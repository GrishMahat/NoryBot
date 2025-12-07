# Context Menus

Context Menus are commands that appear when you right-click a **User** or a **Message** in Discord (Apps > Command Name).

In NoryBot, these are handled separately from Slash Commands, located in `src/contextmenus/`.

## 1. Directory Structure

```
src/contextmenus/
├── user/       # Rights-click on Users
│   └── info.ts
└── message/    # Right-click on Messages
    └── quote.ts
```

## 2. Creating a Context Menu

Context Menu files export an object with two main properties: `data` and `run`.

### User Context Menu Example

**File**: `src/contextmenus/user/info.ts`

```typescript
import { 
    ContextMenuCommandBuilder, 
    ApplicationCommandType, 
    ContextMenuCommandInteraction,
    EmbedBuilder,
    Client 
} from "discord.js";

export default {
    // 1. Define the Command Data
    data: new ContextMenuCommandBuilder()
        .setName("User Info")
        .setType(ApplicationCommandType.User), // Important: Type USER

    // 2. The Run Function
    run: async (client: Client, interaction: ContextMenuCommandInteraction) => {
        // Guard check for type safety
        if (!interaction.isUserContextMenuCommand()) return;

        const targetUser = interaction.targetUser;
        const targetMember = interaction.targetMember; // If in a guild

        const embed = new EmbedBuilder()
            .setTitle(`User Info: ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: "ID", value: targetUser.id },
                { name: "Bot", value: targetUser.bot ? "Yes" : "No" }
            );

        await interaction.reply({ 
            embeds: [embed], 
            ephemeral: true 
        });
    }
};
```

### Message Context Menu Example

**File**: `src/contextmenus/message/bookmark.ts`

```typescript
import { 
    ContextMenuCommandBuilder, 
    ApplicationCommandType, 
    ContextMenuCommandInteraction,
    Client 
} from "discord.js";

export default {
    // 1. Define Type MESSAGE
    data: new ContextMenuCommandBuilder()
        .setName("Bookmark Message")
        .setType(ApplicationCommandType.Message),

    // 2. Run Function
    run: async (client: Client, interaction: ContextMenuCommandInteraction) => {
        if (!interaction.isMessageContextMenuCommand()) return;

        const targetMessage = interaction.targetMessage;

        // Logic to DM the user the message link
        await interaction.user.send({
            content: `You bookmarked a message: ${targetMessage.url}`
        });

        await interaction.reply({ 
            content: "Message bookmarked! Check your DMs.", 
            ephemeral: true 
        });
    }
};
```

## 3. Registration

Context Menus are registered to Discord alongside Slash Commands by the `CommandRegistrationService`. It scans the `src/contextmenus` folder and uploads the definitions found in `data`.
