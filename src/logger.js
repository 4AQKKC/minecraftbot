const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let log = `${timestamp} ${level}: ${message}`;
        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
        }
        return log;
    })
);

// Custom format for file output
const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: fileFormat,
    transports: [
        // File transport for all logs
        new winston.transports.File({
            filename: path.join(logsDir, 'bot.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            tailable: true
        }),
        
        // File transport for errors only
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 3,
            tailable: true
        })
    ],
    
    // Handle uncaught exceptions
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'exceptions.log')
        })
    ],
    
    // Handle unhandled promise rejections
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(logsDir, 'rejections.log')
        })
    ]
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat,
        level: 'debug'
    }));
}

// Custom logging methods for specific bot events
logger.botEvent = (event, data) => {
    logger.info(`[BOT_EVENT] ${event}`, data);
};

logger.chatLog = (username, message, type = 'chat') => {
    logger.info(`[${type.toUpperCase()}] ${username}: ${message}`);
};

logger.connectionLog = (event, details) => {
    logger.info(`[CONNECTION] ${event}`, details);
};

logger.errorLog = (context, error, additionalData = {}) => {
    logger.error(`[${context}] ${error.message}`, {
        error: {
            message: error.message,
            stack: error.stack,
            name: error.name
        },
        ...additionalData
    });
};

// Stream for writing access logs
logger.stream = {
    write: (message) => {
        logger.info(message.trim());
    }
};

module.exports = logger;
