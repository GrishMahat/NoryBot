import 'colors';
import {
  ApplicationCommand,
  Client,
  ApplicationCommandType,
  ApplicationCommandOptionData,
} from 'discord.js';
import { config } from '../../config/config.js';
import getLocalCommands from '../../utils/getLocalCommands.js';
import getApplicationCommands from '../../utils/getApplicationCommands.js';
import compareCommands from '../../utils/commandComparing.js';
import { LocalCommand } from '../../types/index.js';

/**
 * Synchronizes local command definitions with the Discord application's registered commands.
 * This function performs the following steps:
 * - Fetches local command definitions and registered application commands.
 * - Deletes commands from the application that are no longer present locally.
 * - Updates existing commands if there are any changes.
 * - Registers new commands that are defined locally but not yet registered.
 * - Logs the changes made during the synchronization process.
 *
 * @async
 * @function syncCommands
 * @param {Client} client - The Discord.js client instance.
 * @returns {Promise<void>} Resolves when the synchronization process is complete.
 * @throws {Error} Throws an error if fetching commands fails or if unexpected issues occur.
 *
 * @example
 * // Usage in your main bot file

 *
 * @note
 * Ensure that you have the necessary permissions to manage application commands.
 * This function should be called after the client is ready.
 *
 * @since 0.0.1
 * @see {@link https://discord.js.org/#/docs/main/stable/class/Client|Discord.js Client}
 * @see {@link https://discord.com/developers/docs/interactions/application-commands|Discord Application Commands}
 *
 * @todo
 * - Implement caching mechanisms to reduce redundant API calls.
 * - Include validation for command data before attempting to register or update.
 * - Provide better error handling and retry logic for rate limits.
 */

export default async (client: Client): Promise<void> => {
  try {
    const [localCommands, applicationCommands] = await Promise.all([
      getLocalCommands(),
      getApplicationCommands(client),
    ]);

    if (!localCommands || !applicationCommands) {
      throw new Error('Failed to fetch commands');
    }

    const deletedCommands: string[] = [];
    const updatedCommands: string[] = [];
    const newCommands: string[] = [];

    await deleteUnusedCommands(
      applicationCommands,
      localCommands,
      deletedCommands
    );

    await updateOrCreateCommands(
      applicationCommands,
      localCommands,
      client,
      updatedCommands,
      newCommands
    );

    logCommandChanges(
      localCommands,
      updatedCommands,
      newCommands,
      deletedCommands
    );
  } catch (err: any) {
    console.error(
      `[${new Date().toISOString()}] Error during command sync: ${
        err?.message ?? 'Unknown error'
      }`.red
    );
  }
};
/**
 * Deletes application commands that are not present in the local command definitions.
 *
 * @async
 * @function deleteUnusedCommands
 * @param {ApplicationCommand[]} applicationCommands - The list of commands registered with the application.
 * @param {LocalCommand[]} localCommands - The list of local command definitions.
 * @param {string[]} deletedCommands - An array to store the names of deleted commands.
 * @returns {Promise<void>} Resolves when deletion is complete.
 *
 * @throws {Error} Throws an error if command deletion fails.
 *
 * @example
 * // Called internally within syncCommands
 * await deleteUnusedCommands(applicationCommands, localCommands, deletedCommands);
 *
 * @since 0.0.1
 */

async function deleteUnusedCommands(
  applicationCommands: ApplicationCommand[],
  localCommands: LocalCommand[],
  deletedCommands: string[]
): Promise<void> {
  const localCommandNames = new Set(
    localCommands.map((cmd) => cmd.data?.name).filter(Boolean)
  );
  const commandsToDelete = applicationCommands.filter(
    (cmd) =>
      cmd.type === ApplicationCommandType.ChatInput &&
      cmd.name &&
      !localCommandNames.has(cmd.name)
  );

  await Promise.all(
    commandsToDelete.map(async (cmd) => {
      if (cmd.name) {
        await cmd.delete();
        deletedCommands.push(cmd.name);
      }
    })
  );
}

async function updateOrCreateCommands(
  applicationCommands: ApplicationCommand[],
  localCommands: LocalCommand[],
  client: Client,
  updatedCommands: string[],
  newCommands: string[]
): Promise<void> {
  for (const [index, localCommand] of localCommands.entries()) {
    try {
      if (!localCommand || !localCommand.data || !localCommand.data.name) {
        continue;
      }

      const { data } = localCommand;
      const commandName = data.name;

      const existingCommand = applicationCommands.find(
        (cmd) => cmd.name === commandName
      );

      if (existingCommand) {
        const isUpdated = await handleExistingCommand(
          existingCommand,
          localCommand
        );
        if (isUpdated) updatedCommands.push(commandName);
      } else {
        await createCommand(client, data);
        newCommands.push(commandName);
      }
    } catch (error: any) {
      console.error(
        `[${new Date().toISOString()}] Error processing command ${index + 1}: ${
          error.message
        }`.red
      );
    }
  }
}

async function handleExistingCommand(
  existingCommand: ApplicationCommand,
  localCommand: LocalCommand
): Promise<boolean> {
  const needsUpdate = compareCommands(existingCommand, localCommand);

  if (needsUpdate) {
    try {
      await existingCommand.edit({
        name: localCommand.data.name,
        description: localCommand.data.description ?? '',
        contexts: localCommand.data.contexts ?? [0, 1],
        integrationTypes: localCommand.data.integration_types ?? [0, 1],
        options:
          (localCommand.data.options as ApplicationCommandOptionData[]) ?? [],
      });

      return true;
    } catch (error: any) {
      console.error(
        `[${new Date().toISOString()}] Error updating command ${
          localCommand.data.name
        }: ${error.message}`.red
      );
      return false;
    }
  }
  return false;
}


async function createCommand(
  client: Client,
  data: LocalCommand['data']
): Promise<void> {
  if (!data || !data.name) {
    return;
  }

  try {
    await client.application?.commands.create({
      name: data.name,
      description: data.description ?? '',
      contexts: data.contexts ?? [0, 1],
      integrationTypes: data.integration_types ?? [0, 1],
      options: (data.options as ApplicationCommandOptionData[]) ?? [],
    });
  } catch (err: any) {
    console.error(
      `[${new Date().toISOString()}] Failed to create command ${data.name}: ${
        err?.message ?? 'Unknown error'
      }`.red
    );
  }
}

function logCommandChanges(
  localCommands: LocalCommand[],
  updatedCommands: string[],
  newCommands: string[],
  deletedCommands: string[]
): void {
  console.log(`Total Commands: ${localCommands.length}`.yellow);
  console.log('--------------------------------------------------'.cyan);

  if (updatedCommands.length) {
    console.log('Edited Commands:'.yellow);
    updatedCommands.forEach((cmd) => console.log(`  - ${cmd}`.white));
  }
  
  if (newCommands.length) {
    console.log('Newly Registered Commands:'.green);
    newCommands.forEach((cmd) => console.log(`  - ${cmd}`.white));
  }

  if (deletedCommands.length) {
    console.log('Deleted Commands:'.red);
    deletedCommands.forEach((cmd) => console.log(`  - ${cmd}`.white));
  }

  console.log('=================================================='.cyan);
}
