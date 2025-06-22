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
        // Comprehensive proxy list from multiple sources
        const proxies = [
            // Cloudflare WARP endpoints
            'socks5://162.159.192.1:32768',
            'socks5://162.159.195.1:32768',
            'socks5://162.159.193.1:32768',
            'socks5://162.159.194.1:32768',
            
            // Public SOCKS5 proxies (reliable sources)
            'socks5://51.79.251.116:59166',
            'socks5://184.178.172.18:15280',
            'socks5://72.195.34.59:4145',
            'socks5://72.195.34.60:27391',
            'socks5://184.178.172.17:4145',
            'socks5://184.178.172.14:4145',
            'socks5://192.252.220.92:17328',
            'socks5://192.252.208.70:14282',
            'socks5://98.162.25.7:31653',
            'socks5://98.162.25.4:31654',
            'socks5://98.162.25.16:4145',
            'socks5://98.162.25.23:4145',
            'socks5://72.210.252.134:46164',
            'socks5://72.210.252.137:4145',
            
            // HTTP/HTTPS proxies
            'http://103.152.112.162:80',
            'http://103.118.46.61:8080',
            'http://103.139.242.135:8080',
            'http://103.148.39.38:83',
            'http://154.236.168.179:1976',
            'http://154.236.179.233:1976',
            'http://154.236.189.26:8080',
            'http://154.26.134.214:80',
            'http://185.105.102.179:80',
            'http://185.105.102.189:80',
            
            // Asia Pacific proxies
            'socks5://103.127.204.114:23914',
            'socks5://103.127.204.113:25327',
            'socks5://103.127.204.115:28195',
            'socks5://45.249.48.201:4153',
            'socks5://103.38.205.3:5678',
            'socks5://103.38.205.10:5678',
            
            // European proxies
            'socks5://51.77.211.89:37301',
            'socks5://51.77.211.89:45262',
            'socks5://176.31.182.123:59166',
            'socks5://185.32.6.129:59166',
            'socks5://188.165.45.156:40278',
            
            // US-based proxies
            'socks5://142.54.235.9:4145',
            'socks5://142.54.226.214:4145',
            'socks5://142.54.231.38:4145',
            'socks5://199.229.254.129:4145',
            'socks5://199.102.104.70:4145',
            'socks5://199.102.106.94:4145',
            
            // Additional HTTP proxies
            'http://20.206.106.192:80',
            'http://23.94.25.198:18080',
            'http://43.134.68.153:3128',
            'http://47.88.3.19:8080',
            'http://82.223.102.92:9443',
            'http://91.107.68.25:8080'
        ];

        this.proxies = proxies;
        this.bannedProxies = new Set();
        this.proxyRotationEnabled = this.proxies.length > 0;

        logger.info('Proxy manager initialized', { 
            proxyCount: this.proxies.length,
            rotationEnabled: this.proxyRotationEnabled 
        });
        
        console.log(`🌐 Đã khởi tạo ${this.proxies.length} proxy từ nhiều nguồn khác nhau`.green);
        console.log(`🔄 Tự động chuyển đổi proxy khi gặp lỗi ban IP`.cyan);
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
     * Get next proxy in rotation with failure handling
     */
    getNextProxy(excludeBanned = true) {
        if (!this.proxyRotationEnabled || this.proxies.length === 0) {
            return null;
        }
        
        let attempts = 0;
        let proxy;
        
        do {
            proxy = this.proxies[this.currentProxyIndex];
            this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
            attempts++;
            
            if (attempts >= this.proxies.length) {
                break;
            }
        } while (excludeBanned && this.bannedProxies && this.bannedProxies.has(proxy));
        
        return proxy;
    }
    
    /**
     * Mark proxy as banned and get alternative
     */
    markProxyAsBanned(proxyUrl) {
        if (!this.bannedProxies) {
            this.bannedProxies = new Set();
        }
        
        this.bannedProxies.add(proxyUrl);
        console.log(`🚫 Proxy ${proxyUrl} đã bị đánh dấu là banned`.red);
        
        const nextProxy = this.getNextProxy(true);
        if (nextProxy) {
            console.log(`🔄 Chuyển sang proxy khác: ${nextProxy}`.cyan);
            return nextProxy;
        } else {
            console.log(`⚠️ Tất cả proxy đã bị ban - sử dụng kết nối trực tiếp`.yellow);
            return null;
        }
    }
    
    /**
     * Reset banned proxy list
     */
    resetBannedProxies() {
        this.bannedProxies = new Set();
        console.log(`🔄 Đã reset danh sách proxy bị ban`.green);
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