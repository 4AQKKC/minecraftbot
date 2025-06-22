const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const logger = require('./logger');
const auth = require('./auth');
const behaviors = require('./behaviors');
const ProxyManager = require('./proxy-manager');

class MinecraftBot {
    constructor(config, proxyManager = null) {
        this.config = config;
        this.bot = null;
        this.isConnected = false;
        this.currentGoal = null;
        this.followTarget = null;
        this.antiKickInterval = null;
        this.proxyManager = proxyManager;
        this.currentProxy = null;
        this.retryCount = 0;
        this.lastConnectionAttempt = 0;
    }

    async connect() {
        try {
            // Check if we need to wait due to connection throttling
            const timeSinceLastAttempt = Date.now() - this.lastConnectionAttempt;
            if (timeSinceLastAttempt < this.config.connectionDelay) {
                const waitTime = this.config.connectionDelay - timeSinceLastAttempt;
                console.log(`Đợi ${waitTime / 1000} giây trước khi kết nối để tránh bị giới hạn...`.yellow);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            
            this.lastConnectionAttempt = Date.now();
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

            // Add proxy support if proxy manager is available
            if (this.proxyManager && this.config.useProxy !== false) {
                this.currentProxy = this.proxyManager.getNextProxy();
                if (this.currentProxy) {
                    const proxyAgent = this.proxyManager.getProxyAgent(this.currentProxy);
                    if (proxyAgent) {
                        botOptions.agent = proxyAgent;
                        logger.info('Using proxy for connection', { 
                            proxy: this.currentProxy,
                            botId: this.config.botId 
                        });
                    }
                }
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
            console.log(`🎮 Bot đã xuất hiện trong thế giới tại: ${this.bot.entity.position}`.green);
            
            // Tập trung hoàn toàn vào kết nối - chỉ xử lý login khi cần thiết
            console.log(`🎯 Bot ${this.bot.username} đã spawn - chỉ tập trung vào duy trì kết nối`.green);
            
            // Chỉ auto-login nếu được bật và server yêu cầu
            if (this.config.autoLogin) {
                setTimeout(() => {
                    console.log(`🔑 Bắt đầu quá trình đăng nhập cho ${this.bot.username}`.cyan);
                    this.autoLogin();
                }, this.config.loginDelay);
            } else {
                console.log(`⏸️ Auto-login tắt - bot ${this.bot.username} đợi yêu cầu từ server`.gray);
            }
            
            // Hoàn toàn tắt permission commands để tập trung kết nối
            // Tất cả lệnh khác sẽ chỉ chạy khi được gọi thủ công
        });

        this.bot.on('respawn', () => {
            logger.info('Bot respawned');
            console.log('Bot respawned'.yellow);
        });

        this.bot.on('death', () => {
            logger.info('Bot died');
            if (!this.config.hideDeathMessages) {
                console.log('Bot đã chết!'.red);
            }
            
            if (this.config.autoRespawn) {
                setTimeout(() => {
                    this.bot.respawn();
                }, 1000);
            }
        });

        // Chat events
        this.bot.on('chat', (username, message) => {
            if (username === this.bot.username) {
                console.log(`✅ Tin nhắn của bot đã xuất hiện: ${message}`.green);
                return;
            }
            
            logger.info('Chat message received', { username, message });
            console.log(`💬 [${username}] ${message}`.cyan);
            
            // Xử lý lệnh cơ bản từ người chơi khác
            this.handleChatCommands(username, message);
        });

        // Listen for message events to debug chat issues and auto-respond
        this.bot.on('message', (jsonMsg, position) => {
            const text = jsonMsg.toString();
            
            // Chỉ hiển thị tin nhắn server nếu không bị ẩn
            if (!this.config.hideServerMessages) {
                console.log(`📨 Tin nhắn server (${position}): ${text}`.gray);
            }
            
            // Chỉ phản hồi server messages nếu được phép
            if (this.config.autoLogin) {
                this.handleServerMessage(text);
            }
        });

        // Listen for kick events that might be related to chat
        this.bot.on('kick_disconnect', (packet) => {
            console.log(`🚫 Kick packet: ${JSON.stringify(packet)}`.red);
        });

        // Xử lý lỗi
        this.bot.on('error', (error) => {
            logger.error('Bot error', error);
            console.log(`❌ Lỗi bot: ${error.message}`.red);
            
            // Xử lý các lỗi cụ thể
            if (error.message.includes('ENOTFOUND')) {
                console.log('⚠️ Không tìm thấy server. Kiểm tra địa chỉ server.'.yellow);
            } else if (error.message.includes('ECONNREFUSED')) {
                console.log('⚠️ Kết nối bị từ chối. Server có thể offline hoặc port bị chặn.'.yellow);
            } else if (error.message.includes('ETIMEDOUT')) {
                console.log('⚠️ Hết thời gian kết nối. Server có thể chậm hoặc không thể truy cập.'.yellow);
            } else if (error.message.includes('ECONNRESET')) {
                console.log('⚠️ Kết nối bị reset bởi server - có thể do anti-bot.'.yellow);
            } else if (error.message.includes('Invalid username')) {
                console.log('⚠️ Tên người dùng không hợp lệ. Thử tên khác.'.yellow);
            } else if (error.message.includes('keepAlive') || error.message.includes('Connection throttled')) {
                console.log('🔄 Kết nối bị gián đoạn, đang thử kết nối lại sau 10 giây...'.cyan);
                setTimeout(() => {
                    this.reconnect();
                }, 10000);
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
            if (this.bot.health < 5 && !this.config.hideHealthMessages) {
                logger.warn('Bot health is low', { health: this.bot.health });
                console.log(`Cảnh báo: Máu thấp (${this.bot.health})`.red);
            }
        });

        // Damage monitoring
        this.bot.on('entityHurt', (entity) => {
            if (entity === this.bot.entity && !this.config.hideDamageMessages) {
                logger.info('Bot took damage', { health: this.bot.health });
                console.log(`Bot bị sát thương - Máu còn: ${this.bot.health}`.yellow);
            }
        });

        // Kicked handling with reconnection logic
        this.bot.on('kicked', (reason) => {
            logger.warn('Bot was kicked', { reason });
            const reasonText = typeof reason === 'object' ? reason.value || reason.text || JSON.stringify(reason) : reason;
            console.log(`Bot bị kick: ${reasonText}`.red);
            
            // Handle specific kick reasons
            if (reasonText.includes('Connection throttled') || reasonText.includes('Please wait before reconnecting')) {
                console.log(`Đợi ${this.config.throttleDelay / 1000} giây trước khi thử kết nối lại...`.yellow);
                setTimeout(() => {
                    this.handleThrottledReconnection();
                }, this.config.throttleDelay);
            } else if (reasonText.includes('You are already connected')) {
                console.log('Lỗi đã kết nối - đợi trước khi thử lại...'.yellow);
                setTimeout(() => {
                    this.handleThrottledReconnection();
                }, this.config.retryDelay);
            } else if (reasonText.includes('failed to connect') || reasonText.includes('verification')) {
                console.log('Lỗi xác minh server - có thể server có anti-bot'.yellow);
            } else if (reasonText.includes('Login timed out')) {
                console.log('Hết thời gian đăng nhập - thử lại sau'.yellow);
                setTimeout(() => {
                    this.handleThrottledReconnection();
                }, this.config.retryDelay);
            }
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

    handleThrottledReconnection() {
        if (this.retryCount < this.config.maxRetries) {
            this.retryCount++;
            console.log(`Đang thử kết nối lại (${this.retryCount}/${this.config.maxRetries})...`.cyan);
            
            // Wait additional time for each retry attempt
            const retryWait = this.config.retryDelay * this.retryCount;
            setTimeout(() => {
                this.connect().catch(error => {
                    console.log(`Lần thử kết nối lại ${this.retryCount} thất bại: ${error.message}`.red);
                    if (this.retryCount >= this.config.maxRetries) {
                        console.log('Đã đạt số lần thử tối đa. Dừng việc kết nối lại.'.red);
                        this.retryCount = 0;
                    }
                });
            }, retryWait);
        } else {
            console.log('Đã đạt số lần thử tối đa cho kết nối bị giới hạn.'.red);
            this.retryCount = 0;
        }
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
            throw new Error('Bot không kết nối');
        }

        try {
            // Kiểm tra xem bot có thể chat không
            if (!this.bot.entity || !this.bot.entity.position) {
                console.log('⏳ Bot chưa spawn hoàn toàn, đợi trước khi gửi chat...'.yellow);
                return false;
            }

            // Thêm delay trước khi chat để đảm bảo bot sẵn sàng
            setTimeout(() => {
                this.bot.chat(message);
                if (!this.config.hideDebugChat) {
                    console.log(`📤 Đã gửi: "${message}" từ ${this.bot.username}`.green);
                }
                logger.info('Chat message sent', { message, username: this.bot.username });
                
                // Đặt timeout để kiểm tra tin nhắn xuất hiện (chỉ nếu debug không bị ẩn)
                if (!this.config.hideDebugChat) {
                    setTimeout(() => {
                        console.log(`⏰ Đang kiểm tra phản hồi từ server cho tin nhắn "${message}"...`.cyan);
                    }, 2000);
                }
            }, 500);
            
            return true;
        } catch (error) {
            console.log(`❌ Không thể gửi tin nhắn: ${error.message}`.red);
            logger.error('Chat failed', { error: error.message, message });
            return false;
        }
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
            // Create register command based on format
            let registerCommand;
            if (this.config.registerFormat === 'double') {
                registerCommand = `/register ${this.config.loginPassword} ${this.config.loginPassword}`;
            } else {
                registerCommand = `/register ${this.config.loginPassword}`;
            }
            
            this.bot.chat(registerCommand);
            logger.info('Auto-register command sent', { password: this.config.loginPassword, format: this.config.registerFormat });
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

    handleServerMessage(text) {
        // Kiểm tra yêu cầu đăng ký/đăng nhập
        if (text.includes('Please register using /register') || text.includes('Vui lòng đăng ký')) {
            console.log('🔐 Server yêu cầu đăng ký - tự động gửi lệnh register'.blue);
            setTimeout(() => {
                this.autoRegister();
            }, 2000);
        } else if (text.includes('Please login using /login') || text.includes('Vui lòng đăng nhập')) {
            console.log('🔑 Server yêu cầu đăng nhập - tự động gửi lệnh login'.blue);
            setTimeout(() => {
                this.autoLoginOnly();
            }, 2000);
        } else if (text.includes('You have successfully registered') || text.includes('đăng ký thành công')) {
            console.log('✅ Đăng ký thành công - tự động đăng nhập'.green);
            setTimeout(() => {
                this.autoLoginOnly();
            }, 1000);
        } else if (text.includes('muted') || text.includes('silence') || text.includes('không thể chat')) {
            console.log('⚠️ Bot có thể bị mute hoặc hạn chế chat'.yellow);
        }
    }

    autoRegister() {
        if (!this.isConnected || !this.bot) return;
        
        try {
            let registerCommand;
            if (this.config.registerFormat === 'double') {
                registerCommand = `/register ${this.config.loginPassword} ${this.config.loginPassword}`;
            } else {
                registerCommand = `/register ${this.config.loginPassword}`;
            }
            
            this.bot.chat(registerCommand);
            console.log(`🔐 Auto-register: ${registerCommand}`.green);
            logger.info('Auto-register triggered by server message', { password: this.config.loginPassword });
        } catch (error) {
            console.log(`❌ Lỗi auto-register: ${error.message}`.red);
        }
    }

    autoLoginOnly() {
        if (!this.isConnected || !this.bot) return;
        
        try {
            const loginCommand = `/login ${this.config.loginPassword}`;
            this.bot.chat(loginCommand);
            console.log(`🔑 Auto-login: ${loginCommand}`.green);
            logger.info('Auto-login triggered by server message', { password: this.config.loginPassword });
        } catch (error) {
            console.log(`❌ Lỗi auto-login: ${error.message}`.red);
        }
    }

    tryPermissionCommands() {
        const commands = [
            '/accept',
            '/rules', 
            '/spawn',
            '/kit starter',
            '/help',
            '/perms'
        ];
        
        commands.forEach((cmd, index) => {
            setTimeout(() => {
                try {
                    this.bot.chat(cmd);
                    console.log(`Thử lệnh: ${cmd}`.gray);
                } catch (error) {
                    // Ignore errors
                }
            }, index * 1000);
        });
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
