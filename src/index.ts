import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import loadEventHandlers from './handlers/eventHandler.js';
import ErrorHandler from './handlers/errorHandler.js';

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
  const client = new Client<boolean>({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
  });

  // Initialize error handler with client
  errorHandler.initialize(client);

  // Load event handlers
  await loadEventHandlers(client);

  // Log in to Discord
  await client.login(process.env.TOKEN);

  return client;
};

const main = async (): Promise<void> => {
  try {
    await initializeClient();
  } catch (error) {
    await errorHandler.handleError(error, 'MainProcessError');
    process.exit(1);
  }
};

process.on('uncaughtException', async (error) => {
  await errorHandler.handleError(error, 'UncaughtException');
  process.exit(1);
});

process.on('unhandledRejection', async (error) => {
  await errorHandler.handleError(error, 'UnhandledRejection');
  process.exit(1);
});

process.on('SIGINT', () => {
  errorHandler.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  errorHandler.destroy();
  process.exit(0);
});

main().catch(async (error) => {
  await errorHandler.handleError(error, 'UncaughtError');
  process.exit(1);
});
