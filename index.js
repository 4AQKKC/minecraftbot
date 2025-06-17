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
        console.log('  Multi-Bot Commands:'.cyan.bold);
        console.log('  create <count> - Create multiple bots'.white);
        console.log('  connectall <host> [port] - Connect all bots to server'.white);
        console.log('  list - Show all bots status'.white);
        console.log('  chatall <message> - Send message from all bots'.white);
        console.log('  removeall - Remove all bots'.white);
        console.log('');
        console.log('  System Commands:'.cyan.bold);
        console.log('  core - Show CPU cores available'.white);
        console.log('  ram - Show RAM usage information'.white);
        console.log('  quit/exit - Exit the bot'.white);
        console.log('');
    },

    connect: (args) => {
        if (isConnected) {
            console.log('Already connected to a server. Use "disconnect" first.'.yellow);
            return;
        }

        if (args.length < 1) {
            console.log('Usage: connect <host> [port]'.red);
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
            console.log('ID'.padEnd(12) + 'Name'.padEnd(15) + 'Status'.padEnd(12) + 'Server'.padEnd(25) + 'Duration'.white);
            console.log('-'.repeat(80).gray);
            
            bots.forEach(bot => {
                const statusColor = bot.status === 'connected' ? 'green' : 
                                  bot.status === 'failed' ? 'red' : 'yellow';
                
                console.log(
                    bot.id.padEnd(12) +
                    bot.name.padEnd(15) +
                    bot.status.padEnd(12)[statusColor] +
                    bot.connectedTo.padEnd(25) +
                    bot.durationFormatted
                );
            });
        }
        
        console.log(`\nSystem: ${systemInfo.cores} cores, ${systemInfo.usedMemoryGB}GB/${systemInfo.totalMemoryGB}GB RAM used`.gray);
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
