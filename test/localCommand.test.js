import getLocalCommands from "../src/utils/getLocalCommands.js";
import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';

export default async (client) => {
  try {
    const localCommands = getLocalCommands();
    // Perform actions with localCommands
  } catch (error) {
    console.log(error);
  }
};

// Initialize the Discord.js client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

const localCommands = getLocalCommands();
console.log(localCommands)
// Login the client using the token from environment variables
client.login(process.env.TOKEN).catch(console.error);
