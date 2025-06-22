const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path');
const os = require('os');

class WorkerPool {
    constructor(maxWorkers = os.cpus().length) {
        this.maxWorkers = maxWorkers;
        this.workers = [];
        this.queue = [];
        this.activeJobs = new Map();
        this.jobId = 0;
    }

    /**
     * Initialize worker pool
     */
    init() {
        console.log(`Khởi tạo worker pool với ${this.maxWorkers} luồng`.cyan);
        
        for (let i = 0; i < this.maxWorkers; i++) {
            this.createWorker();
        }
    }

    /**
     * Create a new worker
     */
    createWorker() {
        const worker = new Worker(path.join(__dirname, 'bot-worker.js'));
        
        worker.on('message', (result) => {
            const { jobId, success, data, error } = result;
            const job = this.activeJobs.get(jobId);
            
            if (job) {
                this.activeJobs.delete(jobId);
                
                if (success) {
                    job.resolve(data);
                } else {
                    job.reject(new Error(error));
                }
                
                // Process next job in queue
                this.processQueue();
            }
        });

        worker.on('error', (error) => {
            console.log(`Worker error: ${error.message}`.red);
            this.restartWorker(worker);
        });

        worker.on('exit', (code) => {
            if (code !== 0) {
                console.log(`Worker exited with code ${code}`.yellow);
                this.restartWorker(worker);
            }
        });

        this.workers.push({
            worker,
            busy: false
        });
    }

    /**
     * Restart a failed worker
     */
    restartWorker(failedWorker) {
        const index = this.workers.findIndex(w => w.worker === failedWorker);
        if (index !== -1) {
            this.workers[index].worker.terminate();
            this.workers.splice(index, 1);
            this.createWorker();
        }
    }

    /**
     * Execute a job using worker threads
     */
    async execute(task, data) {
        return new Promise((resolve, reject) => {
            const jobId = ++this.jobId;
            const job = { jobId, task, data, resolve, reject };
            
            const availableWorker = this.workers.find(w => !w.busy);
            
            if (availableWorker) {
                this.assignJob(availableWorker, job);
            } else {
                this.queue.push(job);
            }
        });
    }

    /**
     * Assign job to worker
     */
    assignJob(workerInfo, job) {
        workerInfo.busy = true;
        this.activeJobs.set(job.jobId, job);
        
        workerInfo.worker.postMessage({
            jobId: job.jobId,
            task: job.task,
            data: job.data
        });
    }

    /**
     * Process queue when worker becomes available
     */
    processQueue() {
        if (this.queue.length === 0) return;
        
        const availableWorker = this.workers.find(w => !w.busy);
        if (availableWorker) {
            const job = this.queue.shift();
            this.assignJob(availableWorker, job);
        }
    }

    /**
     * Connect multiple bots in parallel using workers
     */
    async connectBotsParallel(bots, host, port = 25565) {
        console.log(`Kết nối ${bots.length} bot song song với ${this.maxWorkers} luồng`.cyan);
        
        const tasks = bots.map(bot => ({
            task: 'connect',
            data: {
                botConfig: bot.config,
                host,
                port,
                botId: bot.id
            }
        }));

        const results = await Promise.allSettled(
            tasks.map(task => this.execute(task.task, task.data))
        );

        let successCount = 0;
        let failCount = 0;

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                successCount++;
                console.log(`✅ Bot ${bots[index].id} kết nối thành công`.green);
            } else {
                failCount++;
                console.log(`❌ Bot ${bots[index].id} kết nối thất bại: ${result.reason.message}`.red);
            }
        });

        console.log(`Hoàn thành: ${successCount} thành công, ${failCount} thất bại`.cyan);
        return { successCount, failCount };
    }

    /**
     * Send chat messages from multiple bots in parallel
     */
    async chatBotsParallel(bots, message) {
        const tasks = bots.map(bot => ({
            task: 'chat',
            data: {
                botId: bot.id,
                message
            }
        }));

        const results = await Promise.allSettled(
            tasks.map(task => this.execute(task.task, task.data))
        );

        let successCount = 0;
        results.forEach(result => {
            if (result.status === 'fulfilled') {
                successCount++;
            }
        });

        return successCount;
    }

    /**
     * Get worker pool statistics
     */
    getStats() {
        const busyWorkers = this.workers.filter(w => w.busy).length;
        return {
            totalWorkers: this.workers.length,
            busyWorkers,
            availableWorkers: this.workers.length - busyWorkers,
            queueLength: this.queue.length,
            activeJobs: this.activeJobs.size
        };
    }

    /**
     * Cleanup worker pool
     */
    async cleanup() {
        console.log('Đang dọn dẹp worker pool...'.yellow);
        
        await Promise.all(
            this.workers.map(w => w.worker.terminate())
        );
        
        this.workers = [];
        this.queue = [];
        this.activeJobs.clear();
        
        console.log('Worker pool đã được dọn dẹp'.green);
    }
}

module.exports = WorkerPool;