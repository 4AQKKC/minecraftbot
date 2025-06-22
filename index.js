const readline = require('readline');
const colors = require('colors');
const Bot = require('./src/bot');
const BotManager = require('./src/bot-manager');
const logger = require('./src/logger');
const config = require('./config/bot-config');

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'MinecraftBot> '.cyan
});

let bot = null;
let isConnected = false;
const botManager = new BotManager();

// Display welcome message
console.log('='.repeat(50).green);
console.log('  Bộ Điều Khiển Bot Minecraft v1.0'.green.bold);
console.log('='.repeat(50).green);
console.log('Gõ "help" để xem các lệnh có sẵn\n'.yellow);

// Command handlers
const commands = {
    help: () => {
        console.log('\nCác lệnh có sẵn:'.cyan.bold);
        console.log('  connect <host> [port] - Kết nối đến server Minecraft'.white);
        console.log('  disconnect - Ngắt kết nối khỏi server'.white);
        console.log('  chat <tin nhắn> - Gửi tin nhắn chat'.white);
        console.log('  move <hướng> <khoảng cách> - Di chuyển bot (forward/back/left/right)'.white);
        console.log('  jump - Làm bot nhảy'.white);
        console.log('  look <x> <y> - Nhìn theo hướng (pitch, yaw)'.white);
        console.log('  follow <người chơi> - Theo dõi một người chơi'.white);
        console.log('  stop - Dừng hành động hiện tại'.white);
        console.log('  status - Hiển thị trạng thái kết nối'.white);
        console.log('  config - Hiển thị cấu hình hiện tại'.white);
        console.log('  login - Gửi lệnh đăng ký + đăng nhập thủ công'.white);
        console.log('  autologin <on/off> - Bật/tắt tự động đăng nhập'.white);
        console.log('  hidemessages <on/off> - Ẩn/hiện thông báo damage/death'.white);
        console.log('  hidechat <on/off> - Ẩn/hiện debug chat và server messages'.white);
        console.log('  setpassword <mật khẩu> - Đổi mật khẩu đăng nhập cho tất cả bot'.white);
        console.log('  setregformat <single/double> - Đổi format lệnh /register'.white);
        console.log('  status - Xem trạng thái và log lỗi gần đây'.white);
        console.log('');
        console.log('  Test Servers:'.cyan.bold);
        console.log('  testlocal - Thử kết nối localhost:25565'.white);
        console.log('  testhypixel - Thử kết nối mc.hypixel.net'.white);
        console.log('  testminehut - Thử kết nối minehut.com'.white);
        console.log('');
        console.log('  Lệnh Đa Bot:'.cyan.bold);
        console.log('  create <số lượng> - Tạo nhiều bot'.white);
        console.log('  connect <số> <host> [port] - Kết nối bot cụ thể theo số'.white);
        console.log('  disconnect <số> - Ngắt kết nối bot cụ thể theo số'.white);
        console.log('  chat <số> <tin nhắn> - Gửi tin nhắn từ bot cụ thể'.white);
        console.log('  remove <số> - Xóa bot cụ thể theo số'.white);
        console.log('  connectall <host> [port] - Kết nối tất cả bot (tuần tự)'.white);
        console.log('  connectfast <host> [port] - Kết nối tất cả bot (song song, chống spam)'.white);
        console.log('  list - Hiển thị trạng thái tất cả bot với số'.white);
        console.log('  chatall <tin nhắn> - Gửi tin nhắn từ tất cả bot'.white);
        console.log('  spamall <tin nhắn> <số lần> [delay_ms] - Spam tin nhắn (chống kick)'.white);
        console.log('  testchat <tin nhắn> - Test gửi 1 tin nhắn từ bot đầu tiên'.white);
        console.log('  forcechat <tin nhắn> - Buộc gửi tin nhắn bỏ qua các kiểm tra'.white);
        console.log('  checkchat - Kiểm tra khả năng chat của bot'.white);
        console.log('  tryperm - Thử các lệnh permission phổ biến'.white);
        console.log('  chatperm - Test chat với prefix để bypass restrictions'.white);
        console.log('  removeall - Xóa tất cả bot'.white);
        console.log('');
        console.log('  Lệnh Proxy:'.cyan.bold);
        console.log('  proxyadd <proxy_url> hoặc proxyadd bulk - Thêm proxy'.white);
        console.log('  proxyremove <proxy_url> - Xóa proxy'.white);
        console.log('  proxylist - Hiển thị tất cả proxy và trạng thái'.white);
        console.log('  proxytest - Kiểm tra tất cả proxy'.white);
        console.log('  proxyon - Bật xoay proxy'.white);
        console.log('  proxyoff - Tắt xoay proxy'.white);
        console.log('');
        console.log('  Lệnh Hệ Thống:'.cyan.bold);
        console.log('  core - Hiển thị số lõi CPU có sẵn'.white);
        console.log('  ram - Hiển thị thông tin sử dụng RAM'.white);
        console.log('  workers - Hiển thị trạng thái worker threads'.white);
        console.log('  quit/exit - Thoát bot'.white);
        console.log('');
        console.log('Ví dụ:'.yellow.bold);
        console.log('  create 20'.gray + '                    # Tạo 20 bot với proxy rotation');
        console.log('  connectfast cherry.pikamc.vn'.gray + ' # KẾT NỐI với auto-switch proxy');
        console.log('  list'.gray + '                         # Kiểm tra trạng thái kết nối');
        console.log('  autologin on'.gray + '                # Bật đăng nhập nếu server yêu cầu');
        console.log('  proxystats'.gray + '                   # Xem thống kê proxy');
        console.log('  chatall Xin chào!'.gray + '           # Test chat CHỈ sau khi kết nối xong');
        console.log('');
        console.log('🎯 WORKFLOW VỚI PROXY PROTECTION:'.green.bold);
        console.log('  1. create → 2. connectfast → 3. proxystats → 4. list → 5. chatall'.cyan);
        console.log('');
    },

    connect: (args) => {
        if (args.length < 1) {
            console.log('Cách dùng: connect <host> [port] HOẶC connect <số_bot> <host> [port]'.red);
            console.log('Ví dụ:'.yellow);
            console.log('  connect localhost 25565'.gray);
            console.log('  connect 1 mc.hypixel.net'.gray);
            console.log('  connect 2 localhost 25566'.gray);
            return;
        }

        // Check if first argument is a number (bot index)
        const firstArg = args[0];
        const isNumber = !isNaN(parseInt(firstArg)) && isFinite(firstArg);

        if (isNumber) {
            // Connect specific bot by number
            const botIndex = parseInt(firstArg);
            const host = args[1];
            const port = args[2] ? parseInt(args[2]) : 25565;

            if (!host) {
                console.log('Usage: connect <bot_number> <host> [port]'.red);
                return;
            }

            console.log(`Connecting bot #${botIndex} to ${host}:${port}...`.yellow);
            
            botManager.connectBotByIndex(botIndex, host, port).then(() => {
                console.log(`Bot #${botIndex} successfully connected to ${host}:${port}`.green);
            }).catch((error) => {
                console.log(`Bot #${botIndex} failed to connect: ${error.message}`.red);
            });
        } else {
            // Original single bot connection
            if (isConnected) {
                console.log('Already connected to a server. Use "disconnect" first.'.yellow);
                return;
            }

            const host = args[0];
            const port = args[1] ? parseInt(args[1]) : 25565;

            console.log(`Connecting to ${host}:${port}...`.yellow);
            
            bot = new Bot({
                ...config,
                host: host,
                port: port
            });

            bot.connect().then(() => {
                isConnected = true;
                console.log(`Successfully connected to ${host}:${port}`.green);
            }).catch((error) => {
                console.log(`Failed to connect: ${error.message}`.red);
                bot = null;
            });
        }
    },

    disconnect: () => {
        if (!isConnected || !bot) {
            console.log('Not connected to any server.'.yellow);
            return;
        }

        bot.disconnect();
        bot = null;
        isConnected = false;
        console.log('Disconnected from server.'.yellow);
    },

    chat: (args) => {
        if (!isConnected || !bot) {
            console.log('Not connected to any server.'.red);
            return;
        }

        if (args.length === 0) {
            console.log('Usage: chat <message>'.red);
            return;
        }

        const message = args.join(' ');
        bot.chat(message);
        console.log(`[CHAT] ${message}`.green);
    },

    move: (args) => {
        if (!isConnected || !bot) {
            console.log('Not connected to any server.'.red);
            return;
        }

        if (args.length < 2) {
            console.log('Usage: move <direction> <distance>'.red);
            console.log('Directions: forward, back, left, right'.yellow);
            return;
        }

        const direction = args[0].toLowerCase();
        const distance = parseFloat(args[1]);

        if (isNaN(distance)) {
            console.log('Distance must be a number.'.red);
            return;
        }

        bot.move(direction, distance);
        console.log(`Moving ${direction} for ${distance} blocks...`.green);
    },

    jump: () => {
        if (!isConnected || !bot) {
            console.log('Not connected to any server.'.red);
            return;
        }

        bot.jump();
        console.log('Jumping...'.green);
    },

    look: (args) => {
        if (!isConnected || !bot) {
            console.log('Not connected to any server.'.red);
            return;
        }

        if (args.length < 2) {
            console.log('Usage: look <pitch> <yaw>'.red);
            return;
        }

        const pitch = parseFloat(args[0]);
        const yaw = parseFloat(args[1]);

        if (isNaN(pitch) || isNaN(yaw)) {
            console.log('Pitch and yaw must be numbers.'.red);
            return;
        }

        bot.look(pitch, yaw);
        console.log(`Looking at pitch: ${pitch}, yaw: ${yaw}`.green);
    },

    follow: (args) => {
        if (!isConnected || !bot) {
            console.log('Not connected to any server.'.red);
            return;
        }

        if (args.length === 0) {
            console.log('Usage: follow <player>'.red);
            return;
        }

        const playerName = args[0];
        bot.followPlayer(playerName);
        console.log(`Following player: ${playerName}`.green);
    },

    stop: () => {
        if (!isConnected || !bot) {
            console.log('Not connected to any server.'.red);
            return;
        }

        bot.stop();
        console.log('Stopped current action.'.green);
    },

    status: () => {
        if (isConnected && bot) {
            const status = bot.getStatus();
            console.log('\nBot Status:'.cyan.bold);
            console.log(`  Connected: ${status.connected ? 'Yes'.green : 'No'.red}`);
            console.log(`  Server: ${status.host}:${status.port}`.white);
            console.log(`  Username: ${status.username}`.white);
            console.log(`  Health: ${status.health || 'Unknown'}`.white);
            console.log(`  Position: ${status.position || 'Unknown'}`.white);
            console.log('');
        } else {
            console.log('Status: Not connected'.red);
        }
    },

    config: () => {
        console.log('\nCurrent Configuration:'.cyan.bold);
        console.log(`  Username: ${config.username}`.white);
        console.log(`  Version: ${config.version}`.white);
        console.log(`  Auto-respawn: ${config.autoRespawn ? 'Enabled' : 'Disabled'}`.white);
        console.log(`  Anti-kick: ${config.antiKick ? 'Enabled' : 'Disabled'}`.white);
        console.log(`  Auto-login: ${config.autoLogin ? 'Enabled' : 'Disabled'}`.white);
        console.log(`  Login password: ${config.loginPassword}`.white);
        console.log(`  Verification bypass: ${config.bypassVerification ? 'Enabled' : 'Disabled'}`.white);
        console.log(`  Custom brand: ${config.customBrand}`.white);
        console.log('');
    },

    quit: () => {
        if (isConnected && bot) {
            bot.disconnect();
        }
        console.log('Goodbye!'.cyan);
        process.exit(0);
    },

    login: () => {
        if (!isConnected || !bot) {
            console.log('Not connected to any server.'.red);
            return;
        }

        try {
            bot.autoLogin();
            console.log('Manual register + login commands sent.'.green);
        } catch (error) {
            console.log(`Login failed: ${error.message}`.red);
        }
    },

    // Multi-bot commands
    create: (args) => {
        const count = args.length > 0 ? parseInt(args[0]) : 1;
        if (isNaN(count) || count < 1 || count > 50) {
            console.log('Usage: create <count> (1-50 bots)'.red);
            return;
        }

        console.log(`Creating ${count} bots...`.yellow);
        const createdBots = [];
        
        for (let i = 0; i < count; i++) {
            try {
                const botInfo = botManager.createBot(config);
                createdBots.push(botInfo);
                console.log(`Created bot: ${botInfo.name} (${botInfo.id})`.green);
            } catch (error) {
                console.log(`Failed to create bot ${i + 1}: ${error.message}`.red);
            }
        }
        
        console.log(`Successfully created ${createdBots.length}/${count} bots`.green);
    },

    connectall: (args) => {
        if (args.length < 1) {
            console.log('Usage: connectall <host> [port]'.red);
            return;
        }

        const host = args[0];
        const port = args[1] ? parseInt(args[1]) : 25565;
        const bots = botManager.listBots();

        if (bots.length === 0) {
            console.log('No bots available to connect. Use "create <count>" first.'.yellow);
            return;
        }

        botManager.connectAllBots(host, port).then((successCount) => {
            console.log(`Final result: ${successCount}/${bots.length} bots connected to ${host}:${port}`.cyan.bold);
        }).catch((error) => {
            console.log(`Mass connection failed: ${error.message}`.red);
        });
    },

    connectfast: (args) => {
        if (args.length < 1) {
            console.log('Usage: connectfast <host> [port]'.red);
            console.log('This connects all bots in parallel groups for faster connection'.gray);
            return;
        }

        const host = args[0];
        const port = args[1] ? parseInt(args[1]) : 25565;
        const bots = botManager.listBots();

        if (bots.length === 0) {
            console.log('No bots available to connect. Use "create <count>" first.'.yellow);
            return;
        }

        botManager.connectAllBotsParallel(host, port).then((successCount) => {
            console.log(`Final result: ${successCount}/${bots.length} bots connected to ${host}:${port}`.cyan.bold);
        }).catch((error) => {
            console.log(`Fast mass connection failed: ${error.message}`.red);
        });
    },

    list: () => {
        const bots = botManager.listBots();
        const systemInfo = botManager.getSystemInfo();
        
        console.log('\nBot Status:'.cyan.bold);
        console.log(`Total bots: ${bots.length}, Connected: ${botManager.getConnectedBotsCount()}`.white);
        console.log('');
        
        if (bots.length === 0) {
            console.log('No bots created yet.'.yellow);
        } else {
            console.log('#'.padEnd(4) + 'Name'.padEnd(15) + 'Status'.padEnd(12) + 'Server'.padEnd(25) + 'Duration'.white);
            console.log('-'.repeat(80).gray);
            
            bots.forEach(bot => {
                const statusColor = bot.status === 'connected' ? 'green' : 
                                  bot.status === 'failed' ? 'red' : 'yellow';
                
                console.log(
                    bot.index.toString().padEnd(4) +
                    bot.name.padEnd(15) +
                    bot.status.padEnd(12)[statusColor] +
                    bot.connectedTo.padEnd(25) +
                    bot.durationFormatted
                );
            });
        }
        
        console.log(`\nSystem: ${systemInfo.cores} cores, ${systemInfo.usedMemoryGB}GB/${systemInfo.totalMemoryGB}GB RAM used`.gray);
        console.log('Note: Use "connect <number> <host> [port]" to connect specific bot'.yellow);
        console.log('');
    },

    chatall: (args) => {
        if (args.length === 0) {
            console.log('Cách dùng: chatall <tin nhắn>'.red);
            return;
        }

        const message = args.join(' ');
        const sentCount = botManager.chatAll(message);
        console.log(`Đã gửi tin nhắn từ ${sentCount} bot: "${message}"`.green);
    },

    spamall: async (args) => {
        if (args.length < 2) {
            console.log('Cách dùng: spamall <tin nhắn> <số lần> [delay_ms]'.red);
            console.log('Ví dụ:'.yellow);
            console.log('  spamall Hello 10 1000    # Gửi "Hello" 10 lần, delay 1 giây'.gray);
            console.log('  spamall Test 5           # Gửi "Test" 5 lần, delay 500ms'.gray);
            return;
        }

        const lastArg = args[args.length - 1];
        const secondLastArg = args.length > 2 ? args[args.length - 2] : null;
        
        let message, count, delay;
        
        // Parse arguments based on whether delay is provided
        if (secondLastArg && !isNaN(parseInt(secondLastArg)) && !isNaN(parseInt(lastArg))) {
            // Both count and delay provided
            message = args.slice(0, -2).join(' ');
            count = parseInt(secondLastArg);
            delay = parseInt(lastArg);
        } else {
            // Only count provided
            message = args.slice(0, -1).join(' ');
            count = parseInt(lastArg);
            delay = 500; // default delay
        }

        if (isNaN(count) || count <= 0) {
            console.log('Số lần phải là số dương'.red);
            return;
        }

        if (delay < 100) {
            console.log('Delay tối thiểu là 100ms'.red);
            return;
        }

        try {
            console.log(`Bắt đầu spam "${message}" ${count} lần với delay ${delay}ms...`.cyan);
            const botCount = await botManager.spamAllBots(message, count, delay);
            console.log(`Hoàn thành spam ${count} lần từ ${botCount} bot!`.yellow);
        } catch (error) {
            console.log(`Lỗi spam: ${error.message}`.red);
        }
    },

    removeall: () => {
        const count = botManager.getTotalBotsCount();
        botManager.cleanup();
        console.log(`Removed all ${count} bots`.yellow);
    },

    // System commands
    core: () => {
        const systemInfo = botManager.getSystemInfo();
        console.log('\nCPU Information:'.cyan.bold);
        console.log(`  Available cores: ${systemInfo.cores}`.white);
        console.log(`  Recommended max bots: ${Math.floor(systemInfo.cores * 10)}`.white);
        console.log('');
    },

    ram: () => {
        const systemInfo = botManager.getSystemInfo();
        console.log('\nRAM Information:'.cyan.bold);
        console.log(`  Total RAM: ${systemInfo.totalMemoryGB} GB`.white);
        console.log(`  Used RAM: ${systemInfo.usedMemoryGB} GB (${systemInfo.memoryUsagePercent}%)`.white);
        console.log(`  Free RAM: ${systemInfo.freeMemoryGB} GB`.white);
        console.log(`  Estimated bots capacity: ${Math.floor(parseFloat(systemInfo.freeMemoryGB) * 20)}`.white);
        console.log('');
    },

    workers: () => {
        const systemInfo = botManager.getSystemInfo();
        console.log('\nWorker Thread Status:'.cyan.bold);
        console.log(`  Available CPU cores: ${systemInfo.cores}`.white);
        console.log(`  Max worker threads: ${Math.min(systemInfo.cores, 4)}`.white);
        console.log(`  Current threading: Node.js async (single-threaded event loop)`.white);
        console.log(`  Concurrent connections: Handled via async/await`.gray);
        console.log(`  Anti-spam measures: Active (staggered delays)`.green);
        console.log(`  Connection focus: Prioritized over chat operations`.yellow);
        console.log('');
    },

    // Additional bot management commands
    remove: (args) => {
        if (args.length < 1) {
            console.log('Usage: remove <bot_number>'.red);
            console.log('Example: remove 1'.gray);
            return;
        }

        const botIndex = parseInt(args[0]);
        if (isNaN(botIndex)) {
            console.log('Bot number must be a valid number.'.red);
            return;
        }

        try {
            const removedBot = botManager.removeBotByIndex(botIndex);
            console.log(`Bot #${botIndex} (${removedBot.name}) removed successfully.`.green);
        } catch (error) {
            console.log(`Error: ${error.message}`.red);
        }
    },

    disconnect: (args) => {
        if (args.length === 0) {
            // Original single bot disconnect
            if (!isConnected || !bot) {
                console.log('Not connected to any server.'.yellow);
                return;
            }

            bot.disconnect();
            bot = null;
            isConnected = false;
            console.log('Disconnected from server.'.yellow);
        } else {
            // Disconnect specific bot by number
            const botIndex = parseInt(args[0]);
            if (isNaN(botIndex)) {
                console.log('Bot number must be a valid number.'.red);
                return;
            }

            try {
                const disconnectedBot = botManager.disconnectBotByIndex(botIndex);
                console.log(`Bot #${botIndex} (${disconnectedBot.name}) disconnected.`.yellow);
            } catch (error) {
                console.log(`Error: ${error.message}`.red);
            }
        }
    },

    chat: (args) => {
        if (args.length === 0) {
            console.log('Usage: chat <message> OR chat <bot_number> <message>'.red);
            console.log('Examples:'.yellow);
            console.log('  chat Hello everyone!'.gray);
            console.log('  chat 1 Hello from bot 1!'.gray);
            return;
        }

        // Check if first argument is a number (bot index)
        const firstArg = args[0];
        const isNumber = !isNaN(parseInt(firstArg)) && isFinite(firstArg);

        if (isNumber) {
            // Send message from specific bot
            const botIndex = parseInt(firstArg);
            const message = args.slice(1).join(' ');

            if (!message) {
                console.log('Usage: chat <bot_number> <message>'.red);
                return;
            }

            try {
                const chatBot = botManager.chatBotByIndex(botIndex, message);
                console.log(`[Bot #${botIndex} - ${chatBot.name}] ${message}`.green);
            } catch (error) {
                console.log(`Error: ${error.message}`.red);
            }
        } else {
            // Original single bot chat
            if (!isConnected || !bot) {
                console.log('Not connected to any server.'.red);
                return;
            }

            const message = args.join(' ');
            bot.chat(message);
            console.log(`[CHAT] ${message}`.green);
        }
    },

    // Proxy management commands
    proxyadd: (args) => {
        if (args.length < 1) {
            console.log('Usage: proxyadd <proxy_url>'.red);
            console.log('Examples:'.yellow);
            console.log('  proxyadd socks5://1.1.1.1:1080'.gray);
            console.log('  proxyadd http://proxy.example.com:8080'.gray);
            return;
        }

        const proxyUrl = args[0];
        try {
            botManager.addProxy(proxyUrl);
            console.log(`Proxy added successfully: ${proxyUrl}`.green);
        } catch (error) {
            console.log(`Failed to add proxy: ${error.message}`.red);
        }
    },

    proxyremove: (args) => {
        if (args.length < 1) {
            console.log('Usage: proxyremove <proxy_url>'.red);
            return;
        }

        const proxyUrl = args[0];
        try {
            botManager.removeProxy(proxyUrl);
            console.log(`Proxy removed: ${proxyUrl}`.yellow);
        } catch (error) {
            console.log(`Failed to remove proxy: ${error.message}`.red);
        }
    },

    proxylist: () => {
        const stats = botManager.getProxyStats();
        
        console.log('\nProxy Status:'.cyan.bold);
        console.log(`Total proxies: ${stats.totalProxies}, Rotation: ${stats.rotationEnabled ? 'ON' : 'OFF'}`.white);
        console.log('');
        
        if (stats.proxies.length === 0) {
            console.log('No proxies configured. Use "proxyadd <url>" to add proxies.'.yellow);
            console.log('');
            console.log('Cloudflare WARP examples:'.gray);
            console.log('  proxyadd socks5://162.159.36.1:32768'.gray);
            console.log('  proxyadd socks5://162.159.46.1:32768'.gray);
        } else {
            console.log('URL'.padEnd(40) + 'Status'.padEnd(10) + 'Active'.white);
            console.log('-'.repeat(60).gray);
            
            stats.proxies.forEach((proxy, index) => {
                const status = 'Unknown';
                const active = proxy.active ? '✓' : '';
                console.log(
                    `${index + 1}. `.padEnd(4) +
                    proxy.url.padEnd(40) +
                    status.padEnd(10) +
                    active
                );
            });
        }
        console.log('');
    },

    proxytest: async () => {
        console.log('Testing all proxies...'.yellow);
        try {
            const workingProxies = await botManager.testProxies();
            console.log(`Proxy test completed: ${workingProxies.length} working proxies found`.green);
            
            if (workingProxies.length > 0) {
                console.log('Working proxies:'.cyan);
                workingProxies.forEach((proxy, index) => {
                    console.log(`  ${index + 1}. ${proxy}`.green);
                });
            } else {
                console.log('No working proxies found. Consider adding new ones.'.red);
            }
        } catch (error) {
            console.log(`Proxy test failed: ${error.message}`.red);
        }
    },

    proxyon: () => {
        const proxyManager = botManager.getProxyManager();
        proxyManager.setRotationEnabled(true);
        console.log('Proxy rotation enabled. Bots will use different proxies when connecting.'.green);
    },

    proxyoff: () => {
        const proxyManager = botManager.getProxyManager();
        proxyManager.setRotationEnabled(false);
        console.log('Proxy rotation disabled. Bots will connect directly.'.yellow);
    },

    // Test server commands
    testlocal: () => {
        console.log('Testing connection to localhost:25565...'.yellow);
        commands.connect(['localhost', '25565']);
    },

    testhypixel: () => {
        console.log('Testing connection to mc.hypixel.net...'.yellow);
        commands.connect(['mc.hypixel.net']);
    },

    testminehut: () => {
        console.log('Testing connection to minehut.com...'.yellow);
        commands.connect(['minehut.com']);
    },

    // Auto-login control
    autologin: (args) => {
        if (args.length < 1) {
            console.log('Cách dùng: autologin <on/off>'.red);
            console.log('Hiện tại: ' + (config.autoLogin ? 'BẬT' : 'TẮT').green);
            return;
        }

        const setting = args[0].toLowerCase();
        if (setting === 'on' || setting === 'true') {
            config.autoLogin = true;
            console.log('Tự động đăng nhập đã được BẬT'.green);
        } else if (setting === 'off' || setting === 'false') {
            config.autoLogin = false;
            console.log('Tự động đăng nhập đã được TẮT'.yellow);
        } else {
            console.log('Giá trị không hợp lệ. Sử dụng: on hoặc off'.red);
        }
    },

    // Hide messages control
    hidemessages: (args) => {
        if (args.length < 1) {
            console.log('Cách dùng: hidemessages <on/off>'.red);
            console.log('Hiện tại:'.white);
            console.log(`  Ẩn thông báo máu: ${config.hideHealthMessages ? 'BẬT' : 'TẮT'}`);
            console.log(`  Ẩn thông báo chết: ${config.hideDeathMessages ? 'BẬT' : 'TẮT'}`);
            console.log(`  Ẩn thông báo sát thương: ${config.hideDamageMessages ? 'BẬT' : 'TẮT'}`);
            return;
        }

        const setting = args[0].toLowerCase();
        if (setting === 'on' || setting === 'true') {
            config.hideHealthMessages = true;
            config.hideDeathMessages = true;
            config.hideDamageMessages = true;
            console.log('Đã ẨN tất cả thông báo damage/death'.green);
        } else if (setting === 'off' || setting === 'false') {
            config.hideHealthMessages = false;
            config.hideDeathMessages = false;
            config.hideDamageMessages = false;
            console.log('Đã HIỆN tất cả thông báo damage/death'.yellow);
        } else {
            console.log('Giá trị không hợp lệ. Sử dụng: on hoặc off'.red);
        }
    },

    // Hide chat control
    hidechat: (args) => {
        if (args.length < 1) {
            console.log('Cách dùng: hidechat <on/off>'.red);
            console.log('Hiện tại:'.white);
            console.log(`  Ẩn server messages: ${config.hideServerMessages ? 'BẬT' : 'TẮT'}`);
            console.log(`  Ẩn debug chat: ${config.hideDebugChat ? 'BẬT' : 'TẮT'}`);
            return;
        }

        const setting = args[0].toLowerCase();
        if (setting === 'on' || setting === 'true') {
            config.hideServerMessages = true;
            config.hideDebugChat = true;
            
            // Update for all bots
            const updatedCount = botManager.updateAllBotsChatSettings(true, true);
            console.log('Đã ẨN tất cả debug chat và server messages'.green);
            console.log(`Cập nhật cho ${updatedCount} bot`.cyan);
        } else if (setting === 'off' || setting === 'false') {
            config.hideServerMessages = false;
            config.hideDebugChat = false;
            
            // Update for all bots
            const updatedCount = botManager.updateAllBotsChatSettings(false, false);
            console.log('Đã HIỆN tất cả debug chat và server messages'.yellow);
            console.log(`Cập nhật cho ${updatedCount} bot`.cyan);
        } else {
            console.log('Giá trị không hợp lệ. Sử dụng: on hoặc off'.red);
        }
    },

    // Set password for all bots
    setpassword: (args) => {
        if (args.length < 1) {
            console.log('Cách dùng: setpassword <mật khẩu mới>'.red);
            console.log(`Mật khẩu hiện tại: ${config.loginPassword}`.gray);
            return;
        }

        const newPassword = args.join(' ');
        config.loginPassword = newPassword;
        
        // Update password for all existing bots
        const updatedCount = botManager.updateAllBotsPassword(newPassword);
        
        console.log(`Đã đổi mật khẩu thành: "${newPassword}"`.green);
        console.log(`Cập nhật cho ${updatedCount} bot`.cyan);
    },

    // Set register format
    setregformat: (args) => {
        if (args.length < 1) {
            console.log('Cách dùng: setregformat <single/double>'.red);
            console.log(`Format hiện tại: ${config.registerFormat}`.gray);
            console.log('single: /register <password>'.gray);
            console.log('double: /register <password> <password>'.gray);
            return;
        }

        const format = args[0].toLowerCase();
        if (format === 'single' || format === 'double') {
            config.registerFormat = format;
            
            // Update format for all existing bots
            const updatedCount = botManager.updateAllBotsRegisterFormat(format);
            
            console.log(`Đã đổi register format thành: ${format}`.green);
            console.log(`Cập nhật cho ${updatedCount} bot`.cyan);
        } else {
            console.log('Format không hợp lệ. Sử dụng: single hoặc double'.red);
        }
    },

    // Enhanced status command
    status: () => {
        if (isConnected && bot) {
            console.log('\nTrạng thái Bot Chính:'.cyan.bold);
            console.log(`  Kết nối: ${'✓ Đã kết nối'.green}`);
            console.log(`  Server: ${bot.bot?.host || 'N/A'}:${bot.bot?.port || 'N/A'}`);
            console.log(`  Username: ${bot.bot?.username || 'N/A'}`);
            console.log(`  Health: ${bot.bot?.health || 'N/A'}`);
            console.log(`  Position: ${bot.bot?.entity?.position || 'N/A'}`);
        } else {
            console.log('\nTrạng thái Bot Chính:'.cyan.bold);
            console.log(`  Kết nối: ${'✗ Chưa kết nối'.red}`);
        }

        // Multi-bot status
        const connectedCount = botManager.getConnectedBotsCount();
        const totalCount = botManager.getTotalBotsCount();
        
        console.log('\nTrạng thái Đa Bot:'.cyan.bold);
        console.log(`  Tổng số bot: ${totalCount}`);
        console.log(`  Đã kết nối: ${connectedCount}`.green);
        console.log(`  Chưa kết nối: ${totalCount - connectedCount}`.yellow);

        // Recent errors
        console.log('\nLỗi gần đây:'.cyan.bold);
        try {
            const { execSync } = require('child_process');
            const recentErrors = execSync('tail -5 logs/error.log 2>/dev/null || echo "Không có lỗi"', { encoding: 'utf8' });
            console.log(recentErrors.gray);
        } catch (error) {
            console.log('Không thể đọc log lỗi'.gray);
        }
    },

    // Test chat function
    testchat: (args) => {
        if (args.length === 0) {
            console.log('Cách dùng: testchat <tin nhắn>'.red);
            return;
        }

        const message = args.join(' ');
        const bots = Array.from(botManager.bots.values());
        const connectedBot = bots.find(bot => bot.status === 'connected' && bot.bot.isConnected);
        
        if (!connectedBot) {
            console.log('❌ Không có bot nào đang kết nối'.red);
            return;
        }

        console.log(`🧪 Test gửi "${message}" từ bot ${connectedBot.name}...`.yellow);
        try {
            const success = connectedBot.bot.chat(message);
            if (success !== false) {
                console.log('✅ Lệnh gửi thành công - chờ phản hồi từ server...'.green);
            } else {
                console.log('⚠️ Lệnh gửi có vấn đề'.yellow);
            }
        } catch (error) {
            console.log(`❌ Lỗi test chat: ${error.message}`.red);
        }
    },

    // Force chat without checks
    forcechat: (args) => {
        if (args.length === 0) {
            console.log('Cách dùng: forcechat <tin nhắn>'.red);
            return;
        }

        const message = args.join(' ');
        const bots = Array.from(botManager.bots.values());
        const connectedBot = bots.find(bot => bot.status === 'connected' && bot.bot.isConnected);
        
        if (!connectedBot) {
            console.log('❌ Không có bot nào đang kết nối'.red);
            return;
        }

        console.log(`⚡ Force chat "${message}" từ bot ${connectedBot.name}...`.yellow);
        try {
            // Direct bot.chat without any checks
            connectedBot.bot.bot.chat(message);
            console.log('⚡ Đã gửi trực tiếp qua bot API'.green);
        } catch (error) {
            console.log(`❌ Lỗi force chat: ${error.message}`.red);
        }
    },

    // Check chat capabilities
    checkchat: () => {
        const bots = Array.from(botManager.bots.values());
        const connectedBot = bots.find(bot => bot.status === 'connected' && bot.bot.isConnected);
        
        if (!connectedBot) {
            console.log('❌ Không có bot nào đang kết nối'.red);
            return;
        }

        const bot = connectedBot.bot.bot;
        console.log('\n🔍 Kiểm tra khả năng chat:'.cyan.bold);
        console.log(`  Bot username: ${bot.username}`);
        console.log(`  Bot entity: ${bot.entity ? '✅' : '❌'}`);
        console.log(`  Bot position: ${bot.entity?.position || 'N/A'}`);
        console.log(`  Bot health: ${bot.health || 'N/A'}`);
        console.log(`  Connection state: ${bot.state || 'N/A'}`);
        console.log(`  Server version: ${bot.version || 'N/A'}`);
        
        // Try to get player info
        const players = Object.keys(bot.players || {});
        console.log(`  Players online: ${players.length}`);
        if (players.length > 0) {
            console.log(`  Players: ${players.slice(0, 5).join(', ')}${players.length > 5 ? '...' : ''}`);
        }
    },

    // Try permission commands
    tryperm: () => {
        const bots = Array.from(botManager.bots.values());
        const connectedBot = bots.find(bot => bot.status === 'connected' && bot.bot.isConnected);
        
        if (!connectedBot) {
            console.log('❌ Không có bot nào đang kết nối'.red);
            return;
        }

        console.log('🔑 Thử các lệnh permission...'.cyan);
        connectedBot.bot.tryPermissionCommands();
    },

    // Test chat with different prefixes
    chatperm: (args) => {
        if (args.length === 0) {
            console.log('Cách dùng: chatperm <tin nhắn>'.red);
            return;
        }

        const message = args.join(' ');
        const bots = Array.from(botManager.bots.values());
        const connectedBot = bots.find(bot => bot.status === 'connected' && bot.bot.isConnected);
        
        if (!connectedBot) {
            console.log('❌ Không có bot nào đang kết nối'.red);
            return;
        }

        const prefixes = ['!', '.', '/', '@', '#', ''];
        console.log('🧪 Test chat với các prefix khác nhau...'.cyan);
        
        prefixes.forEach((prefix, index) => {
            setTimeout(() => {
                try {
                    const testMsg = `${prefix}${message}`;
                    connectedBot.bot.bot.chat(testMsg);
                    console.log(`📤 Test: "${testMsg}"`);
                } catch (error) {
                    console.log(`❌ Lỗi với prefix "${prefix}": ${error.message}`.red);
                }
            }, index * 2000);
        });
    },

    exit: () => commands.quit()
};

// Handle user input
rl.on('line', (input) => {
    const trimmed = input.trim();
    if (!trimmed) {
        rl.prompt();
        return;
    }

    const parts = trimmed.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (commands[command]) {
        try {
            commands[command](args);
        } catch (error) {
            console.log(`Error executing command: ${error.message}`.red);
            logger.error('Command execution error', error);
        }
    } else {
        console.log(`Unknown command: ${command}. Type "help" for available commands.`.red);
    }

    rl.prompt();
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\nReceived SIGINT. Shutting down gracefully...'.yellow);
    if (isConnected && bot) {
        bot.disconnect();
    }
    botManager.cleanup();
    rl.close();
    process.exit(0);
});

// Start the interactive prompt
rl.prompt();
