require('dotenv').config();

module.exports = {
    // Minecraft account credentials
    username: process.env.MC_USERNAME || 'MinecraftBot',
    password: process.env.MC_PASSWORD,
    
    // Server connection settings
    host: process.env.MC_HOST || 'localhost',
    port: parseInt(process.env.MC_PORT) || 25565,
    version: process.env.MC_VERSION || '1.21',
    
    // Bot behavior settings
    autoRespawn: process.env.AUTO_RESPAWN !== 'false',
    antiKick: process.env.ANTI_KICK !== 'false',
    chatDelay: parseInt(process.env.CHAT_DELAY) || 1000,
    moveTimeout: parseInt(process.env.MOVE_TIMEOUT) || 10000,
    
    // Authentication settings
    auth: process.env.MC_AUTH || 'offline', // 'microsoft', 'mojang', or 'offline'
    
    // Logging settings
    logLevel: process.env.LOG_LEVEL || 'info',
    logFile: process.env.LOG_FILE || 'bot.log',
    
    // Anti-kick settings
    antiKickInterval: parseInt(process.env.ANTI_KICK_INTERVAL) || 30000, // 30 seconds
    
    // Follow settings
    followDistance: parseFloat(process.env.FOLLOW_DISTANCE) || 3.0,
    
    // Pathfinding settings
    pathfindingTimeout: parseInt(process.env.PATHFINDING_TIMEOUT) || 10000
};
