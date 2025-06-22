require('dotenv').config();

// Function to generate random username with letters and numbers
function generateRandomUsername() {
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

module.exports = {
    // Minecraft account credentials
    username: process.env.MC_USERNAME || generateRandomUsername(),
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
    
    // Auto-login settings
    autoLogin: process.env.AUTO_LOGIN === 'true', // Changed default to false
    loginPassword: process.env.LOGIN_PASSWORD || 'botminecraft',
    loginDelay: parseInt(process.env.LOGIN_DELAY) || 5000, // 5 seconds after spawn
    registerFormat: process.env.REGISTER_FORMAT || 'single', // 'single' or 'double'
    
    // Client verification settings
    bypassVerification: process.env.BYPASS_VERIFICATION !== 'false',
    hidePluginChannels: process.env.HIDE_PLUGIN_CHANNELS !== 'false',
    customBrand: process.env.CUSTOM_BRAND || 'vanilla',
    protocolVersion: process.env.PROTOCOL_VERSION || null,
    
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
    pathfindingTimeout: parseInt(process.env.PATHFINDING_TIMEOUT) || 10000,
    
    // Connection throttling settings
    connectionDelay: parseInt(process.env.CONNECTION_DELAY) || 5000, // 5 seconds between connections
    maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
    retryDelay: parseInt(process.env.RETRY_DELAY) || 10000, // 10 seconds between retries
    throttleDelay: parseInt(process.env.THROTTLE_DELAY) || 30000, // 30 seconds if throttled
    
    // Display settings
    hideHealthMessages: process.env.HIDE_HEALTH_MESSAGES === 'true',
    hideDeathMessages: process.env.HIDE_DEATH_MESSAGES === 'true',
    hideDamageMessages: process.env.HIDE_DAMAGE_MESSAGES === 'true',
    hideServerMessages: process.env.HIDE_SERVER_MESSAGES === 'true',
    hideDebugChat: process.env.HIDE_DEBUG_CHAT === 'true'
};
