const logger = require('./logger');

class CommandHandler {
    constructor(bot) {
        this.bot = bot;
        this.commands = new Map();
        this.setupCommands();
    }

    setupCommands() {
        // Basic movement commands
        this.commands.set('forward', (args) => this.moveCommand('forward', args));
        this.commands.set('back', (args) => this.moveCommand('back', args));
        this.commands.set('left', (args) => this.moveCommand('left', args));
        this.commands.set('right', (args) => this.moveCommand('right', args));
        this.commands.set('jump', () => this.jumpCommand());

        // Interaction commands
        this.commands.set('follow', (args) => this.followCommand(args));
        this.commands.set('stop', () => this.stopCommand());
        this.commands.set('come', (args) => this.comeCommand(args));

        // Utility commands
        this.commands.set('pos', () => this.positionCommand());
        this.commands.set('health', () => this.healthCommand());
        this.commands.set('inventory', () => this.inventoryCommand());
        this.commands.set('look', (args) => this.lookCommand(args));

        // Fun commands
        this.commands.set('dance', () => this.danceCommand());
        this.commands.set('spin', () => this.spinCommand());
    }

    moveCommand(direction, args) {
        const distance = args.length > 0 ? parseFloat(args[0]) : 5;
        if (isNaN(distance) || distance <= 0) {
            return 'Invalid distance. Please provide a positive number.';
        }

        try {
            this.bot.move(direction, distance);
            return `Moving ${direction} for ${distance} blocks`;
        } catch (error) {
            logger.error('Move command error', error);
            return `Error: ${error.message}`;
        }
    }

    jumpCommand() {
        try {
            this.bot.jump();
            return 'Jumping!';
        } catch (error) {
            logger.error('Jump command error', error);
            return `Error: ${error.message}`;
        }
    }

    followCommand(args) {
        if (args.length === 0) {
            return 'Please specify a player to follow.';
        }

        const playerName = args[0];
        try {
            this.bot.followPlayer(playerName);
            return `Following ${playerName}`;
        } catch (error) {
            logger.error('Follow command error', error);
            return `Error: ${error.message}`;
        }
    }

    stopCommand() {
        try {
            this.bot.stop();
            return 'Stopped all actions.';
        } catch (error) {
            logger.error('Stop command error', error);
            return `Error: ${error.message}`;
        }
    }

    comeCommand(args) {
        if (args.length === 0) {
            return 'Please specify coordinates (x, y, z) or a player name.';
        }

        try {
            if (args.length >= 3) {
                // Coordinates provided
                const x = parseFloat(args[0]);
                const y = parseFloat(args[1]);
                const z = parseFloat(args[2]);

                if (isNaN(x) || isNaN(y) || isNaN(z)) {
                    return 'Invalid coordinates. Please provide numbers.';
                }

                this.bot.moveTo({ x, y, z });
                return `Moving to coordinates (${x}, ${y}, ${z})`;
            } else {
                // Player name provided
                return this.followCommand(args);
            }
        } catch (error) {
            logger.error('Come command error', error);
            return `Error: ${error.message}`;
        }
    }

    positionCommand() {
        try {
            const status = this.bot.getStatus();
            return `Current position: ${status.position}`;
        } catch (error) {
            logger.error('Position command error', error);
            return `Error: ${error.message}`;
        }
    }

    healthCommand() {
        try {
            const status = this.bot.getStatus();
            return `Health: ${status.health}/20, Food: ${status.food}/20`;
        } catch (error) {
            logger.error('Health command error', error);
            return `Error: ${error.message}`;
        }
    }

    inventoryCommand() {
        try {
            if (!this.bot.bot || !this.bot.bot.inventory) {
                return 'Cannot access inventory.';
            }

            const items = this.bot.bot.inventory.items();
            if (items.length === 0) {
                return 'Inventory is empty.';
            }

            const itemList = items.map(item => `${item.count}x ${item.name}`).join(', ');
            return `Inventory: ${itemList}`;
        } catch (error) {
            logger.error('Inventory command error', error);
            return `Error: ${error.message}`;
        }
    }

    lookCommand(args) {
        if (args.length < 2) {
            return 'Usage: look <pitch> <yaw>';
        }

        const pitch = parseFloat(args[0]);
        const yaw = parseFloat(args[1]);

        if (isNaN(pitch) || isNaN(yaw)) {
            return 'Invalid angles. Please provide numbers.';
        }

        try {
            this.bot.look(pitch, yaw);
            return `Looking at pitch: ${pitch}, yaw: ${yaw}`;
        } catch (error) {
            logger.error('Look command error', error);
            return `Error: ${error.message}`;
        }
    }

    danceCommand() {
        try {
            // Simple dance routine
            const dance = async () => {
                for (let i = 0; i < 4; i++) {
                    this.bot.look(0, Math.PI / 2 * i);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    this.bot.jump();
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            };

            dance();
            return 'Dancing! 💃';
        } catch (error) {
            logger.error('Dance command error', error);
            return `Error: ${error.message}`;
        }
    }

    spinCommand() {
        try {
            let angle = 0;
            const spinInterval = setInterval(() => {
                this.bot.look(0, angle);
                angle += Math.PI / 8;
                if (angle >= Math.PI * 4) {
                    clearInterval(spinInterval);
                }
            }, 100);

            return 'Spinning! 🌪️';
        } catch (error) {
            logger.error('Spin command error', error);
            return `Error: ${error.message}`;
        }
    }

    executeCommand(command, args, playerName) {
        if (!this.commands.has(command)) {
            return `Unknown command: ${command}. Type 'help' for available commands.`;
        }

        try {
            const result = this.commands.get(command)(args);
            logger.info('Command executed', { command, args, playerName, result });
            return result;
        } catch (error) {
            logger.error('Command execution error', { command, args, playerName, error });
            return `Error executing command: ${error.message}`;
        }
    }

    getAvailableCommands() {
        return Array.from(this.commands.keys()).sort();
    }
}

module.exports = CommandHandler;
