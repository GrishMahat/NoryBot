# Getting Started with NoryBot

This guide will help you set up and run NoryBot on your system.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v16.9.0 or higher)
- [PNPM](https://pnpm.io/) package manager
- [MongoDB](https://www.mongodb.com/) database
- [Discord Developer Account](https://discord.com/developers/applications)

## Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/NoryBot.git
   cd NoryBot
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   ```env
   TOKEN=your_discord_bot_token
   MONGODB_TOKEN=your_mongodb_uri
   NODE_ENV=development
   ERROR_WEBHOOK=your_error_webhook_url
   ```

4. **Build the Project**
   ```bash
   pnpm build
   ```

5. **Start the Bot**
   ```bash
   pnpm start
   ```

## Development Mode

For development, use:
```bash
pnpm dev
```
This enables hot reloading for faster development.

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm start` | Start the bot |
| `pnpm dev` | Start with hot reload |
| `pnpm build` | Build the project |
| `pnpm test` | Run tests |
| `pnpm pre` | Format code |

## Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Add a bot to your application
4. Enable required intents:
   - Presence Intent
   - Server Members Intent
   - Message Content Intent
5. Copy the bot token to your `.env` file

## Adding Bot to Servers

1. Go to OAuth2 > URL Generator
2. Select scopes:
   - `bot`
   - `applications.commands`
3. Select required permissions
4. Copy and use the generated URL to invite the bot

## Next Steps

- Check out the [Configuration Guide](./configuration.md)
- Learn about available [Commands](./features/commands.md)
- Read our [Contributing Guidelines](./contributing.md)
- Join our [Support Server](https://discord.gg/your-server)

## Troubleshooting

If you encounter issues:

1. Check the [Troubleshooting Guide](./troubleshooting.md)
2. Review the [FAQ](./faq.md)
3. Open an [Issue](https://github.com/yourusername/NoryBot/issues)

## Need Help?

- Join our [Discord Server](https://discord.gg/your-server)
- Check our [Documentation](./README.md)
- Open a [GitHub Issue](https://github.com/yourusername/NoryBot/issues) 