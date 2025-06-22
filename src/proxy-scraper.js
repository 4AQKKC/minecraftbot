const https = require('https');
const http = require('http');
const logger = require('./logger');

/**
 * ProxyScraper - Tự động thu thập proxy từ các nguồn công khai
 */
class ProxyScraper {
    constructor() {
        this.scrapeSources = [
            {
                name: 'ProxyList',
                url: 'https://api.proxyscrape.com/v2/?request=getproxies&protocol=socks5&timeout=10000&country=all&ssl=all&anonymity=all',
                format: 'txt'
            },
            {
                name: 'FreeProxyList',
                url: 'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=all',
                format: 'txt'
            },
            {
                name: 'ProxyListPlus',
                url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/socks5.txt',
                format: 'txt'
            },
            {
                name: 'HTTPProxies',
                url: 'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
                format: 'txt'
            }
        ];
        this.scrapedProxies = new Set();
    }

    /**
     * Fetch proxy list from URL
     */
    async fetchProxyList(source) {
        return new Promise((resolve, reject) => {
            const client = source.url.startsWith('https') ? https : http;
            
            const req = client.get(source.url, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    resolve(data);
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.setTimeout(10000, () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
        });
    }

    /**
     * Parse proxy list from text format
     */
    parseProxyList(data, protocol = 'socks5') {
        const proxies = [];
        const lines = data.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && trimmed.includes(':')) {
                const [ip, port] = trimmed.split(':');
                if (ip && port && !isNaN(parseInt(port))) {
                    const proxyUrl = `${protocol}://${ip}:${port}`;
                    proxies.push(proxyUrl);
                    this.scrapedProxies.add(proxyUrl);
                }
            }
        }
        
        return proxies;
    }

    /**
     * Scrape proxies from all sources
     */
    async scrapeAll() {
        console.log('🕸️ Bắt đầu tự động đào proxy từ các nguồn công khai...'.cyan);
        const allProxies = [];
        let successCount = 0;

        for (const source of this.scrapeSources) {
            try {
                console.log(`📡 Đang đào proxy từ ${source.name}...`.gray);
                const data = await this.fetchProxyList(source);
                
                let protocol = 'socks5';
                if (source.url.includes('protocol=http')) {
                    protocol = 'http';
                } else if (source.name.includes('HTTP')) {
                    protocol = 'http';
                }
                
                const proxies = this.parseProxyList(data, protocol);
                allProxies.push(...proxies);
                successCount++;
                
                console.log(`✅ ${source.name}: Tìm thấy ${proxies.length} proxy`.green);
                
                // Delay giữa các request
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.log(`❌ Lỗi đào proxy từ ${source.name}: ${error.message}`.red);
            }
        }

        // Remove duplicates
        const uniqueProxies = [...new Set(allProxies)];
        
        console.log(`🎯 Hoàn tất đào proxy: ${uniqueProxies.length} proxy từ ${successCount}/${this.scrapeSources.length} nguồn`.green.bold);
        
        return uniqueProxies;
    }

    /**
     * Quick scrape from fastest sources
     */
    async quickScrape() {
        console.log('⚡ Đào proxy nhanh từ nguồn đáng tin cậy...'.cyan);
        
        try {
            const source = this.scrapeSources[0]; // ProxyList API
            const data = await this.fetchProxyList(source);
            const proxies = this.parseProxyList(data, 'socks5');
            
            console.log(`⚡ Quick scrape: Tìm thấy ${proxies.length} SOCKS5 proxy`.green);
            return proxies;
            
        } catch (error) {
            console.log(`❌ Quick scrape thất bại: ${error.message}`.red);
            return [];
        }
    }

    /**
     * Get scraped proxy statistics
     */
    getStats() {
        return {
            totalScraped: this.scrapedProxies.size,
            sources: this.scrapeSources.length,
            lastScrapeTime: this.lastScrapeTime || null
        };
    }
}

module.exports = ProxyScraper;