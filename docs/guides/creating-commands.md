# Creating Commands

The NoryBot command system is powered by a robust **`CommandValidator`** handling lifecycle management, validation, and execution metrics.

## 1. Technical Architecture

Commands are lazily loaded and cached to ensure performance.

### Loading & Caching
-   **Lazy Initialization**: Commands are not loaded until the first interaction occurs (or explicit initialization), optimizing startup time.
-   **LRU Cache**: The list of local commands is cached in memory (2-hour TTL) to prevent repeated file system scans.
-   **Metrics**: Every command execution tracks usage, response time, and failure rates in memory.

### The Execution Loop
When a user sends a Slash Command:
1.  **Initialization Check**: If commands aren't loaded, the validator loads and caches them.
2.  **Maintenance Check**: If the bot is in maintenance mode, only developers can execute commands.
3.  **Validation**: The request passes through a rigorous series of checks (Cooldowns, Permissions, NSFW, etc.).
4.  **Execution**: The `run` function is executed.
5.  **Metrics Update**: Success/Failure execution time is recorded.

## 2. Command Configuration

Every command object must implement the `Command` (or `Command`) interface.

### The `Command` Object

| Property | Type | Description |
| :--- | :--- | :--- |
| **`data`** | `SlashCommandBuilder` | **Required**. Standard Discord.js builder defining name, description, and options. |
| **`run`** | `function` | **Required**. The function executed when the command is called. Receives `(client, interaction)`. |
| `cooldown` | `number` | Time in seconds a user must wait between uses. |
| `userPermissions` | `Permission[]` | Permissions the **User** must have (e.g., `Administrator`). |
| `botPermissions` | `Permission[]` | Permissions the **Bot** needs (e.g., `BanMembers`). |
| `devOnly` | `boolean` | If `true`, restricts usage to Bot Developers (defined in config). |
| `testMode` | `boolean` | If `true`, command only works in the configured Test Server. |
| `nsfwMode` | `boolean` | If `true`, command only works in NSFW-marked channels (Guild only). |
| `deleted` | `boolean` | Logic soft-delete; command will be ignored if set to true. |

## 3. Creating a Command

**File**: `src/commands/General/Ping.ts`

```typescript
import { SlashCommandBuilder } from "discord.js";
// Global 'Command' type is available

const pingCommand: Command = {
    // 1. Definition
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Check the bot's latency"),

    // 2. Configuration
    cooldown: 5, // 5 seconds cooldown
    
    // 3. Execution
    run: async (client, interaction) => {
        const start = Date.now();
        await interaction.reply({ content: "Pinging...", ephemeral: true });
        
        const latency = Date.now() - start;
        await interaction.editReply(`Pong! 🏓 Latency: ${latency}ms`);
    }
};

export default pingCommand;
```

## 4. Validation Steps

Before `run` is called, the Validator checks these conditions in order:

1.  **Maintenance Mode**: Is the bot in maintenance? (Bypass for Developers).
2.  **Cooldown**: Is the user on cooldown? (Returns time remaining).
3.  **Developer Only**: Is `devOnly` set and user is not a dev?
4.  **Test Mode**: Is `testMode` set and guild is not the Test Server?
5.  **NSFW**: Is `nsfwMode` set and channel is not NSFW?
6.  **User Permissions**: Does user lack `userPermissions`?
7.  **Bot Permissions**: Does bot lack `botPermissions`?

If any check fails, the bot automatically replies with an appropriate error embed.

## 5. Autocomplete Support

To support autocomplete options, add an `autocomplete` function to your command object.

```typescript
const command: Command = {
    data: new SlashCommandBuilder()
        .setName("search")
        .setDescription("Search things")
        .addStringOption(opt => 
            opt.setName("query")
               .setDescription("Search query")
               .setAutocomplete(true)
        ),
        
    autocomplete: async (client, interaction) => {
        const focused = interaction.options.getFocused();
        // Return matching choices
        await interaction.respond([
            { name: "Option 1", value: "1" },
            { name: "Option 2", value: "2" }
        ]);
    },
    
    run: async (client, interaction) => { /* ... */ }
};
```
