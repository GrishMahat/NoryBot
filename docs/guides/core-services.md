# Core Services & Managers

NoryBot's functionality is powered by several core systems located in `src/services/`. These systems handle registration, validation, and state management.

## 1. Command Registration (`src/services/CommandRegistrationService.ts`)

This service handles the synchronization of your local commands with Discord's API.

-   **Development Mode**: Commands are registered immediately to the specific Test Guild (defined in config) for instant updates.
-   **Production Mode**: Commands are registered Globaly (may take up to 1 hour to propagate).
-   **Validation**: It compares local command data with existing remote commands to avoid unnecessary API calls (rate limit prevention).

## 2. Managers (`src/services/manager/`)

Managers are singletons that handle state for specific features.

### ComponentManager
Handles all Button, Select Menu, and Modal interactions.
-   **Docs**: See [Component Handling](./components.md) for a deep dive.

### CooldownManager
Tracks command usage to enforce rate limits.
-   **Storage**: Uses an in-memory Map to store timestamps.
-   **Logic**: `checkCooldown(userId, commandName)` returns the remaining time in seconds.

### LRUCache
A utility class implementing a **Least Recently Used** cache policy.
-   Used by `ComponentManager` and `CommandValidator` to store frequently accessed data in memory while preventing memory leaks by evicting old items.

## 3. Guards (`src/services/guards/`)

Guards authenticate and validate interactions *before* they reach your command logic. See [Database & Services](./database-and-services.md#3-the-guard-system) for implementation details.

-   **EnvironmentGuard**: Ensures command runs in allowed contexts (Guild/DM).
-   **PermissionGuard**: Enforces `userPermissions` and `botPermissions`.

## 4. Error Handling (`src/services/error/`)

The bot features a global error handling service.
-   It catches unhandled rejections and exceptions.
-   **Webhook Logging**: Critical errors are sent to the configured Discord Webhook (`ERROR_WEBHOOK`).
-   It attempts to reply to the user if the interaction is still pending, ensuring they aren't left with a "bot is thinking" state.
