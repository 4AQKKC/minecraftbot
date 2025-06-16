const logger = require('./logger');

class BotBehaviors {
    constructor() {
        this.lastActivityTime = Date.now();
        this.antiKickActions = [
            'look',
            'jump',
            'crouch',
            'inventory'
        ];
    }

    /**
     * Anti-kick behavior to keep the bot active
     * @param {Object} bot - Mineflayer bot instance
     */
    antiKick(bot) {
        if (!bot || !bot.entity) {
            return;
        }

        try {
            // Update last activity time
            this.lastActivityTime = Date.now();

            // Randomly choose an action
            const action = this.antiKickActions[Math.floor(Math.random() * this.antiKickActions.length)];

            switch (action) {
                case 'look':
                    this.randomLook(bot);
                    break;
                case 'jump':
                    this.randomJump(bot);
                    break;
                case 'crouch':
                    this.randomCrouch(bot);
                    break;
                case 'inventory':
                    this.openInventory(bot);
                    break;
                default:
                    this.randomLook(bot);
            }

            logger.debug('Anti-kick action performed', { action });

        } catch (error) {
            logger.errorLog('ANTI_KICK', error);
        }
    }

    /**
     * Random look behavior
     * @param {Object} bot - Mineflayer bot instance
     */
    randomLook(bot) {
        const yaw = (Math.random() - 0.5) * Math.PI * 2;
        const pitch = (Math.random() - 0.5) * Math.PI / 2;
        bot.look(yaw, pitch);
    }

    /**
     * Random jump behavior
     * @param {Object} bot - Mineflayer bot instance
     */
    randomJump(bot) {
        if (bot.entity.onGround) {
            bot.setControlState('jump', true);
            setTimeout(() => {
                bot.setControlState('jump', false);
            }, 100);
        }
    }

    /**
     * Random crouch behavior
     * @param {Object} bot - Mineflayer bot instance
     */
    randomCrouch(bot) {
        bot.setControlState('sneak', true);
        setTimeout(() => {
            bot.setControlState('sneak', false);
        }, 1000 + Math.random() * 2000);
    }

    /**
     * Open inventory briefly
     * @param {Object} bot - Mineflayer bot instance
     */
    openInventory(bot) {
        try {
            // Simply accessing the inventory counts as activity
            const items = bot.inventory.items();
            logger.debug('Inventory checked', { itemCount: items.length });
        } catch (error) {
            logger.debug('Could not access inventory', error);
        }
    }

    /**
     * Auto-respawn behavior
     * @param {Object} bot - Mineflayer bot instance
     */
    autoRespawn(bot) {
        try {
            bot.respawn();
            logger.info('Bot auto-respawned');
        } catch (error) {
            logger.errorLog('AUTO_RESPAWN', error);
        }
    }

    /**
     * Auto-eat behavior when hungry
     * @param {Object} bot - Mineflayer bot instance
     */
    autoEat(bot) {
        if (bot.food < 16) {
            const food = bot.inventory.items().find(item => 
                item.name.includes('bread') || 
                item.name.includes('apple') || 
                item.name.includes('carrot') ||
                item.name.includes('potato') ||
                item.name.includes('beef') ||
                item.name.includes('pork') ||
                item.name.includes('chicken')
            );

            if (food) {
                try {
                    bot.equip(food, 'hand');
                    bot.consume();
                    logger.info('Bot ate food', { food: food.name });
                } catch (error) {
                    logger.errorLog('AUTO_EAT', error);
                }
            }
        }
    }

