import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";
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
  }
});

/**
 * Initializes a Discord client with the specified intents and loads event handlers.
 * This function creates a new Discord.js client, configures it with the necessary 
 * intents, and loads the event handlers before logging in using the provided token.
 *
 * @async
 * @function initializeClient
 * @returns {Promise<Client<boolean>>} A promise that resolves to the initialized Discord client instance.
 * @throws {Error} If the client fails to login, an error is thrown with the relevant message.
 * 
 * @example
 * // Basic usage example
 * initializeClient()
 *   .then(client => {
 *     console.log('Discord client successfully initialized:', client);
 *   })
 *   .catch(error => {
 *     console.error('Failed to initialize Discord client:', error);
 *   });
 *
 * @note Ensure that the `TOKEN` environment variable is properly set in your `.env` file.
 * The Discord bot will not start without a valid bot token.
 *
 * @since 0.0.1
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

/**
 * Main function to initialize the Discord client and set up additional services like the email server.
 * This function calls `initializeClient()` to start the bot, then calls `setupEmailServer()` 
 * to set up an email system associated with the bot. Handles errors with proper logging and exits the process 
 * if initialization fails.
 *
 * @async
 * @function main
 * @returns {Promise<void>} A promise that resolves when both the Discord client and email server are set up successfully.
 * @throws {Error} If either the Discord client initialization or the email server setup fails, an error is thrown and logged.
 * 
 * @example
 * // Basic usage example
 * main()
 *   .catch(error => {
 *     console.error('An unhandled error occurred in the main function:', error);
 *   });
 *
 * @note It's crucial to handle unhandled rejections to avoid silent failures. 
 * Exiting the process with a non-zero status code ensures the application can be restarted.
 *
 * @since 0.0.1
 * @see {@link initializeClient} for initializing the Discord client.
 * @see {@link setupEmailServer} for setting up the email server.
 */
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
