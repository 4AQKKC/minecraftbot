const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const logger = require('./logger');
const auth = require('./auth');
const behaviors = require('./behaviors');

class MinecraftBot {
    constructor(config) {
        this.config = config;
        this.bot = null;
        this.isConnected = false;
        this.currentGoal = null;
        this.followTarget = null;
        this.antiKickInterval = null;
    }

    async connect() {
        try {
            // Setup bot options
            const botOptions = {
                host: this.config.host,
                port: this.config.port,
                username: this.config.username,
                version: this.config.version,
                auth: this.config.auth
            };

            // Add authentication if provided
            if (this.config.password && this.config.auth !== 'offline') {
                botOptions.password = this.config.password;
            }

            logger.info(`Attempting to connect to ${this.config.host}:${this.config.port}`, {
                username: this.config.username,
                version: this.config.version,
                auth: this.config.auth
            });

            // Create bot instance
            this.bot = mineflayer.createBot(botOptions);

            // Load pathfinder plugin
            this.bot.loadPlugin(pathfinder);

            // Setup event handlers
            this.setupEventHandlers();

            // Wait for successful connection
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 30000);

                this.bot.once('spawn', () => {
                    clearTimeout(timeout);
                    this.isConnected = true;
                    this.setupBehaviors();
                    resolve();
                });

                this.bot.once('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });

                this.bot.once('end', (reason) => {
                    clearTimeout(timeout);
                    if (!this.isConnected) {
                        reject(new Error(`Connection ended: ${reason}`));
                    }
                });
            });

        } catch (error) {
            logger.error('Failed to connect to server', error);
            throw error;
        }
    }

    setupEventHandlers() {
        // Connection events
        this.bot.on('login', () => {
            logger.info('Bot logged in successfully');
        });

        this.bot.on('spawn', () => {
            logger.info('Bot spawned in the world');
            console.log(`Bot spawned at position: ${this.bot.entity.position}`.green);
        });

        this.bot.on('respawn', () => {
            logger.info('Bot respawned');
            console.log('Bot respawned'.yellow);
        });

        this.bot.on('death', () => {
            logger.info('Bot died');
            console.log('Bot died!'.red);
            
            if (this.config.autoRespawn) {
                setTimeout(() => {
                    this.bot.respawn();
                }, 1000);
            }
        });

        // Chat events
        this.bot.on('chat', (username, message) => {
            if (username === this.bot.username) return;
            
            logger.info('Chat message received', { username, message });
            console.log(`[${username}] ${message}`.cyan);
            
            // Handle basic commands from other players
            this.handleChatCommands(username, message);
        });

        // Error handling
        this.bot.on('error', (error) => {
            logger.error('Bot error', error);
            console.log(`Bot error: ${error.message}`.red);
        });

        this.bot.on('end', (reason) => {
            this.isConnected = false;
            this.cleanup();
            logger.info('Bot disconnected', { reason });
            console.log(`Bot disconnected: ${reason}`.yellow);
        });

        // Health monitoring
        this.bot.on('health', () => {
            if (this.bot.health < 5) {
                logger.warn('Bot health is low', { health: this.bot.health });
                console.log(`Warning: Health is low (${this.bot.health})`.red);
            }
        });

        // Kicked handling
        this.bot.on('kicked', (reason) => {
            logger.warn('Bot was kicked', { reason });
            console.log(`Bot was kicked: ${reason}`.red);
        });
    }

    setupBehaviors() {
        // Setup pathfinder movements
        const mcData = require('minecraft-data')(this.bot.version);
        const defaultMove = new Movements(this.bot, mcData);
        this.bot.pathfinder.setMovements(defaultMove);

        // Start anti-kick behavior if enabled
        if (this.config.antiKick) {
            this.startAntiKickBehavior();
        }

        logger.info('Bot behaviors initialized');
    }

    startAntiKickBehavior() {
        this.antiKickInterval = setInterval(() => {
            if (this.isConnected && this.bot) {
                behaviors.antiKick(this.bot);
            }
        }, this.config.antiKickInterval);
    }

    handleChatCommands(username, message) {
        // Simple command handling for other players
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes(`${this.bot.username.toLowerCase()} come here`)) {
            this.followPlayer(username);
        } else if (lowerMessage.includes(`${this.bot.username.toLowerCase()} stop`)) {
            this.stop();
        }
    }

    // Bot actions
    chat(message) {
        if (!this.isConnected || !this.bot) {
            throw new Error('Bot is not connected');
        }

        this.bot.chat(message);
        logger.info('Chat message sent', { message });
    }

    move(direction, distance) {
        if (!this.isConnected || !this.bot) {
            throw new Error('Bot is not connected');
        }

        const currentPos = this.bot.entity.position;
        let targetPos;

        switch (direction.toLowerCase()) {
            case 'forward':
                targetPos = currentPos.offset(0, 0, -distance);
                break;
            case 'back':
            case 'backward':
                targetPos = currentPos.offset(0, 0, distance);
                break;
            case 'left':
                targetPos = currentPos.offset(-distance, 0, 0);
                break;
            case 'right':
                targetPos = currentPos.offset(distance, 0, 0);
                break;
            default:
                throw new Error('Invalid direction. Use: forward, back, left, right');
        }

        this.moveTo(targetPos);
    }

    moveTo(position) {
        if (!this.bot.pathfinder) {
            throw new Error('Pathfinder not available');
        }

        this.currentGoal = new goals.GoalBlock(position.x, position.y, position.z);
        this.bot.pathfinder.setGoal(this.currentGoal);
        
        logger.info('Moving to position', { position });
    }

    jump() {
        if (!this.isConnected || !this.bot) {
            throw new Error('Bot is not connected');
        }

        this.bot.setControlState('jump', true);
        setTimeout(() => {
            this.bot.setControlState('jump', false);
        }, 100);

        logger.info('Bot jumped');
    }

    look(pitch, yaw) {
        if (!this.isConnected || !this.bot) {
            throw new Error('Bot is not connected');
        }

        this.bot.look(yaw, pitch);
        logger.info('Bot looked', { pitch, yaw });
    }

    followPlayer(playerName) {
        if (!this.isConnected || !this.bot) {
            throw new Error('Bot is not connected');
        }

        const player = this.bot.players[playerName];
        if (!player || !player.entity) {
            throw new Error(`Player ${playerName} not found or not visible`);
        }

        this.followTarget = playerName;
        const goal = new goals.GoalFollow(player.entity, this.config.followDistance);
        this.bot.pathfinder.setGoal(goal);

        logger.info('Following player', { playerName });
    }

    stop() {
        if (!this.isConnected || !this.bot) {
            return;
        }

        this.bot.pathfinder.setGoal(null);
        this.currentGoal = null;
        this.followTarget = null;
        
        // Stop all movement
        this.bot.clearControlStates();

        logger.info('Bot stopped all actions');
    }

    getStatus() {
        if (!this.bot) {
            return { connected: false };
        }

        const position = this.bot.entity ? 
            `${Math.round(this.bot.entity.position.x)}, ${Math.round(this.bot.entity.position.y)}, ${Math.round(this.bot.entity.position.z)}` : 
            'Unknown';

        return {
            connected: this.isConnected,
            host: this.config.host,
            port: this.config.port,
            username: this.bot.username,
            health: this.bot.health,
            food: this.bot.food,
            position: position,
            followTarget: this.followTarget
        };
    }

    cleanup() {
        if (this.antiKickInterval) {
            clearInterval(this.antiKickInterval);
            this.antiKickInterval = null;
        }
    }

    disconnect() {
        if (this.bot) {
            this.cleanup();
            this.bot.quit();
            this.bot = null;
        }
        this.isConnected = false;
        logger.info('Bot disconnected manually');
    }
}

module.exports = MinecraftBot;
