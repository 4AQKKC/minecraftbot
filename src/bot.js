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
            // Setup bot options with better compatibility
            const botOptions = {
                host: this.config.host,
                port: this.config.port,
                username: this.config.username,
                version: this.config.version || '1.19.4', // Use stable version
                auth: this.config.auth || 'offline',
                hideErrors: false,
                keepAlive: true,
                checkTimeoutInterval: 30000
            };

            // Add authentication if provided
            if (this.config.password && this.config.auth !== 'offline') {
                botOptions.password = this.config.password;
            }

            // Add verification bypass options for better server compatibility
            if (this.config.bypassVerification) {
                botOptions.hideErrors = false; // Show errors for debugging
                botOptions.keepAlive = true;
                botOptions.checkTimeoutInterval = 30000;
                botOptions.brand = this.config.customBrand || 'vanilla';
            }

            // Additional connection options for better compatibility
            botOptions.skipValidation = true;
            botOptions.viewDistance = 'far';
            botOptions.chatLengthLimit = 256;

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

            // Setup client verification bypass
            if (this.config.bypassVerification) {
                this.setupVerificationBypass();
            }

            // Wait for successful connection with better error handling
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    if (this.bot) {
                        this.bot.quit();
                    }
                    reject(new Error('Connection timeout - server may be offline or unreachable'));
                }, 15000); // Reduce timeout to 15 seconds

                this.bot.once('spawn', () => {
                    clearTimeout(timeout);
                    this.isConnected = true;
                    this.setupBehaviors();
                    console.log(`Successfully connected to ${this.config.host}:${this.config.port}`.green);
                    resolve();
                });

                this.bot.once('error', (error) => {
                    clearTimeout(timeout);
                    
                    // Clean up bot instance on error
                    if (this.bot) {
                        try {
                            this.bot.quit();
                        } catch (e) {
                            // Ignore cleanup errors
                        }
                    }
                    
                    // Provide more helpful error messages
                    let errorMessage = error.message;
                    if (error.code === 'ECONNRESET') {
                        errorMessage = 'Server closed the connection. This might be due to:\n  - Server anti-bot protection\n  - Invalid client version\n  - Server whitelist/IP restrictions';
                    } else if (error.code === 'ENOTFOUND') {
                        errorMessage = 'Server not found. Check the server address';
                    } else if (error.code === 'ECONNREFUSED') {
                        errorMessage = 'Connection refused. Server might be offline or port blocked';
                    }
                    
                    reject(new Error(errorMessage));
                });

                this.bot.once('end', (reason) => {
                    clearTimeout(timeout);
                    if (!this.isConnected) {
                        reject(new Error(`Connection ended before spawn: ${reason}`));
                    }
                });

                // Add login event handler for better connection tracking
                this.bot.once('login', () => {
                    console.log(`Logged in as ${this.bot.username}`.cyan);
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
            
            // Auto-login after spawn if enabled
            if (this.config.autoLogin) {
                setTimeout(() => {
                    this.autoLogin();
                }, this.config.loginDelay);
            }
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
            
            // Handle specific errors
            if (error.message.includes('ENOTFOUND')) {
                console.log('Server not found. Check the server address.'.yellow);
            } else if (error.message.includes('ECONNREFUSED')) {
                console.log('Connection refused. Server might be offline or port blocked.'.yellow);
            } else if (error.message.includes('ETIMEDOUT')) {
                console.log('Connection timed out. Server might be slow or unreachable.'.yellow);
            } else if (error.message.includes('Invalid username')) {
                console.log('Invalid username format. Try a different username.'.yellow);
            }
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

    autoLogin() {
        if (!this.isConnected || !this.bot) {
            return;
        }

        try {
            // First send register command
            const registerCommand = `/register ${this.config.loginPassword} ${this.config.loginPassword}`;
            this.bot.chat(registerCommand);
            logger.info('Auto-register command sent', { password: this.config.loginPassword });
            console.log(`Auto-register sent: ${registerCommand}`.green);
            
            // Then send login command after a short delay
            setTimeout(() => {
                const loginCommand = `/login ${this.config.loginPassword}`;
                this.bot.chat(loginCommand);
                logger.info('Auto-login command sent', { password: this.config.loginPassword });
                console.log(`Auto-login sent: ${loginCommand}`.green);
            }, 1000); // 1 second delay between commands
            
        } catch (error) {
            logger.error('Auto-login/register failed', error);
            console.log(`Auto-login/register failed: ${error.message}`.red);
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

    setupVerificationBypass() {
        if (!this.bot) return;

        // Handle plugin channels to avoid detection
        this.bot.on('custom_payload', (packet) => {
            if (this.config.hidePluginChannels) {
                // Ignore plugin channel packets that might reveal bot nature
                return;
            }
        });

        // Override brand packet to appear as vanilla client
        this.bot._client.on('brand', (packet) => {
            // Send custom brand response
            this.bot._client.write('brand', {
                brand: this.config.customBrand
            });
        });

        // Handle server verification requests
        this.bot.on('message', (jsonMsg) => {
            const message = jsonMsg.toString();
            
            // Auto-respond to common verification prompts
            if (message.includes('Verifying') || message.includes('verify')) {
                logger.info('Server verification detected, attempting bypass');
                
                // Send movement to appear active during verification
                setTimeout(() => {
                    if (this.bot && this.isConnected) {
                        this.bot.look(Math.random() * Math.PI * 2, (Math.random() - 0.5) * Math.PI);
                    }
                }, 500);
            }
        });

        // Handle kick messages and auto-retry
        this.bot.on('kicked', (reason) => {
            const reasonStr = JSON.stringify(reason);
            logger.warn('Kicked during verification', { reason: reasonStr });
            
            // If kicked for verification failure, wait and retry
            if (reasonStr.includes('failed to connect') || reasonStr.includes('verify')) {
                console.log('Verification failed, retrying in 5 seconds...'.yellow);
                setTimeout(() => {
                    this.reconnect();
                }, 5000);
            }
        });

        // Send periodic keep-alive during login process
        const keepAliveInterval = setInterval(() => {
            if (this.isConnected && this.bot) {
                // Send subtle movement to stay active
                try {
                    this.bot.look(this.bot.entity.yaw + 0.1, this.bot.entity.pitch);
                } catch (error) {
                    // Ignore errors during keep-alive
                }
            } else {
                clearInterval(keepAliveInterval);
            }
        }, 2000);

        logger.info('Verification bypass setup completed');
    }

    async reconnect() {
        if (this.bot) {
            this.cleanup();
            this.bot = null;
        }
        this.isConnected = false;
        
        try {
            await this.connect();
            console.log('Reconnection successful'.green);
        } catch (error) {
            console.log(`Reconnection failed: ${error.message}`.red);
        }
    }
}

module.exports = MinecraftBot;
