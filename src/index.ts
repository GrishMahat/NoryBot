import 'dotenv/config';
import 'colors';
import { Client, GatewayIntentBits } from 'discord.js';
import { EventManager } from '@/handlers/eventHandler';
import { logs } from '@/services/logs';

// Services initialized statically

const initializeClient = async (): Promise<Client<boolean>> => {
	// Create Discord client with required intents
	const client = new Client({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMembers,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
		],
	});

	// Attach services

	// Initialize services

	try {
		// Load event handlers
		const eventManager = new EventManager(client);
		await eventManager.init();

		// Log in to Discord
		await client.login(process.env.TOKEN);

		return client;
	} catch (error) {
		logs.fatal(error, { tag: 'init' });
		throw error;
	}
};

const main = async (): Promise<void> => {
	try {
		await initializeClient();
	} catch (error) {
		logs.fatal(error, { tag: 'main' });
		process.exit(1);
	}
};

// Handle uncaught errors in the main process

main().catch((error) => {
	logs.fatal(error, { tag: 'uncaught' });
	process.exit(1);
});
