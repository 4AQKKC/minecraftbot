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
console.log('  Minecraft Bot Controller v1.0'.green.bold);
console.log('='.repeat(50).green);
console.log('Type "help" for available commands\n'.yellow);

// Command handlers
const commands = {
    help: () => {
        console.log('\nAvailable commands:'.cyan.bold);
        console.log('  connect <host> [port] - Connect to a Minecraft server'.white);
        console.log('  disconnect - Disconnect from the server'.white);
        console.log('  chat <message> - Send a chat message'.white);
        console.log('  move <direction> <distance> - Move the bot (forward/back/left/right)'.white);
        console.log('  jump - Make the bot jump'.white);
        console.log('  look <x> <y> - Look in a direction (pitch, yaw)'.white);
        console.log('  follow <player> - Follow a player'.white);
        console.log('  stop - Stop current action'.white);
        console.log('  status - Show connection status'.white);
        console.log('  config - Show current configuration'.white);
        console.log('  login - Manually send register + login commands'.white);
        console.log('');
        console.log('  Test Servers:'.cyan.bold);
        console.log('  testlocal - Try connecting to localhost:25565'.white);
        console.log('  testhypixel - Try connecting to mc.hypixel.net'.white);
        console.log('  testminehut - Try connecting to minehut.com'.white);
        console.log('');
        console.log('  Multi-Bot Commands:'.cyan.bold);
        console.log('  create <count> - Create multiple bots'.white);
        console.log('  connect <number> <host> [port] - Connect specific bot by number'.white);
        console.log('  disconnect <number> - Disconnect specific bot by number'.white);
        console.log('  chat <number> <message> - Send message from specific bot'.white);
        console.log('  remove <number> - Remove specific bot by number'.white);
        console.log('  connectall <host> [port] - Connect all bots (sequential)'.white);
        console.log('  connectfast <host> [port] - Connect all bots (parallel groups)'.white);
        console.log('  list - Show all bots status with numbers'.white);
        console.log('  chatall <message> - Send message from all bots'.white);
        console.log('  removeall - Remove all bots'.white);
        console.log('');
        console.log('  Proxy Commands:'.cyan.bold);
        console.log('  proxyadd <proxy_url> - Add proxy (socks5://ip:port or http://ip:port)'.white);
        console.log('  proxyremove <proxy_url> - Remove proxy'.white);
        console.log('  proxylist - Show all proxies and status'.white);
        console.log('  proxytest - Test all proxies'.white);
        console.log('  proxyon - Enable proxy rotation'.white);
        console.log('  proxyoff - Disable proxy rotation'.white);
        console.log('');
        console.log('  System Commands:'.cyan.bold);
        console.log('  core - Show CPU cores available'.white);
        console.log('  ram - Show RAM usage information'.white);
        console.log('  quit/exit - Exit the bot'.white);
        console.log('');
        console.log('Examples:'.yellow.bold);
        console.log('  create 50'.gray + '                  # Tạo 50 bot');
        console.log('  connectall mc.hypixel.net'.gray + '   # Kết nối tất cả bot tuần tự');
        console.log('  connectfast localhost'.gray + '       # Kết nối tất cả bot song song (nhanh)');
        console.log('  proxyadd socks5://1.1.1.1:1080'.gray + ' # Thêm proxy Cloudflare');
        console.log('  proxylist'.gray + '                   # Xem danh sách proxy');
        console.log('  chat 1 Hello everyone!'.gray + '     # Bot số 1 gửi tin nhắn');
        console.log('  chatall Hello from all bots!'.gray + ' # Tất cả bot gửi tin nhắn');
        console.log('');
    },

    connect: (args) => {
        if (args.length < 1) {
            console.log('Usage: connect <host> [port] OR connect <bot_number> <host> [port]'.red);
            console.log('Examples:'.yellow);
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
            console.log('No bots available. Create bots first with "create <count>"'.yellow);
            return;
        }

        console.log(`Connecting ${bots.length} bots to ${host}:${port}...`.yellow);
        let successCount = 0;
        
        bots.forEach(async (botInfo, index) => {
            setTimeout(async () => {
                try {
                    await botManager.connectBot(botInfo.id, host, port);
                    successCount++;
                    console.log(`Bot ${botInfo.name} connected successfully`.green);
                } catch (error) {
                    console.log(`Bot ${botInfo.name} failed to connect: ${error.message}`.red);
                }
                
                if (index === bots.length - 1) {
                    setTimeout(() => {
                        console.log(`Connection complete: ${successCount}/${bots.length} bots connected`.cyan);
                    }, 1000);
                }
            }, index * 2000); // 2 second delay between connections
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
            console.log('Usage: chatall <message>'.red);
            return;
        }

        const message = args.join(' ');
        const sentCount = botManager.chatAll(message);
        console.log(`Message sent from ${sentCount} bots: "${message}"`.green);
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
