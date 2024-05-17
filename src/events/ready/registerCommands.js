import 'colors';
import commandComparing from '../../utils/commandComparing.js';
import getApplicationCommands from '../../utils/getApplicationCommands.js';
import getLocalCommands from '../../utils/getLocalCommands.js';
import config from '../../config/config.json' assert { type: 'json' };
import { AutoModerationRuleKeywordPresetType } from 'discord.js';

export default async (client) => {
  try {
    const { testServerId } = config;
    const localCommands = await getLocalCommands();
    const applicationCommands = await getApplicationCommands(
      client,
      testServerId
    );

    for (const localCommand of localCommands) {
      const { data } = localCommand;

      const commandName = data.name;
      const commandDescription = data.description;
      const commandOptions = data.options;

      const existingCommand = await applicationCommands.cache.find(
        (cmd) => cmd.name === commandName
      );

      if (existingCommand) {
        if (localCommand.deleted) {
          await applicationCommands.delete(existingCommand.id);
          console.log(
            `Application command ${commandName} has been deleted.`.red
          );
          continue;
        }

        if (commandComparing(existingCommand, localCommand)) {
          await applicationCommands.edit(existingCommand.id, {
            name: commandName,
            description: commandDescription,
            options: commandOptions,
          });
          console.log(
            `Application command ${commandName} has been edited.`.yellow
          );
        }
      } else {
        if (localCommand.deleted) {
          console.log(
            `Application command ${commandName} has been skipped, since property "deleted" is set to "true".`
              .grey
          );
          continue;
        }

        await applicationCommands.create({
          name: commandName,
          description: commandDescription,
          options: commandOptions,
        });
        console.log(
          `Application command ${commandName} has been registered.`.green
        );
      }
    }
  } catch (err) {
    console.log(`An error occurred while registering commands! ${err}`.red);
  }
};
