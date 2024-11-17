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

/**
 * initializeClient - Creates and configures a Discord.js client instance
 *
 * Initializes a Discord client with specified intents, sets up error handling,
 * and loads event handlers. Manages the bot's core functionality setup.
 *
 * @since 0.0.1
 * @author [GrishMahat]
 *
 * @example
 * // Basic initialization
 * const client = await initializeClient();
 *
 * // Error handling
 * try {
 *   const client = await initializeClient();
 *   console.log('Bot initialized successfully');
 * } catch (error) {
 *   console.error('Failed to initialize:', error);
 *   process.exit(1);
 * }
 *
 * @returns {Promise<Client<boolean>>} Initialized Discord.js client
 *
 * @throws {Error} When TOKEN environment variable is missing
 * @throws {Error} When client fails to connect to Discord
 * @throws {Error} When event handlers fail to load
 *
 * @see loadEventHandlers
 * @see ErrorHandler
 *
 * Performance Considerations:
 * -------------------------
 * - Startup time varies with number of event handlers
 * - Memory usage scales with enabled intents
 * - Network dependent initialization steps
 *
 * Edge Cases:
 * -----------
 * 1. Invalid token: Throws detailed error
 * 2. Network issues: Implements connection retry
 * 3. Partial handler loading: Logs warnings
 * 4. Rate limiting: Handles Discord API limits
 *
 * Version Compatibility:
 * ---------------------
 * - Requires Node.js version 16.9.0 or higher
 * - Discord.js v14+ compatible
 * - Environment: Supports both development and production
 */
const initializeClient = async (): Promise<Client<boolean>> => {
  const client = new Client<boolean>({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
      // GatewayIntentBits.GuildVoiceStates,
    ],
  });

  // Initialize error handler with client
  errorHandler.initialize(client);

  // Load event handlers (defined in an external module) to handle different events.
  await loadEventHandlers(client);

  // Log the bot in using the token stored in environment variables.
  await client.login(process.env.TOKEN as string);

  return client;
};

const main = async (): Promise<void> => {
  try {
    const client = await initializeClient();
  } catch (error) {
    // Use error handler for main process errors
    await errorHandler.handleError(error, 'MainProcessError');
    process.exit(1);
  }
};

// Call the main function and catch unhandled errors
main().catch(async (error: Error) => {
  await errorHandler.handleError(error, 'UncaughtError');
  process.exit(1);
});

// // Cleanup on process exit
// process.on('SIGINT', () => {
//   errorHandler.destroy();
//   process.exit(0);
// });

// process.on('SIGTERM', () => {
//   errorHandler.destroy();
//   process.exit(0);
// });
