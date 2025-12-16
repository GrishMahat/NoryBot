import 'colors';
import type { Client } from 'discord.js';
import { MongoService } from '@/database/services/MongoService';
import { logs } from '@/services/logs';

/**
 * @fileoverview Console logging utility for Discord bot status and database connection monitoring
 * @module events/ready/consoleLog
 */

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
	dbStatus: 'connected' | 'disconnected' | 'connecting';
}

/**
 * Formats and displays bot statistics in the console with color-coding
 * @function formatLogOutput
 * @param {LogConfig} config - Configuration object containing bot statistics
 * @throws {Error} May throw if console output fails
 */
const formatLogOutput = (config: LogConfig): void => {
	logs.info(`Bot Online: ${config.botName}`, {
		tag: 'Startup',
		context: {
			servers: config.serverCount,
			users: config.userCount,
			dbStatus: config.dbStatus,
		},
	});
};

/**
 * Initializes console logging for bot status and database connection
 * @async
 * @function consoleLog
 * @param {Client} client - Discord.js client instance
 * @returns {Promise<void>} Resolves when logging is complete
 */
const consoleLog = async (client: Client): Promise<void> => {
	try {
		const mongoService = MongoService.getInstance();
		const dbStatus: 'connected' | 'disconnected' | 'connecting' = 'connecting';

		const logConfig: LogConfig = {
			botName: client.user?.username ?? 'Bot',
			serverCount: client.guilds.cache.size,
			userCount: client.users.cache.size,
			dbStatus,
		};

		try {
			await mongoService.connect();
			logConfig.dbStatus = 'connected';
		} catch (error) {
			logs.error(error, { tag: 'Startup', context: 'DatabaseConnectionError' });
			logConfig.dbStatus = 'disconnected';
		}

		formatLogOutput(logConfig);

		// Setup MongoDB event listeners
		mongoService.on('error', async (error) => {
			logs.error(error, { tag: 'Startup', context: 'MongoDBError' });
		});

		mongoService.on('disconnected', () => {
			logs.warn('MongoDB connection lost. Attempting to reconnect...', { tag: 'MongoDB' });
		});

		mongoService.on('maxReconnectAttemptsReached', async () => {
			logs.error(new Error('Max MongoDB reconnection attempts reached'), {
				tag: 'Startup',
				context: 'MongoDBMaxReconnectError',
			});
		});
	} catch (error) {
		logs.error(error, { tag: 'Startup', context: 'ConsoleLogError' });
	}
};

export default consoleLog;

consoleLog.priority = 1; // Higher priority to ensure it runs first
