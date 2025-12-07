# Database & Services Architecture

NoryBot separates data persistence and business logic using a comprehensive **Service-Oriented Architecture**. This ensures that commands and components remain "thin" and focused only on user interaction.

## 1. The Service Pattern

Services are singleton classes or static utility collections that handle specific domain logic.

### Why Singetons?
Classes like `MongoService` are singletons because they manage a shared resource (the database connection) that must be unique across the application.

```typescript
// Accessing a singleton service
const mongo = MongoService.getInstance();
await mongo.connect();
```

## 2. MongoService (Deep Dive)

The `MongoService` is the core database handler. It wraps the Mongoose library with robust connection management.

### Key Technical Features
-   **Automatic Reconnection**: If the database connection drops, it automatically attempts to reconnect 5 times with a 5-second interval. `maxReconnectAttemptsReached` event is emitted if it fails.
-   **Event Driven**: It extends `EventEmitter`, allowing other parts of the bot to listen for `connected`, `disconnected`, or `error` states.
-   **Connection Pooling**: configured with a pool size of 2 (min) to 10 (max) to handle concurrent operations efficiently without overloading the database.

### Event Usage
```typescript
MongoService.getInstance().on('connected', () => {
    console.log("Database is ready!");
});
```

## 3. The Guard System

NoryBot uses "Guards" to abstract validation logic. A Guard is a reusable class that validates an interaction *before* the main code runs.

### Guard Interface
Every guard implements the `Guard` interface:
```typescript
interface Guard {
    name: string;
    validate(interaction: Interaction, component: BaseComponent): Promise<InteractionReplyOptions | null>;
}
```
If `validate` returns an object (Embed), the execution stops and that object is sent to the user. If it returns `null`, execution proceeds.

### Built-in Guards
1.  **PermissionGuard**: Checks `userPermissions` and `botPermissions`.
2.  **EnvironmentGuard**: Checks if command is run in the correct context (Guild-only, Voice-only).
3.  **CooldownGuard**: Checks `CooldownManager` to enforce rate limits.

## 4. Creating a New Mongoose Model

Models are the standard way to define data structure.

**File**: `src/database/schemas/GuildSettings.ts`

```typescript
import mongoose, { Schema, Document } from "mongoose";

interface IGuildSettings extends Document {
    guildId: string;
    prefix: string;
    modules: {
        moderation: boolean;
        economy: boolean;
    }
}

const GuildSettingsSchema = new Schema<IGuildSettings>({
    guildId: { type: String, required: true, unique: true, index: true },
    prefix: { type: String, default: "!" },
    modules: {
        moderation: { type: Boolean, default: true },
        economy: { type: Boolean, default: false }
    }
});

// Export the Model
export default mongoose.model<IGuildSettings>("GuildSettings", GuildSettingsSchema);
```

## 5. Implementing a Domain Service

Business logic services should abstract the database schema.

**File**: `src/services/GuildService.ts`

```typescript
import GuildSettings from "../database/schemas/GuildSettings";

export class GuildService {
    
    // Static methods are fine for stateless logic
    static async getSettings(guildId: string) {
        // Find or create pattern
        let settings = await GuildSettings.findOne({ guildId });
        if (!settings) {
            settings = await GuildSettings.create({ guildId });
        }
        return settings;
    }

    static async updatePrefix(guildId: string, newPrefix: string) {
        return GuildSettings.findOneAndUpdate(
            { guildId },
            { prefix: newPrefix },
            { new: true }
        );
    }
}
```
