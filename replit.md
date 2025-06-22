# Minecraft Bot Application

## Overview

This is a Node.js-based Minecraft bot application that can connect to and interact with Minecraft 1.21 servers. The bot features a console-based interface for real-time control, automated behaviors to prevent server kicks, and support for multiple bot instances. The application is designed to work with various server types and includes verification bypass capabilities for servers that implement anti-bot measures.

## System Architecture

The application follows a modular architecture with clear separation of concerns:

### Frontend Architecture
- **Console Interface**: Interactive command-line interface using readline for real-time bot control
- **Color-coded Output**: Uses the `colors` library for enhanced console readability
- **Real-time Feedback**: Immediate response to user commands with status updates

### Backend Architecture
- **Event-driven Design**: Built on mineflayer's event system for handling Minecraft protocol events
- **Modular Components**: Separate modules for authentication, behaviors, commands, and logging
- **Multi-bot Support**: Centralized bot manager for handling multiple bot instances
- **Configuration Management**: Environment-based configuration with fallback defaults

## Key Components

### Core Modules

1. **Bot Manager (`src/bot-manager.js`)**
   - Manages multiple bot instances
   - Provides system resource monitoring
   - Handles bot creation and lifecycle management

2. **Bot Controller (`src/bot.js`)**
   - Main bot class using mineflayer library
   - Handles server connection and authentication
   - Manages bot behaviors and pathfinding

3. **Authentication Manager (`src/auth.js`)**
   - Supports offline, Microsoft, and Mojang authentication
   - Validates authentication configurations
   - Handles username format validation

4. **Behavior System (`src/behaviors.js`)**
   - Anti-kick mechanisms to prevent server timeouts
   - Automated movement and activity patterns
   - Respawn handling and health monitoring

5. **Command Handler (`src/commands.js`)**
   - Processes user commands from console interface
   - Implements movement, interaction, and utility commands
   - Provides feedback for command execution

6. **Logging System (`src/logger.js`)**
   - Winston-based logging with multiple output formats
   - Structured logging with JSON format for file storage
   - Separate error logging and log rotation

### Configuration System
- Environment variable-based configuration
- Automatic random username generation
- Comprehensive bot behavior settings
- Server connection parameters

## Data Flow

1. **Initialization**: Application loads configuration from environment variables and creates bot instances
2. **Connection**: Bot connects to Minecraft server using specified authentication method
3. **Event Handling**: Bot listens for server events (spawn, chat, kick, etc.) and responds accordingly
4. **Command Processing**: User inputs commands through console interface, which are processed and executed
5. **Automated Behaviors**: Background processes handle anti-kick actions and health monitoring
6. **Logging**: All activities are logged with appropriate levels and stored in rotating log files

## External Dependencies

### Core Libraries
- **mineflayer**: Main Minecraft bot framework for protocol handling
- **mineflayer-pathfinder**: Advanced pathfinding and movement capabilities
- **minecraft-protocol**: Low-level Minecraft protocol implementation

### Utility Libraries
- **winston**: Comprehensive logging framework
- **colors**: Console output colorization
- **dotenv**: Environment variable management
- **readline**: Interactive console interface

### Authentication
- **@azure/msal-node**: Microsoft authentication support
- **jsonwebtoken**: JWT token handling for authentication

## Deployment Strategy

The application is configured for Replit deployment with:

- **Node.js 20** runtime environment
- **Automatic dependency installation** on startup
- **Parallel workflow execution** for testing and production
- **Environment-based configuration** for different deployment contexts

### Deployment Commands
```bash
npm install mineflayer mineflayer-pathfinder minecraft-protocol winston colors dotenv readline && node index.js
```

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### June 17, 2025
- **Initial Setup**: Created comprehensive Minecraft bot application
- **Architecture Update**: Moved to modular structure with src/ directory
- **Connection Improvements**: Enhanced error handling and server compatibility
- **Multi-bot Support**: Added ability to create and manage multiple bot instances
- **Vietnamese Documentation**: Created detailed Vietnamese user guide
- **Test Commands**: Added quick test commands for popular servers
- **Anti-kick System**: Implemented automated behaviors to prevent server kicks
- **Logging System**: Added comprehensive logging with Winston

### Current Status
- Bot successfully connects to Minecraft servers
- Console interface fully functional with help system
- Error handling improved with specific troubleshooting messages
- Support for both offline and online authentication modes
- Pathfinding and movement systems operational
- **New**: Bot numbering system with indexed management
- **New**: Individual bot control by number (connect, chat, disconnect, remove)
- **New**: Enhanced list display with sequential numbering
- **New**: Cloudflare proxy integration for IP ban protection
- **New**: Mass connection commands (connectall/connectfast)
- **New**: Proxy rotation system with SOCKS5/HTTP support
- **New**: Sequential connection system - each bot logs in completely before next bot connects
- **New**: Removed unnecessary chat testing to focus on stable connections
- **New**: Enhanced login detection using server message monitoring

## User Preferences

Preferred communication style: Simple, everyday language in Vietnamese when appropriate.

## Changelog

- June 22, 2025: 
  - Migrated project from Replit Agent to Replit environment
  - Implemented sequential connection system with auto-login
  - Enhanced login detection using server message monitoring
  - Removed unnecessary chat testing for improved stability
  - Each bot now completes login process before next bot connects
- June 17, 2025: Initial setup and comprehensive bot development