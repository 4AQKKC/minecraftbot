const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const logger = require('./logger');

class ProxyManager {
    constructor() {
        this.proxies = [];
        this.currentProxyIndex = 0;
        this.proxyRotationEnabled = false;
    }

    /**
     * Add Cloudflare WARP endpoints and other proxies
     */
    initializeDefaultProxies() {
        // Cloudflare WARP endpoints (free proxy service)
        const cloudflareProxies = [
            'socks5://162.159.36.1:32768',
            'socks5://162.159.46.1:32768', 
            'socks5://162.159.192.1:32768',
            'socks5://162.159.195.1:32768'
        ];

        // Public HTTP/HTTPS proxies (you can add more)
        const httpProxies = [
            'http://proxy1.example.com:8080',
            'http://proxy2.example.com:3128'
        ];

        this.proxies = [...cloudflareProxies, ...httpProxies];
        this.proxyRotationEnabled = this.proxies.length > 0;

        logger.info('Proxy manager initialized', { 
            proxyCount: this.proxies.length,
            rotationEnabled: this.proxyRotationEnabled 
        });
    }

    /**
     * Add custom proxy
     */
    addProxy(proxyUrl) {
        if (!this.isValidProxy(proxyUrl)) {
            throw new Error('Invalid proxy URL format');
        }

        this.proxies.push(proxyUrl);
        this.proxyRotationEnabled = true;
        
        logger.info('Proxy added', { proxyUrl, totalProxies: this.proxies.length });
    }

    /**
     * Remove proxy
     */
    removeProxy(proxyUrl) {
        const index = this.proxies.indexOf(proxyUrl);
        if (index > -1) {
            this.proxies.splice(index, 1);
            if (this.currentProxyIndex >= this.proxies.length) {
                this.currentProxyIndex = 0;
            }
            this.proxyRotationEnabled = this.proxies.length > 0;
            
            logger.info('Proxy removed', { proxyUrl, totalProxies: this.proxies.length });
        }
    }

    /**
     * Get next proxy in rotation
     */
    getNextProxy() {
        if (!this.proxyRotationEnabled || this.proxies.length === 0) {
            return null;
        }

        const proxy = this.proxies[this.currentProxyIndex];
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
        
        return proxy;
    }

    /**
     * Get proxy agent for mineflayer
     */
    getProxyAgent(proxyUrl) {
        if (!proxyUrl) return null;

        try {
            if (proxyUrl.startsWith('socks4://') || proxyUrl.startsWith('socks5://')) {
                return new SocksProxyAgent(proxyUrl);
            } else if (proxyUrl.startsWith('http://') || proxyUrl.startsWith('https://')) {
                return new HttpsProxyAgent(proxyUrl);
            } else {
                throw new Error('Unsupported proxy protocol');
            }
        } catch (error) {
            logger.error('Failed to create proxy agent', { proxyUrl, error: error.message });
            return null;
        }
    }

    /**
     * Test proxy connectivity
     */
    async testProxy(proxyUrl) {
        try {
            const agent = this.getProxyAgent(proxyUrl);
            if (!agent) return false;

            // Simple connectivity test (you can enhance this)
            const axios = require('axios');
            const response = await axios.get('http://httpbin.org/ip', {
                httpAgent: agent,
                httpsAgent: agent,
                timeout: 10000
            });

            logger.info('Proxy test successful', { 
                proxyUrl, 
                responseIP: response.data.origin 
            });
            return true;
        } catch (error) {
            logger.warn('Proxy test failed', { 
                proxyUrl, 
                error: error.message 
            });
            return false;
        }
    }

    /**
     * Validate proxy URL format
     */
    isValidProxy(proxyUrl) {
        const proxyRegex = /^(socks[45]?|https?):\/\/([^:]+:\d+|[^:]+)$/;
        return proxyRegex.test(proxyUrl);
    }

    /**
     * Get proxy statistics
     */
    getStats() {
        return {
            totalProxies: this.proxies.length,
            currentIndex: this.currentProxyIndex,
            rotationEnabled: this.proxyRotationEnabled,
            proxies: this.proxies.map((proxy, index) => ({
                url: proxy,
                active: index === this.currentProxyIndex
            }))
        };
    }

    /**
     * Enable/disable proxy rotation
     */
    setRotationEnabled(enabled) {
        this.proxyRotationEnabled = enabled && this.proxies.length > 0;
        logger.info('Proxy rotation status changed', { enabled: this.proxyRotationEnabled });
    }

    /**
     * Clear all proxies
     */
    clearProxies() {
        this.proxies = [];
        this.currentProxyIndex = 0;
        this.proxyRotationEnabled = false;
        logger.info('All proxies cleared');
    }

    /**
     * Get working proxies by testing them
     */
    async getWorkingProxies() {
        const workingProxies = [];
        
        for (const proxy of this.proxies) {
            const isWorking = await this.testProxy(proxy);
            if (isWorking) {
                workingProxies.push(proxy);
            }
        }

        logger.info('Proxy health check completed', { 
            total: this.proxies.length, 
            working: workingProxies.length 
        });
        
        return workingProxies;
    }
}

module.exports = ProxyManager;