const cluster = require('cluster');
const os = require('os');
const logger = require('./logger');

/**
 * ThreadingManager - Manages multi-threading for bot operations
 * Handles connection pooling, load balancing, and prevents server overload
 */
class ThreadingManager {
    constructor() {
        this.workers = new Map();
        this.taskQueue = [];
        this.isProcessing = false;
        this.maxWorkers = Math.min(os.cpus().length, 4); // Limit to 4 workers max
        this.currentWorker = 0;
    }

    /**
     * Initialize worker pool
     */
    initializeWorkerPool() {
        if (cluster.isMaster) {
            console.log(`🚀 Khởi tạo ${this.maxWorkers} worker threads...`.cyan);
            
            for (let i = 0; i < this.maxWorkers; i++) {
                this.createWorker(i);
            }

            cluster.on('exit', (worker, code, signal) => {
                console.log(`Worker ${worker.process.pid} died`.red);
                // Restart worker if it crashes
                this.createWorker(worker.id);
            });
        }
    }

    /**
     * Create a new worker
     */
    createWorker(id) {
        const worker = cluster.fork({ WORKER_ID: id });
        this.workers.set(id, {
            worker,
            busy: false,
            connections: 0,
            lastUsed: Date.now()
        });

        worker.on('message', (msg) => {
            this.handleWorkerMessage(id, msg);
        });

        return worker;
    }

    /**
     * Handle messages from workers
     */
    handleWorkerMessage(workerId, message) {
        const workerInfo = this.workers.get(workerId);
        
        switch (message.type) {
            case 'connection_complete':
                workerInfo.busy = false;
                workerInfo.connections++;
                console.log(`✅ Worker ${workerId} hoàn thành kết nối`.green);
                break;
                
            case 'connection_failed':
                workerInfo.busy = false;
                console.log(`❌ Worker ${workerId} kết nối thất bại: ${message.error}`.red);
                break;
                
            case 'status_update':
                console.log(`🔄 Worker ${workerId}: ${message.status}`.gray);
                break;
        }
        
        // Process next task in queue
        this.processNextTask();
    }

    /**
     * Distribute bot connection tasks across workers
     */
    async distributeConnections(botConfigs, host, port) {
        console.log(`📡 Phân phối ${botConfigs.length} bot connections qua ${this.maxWorkers} workers...`.cyan);
        
        const promises = botConfigs.map((config, index) => {
            return new Promise((resolve, reject) => {
                const task = {
                    type: 'connect_bot',
                    config,
                    host,
                    port,
                    index,
                    resolve,
                    reject
                };
                
                this.taskQueue.push(task);
            });
        });

        // Start processing tasks
        this.processTaskQueue();
        
        return Promise.allSettled(promises);
    }

    /**
     * Process task queue with load balancing
     */
    async processTaskQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.taskQueue.length > 0) {
            const availableWorker = this.getAvailableWorker();
            
            if (!availableWorker) {
                // Wait for a worker to become available
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }

            const task = this.taskQueue.shift();
            this.assignTaskToWorker(availableWorker.id, task);
            
            // Small delay between task assignments to prevent overload
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        this.isProcessing = false;
    }

    /**
     * Get least busy available worker
     */
    getAvailableWorker() {
        let bestWorker = null;
        let minConnections = Infinity;

        for (const [id, workerInfo] of this.workers) {
            if (!workerInfo.busy && workerInfo.connections < minConnections) {
                bestWorker = { id, ...workerInfo };
                minConnections = workerInfo.connections;
            }
        }

        return bestWorker;
    }

    /**
     * Assign task to specific worker
     */
    assignTaskToWorker(workerId, task) {
        const workerInfo = this.workers.get(workerId);
        workerInfo.busy = true;
        workerInfo.lastUsed = Date.now();

        workerInfo.worker.send({
            type: task.type,
            payload: {
                config: task.config,
                host: task.host,
                port: task.port,
                index: task.index
            }
        });

        // Store resolve/reject for later use
        workerInfo.currentTask = task;
    }

    /**
     * Process next task in queue
     */
    processNextTask() {
        if (this.taskQueue.length > 0) {
            setTimeout(() => this.processTaskQueue(), 100);
        }
    }

    /**
     * Get worker statistics
     */
    getWorkerStats() {
        const stats = {
            totalWorkers: this.workers.size,
            busyWorkers: 0,
            totalConnections: 0,
            queueLength: this.taskQueue.length
        };

        for (const workerInfo of this.workers.values()) {
            if (workerInfo.busy) stats.busyWorkers++;
            stats.totalConnections += workerInfo.connections;
        }

        return stats;
    }

    /**
     * Cleanup all workers
     */
    cleanup() {
        console.log('🧹 Cleaning up worker pool...'.yellow);
        
        for (const workerInfo of this.workers.values()) {
            workerInfo.worker.kill();
        }
        
        this.workers.clear();
        this.taskQueue = [];
        console.log('✅ Worker pool cleanup complete'.green);
    }
}

module.exports = ThreadingManager;