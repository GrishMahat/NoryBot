import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import errorHandler from './utils/errorHandler.js';

if (!process.env.TOKEN) {
  console.error("TOKEN is not defined in the environment variables");
  process.exit(1);
}

(async () => {
  try {
    const { default: eventHandler } = await import('./handlers/eventHandler.js');

    const client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });

    // Initialize error handling
    errorHandler.errorHandler(client);

    // Initialize event handling
    await eventHandler(client);

    // Login the bot
    await client.login(process.env.TTOKEN);

    // Schedule daily error summary report
    setInterval(() => {
      errorHandler.sendDailyErrorSummaryReport(errorHandler.errorCounts);
    }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds


  } catch (error) {
    console.error('Error during bot initialization:', error);
    process.exit(1);
  }
})();