    /**
     * Avoid hostile mobs
     * @param {Object} bot - Mineflayer bot instance
     */
    avoidHostileMobs(bot) {
        const hostileMobs = ['zombie', 'skeleton', 'creeper', 'spider', 'enderman'];
        
        for (const entity of Object.values(bot.entities)) {
            if (entity.type === 'mob' && hostileMobs.some(mob => entity.name?.includes(mob))) {
                const distance = bot.entity.position.distanceTo(entity.position);
                
                if (distance < 8) {
                    // Move away from hostile mob
                    const direction = bot.entity.position.minus(entity.position).normalize();
                    const escapePos = bot.entity.position.plus(direction.scaled(10));
                    
                    try {
                        if (bot.pathfinder) {
                            const { goals } = require('mineflayer-pathfinder');
                            bot.pathfinder.setGoal(new goals.GoalBlock(escapePos.x, escapePos.y, escapePos.z));
                        }
                        logger.info('Avoiding hostile mob', { mob: entity.name, distance });
                    } catch (error) {
                        logger.errorLog('AVOID_MOBS', error);
                    }
                    break;
                }
            }
        }
    }

    /**
     * Auto-collect nearby items
     * @param {Object} bot - Mineflayer bot instance
     */
    autoCollectItems(bot) {
        const items = Object.values(bot.entities).filter(entity => 
            entity.name === 'item' && 
            bot.entity.position.distanceTo(entity.position) < 5
        );

        if (items.length > 0) {
            const nearestItem = items.reduce((closest, item) => {
                const closestDist = bot.entity.position.distanceTo(closest.position);
                const itemDist = bot.entity.position.distanceTo(item.position);
                return itemDist < closestDist ? item : closest;
            });

            try {
                if (bot.pathfinder) {
                    const { goals } = require('mineflayer-pathfinder');
                    const goal = new goals.GoalFollow(nearestItem, 1);
                    bot.pathfinder.setGoal(goal);
                    logger.info('Collecting nearby item', { 
                        position: nearestItem.position,
                        distance: bot.entity.position.distanceTo(nearestItem.position)
                    });
                }
            } catch (error) {
                logger.errorLog('AUTO_COLLECT', error);
            }
        }
    }

    /**
     * Follow a specific player
     * @param {Object} bot - Mineflayer bot instance
     * @param {string} playerName - Name of player to follow
     * @param {number} distance - Follow distance
     */
    followPlayer(bot, playerName, distance = 3) {
        const player = bot.players[playerName];
        
        if (!player || !player.entity) {
            logger.warn('Cannot follow player - not found or not visible', { playerName });
            return false;
        }

        try {
            if (bot.pathfinder) {
                const { goals } = require('mineflayer-pathfinder');
                const goal = new goals.GoalFollow(player.entity, distance);
                bot.pathfinder.setGoal(goal);
                logger.info('Following player', { playerName, distance });
                return true;
            }
        } catch (error) {
            logger.errorLog('FOLLOW_PLAYER', error);
        }
        
        return false;
    }

    /**
     * Patrol between waypoints
     * @param {Object} bot - Mineflayer bot instance
     * @param {Array} waypoints - Array of position objects
     */
    patrol(bot, waypoints) {
        if (!waypoints || waypoints.length === 0) {
            return;
        }

        let currentWaypointIndex = 0;

        const moveToNextWaypoint = () => {
            const waypoint = waypoints[currentWaypointIndex];
            
            try {
                if (bot.pathfinder) {
                    const { goals } = require('mineflayer-pathfinder');
                    const goal = new goals.GoalBlock(waypoint.x, waypoint.y, waypoint.z);
                    bot.pathfinder.setGoal(goal);
                    
                    logger.info('Patrolling to waypoint', { 
                        index: currentWaypointIndex,
                        waypoint 
                    });
                }
            } catch (error) {
                logger.errorLog('PATROL', error);
            }

            currentWaypointIndex = (currentWaypointIndex + 1) % waypoints.length;
        };

        // Start patrol
        moveToNextWaypoint();

        // Move to next waypoint when reaching current one
        bot.on('goal_reached', moveToNextWaypoint);
    }

    /**
     * Get last activity time
     * @returns {number} Timestamp of last activity
     */
    getLastActivityTime() {
        return this.lastActivityTime;
    }

    /**
     * Reset activity timer
     */
    resetActivityTimer() {
        this.lastActivityTime = Date.now();
    }
}

module.exports = new BotBehaviors();
