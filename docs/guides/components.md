# Component Handling System

The NoryBot component system is built on a robust, unified **`ComponentManager`**. It handles Buttons, Select Menus, and Modals with a centralized logic flow that includes caching, dynamic ID resolution, input validation (guards), and performance metrics.

## 1. Technical Architecture

All components are loaded into memory when the bot starts and are managed by the `ComponentManager` singleton.

### Storage & Caching
-   **Maps**: Components are stored in three separate Maps: `buttons`, `selects`, and `modals`.
-   **LRU Cache**: Frequently accessed components (including dynamically resolved ones) are cached in a Least Recently Used (LRU) cache with a 1-hour TTL. This minimizes lookup time for popular features.

### The Resolution Loop (How it works)
When a user interacts with a component:
1.  **Cache Check**: The manager checks if this `customId` is already in the `LRUCache`.
2.  **Exact Match**: It checks if the `customId` exists exactly in the relevant Map.
3.  **Dynamic Resolution (Prefix Match)**:
    -   If no exact match is found, the manager iterates through registered components to see if the ID *starts with* a known key.
    -   Example: `ban_user:123` starts with `ban_user`.
    -   It extracts the suffix (`:123`) as arguments and caches this resolution for future speed.

## 2. Component Configuration

Every component exports an object that implements the `BaseComponent` interface. Here is the reference for all available properties:

| Property | Type | Description |
| :--- | :--- | :--- |
| **`customId`** | `string` | **Required**. The unique identifier for this component. Can be a prefix for dynamic IDs. |
| **`run`** | `function` | **Required**. The logic to execute. Receives `(client, interaction, args)`. |
| `cooldown` | `number` | Time in seconds a user must wait before using this component again. |
| `userPermissions` | `Permission[]` | Discord array of permissions the **User** must have (e.g., `Administrator`). |
| `botPermissions` | `Permission[]` | Permissions the **Bot** needs to execute this action. |
| `devOnly` | `boolean` | If `true`, only Bot Developers (defined in config) can use it. |
| `autoDefer` | `boolean` | If `true`, the bot automatically calls `deferReply/deferUpdate` to prevent timeouts. |
| `premiumOnly` | `boolean` | Restricts usage to premium/supporter guilds or users. |
| `voiceChannelOnly`| `boolean` | Restricts usage to users currently inside a Voice Channel. |
| `experimental` | `boolean` | Marks feature as beta; may warn user or restrict access. |

## 3. Dynamic IDs & Arguments

One of the most powerful features is **Dynamic ID Resolution**. You can pass state through the `customId` string.

### How to use it
1.  **Set the ID** with data separated by colons (or any separator, though `:` is standard).
    ```typescript
    // In your command
    new ButtonBuilder().setCustomId("ticket:close:12345");
    ```

2.  **Register the Component** with the *base prefix* only.
    ```typescript
    // src/components/buttons/tickets/close.ts
    export const component: Button = {
        customId: "ticket:close", // matches "ticket:close:..."
        run: async (client, interaction, args) => {
             // args[0] = "12345"
             const ticketId = args[0];
             await closeTicket(ticketId);
        }
    }
    ```

**Note**: The manager strips the base ID, checks for a separator (like `:`), and splits the rest into the `args` array.

## 4. Validation Guards

Before your `run` function is ever called, the interaction passes through a series of **Guards**:

1.  **EnvironmentGuard**: Checks context-specific requirements (Guild vs DM, Voice Channel requirements).
2.  **PermissionGuard**: Verifies `userPermissions` and `botPermissions`. Missing permissions trigger an automatic ephemeral error reply.
3.  **CooldownGuard**: Checks rate limits. If a user is on cooldown, it blocks execution and tells them how long to wait.

## 5. Directory Structure

Components are strictly organized by type in `src/components`:

```
src/components/
├── buttons/        # Button interactions
│   ├── moderation/
│   │   ├── ban.ts
│   │   └── kick.ts
│   └── misc/
├── selects/        # Dropdown menus
│   └── roles/
│       └── colorSelect.ts
└── modals/         # Form usage
    └── feedback/
        └── submit.ts
```

## Example: Fully Featured Button

**File**: `src/components/buttons/moderation/unlock.ts`

```typescript
import { PermissionFlagsBits } from "discord.js";

const unlockButton: Button = {
    customId: "mod:channel:unlock",
    
    // Security & Limits
    userPermissions: ["ManageChannels"],
    botPermissions: ["ManageChannels"],
    cooldown: 5,
    
    // Auto-Defer: Good for operations taking >3 seconds
    autoDefer: true, 

    run: async (client, interaction, args) => {
        // Because of 'autoDefer', we must use editReply or followUp
        const channelId = args[0]; 
        const channel = await client.channels.fetch(channelId);
        
        // ... logic to unlock channel ...

        await interaction.editReply({ 
            content: `🔓 Channel <#${channelId}> has been unlocked.` 
        });
    }
};

export default unlockButton;
```