const MinecraftBot = require('./bot');
const logger = require('./logger');
const ProxyManager = require('./proxy-manager');
const ProxyScraper = require('./proxy-scraper');
const os = require('os');

class BotManager {
    constructor() {
        this.bots = new Map();
        this.nextBotId = 1;
        this.proxyManager = new ProxyManager();
        this.proxyManager.initializeDefaultProxies();
        this.proxyScraper = new ProxyScraper();
    }

    /**
     * Get system information
     */
    getSystemInfo() {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const cpuCores = os.cpus().length;
        
        return {
            cores: cpuCores,
            totalMemoryGB: (totalMemory / (1024 * 1024 * 1024)).toFixed(2),
            usedMemoryGB: (usedMemory / (1024 * 1024 * 1024)).toFixed(2),
            freeMemoryGB: (freeMemory / (1024 * 1024 * 1024)).toFixed(2),
            memoryUsagePercent: ((usedMemory / totalMemory) * 100).toFixed(2)
        };
    }

    /**
     * Generate random bot name with letters and numbers
     */
    generateRandomBotName() {
        const letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        let name = '';
        
        // 3-5 random letters
        const letterCount = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < letterCount; i++) {
            name += letters.charAt(Math.floor(Math.random() * letters.length));
        }
        
        // 2-4 random numbers
        const numberCount = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numberCount; i++) {
            name += numbers.charAt(Math.floor(Math.random() * numbers.length));
        }
        
        return name;
    }

    /**
     * Create a new bot
     */
    createBot(config = {}) {
        const botId = `bot_${this.nextBotId++}`;
        const botName = this.generateRandomBotName();
        
        const botConfig = {
            ...config,
            username: botName,
            botId: botId
        };

        const bot = new MinecraftBot(botConfig, this.proxyManager);
        
        const botInfo = {
            id: botId,
            name: botName,
            bot: bot,
            config: botConfig,
            connectedTo: null,
            connectionTime: null,
            status: 'created'
        };

        this.bots.set(botId, botInfo);
        logger.info('Bot created', { botId, botName });
        
        return botInfo;
    }

    /**
     * Connect bot to server
     */
    async connectBot(botId, host, port = 25565) {
        const botInfo = this.bots.get(botId);
        if (!botInfo) {
            throw new Error(`Bot ${botId} not found`);
        }

        try {
            botInfo.config.host = host;
            botInfo.config.port = port;
            
            // Add connection delay to prevent throttling
            const timeSinceLastConnection = Date.now() - (this.lastConnectionTime || 0);
            const minDelay = botInfo.config.connectionDelay || 5000;
            
            if (timeSinceLastConnection < minDelay) {
                const waitTime = minDelay - timeSinceLastConnection;
                console.log(`Đợi ${waitTime / 1000} giây để tránh bị giới hạn kết nối...`.yellow);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            
            this.lastConnectionTime = Date.now();
        
        // Initialize lastConnectionTime if not set
        if (!this.lastConnectionTime) {
            this.lastConnectionTime = 0;
        }
            await botInfo.bot.connect();
            
            botInfo.connectedTo = `${host}:${port}`;
            botInfo.connectionTime = new Date();
            botInfo.status = 'connected';
            
            logger.info('Bot connected', { botId: botInfo.id, server: botInfo.connectedTo });
            return true;
        } catch (error) {
            botInfo.status = 'failed';
            logger.error('Bot connection failed', { botId: botInfo.id, error: error.message });
            throw error;
        }
    }

    /**
     * Disconnect bot
     */
    disconnectBot(botId) {
        const botInfo = this.bots.get(botId);
        if (!botInfo) {
            throw new Error(`Bot ${botId} not found`);
        }

        botInfo.bot.disconnect();
        botInfo.connectedTo = null;
        botInfo.connectionTime = null;
        botInfo.status = 'disconnected';
        
        logger.info('Bot disconnected', { botId: botInfo.id });
    }

    /**
     * Remove bot
     */
    removeBot(botId) {
        const botInfo = this.bots.get(botId);
        if (!botInfo) {
            throw new Error(`Bot ${botId} not found`);
        }

        if (botInfo.status === 'connected') {
            this.disconnectBot(botId);
        }

        this.bots.delete(botId);
        logger.info('Bot removed', { botId });
    }

    /**
     * Get list of all bots with sequential numbering
     */
    listBots() {
        const botList = [];
        let index = 1;
        
        for (const [botId, botInfo] of this.bots) {
            const connectionDuration = botInfo.connectionTime ? 
                Math.floor((Date.now() - botInfo.connectionTime.getTime()) / 1000) : 0;
            
            botList.push({
                index: index++,
                id: botId,
                name: botInfo.name,
                status: botInfo.status,
                connectedTo: botInfo.connectedTo || 'Not connected',
                connectionTime: botInfo.connectionTime ? botInfo.connectionTime.toLocaleString() : 'Never',
                durationSeconds: connectionDuration,
                durationFormatted: this.formatDuration(connectionDuration)
            });
        }
        
        return botList;
    }

    /**
     * Get bot by index number
     */
    getBotByIndex(index) {
        const botList = Array.from(this.bots.values());
        if (index < 1 || index > botList.length) {
            return null;
        }
        return botList[index - 1];
    }

    /**
     * Connect bot by index number
     */
    async connectBotByIndex(index, host, port = 25565) {
        const botInfo = this.getBotByIndex(index);
        if (!botInfo) {
            throw new Error(`Bot number ${index} not found. Use 'list' to see available bots.`);
        }
        
        return await this.connectBot(botInfo.id, host, port);
    }

    /**
     * Disconnect bot by index number
     */
    disconnectBotByIndex(index) {
        const botInfo = this.getBotByIndex(index);
        if (!botInfo) {
            throw new Error(`Bot number ${index} not found. Use 'list' to see available bots.`);
        }
        
        this.disconnectBot(botInfo.id);
        return botInfo;
    }

    /**
     * Remove bot by index number
     */
    removeBotByIndex(index) {
        const botInfo = this.getBotByIndex(index);
        if (!botInfo) {
            throw new Error(`Bot number ${index} not found. Use 'list' to see available bots.`);
        }
        
        this.removeBot(botInfo.id);
        return botInfo;
    }

    /**
     * Send chat message from specific bot by index
     */
    chatBotByIndex(index, message) {
        const botInfo = this.getBotByIndex(index);
        if (!botInfo) {
            throw new Error(`Bot number ${index} not found. Use 'list' to see available bots.`);
        }
        
        if (botInfo.status !== 'connected' || !botInfo.bot.isConnected) {
            throw new Error(`Bot #${index} (${botInfo.name}) is not connected to any server.`);
        }
        
        botInfo.bot.chat(message);
        return botInfo;
    }

    /**
     * Chờ bot đăng nhập hoàn tất - theo dõi sự kiện chat từ server
     */
    async waitForBotLogin(botId, timeoutMs = 15000) {
        const botInfo = this.bots.get(botId);
        if (!botInfo || !botInfo.bot) {
            throw new Error('Bot not found or not connected');
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Login timeout - bot không đăng nhập được'));
            }, timeoutMs);

            let loginAttempted = false;
            
            // Lắng nghe tin nhắn từ server để xác định trạng thái đăng nhập
            const messageHandler = (jsonMsg) => {
                try {
                    const text = jsonMsg.toString().toLowerCase();
                    
                    // Phát hiện thông báo đăng nhập thành công
                    if (text.includes('successfully') || text.includes('logged in') || 
                        text.includes('welcome') || text.includes('spawn') ||
                        text.includes('thành công') || text.includes('đăng nhập')) {
                        clearTimeout(timeout);
                        botInfo.bot.removeListener('message', messageHandler);
                        resolve();
                    }
                    
                    // Phát hiện yêu cầu đăng nhập/đăng ký
                    if ((text.includes('register') || text.includes('login') || 
                         text.includes('đăng ký') || text.includes('đăng nhập')) && !loginAttempted) {
                        loginAttempted = true;
                        setTimeout(() => {
                            if (botInfo.bot && botInfo.bot.isConnected) {
                                botInfo.bot.instance.autoLogin();
                            }
                        }, 1000);
                    }
                } catch (error) {
                    // Bỏ qua lỗi parse message
                }
            };

            // Đăng ký lắng nghe tin nhắn
            botInfo.bot.on('message', messageHandler);
            
            // Fallback: Kiểm tra player entity sau 3 giây
            setTimeout(() => {
                if (botInfo.bot && botInfo.bot.player && botInfo.bot.entity) {
                    clearTimeout(timeout);
                    botInfo.bot.removeListener('message', messageHandler);
                    resolve();
                }
            }, 3000);
        });
    }

    /**
     * Connect all bots to same server with delays - mỗi bot login hoàn tất mới kết nối bot tiếp theo
     */
    async connectAllBots(host, port = 25565, delayMs = 3000) {
        const bots = Array.from(this.bots.values());
        let successCount = 0;
        
        console.log(`🚀 Bắt đầu kết nối tuần tự: ${bots.length} bot tới ${host}:${port}`.yellow.bold);
        console.log(`⏱️ Mỗi bot sẽ đăng nhập hoàn tất mới kết nối bot tiếp theo`.cyan);
        
        for (let i = 0; i < bots.length; i++) {
            const botInfo = bots[i];
            
            try {
                console.log(`[${i+1}/${bots.length}] 🔗 Kết nối ${botInfo.name}...`.cyan);
                await this.connectBot(botInfo.id, host, port);
                
                // Chờ bot đăng nhập hoàn tất
                await this.waitForBotLogin(botInfo.id);
                
                successCount++;
                console.log(`✅ ${botInfo.name} đã kết nối và đăng nhập thành công`.green);
                
                // Delay trước khi kết nối bot tiếp theo
                if (i < bots.length - 1) {
                    console.log(`⏳ Chờ ${delayMs/1000}s trước khi kết nối bot tiếp theo...`.gray);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            } catch (error) {
                console.log(`❌ ${botInfo.name} thất bại: ${error.message}`.red);
            }
        }
        
        console.log(`🎯 Hoàn thành kết nối tuần tự: ${successCount}/${bots.length} bot đã kết nối`.cyan.bold);
        return successCount;
    }

    /**
     * Connect bots tuần tự với auto-login - tối ưu hóa cho tính ổn định
     */
    async connectAllBotsParallel(host, port = 25565, groupSize = 1, delayBetweenGroups = 4000) {
        const bots = Array.from(this.bots.values());
        let successCount = 0;
        
        console.log(`🎯 Kết nối tuần tự tối ưu: ${bots.length} bot tới ${host}:${port}`.yellow.bold);
        console.log(`🔒 Mỗi bot sẽ kết nối → đăng nhập → chờ ổn định → bot tiếp theo`.cyan);
        
        for (let i = 0; i < bots.length; i++) {
            const botInfo = bots[i];
            const botNumber = i + 1;
            
            try {
                console.log(`[${botNumber}/${bots.length}] 🚀 Kết nối ${botInfo.name}...`.cyan);
                
                // Kết nối bot
                await this.connectBot(botInfo.id, host, port);
                
                // Chờ bot đăng nhập hoàn tất
                console.log(`⏳ Chờ ${botInfo.name} đăng nhập...`.yellow);
                await this.waitForBotLogin(botInfo.id);
                
                successCount++;
                console.log(`✅ ${botInfo.name} hoàn tất (${successCount}/${bots.length})`.green);
                
                // Delay trước bot tiếp theo để tránh rate limit
                if (i < bots.length - 1) {
                    console.log(`⏱️ Chờ ${delayBetweenGroups/1000}s trước bot tiếp theo...`.gray);
                    await new Promise(resolve => setTimeout(resolve, delayBetweenGroups));
                }
                
            } catch (error) {
                console.log(`❌ Bot ${botInfo.name} kết nối thất bại: ${error.message}`.red);
            }
        }
        
        console.log(`🎯 Hoàn tất kết nối tuần tự tối ưu: ${successCount}/${bots.length} bot đã kết nối và đăng nhập`.green.bold);
        return successCount;
    }

    /**
     * Send chat message to all connected bots
     */
    chatAll(message) {
        let sentCount = 0;
        let successCount = 0;
        
        for (const [botId, botInfo] of this.bots) {
            if (botInfo.status === 'connected' && botInfo.bot.isConnected) {
                try {
                    const success = botInfo.bot.chat(message);
                    sentCount++;
                    if (success !== false) {
                        successCount++;
                    }
                } catch (error) {
                    console.log(`❌ Bot ${botInfo.name} không thể gửi: ${error.message}`.red);
                    logger.error('Failed to send chat from bot', { botId, error: error.message });
                }
            }
        }
        
        console.log(`📤 Đã gửi từ ${successCount}/${sentCount} bot thành công`.cyan);
        logger.info('Chat sent to all bots', { message, sentCount, successCount });
        return sentCount;
    }

    /**
     * Spam chat messages from all connected bots with anti-kick measures
     */
    async spamAllBots(message, count, delayMs = 2000) {
        const connectedBots = Array.from(this.bots.values()).filter(
            botInfo => botInfo.status === 'connected' && botInfo.bot.isConnected
        );
        
        if (connectedBots.length === 0) {
            throw new Error('Không có bot nào đang kết nối để spam');
        }

        // Adjust delay based on bot count to prevent kicks
        const adjustedDelay = Math.max(delayMs, connectedBots.length * 150);
        
        console.log(`Bắt đầu spam "${message}" ${count} lần từ ${connectedBots.length} bot với delay ${adjustedDelay}ms...`.cyan);
        console.log(`⚠️ Sử dụng delay ${adjustedDelay}ms để tránh bị kick spam`.yellow);
        
        for (let i = 0; i < count; i++) {
            console.log(`[${i + 1}/${count}] Gửi từ ${connectedBots.length} bot: "${message}"`.yellow);
            
            // Send messages with staggered timing to prevent server overload
            const results = await Promise.allSettled(
                connectedBots.map(async (botInfo, index) => {
                    try {
                        // Stagger messages by index to avoid simultaneous sending
                        const staggerDelay = index * 200; // 200ms between each bot
                        await new Promise(resolve => setTimeout(resolve, staggerDelay));
                        
                        await botInfo.bot.chat(message);
                        return { success: true, botName: botInfo.name };
                    } catch (error) {
                        return { success: false, botName: botInfo.name, error: error.message };
                    }
                })
            );
            
            const successCount = results.filter(r => r.value?.success).length;
            console.log(`📤 Đã gửi tin nhắn từ ${successCount}/${connectedBots.length} bot thành công`.green);
            logger.info(`Chat sent to all bots ${message}`, { sentCount: connectedBots.length, successCount });
            
            // Wait before next iteration (except for last one)
            if (i < count - 1) {
                await new Promise(resolve => setTimeout(resolve, adjustedDelay));
            }
        }
        
        console.log(`🎯 Hoàn tất spam ${count} lần từ ${connectedBots.length} bot thành công!`.green.bold);
        return connectedBots.length;
    }

    /**
     * Get connected bots count
     */
    getConnectedBotsCount() {
        let count = 0;
        for (const [botId, botInfo] of this.bots) {
            if (botInfo.status === 'connected') {
                count++;
            }
        }
        return count;
    }

    /**
     * Update password for all bots
     */
    updateAllBotsPassword(newPassword) {
        let updatedCount = 0;
        
        for (const [botId, botInfo] of this.bots) {
            botInfo.config.loginPassword = newPassword;
            if (botInfo.bot) {
                botInfo.bot.config.loginPassword = newPassword;
            }
            updatedCount++;
        }
        
        return updatedCount;
    }

    /**
     * Update register format for all bots
     */
    updateAllBotsRegisterFormat(format) {
        let updatedCount = 0;
        
        for (const [botId, botInfo] of this.bots) {
            botInfo.config.registerFormat = format;
            if (botInfo.bot) {
                botInfo.bot.config.registerFormat = format;
            }
            updatedCount++;
        }
        
        return updatedCount;
    }

    /**
     * Format duration in seconds to readable format
     */
    formatDuration(seconds) {
        if (seconds < 60) {
            return `${seconds}s`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }
    }

    /**
     * Get bot by ID
     */
    getBot(botId) {
        return this.bots.get(botId);
    }

    /**
     * Get total bots count
     */
    getTotalBotsCount() {
        return this.bots.size;
    }

    /**
     * Get proxy manager for external access
     */
    getProxyManager() {
        return this.proxyManager;
    }

    /**
     * Add proxy to the manager
     */
    addProxy(proxyUrl) {
        return this.proxyManager.addProxy(proxyUrl);
    }

    /**
     * Remove proxy from the manager
     */
    removeProxy(proxyUrl) {
        return this.proxyManager.removeProxy(proxyUrl);
    }

    /**
     * Test all proxies
     */
    async testProxies() {
        return await this.proxyManager.getWorkingProxies();
    }

    /**
     * Get proxy statistics
     */
    getProxyStats() {
        return this.proxyManager.getStats();
    }

    /**
     * Cleanup all bots
     */
    /**
     * Update chat settings for all bots
     */
    updateAllBotsChatSettings(hideServer, hideDebug) {
        let updatedCount = 0;
        
        for (const [botId, botInfo] of this.bots) {
            botInfo.config.hideServerMessages = hideServer;
            botInfo.config.hideDebugChat = hideDebug;
            if (botInfo.bot) {
                botInfo.bot.config.hideServerMessages = hideServer;
                botInfo.bot.config.hideDebugChat = hideDebug;
            }
            updatedCount++;
        }
        
        return updatedCount;
    }

    /**
     * Scrape proxies from public sources
     */
    async scrapeProxies(mode = 'quick') {
        try {
            let newProxies = [];
            
            if (mode === 'full') {
                newProxies = await this.proxyScraper.scrapeAll();
            } else {
                newProxies = await this.proxyScraper.quickScrape();
            }
            
            // Add scraped proxies to proxy manager
            let addedCount = 0;
            for (const proxy of newProxies) {
                try {
                    this.proxyManager.addProxy(proxy);
                    addedCount++;
                } catch (error) {
                    // Skip invalid proxies
                }
            }
            
            console.log(`🎯 Đã thêm ${addedCount} proxy mới từ việc đào tự động`.green);
            return addedCount;
            
        } catch (error) {
            console.log(`❌ Lỗi đào proxy: ${error.message}`.red);
            return 0;
        }
    }

    cleanup() {
        for (const [botId, botInfo] of this.bots) {
            if (botInfo.status === 'connected') {
                this.disconnectBot(botId);
            }
        }
        this.bots.clear();
        logger.info('All bots cleaned up');
    }
}

module.exports = BotManager;