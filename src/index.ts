import 'dotenv/config';
import 'colors';
import { Client, GatewayIntentBits } from 'discord.js';
import { config } from '@/config/config';
import { EventManager } from '@/handlers/eventHandler';
import Logger from '@/handlers/Logger';

// Create logger instance
const logger = new Logger({
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

// Make logger globally available
global.logger = logger;
global.errorHandler = logger; // Backward compatibility

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

	// Initialize logs
	if (!config.errorHandler) {
		logger.initialize(client);
	}

	try {
		// Load event handlers
		const eventManager = new EventManager(client);
		await eventManager.init();

		// Log in to Discord
		await client.login(process.env.TOKEN);

		return client;
	} catch (error) {
		await logger.error(error, 'ClientInitializationError');
		throw error; // Re-throw to be caught by main
	}
};

const main = async (): Promise<void> => {
	try {
		await initializeClient();
	} catch (error) {
		await logger.error(error, 'MainProcessError');
		process.exit(1);
	}
};

// Handle uncaught errors in the main process

main().catch(async (error) => {
	await logger.error(error, 'UncaughtError');
	process.exit(1);
});
