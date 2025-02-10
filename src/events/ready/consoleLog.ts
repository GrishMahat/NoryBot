import 'colors';
import { Client } from 'discord.js';
import mongoose from 'mongoose';

const mongoURI = process.env.MONGODB_TOKEN;

/**
 * @fileoverview Console logging utility for Discord bot status and database connection monitoring
 * @module events/ready/consoleLog
 */

/**
 * @constant {Object} SEPARATOR - Configuration for visual separators in console output
 * @property {string} DOUBLE - Double line separator character
 * @property {string} SINGLE - Single line separator character
 * @property {number} LENGTH - Length of separator lines
 */
const SEPARATOR = {
  DOUBLE: '═',
  SINGLE: '─',
  LENGTH: 60,
};

/**
 * Configuration interface for logging bot statistics
 * @interface LogConfig
 * @property {string} botName - The Discord bot's username
 * @property {number} serverCount - Number of servers the bot is connected to
 * @property {number} userCount - Number of users across all servers
 * @property {'connected' | 'disconnected'} dbStatus - Current database connection status
 */
interface LogConfig {
  botName: string;
  serverCount: number;
  userCount: number;
  dbStatus: 'connected' | 'disconnected';
}

/**
 * Formats and displays bot statistics in the console with color-coding
 * @function formatLogOutput
 * @param {LogConfig} config - Configuration object containing bot statistics
 * @throws {Error} May throw if console output fails
 */
const formatLogOutput = (config: LogConfig): void => {
  const header = `╔${SEPARATOR.DOUBLE.repeat(SEPARATOR.LENGTH)}╗`.cyan;
  const footer = `╚${SEPARATOR.DOUBLE.repeat(SEPARATOR.LENGTH)}╝`.cyan;
  const divider = `╟${SEPARATOR.SINGLE.repeat(SEPARATOR.LENGTH)}╢`.cyan;

  console.log(header);
  console.log(`║ ${config.botName} is now ${'ONLINE'.green.bold}${' '.repeat(SEPARATOR.LENGTH - config.botName.length - 11)} ║`.cyan);
  console.log(divider);
  console.log(`║ Servers  : ${config.serverCount.toString().yellow}${' '.repeat(SEPARATOR.LENGTH - 12 - config.serverCount.toString().length)} ║`.cyan);
  console.log(`║ Users    : ${config.userCount.toString().yellow}${' '.repeat(SEPARATOR.LENGTH - 12 - config.userCount.toString().length)} ║`.cyan);
  console.log(`║ Database : ${config.dbStatus === 'connected' ? 'Connected'.green : 'Connection failed'.red}${' '.repeat(SEPARATOR.LENGTH - (config.dbStatus === 'connected' ? 21 : 29))} ║`.cyan);
  console.log(footer);
};

/**
 * Initializes console logging for bot status and database connection
 * @async
 * @function consoleLog
 * @param {Client} client - Discord.js client instance
 * @returns {Promise<void>} Resolves when logging is complete
 */
const consoleLog = async (client: Client): Promise<void> => {
  let dbStatus: 'connected' | 'disconnected' = 'disconnected';

  try {
    const logConfig: LogConfig = {
      botName: client.user?.username ?? 'Bot',
      serverCount: client.guilds.cache.size,
      userCount: client.users.cache.size,
      dbStatus,
    };

    try {
      mongoose.set('strictQuery', true);

      await mongoose.connect(mongoURI, {
        serverSelectionTimeoutMS: 15000,
      });
      logConfig.dbStatus = 'connected';
    } catch (error) {
      await global.errorHandler.handleError(error, 'DatabaseConnectionError');
      logConfig.dbStatus = 'disconnected';
    }

    formatLogOutput(logConfig);
  } catch (error) {
    await global.errorHandler.handleError(error, 'ConsoleLogError');
  } finally {
    try {
      await mongoose.disconnect();
    } catch (error) {
      await global.errorHandler.handleError(
        error,
        'DatabaseDisconnectionError'
      );
    }
  }
};

export default consoleLog;
