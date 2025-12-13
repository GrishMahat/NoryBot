import 'colors';
import type { Client } from 'discord.js';
import { MongoService } from '@/database/services/MongoService';

const SEPARATOR = {
	DOUBLE: '═',
	SINGLE: '─',
	LENGTH: 60,
};

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
	const header = `╔${SEPARATOR.DOUBLE.repeat(SEPARATOR.LENGTH)}╗`.cyan;
	const footer = `╚${SEPARATOR.DOUBLE.repeat(SEPARATOR.LENGTH)}╝`.cyan;
	const divider = `╟${SEPARATOR.SINGLE.repeat(SEPARATOR.LENGTH)}╢`.cyan;

	console.log(header);
	console.log(
		`║ ${config.botName} is now ${'ONLINE'.green.bold}${' '.repeat(SEPARATOR.LENGTH - config.botName.length - 11)} ║`
			.cyan,
	);
	console.log(divider);
	console.log(
		`║ Servers  : ${config.serverCount.toString().yellow}${' '.repeat(SEPARATOR.LENGTH - 12 - config.serverCount.toString().length)} ║`
			.cyan,
	);
	console.log(
		`║ Users    : ${config.userCount.toString().yellow}${' '.repeat(SEPARATOR.LENGTH - 12 - config.userCount.toString().length)} ║`
			.cyan,
	);
	console.log(
		`║ Database : ${config.dbStatus === 'connected' ? 'Connected'.green : 'Connection failed'.red}${' '.repeat(SEPARATOR.LENGTH - (config.dbStatus === 'connected' ? 21 : 29))} ║`
			.cyan,
	);
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
			await global.errorHandler.handleError(error, 'DatabaseConnectionError');
			logConfig.dbStatus = 'disconnected';
		}

		formatLogOutput(logConfig);

		// Setup MongoDB event listeners
		mongoService.on('error', async (error) => {
			await global.errorHandler.handleError(error, 'MongoDBError');
		});

		mongoService.on('disconnected', () => {
			console.log('MongoDB connection lost. Attempting to reconnect...'.yellow);
		});

		mongoService.on('maxReconnectAttemptsReached', async () => {
			await global.errorHandler.handleError(
				new Error('Max MongoDB reconnection attempts reached'),
				'MongoDBMaxReconnectError',
			);
		});
	} catch (error) {
		await global.errorHandler.handleError(error, 'ConsoleLogError');
	}
};

export default consoleLog;

consoleLog.priority = -1; // Lower priority to ensure it runs last
