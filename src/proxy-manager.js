const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const logger = require('./logger');

class ProxyManager {
    constructor() {
        this.proxies = [];
        this.currentProxyIndex = 0;
        this.proxyRotationEnabled = false;
        this.botProxyMap = new Map(); // Track which bot uses which proxy
        this.bannedProxies = new Set();
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
            'http://91.107.68.25:8080',
            
            // More reliable public proxies
            'socks5://178.128.180.254:7497',
            'socks5://159.65.245.126:7497',
            'socks5://165.22.109.73:33471',
            'socks5://167.172.178.193:33471',
            'socks5://206.189.118.100:26365',
            'socks5://159.89.163.128:59166',
            'socks5://165.22.38.149:27633',
            'socks5://167.172.102.133:54628',
            'socks5://138.68.109.12:18881',
            'socks5://165.22.204.32:59166',
            
            // Free SOCKS5 proxies from proxylist.geonode.com
            'socks5://8.213.128.90:5678',
            'socks5://103.16.199.166:59166',
            'socks5://198.8.94.174:39078',
            'socks5://72.195.34.35:27360',
            'socks5://72.195.34.41:4145',
            'socks5://72.195.34.42:4145',
            'socks5://72.195.34.58:4145',
            'socks5://67.201.33.10:25283',
            'socks5://184.178.172.26:4145',
            'socks5://184.178.172.28:15294',
            
            // International HTTP proxies
            'http://194.67.91.153:80',
            'http://195.154.67.61:3128',
            'http://47.91.45.235:80',
            'http://47.254.47.61:80',
            'http://103.152.112.145:80',
            'http://103.118.46.174:8080',
            'http://45.167.124.193:9991',
            'http://181.65.200.53:8080',
            'http://190.95.156.114:8080',
            'http://103.148.39.50:83',
            
            // Elite anonymous proxies
            'socks5://51.91.148.19:23398',
            'socks5://149.202.84.133:59166',
            'socks5://54.38.134.219:12678',
            'socks5://51.68.50.41:59166',
            'socks5://51.68.189.255:1080',
            'socks5://188.165.230.195:7890',
            'socks5://185.32.6.129:59166',
            'socks5://37.187.153.227:53347',
            'socks5://51.83.78.141:59166',
            'socks5://149.202.84.133:59166',
            
            // Asian region proxies  
            'socks5://103.149.53.120:59166',
            'socks5://123.57.236.96:10000',
            'socks5://47.109.52.147:80',
            'socks5://121.37.201.60:1080',
            'socks5://47.109.52.147:8080',
            'http://47.243.95.228:10080',
            'http://47.243.50.83:8080',
            'http://103.152.112.234:80',
            'http://182.72.203.243:80',
            'http://47.74.152.29:8888',
            
            // Datacenter proxies
            'socks5://198.199.101.192:18879',
            'socks5://198.199.101.121:13613',
            'socks5://206.189.117.108:59166',
            'socks5://159.65.225.8:11949',
            'socks5://167.71.205.1:7307',
            'socks5://134.195.101.34:59166',
            'socks5://192.252.209.155:14455',
            'socks5://192.252.214.20:15864',
            'socks5://192.252.215.5:16137',
            'socks5://24.249.199.12:4145'
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
     * Get dedicated proxy for specific bot (one proxy per account) - tránh ban hàng loạt
     */
    getDedicatedProxy(botId) {
        if (!this.proxyRotationEnabled || this.proxies.length === 0) {
            return null;
        }
        
        // If bot already has a dedicated proxy, check if it's still valid
        if (this.botProxyMap.has(botId)) {
            const existingProxy = this.botProxyMap.get(botId);
            // Check if proxy is banned or deleted
            if (!this.bannedProxies.has(existingProxy) && this.proxies.includes(existingProxy)) {
                return existingProxy;
            } else {
                // Proxy was banned or deleted, remove mapping
                this.botProxyMap.delete(botId);
                console.log(`🔄 Bot ${botId} cần proxy mới - proxy cũ bị ban/xóa`.yellow);
            }
        }
        
        // Find unused proxy for this bot - tránh trùng lặp để tối đa hóa phân tán
        const usedProxies = new Set(this.botProxyMap.values());
        const availableProxies = this.proxies.filter(proxy => 
            !usedProxies.has(proxy) && !this.bannedProxies.has(proxy)
        );
        
        if (availableProxies.length === 0) {
            // Nếu không còn proxy trống, dùng proxy ít được sử dụng nhất
            const proxyUsage = new Map();
            for (const proxy of this.proxies) {
                if (!this.bannedProxies.has(proxy)) {
                    proxyUsage.set(proxy, 0);
                }
            }
            
            for (const assignedProxy of this.botProxyMap.values()) {
                if (proxyUsage.has(assignedProxy)) {
                    proxyUsage.set(assignedProxy, proxyUsage.get(assignedProxy) + 1);
                }
            }
            
            if (proxyUsage.size === 0) {
                console.log(`⚠️ Không còn proxy khả dụng cho bot ${botId}!`.red);
                return null;
            }
            
            // Chọn proxy ít được dùng nhất
            const leastUsedProxy = [...proxyUsage.entries()]
                .sort((a, b) => a[1] - b[1])[0][0];
            
            this.botProxyMap.set(botId, leastUsedProxy);
            console.log(`🔗 Bot ${botId} dùng chung proxy (ít dùng nhất): ${leastUsedProxy}`.yellow);
            return leastUsedProxy;
        }
        
        // Chọn ngẫu nhiên từ danh sách proxy khả dụng để phân tán tốt hơn
        const randomIndex = Math.floor(Math.random() * availableProxies.length);
        const selectedProxy = availableProxies[randomIndex];
        
        // Assign dedicated proxy to this bot
        this.botProxyMap.set(botId, selectedProxy);
        console.log(`🔗 Bot ${botId} được gán proxy riêng: ${selectedProxy}`.cyan);
        return selectedProxy;
    }

    /**
     * Get next proxy in rotation with failure handling (fallback method)
     */
    getNextProxy(excludeBanned = true) {
        if (!this.proxyRotationEnabled || this.proxies.length === 0) {
            return null;
        }
        
        if (this.proxies.length === 0) {
            console.log('⚠️ Không còn proxy khả dụng!'.red);
            return null;
        }
        
        // Get next proxy in rotation
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
        const selectedProxy = this.proxies[this.currentProxyIndex];
        
        return selectedProxy;
    }
    
    /**
     * Mark proxy as banned and permanently remove it
     */
    markProxyAsBanned(proxyUrl) {
        // Remove proxy completely instead of just marking as banned
        this.removeProxy(proxyUrl);
        console.log(`🗑️ Proxy bị ban IP - ĐÃ XÓA VĨNH VIỄN: ${proxyUrl}`.red.bold);
        console.log(`📊 Còn lại ${this.proxies.length} proxy khả dụng`.yellow);
        
        // Remove from bot assignments
        for (const [botId, assignedProxy] of this.botProxyMap.entries()) {
            if (assignedProxy === proxyUrl) {
                this.botProxyMap.delete(botId);
                console.log(`🔄 Bot ${botId} sẽ được gán proxy mới do proxy cũ bị xóa`.blue);
            }
        }
        
        return null;
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
            assignedProxies: this.botProxyMap.size,
            availableProxies: this.proxies.length - this.botProxyMap.size,
            currentProxy: this.proxies[this.currentProxyIndex] || 'None',
            rotationEnabled: this.proxyRotationEnabled,
            oneProxyPerBot: true
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