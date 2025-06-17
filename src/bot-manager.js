const MinecraftBot = require('./bot');
const logger = require('./logger');
const os = require('os');

class BotManager {
    constructor() {
        this.bots = new Map();
        this.nextBotId = 1;
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

        const bot = new MinecraftBot(botConfig);
        
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
     * Get list of all bots
     */
    listBots() {
        const botList = [];
        
        for (const [botId, botInfo] of this.bots) {
            const connectionDuration = botInfo.connectionTime ? 
                Math.floor((Date.now() - botInfo.connectionTime.getTime()) / 1000) : 0;
            
            botList.push({
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