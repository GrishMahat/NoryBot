

# Creating Bot Commands

Commands should be placed in an appropriate subdirectory under `src/commands/`. For example, you might create a file at `src/commands/dev/ping.ts` for a development command.

## Command File Structure

Each command is defined as an object that conforms to a custom `LocalCommand` type (see `src/types/index.ts` for details). A typical command includes the following components:

- **Command Metadata:**  
  Defined with a `SlashCommandBuilder` from the `discord.js` library. This includes the command name, description, and any additional properties (like contexts or integration types).

- **Permissions:**  
  - `userPermissions`: Array of permissions required for the user to run the command.  
  - `botPermissions`: Array of permissions required for the bot to execute the command.

- **Mode Flags:**  
  - `nsfwMode`: If `true`, the command is restricted to NSFW channels.  
  - `cooldown`: Specifies a cooldown (in seconds) between uses.  
  - `testMode`: If `true`, the command is only available in test environments.  
  - `deleted`: If `true`, the command won't be registered.  
  - `devOnly`: If `true`, only developers can use the command.

- **Execution Function (`run`):**  
  This asynchronous function contains the logic executed when the command is invoked. It receives a `Client` and a `ChatInputCommandInteraction` as parameters.

- **Optional Autocomplete:**  
  If provided, this function handles autocomplete logic when users are entering command options.

---

## Example: Ping Command

Below is an example implementation of a simple ping command that measures latency. This command demonstrates the structure and components discussed above.

```ts
import {
  EmbedBuilder,
  SlashCommandBuilder,
  Client,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from 'discord.js';

// The LocalCommand type is imported globally; see src/types/index.ts for details.
const pingCommand: LocalCommand = {
  // Command metadata: Define the command's name, description, and you need .toJSON() work
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Shows detailed system statistics and bot performance metrics')
    .toJSON(),

  // Optional permission settings: These arrays specify the permissions required by users and the bot.
  userPermissions: [],
  botPermissions: [],

  // Additional configuration flags:
  nsfwMode: true,    // Command can only be used in NSFW channels.
  cooldown: 10,      // 10-second cooldown between command uses.
  testMode: false,   // Command is available in production.
  deleted: false,    // Command is active and will be registered.
  devOnly: true,     // Only developers can execute this command.

  // Main execution function: Contains the logic for the command.
  run: async (client: Client, interaction: ChatInputCommandInteraction): Promise<void> => {
    try {
      // Record the time before deferring the reply to measure latency.
      const startTime = Date.now();
      await interaction.deferReply();
      const endTime = Date.now();
      const ping = endTime - startTime;

      // Edit the deferred reply with the latency information.
      await interaction.editReply({ content: `Pong! Latency is ${ping}ms` });
    } catch (error) {
      console.error('Error in ping command:', error);
      await interaction.editReply({
        content: `${emojiConfig.notag} An error occurred while fetching system statistics.`,
      });
    }
  },

  // Optional autocomplete function: Used to provide command option suggestions.
  autocomplete?: async (
    client: Client,
    interaction: AutocompleteInteraction,
  ): Promise<void> => {
    // Add autocomplete logic here if needed.
  },
};

export default pingCommand;
```

---

## How to Use This Guide

1. **File Placement:**  
   Save your command file in the appropriate subdirectory (e.g., `src/commands/dev/`).

2. **Defining Metadata:**  
   Use `SlashCommandBuilder` to define the command's metadata. This ensures that Discord can properly register and display your command.

3. **Setting Permissions and Modes:**  
   Configure any permissions or mode flags according to your bot's requirements. For instance, setting `nsfwMode` to `true` restricts the command to NSFW channels only.

4. **Implementing the `run` Function:**  
   Place your command logic inside the `run` function. In the ping command example, the function calculates the bot's response time by measuring the delay between deferring and editing a reply.

5. **Adding Autocomplete (Optional):**  
   If your command supports autocomplete, implement the logic in the provided `autocomplete` function.

This structure provides a clear and consistent approach for creating commands in your Discord bot, ensuring that each command is easy to understand, maintain, and extend.

For more advanced usage, refer to the [Discord.js documentation](https://discord.js.org/#/docs) and your project’s custom types in `src/types/index.ts`.

