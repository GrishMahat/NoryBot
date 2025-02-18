Below is an improved documentation guide for creating interactive buttons in your Discord bot, along with a sample implementation. This guide outlines the file structure, key configuration options, and example code so that you can easily add new button interactions.

---

# Creating Buttons

Buttons allow users to interact directly with your bot. Each button is defined as an object that conforms to a custom `Button` type (see `src/types/index.ts` for details). To organize your button interactions, create separate files under `src/buttons/`. For example, you might add a file at `src/buttons/testButton.ts`.

## Buttons File Structure

Each button object typically includes:

- **Custom ID:**  
  A unique identifier (e.g., `customId: 'test-button'`) that distinguishes this button interaction.

- **Permissions:**  
  Define which permissions are required for the user or the bot:
  - `userPermissions`: An array of permissions required for the user.
  - `botPermissions`: An array of permissions required for the bot.

- **Configuration Flags:**  
  Set additional options to control where and how the button can be used:
  - `nsfwMode`: If `true`, the button can only be used in NSFW channels.
  - `cooldown`: The cooldown period (in seconds) between button uses.
  - `testMode`: If `true`, the button is available only in testing environments.
  - `deleted`: If `true`, the button won't be registered.
  - `devOnly`: If `true`, only developers can execute this button.

- **Execution Function (`run`):**  
  This asynchronous function contains the logic executed when the button is clicked. It receives a `Client` instance and a `ButtonInteraction`.

---

## Example: Test Button

Below is an example implementation of a simple test button. When clicked, it replies with a confirmation message.

```ts
import { ButtonInteraction, Client } from 'discord.js';
import { Button } from '../types/index.js';

// The test button object conforms to the custom Button type.
const testButton: Button = {
  // Unique identifier for the button.
  customId: 'test-button',
    // Optional permission settings and configuration flags:
  userPermissions: [],
  botPermissions: [],
  nsfwMode: true,    // Only allow in NSFW channels.
  cooldown: 10,      // 10-second cooldown.
  testMode: false,   // Available in production.
  deleted: false,    // Button is active.
  devOnly: true,     // Only accessible by developers.


  // Main execution function: Contains the logic executed when the button is clicked.
  run: async (client: Client, interaction: ButtonInteraction) => {
    try {
      // Reply to the interaction to confirm the button was clicked.
      await interaction.reply('Test button clicked!');
    } catch (error) {
      console.error('Error in test button:', error);
      // Optionally, handle errors gracefully.
      await interaction.reply({
        content: 'There was an error processing your interaction.',
        ephemeral: true,
      });
    }
  },

};

export default testButton;
```

---

## How to Use This Guide

1. **File Placement:**  
   Place your button file under `src/buttons/` to keep your project organized.

2. **Defining the Button:**  
   Create a button object that conforms to your custom `Button` type. Ensure the `customId` is unique to avoid conflicts with other buttons.

3. **Implementing Logic:**  
   Write your button logic inside the asynchronous `run` function. This is where you define what happens when the button is clicked.

4. **Optional Configuration:**  
   Configure additional options like permissions, NSFW mode, cooldowns, test mode, and developer-only access by uncommenting and setting the respective properties.

This documentation provides a clear and modular approach for adding button interactions to your Discord bot. For more advanced usage or customization, consult the [Discord.js documentation](https://discord.js.org/#/docs) and your project’s custom types in `src/types/index.ts`.

