import {
  Client,
  GuildApplicationCommandManager,
  ApplicationCommandManager,
  ApplicationCommand,
} from 'discord.js';

/**
 * Fetches and caches the application commands for a given client and guild ID.
 * This function dynamically determines whether to fetch guild-specific or global commands based on the presence of a guild ID.
 *
 * @param {Client} client - The Discord client instance, which is used to interact with the Discord API.
 * @param {string} [guildId] - The guild ID to fetch commands for. If not provided, the function fetches global commands.
 * @returns {Promise<Array<ApplicationCommand>>} A promise that resolves to an array of fetched application commands.
 * @throws {Error} - Throws an error if the client application is not initialized.
 * @example
 * // Fetch global commands
 * fetchApplicationCommands(client).then(commands => {
 *   console.log('Global commands:', commands);
 * }).catch(error => {
 *   console.error('Error fetching global commands:', error);
 * });
 *
 * @example
 * // Fetch guild-specific commands
 * fetchApplicationCommands(client, 'guild-id').then(commands => {
 *   console.log('Guild commands:', commands);
 * }).catch(error => {
 *   console.error('Error fetching guild commands:', error);
 * });
 *
 * @note
 * Ensure that the client application is initialized before calling this function.
 */
const fetchApplicationCommands = async (
  client: Client,
  guildId?: string
): Promise<Array<ApplicationCommand>> => {
  let applicationCommands:
    | GuildApplicationCommandManager
    | ApplicationCommandManager;

  // Determine whether to fetch guild-specific or global commands
  if (guildId) {
    // Fetch the guild instance for the given guild ID
    const guild = await client.guilds.fetch(guildId);
    // Get the commands manager for the guild
    applicationCommands = guild.commands;
  } else {
    // Ensure client.application is defined
    if (!client.application) {
      throw new Error('Client application is not initialized.');
    }
    // Fetch the global commands for the client's application
    applicationCommands = client.application.commands;
  }

  // Fetch the commands from the API and cache them
  const fetchedCommands = await applicationCommands.fetch({});
  // Return the fetched and cached commands as an array
  return Array.from(fetchedCommands.values());
};

export default fetchApplicationCommands;
