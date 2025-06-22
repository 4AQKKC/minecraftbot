const MinecraftBot = require('./bot');
const logger = require('./logger');
const ProxyManager = require('./proxy-manager');
const os = require('os');

class BotManager {
    constructor() {
        this.bots = new Map();
        this.nextBotId = 1;
        this.proxyManager = new ProxyManager();
        this.proxyManager.initializeDefaultProxies();
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
    async createBot(config = {}) {
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
     * Connect all bots to same server with delays
     */
    async connectAllBots(host, port = 25565, delayMs = 2000) {
        const bots = Array.from(this.bots.values());
        let successCount = 0;
        
        console.log(`Starting mass connection: ${bots.length} bots to ${host}:${port}...`.yellow);
        
        for (let i = 0; i < bots.length; i++) {
            const botInfo = bots[i];
            
            try {
                console.log(`[${i+1}/${bots.length}] Connecting ${botInfo.name}...`.cyan);
                await this.connectBot(botInfo.id, host, port);
                successCount++;
                console.log(`✓ ${botInfo.name} connected successfully`.green);
                
                // Add delay between connections to avoid rate limiting
                if (i < bots.length - 1) {
                    console.log(`Waiting ${delayMs}ms before next connection...`.gray);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
            } catch (error) {
                console.log(`✗ ${botInfo.name} failed: ${error.message}`.red);
            }
        }
        
        console.log(`Mass connection completed: ${successCount}/${bots.length} bots connected`.cyan);
        return successCount;
    }

    /**
     * Connect bots in parallel groups to improve speed
     */
    async connectAllBotsParallel(host, port = 25565, groupSize = 3, delayBetweenGroups = 5000) {
        const bots = Array.from(this.bots.values());
        let successCount = 0;
        
        console.log(`Starting parallel mass connection: ${bots.length} bots in groups of ${groupSize}...`.yellow);
        
        for (let i = 0; i < bots.length; i += groupSize) {
            const group = bots.slice(i, i + groupSize);
            const groupNumber = Math.floor(i / groupSize) + 1;
            const totalGroups = Math.ceil(bots.length / groupSize);
            
            console.log(`[Group ${groupNumber}/${totalGroups}] Connecting ${group.length} bots...`.cyan);
            
            // Connect bots in current group in parallel
            const promises = group.map(async (botInfo) => {
                try {
                    await this.connectBot(botInfo.id, host, port);
                    console.log(`✓ ${botInfo.name} connected`.green);
                    return true;
                } catch (error) {
                    console.log(`✗ ${botInfo.name} failed: ${error.message}`.red);
                    return false;
                }
            });
            
            const results = await Promise.allSettled(promises);
            const groupSuccessCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
            successCount += groupSuccessCount;
            
            console.log(`Group ${groupNumber} completed: ${groupSuccessCount}/${group.length} connected`.cyan);
            
            // Delay between groups to avoid overwhelming the server
            if (i + groupSize < bots.length) {
                console.log(`Waiting ${delayBetweenGroups}ms before next group...`.gray);
                await new Promise(resolve => setTimeout(resolve, delayBetweenGroups));
            }
        }
        
        console.log(`Parallel mass connection completed: ${successCount}/${bots.length} bots connected`.cyan);
        return successCount;
    }

    /**
     * Send chat message to all connected bots
     */
    chatAll(message) {
        let sentCount = 0;
        
        for (const [botId, botInfo] of this.bots) {
            if (botInfo.status === 'connected' && botInfo.bot.isConnected) {
                try {
                    botInfo.bot.chat(message);
                    sentCount++;
                } catch (error) {
                    logger.error('Failed to send chat from bot', { botId, error: error.message });
                }
            }
        }
        
        logger.info('Chat sent to all bots', { message, sentCount });
        return sentCount;
    }

    /**
     * Spam chat messages from all connected bots with intervals
     */
    async spamAllBots(message, count, delayMs = 500) {
        const connectedBots = Array.from(this.bots.values()).filter(
            botInfo => botInfo.status === 'connected' && botInfo.bot.isConnected
        );
        
        if (connectedBots.length === 0) {
            throw new Error('Không có bot nào đang kết nối để spam');
        }
        
        console.log(`Bắt đầu spam từ ${connectedBots.length} bot...`.cyan);
        
        for (let i = 0; i < count; i++) {
            const sentCount = this.chatAll(message);
            console.log(`[${i + 1}/${count}] Gửi từ ${sentCount} bot: "${message}"`.green);
            
            if (i < count - 1) {
                await new Promise(resolve => setTimeout(resolve, delayMs));
            }
        }
        
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