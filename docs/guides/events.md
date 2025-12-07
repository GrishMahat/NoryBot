# Event Handling System

NoryBot uses a powerful **`EventManager`** to load and register Discord events. This system allows you to organize event listeners into folders and granular files.

## 1. Directory Structure

Events are located in `src/events/`.
The **folder name** determines which Discord event is listened to.

```
src/events/
├── clientReady/        # Listens for 'ClientReady'
│   └── consoleLog.ts
├── guildMemberAdd/     # Listens for 'GuildMemberAdd'
│   ├── welcome.ts
│   └── autoRole.ts
└── messageCreate/      # Listens for 'MessageCreate'
    └── handler.ts
```

> **Special Case**: The `validations` folder is mapped to the `interactionCreate` event automatically.

## 2. Event File Structure

Each file in an event folder should export a **default function**.

### Basic Example

**File**: `src/events/messageCreate/pingReply.ts`

```typescript
import { Client, Message } from "discord.js";

// 1. Define the handler function
const pingReply = async (client: Client, message: Message) => {
    if (message.author.bot) return;

    if (message.content === "!ping") {
        await message.reply("Pong!");
    }
};

export default pingReply;
```

### Advanced Configuration (Priority & Once)

You can attach properties to your default function to control how it is registered.

-   **`priority`**: Controls the order of execution. Higher numbers run first. Default is `0`.
-   **`once`**: If `true`, the listener runs only once and then unregisters. Default is `false`.

**File**: `src/events/clientReady/log.ts`

```typescript
import { Client } from "discord.js";

const logReady = async (client: Client) => {
    console.log(`Logged in as ${client.user?.tag}!`);
};

// Run this LAST (low priority)
logReady.priority = -1; 

// Run this ONLY ONCE (when bot starts)
logReady.once = true;

export default logReady;
```

## 3. How EventManager Works (Technical)

The `EventManager` (`src/handlers/eventHandler.ts`) performs the following steps:

1.  **Scanning**: Recursively finds all `.ts` files in `src/events`.
2.  **Mapping**: Uses the **parent folder name** to determine the `ClientEvent` name (e.g., folder `ready` -> event `ready`).
3.  **Loading**: Imports the file.
4.  **Registration**:
    -   It aggregates all functions for a specific event.
    -   It sorts them by `priority` (descending).
    -   It registers a **single wrapper function** to the Discord Client.
5.  **Execution**: When the event fires, the wrapper iterates through the sorted handlers.
    -   **Error Safety**: Each handler is wrapped in a `try/catch`. If one handler crashes, others still run, and the error is logged via `global.logger`.
