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
  DOUBLE: '=',
  SINGLE: '-',
  LENGTH: 50,
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
 * @example
 * formatLogOutput({
 *   botName: 'MyBot',
 *   serverCount: 10,
 *   userCount: 100,
 *   dbStatus: 'connected'
 * });
 */
const formatLogOutput = (config: LogConfig): void => {
  console.log(SEPARATOR.DOUBLE.repeat(SEPARATOR.LENGTH).cyan);
  console.log(`${config.botName} is now ${'ONLINE'.green.bold}`);
  console.log(SEPARATOR.SINGLE.repeat(SEPARATOR.LENGTH).cyan);
  console.log(`Servers  : ${config.serverCount.toString().yellow}`);
  console.log(`Users    : ${config.userCount.toString().yellow}`);
  console.log(
    `Database : ${config.dbStatus === 'connected' ? 'Connected'.green : 'Connection failed'.red}`
  );
  console.log(SEPARATOR.DOUBLE.repeat(SEPARATOR.LENGTH).cyan);
};

/**
 * Initializes console logging for bot status and database connection
 * @async
 * @function consoleLog
 * @param {Client} client - Discord.js client instance
 * @returns {Promise<void>} Resolves when logging is complete
 * @throws {Error} Database connection errors or general execution errors
 *
 * @description
 * This function performs the following operations:
 * 1. Retrieves bot statistics from the Discord client
 * 2. Attempts to establish a database connection
 * 3. Formats and displays the information in the console
 * 4. Ensures proper database disconnection
 *
 * @example
 * await consoleLog(discordClient);
 *
 * @see {@link LogConfig} for the structure of logging configuration
 * @see {@link formatLogOutput} for console output formatting
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
      console.error(
        'Database connection error:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      logConfig.dbStatus = 'disconnected';
    }

    formatLogOutput(logConfig);
  } catch (error) {
    console.error(
      'Error in consoleLog:'.red,
      error instanceof Error ? error.message : 'Unknown error'
    );
  } finally {
    await mongoose
      .disconnect()
      .catch((error) =>
        console.error(
          'Error disconnecting from database:',
          error instanceof Error ? error.message : 'Unknown error'
        )
      );
  }
};

export default consoleLog;
