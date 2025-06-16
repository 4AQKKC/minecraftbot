const logger = require('./logger');

class AuthManager {
    constructor() {
        this.authTypes = {
            offline: 'offline',
            microsoft: 'microsoft',
            mojang: 'mojang'
        };
    }

    /**
     * Validate authentication configuration
     * @param {Object} config - Bot configuration
     * @returns {Object} Validated auth config
     */
    validateAuthConfig(config) {
        const authConfig = {
            auth: config.auth || 'offline',
            username: config.username,
            password: config.password
        };

        // Validate auth type
        if (!Object.values(this.authTypes).includes(authConfig.auth)) {
            logger.warn(`Invalid auth type: ${authConfig.auth}. Defaulting to offline.`);
            authConfig.auth = 'offline';
        }

        // Check username requirements
        if (!authConfig.username) {
            throw new Error('Username is required');
        }

        // Validate username format for offline mode
        if (authConfig.auth === 'offline') {
            if (authConfig.username.length < 3 || authConfig.username.length > 16) {
                throw new Error('Offline username must be between 3 and 16 characters');
            }
            
            if (!/^[a-zA-Z0-9_]+$/.test(authConfig.username)) {
                throw new Error('Offline username can only contain letters, numbers, and underscores');
            }
        }

        // Check password requirements for online modes
        if (authConfig.auth !== 'offline') {
            if (!authConfig.password) {
                throw new Error(`Password is required for ${authConfig.auth} authentication`);
            }
        }

        logger.info('Authentication configuration validated', {
            auth: authConfig.auth,
            username: authConfig.username,
            hasPassword: !!authConfig.password
        });

        return authConfig;
    }

    /**
     * Get authentication options for mineflayer
     * @param {Object} config - Bot configuration
     * @returns {Object} Auth options for mineflayer
     */
    getAuthOptions(config) {
        const authConfig = this.validateAuthConfig(config);
        
        const options = {
            username: authConfig.username,
            auth: authConfig.auth
        };

        // Add password for online authentication
        if (authConfig.auth !== 'offline' && authConfig.password) {
            options.password = authConfig.password;
        }

        // Add additional options based on auth type
        switch (authConfig.auth) {
            case 'microsoft':
                options.authTitle = 'Microsoft';
                break;
            case 'mojang':
                options.authTitle = 'Mojang';
                break;
            case 'offline':
            default:
                // No additional options needed for offline mode
                break;
        }

        return options;
    }

    /**
     * Handle authentication errors
     * @param {Error} error - Authentication error
     * @returns {string} User-friendly error message
     */
    handleAuthError(error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('invalid username or password')) {
            return 'Invalid username or password. Please check your credentials.';
        }
        
        if (errorMessage.includes('invalid session')) {
            return 'Invalid session. Please try logging in again.';
        }
        
        if (errorMessage.includes('account migrated')) {
            return 'This account has been migrated to Microsoft. Please use Microsoft authentication.';
        }
        
        if (errorMessage.includes('rate limit')) {
            return 'Rate limited. Please wait a few minutes before trying again.';
        }
        
        if (errorMessage.includes('connection timed out')) {
            return 'Connection timed out. Please check your internet connection.';
        }
        
        if (errorMessage.includes('enotfound') || errorMessage.includes('dns')) {
            return 'Could not resolve authentication server. Please check your internet connection.';
        }

        // Log the original error for debugging
        logger.errorLog('AUTH_ERROR', error);
        
        return `Authentication failed: ${error.message}`;
    }

    /**
     * Test authentication without connecting to a server
     * @param {Object} config - Bot configuration
     * @returns {Promise<boolean>} Success status
     */
    async testAuthentication(config) {
        try {
            const authConfig = this.validateAuthConfig(config);
            
            if (authConfig.auth === 'offline') {
                // Offline mode doesn't require actual authentication
                logger.info('Offline authentication test passed');
                return true;
            }

            // For online modes, we would need to make a test request to Mojang/Microsoft APIs
            // This is a simplified version - in production, you might want to implement actual API calls
            logger.info('Online authentication test - credentials format validated');
            return true;

        } catch (error) {
            logger.errorLog('AUTH_TEST', error);
            throw new Error(this.handleAuthError(error));
        }
    }

    /**
     * Get authentication status information
     * @param {Object} config - Bot configuration
     * @returns {Object} Auth status info
     */
    getAuthStatus(config) {
        try {
            const authConfig = this.validateAuthConfig(config);
            
            return {
                type: authConfig.auth,
                username: authConfig.username,
                hasPassword: !!authConfig.password,
                valid: true,
                message: `Ready to authenticate with ${authConfig.auth} mode`
            };
        } catch (error) {
            return {
                type: config.auth || 'unknown',
                username: config.username || 'unknown',
                hasPassword: !!config.password,
                valid: false,
                message: error.message
            };
        }
    }
}

module.exports = new AuthManager();
