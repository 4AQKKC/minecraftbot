require('dotenv').config();

// Function to generate random username
function generateRandomUsername() {
    const adjectives = ['Quick', 'Smart', 'Fast', 'Cool', 'Super', 'Mega', 'Ultra', 'Pro', 'Epic', 'Swift'];
    const nouns = ['Player', 'Gamer', 'Bot', 'Hero', 'Ninja', 'Master', 'King', 'Lord', 'Scout', 'Hunter'];
    const numbers = Math.floor(Math.random() * 999) + 1;
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adjective}${noun}${numbers}`;
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
    autoLogin: process.env.AUTO_LOGIN !== 'false',
    loginPassword: process.env.LOGIN_PASSWORD || 'botminecraft',
    loginDelay: parseInt(process.env.LOGIN_DELAY) || 3000, // 3 seconds after spawn
    
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
