import 'module-alias/register';
import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import loadEventHandlers from '@/handlers/eventHandler';
import ErrorHandler from '@/handlers/errorHandler';
import { config } from '@/config/config';

// Create error handler instance
const errorHandler = new ErrorHandler({
	webhook: process.env.ERROR_WEBHOOK,
	environment: process.env.NODE_ENV,
	development: {
		logToConsole: true,
		verbose: true,
		stackTraceLimit: 20,
	},
	production: {
		logToFile: true,
		alertThreshold: 10,
		metricsInterval: 5 * 60 * 1000,
	},
});

// Make error handler globally available
global.errorHandler = errorHandler;

const initializeClient = async (): Promise<Client<boolean>> => {
	// Create Discord client with required intents
	const client = new Client<boolean>({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMembers,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
			GatewayIntentBits.DirectMessages,
		],
	});

	// Initialize error handling if enabled
	if (config.errorHandler) {
		errorHandler.initialize(client);
	}

	try {
		// Load event handlers
		await loadEventHandlers(client);

		// Log in to Discord
		await client.login(process.env.TOKEN);

		return client;
	} catch (error) {
		await errorHandler.handleError(error, 'ClientInitializationError');
		throw error; // Re-throw to be caught by main
	}
};

const main = async (): Promise<void> => {
	try {
		await initializeClient();
	} catch (error) {
		await errorHandler.handleError(error, 'MainProcessError');
		process.exit(1);
	}
};

// Handle uncaught errors in the main process
process.on('unhandledRejection', async (error) => {
	await errorHandler.handleError(error, 'UnhandledRejection');
	process.exit(1);
});

process.on('uncaughtException', async (error) => {
	await errorHandler.handleError(error, 'UncaughtException');
	process.exit(1);
});

main().catch(async (error) => {
	await errorHandler.handleError(error, 'UncaughtError');
	process.exit(1);
});
