# NoryBot

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

A powerful Discord bot built with Discord.js v14, TypeScript, and MongoDB, featuring a modern and scalable architecture.

## 📚 Documentation

We have comprehensive documentation available to help you get started:

### Basics
-   **[Getting Started](./docs/getting-started.md)**: Installation, setup, and running the bot.
-   **[Architecture Overview](./docs/architecture.md)**: Understand the tech stack and design decisions.

### Developer Guides
-   **[Creating Commands](./docs/guides/creating-commands.md)**: Slash commands, validation, and options.
-   **[Context Menus](./docs/guides/context-menus.md)**: Right-click commands on Users and Messages.
-   **[Components](./docs/guides/components.md)**: Buttons, Select Menus, Modals, and the Component Manager.
-   **[Events](./docs/guides/events.md)**: Handling Discord events (Ready, MessageCreate, etc.).
-   **[Database & Data Services](./docs/guides/database-and-services.md)**: MongoDB, Models, and the Service pattern.
-   **[Core Services](./docs/guides/core-services.md)**: Managers, Registration, and Error Handling.

## ✨ Features

- **Custom Image Generation** - Dynamic image generation capabilities
- **MongoDB Integration** - Robust database integration for data persistence
- **TypeScript Support** - Full TypeScript support for better development experience
- **Modern Architecture** - Built with the latest Discord.js v14 features

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:

- [Bun](https://bun.sh/) package manager
- [MongoDB](https://www.mongodb.com/) database
- [Discord Bot Token](https://discord.com/developers/applications)

## 🚀 Quick Start

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/NoryBot.git
cd NoryBot
```

2. **Install dependencies**
```bash
bun install
```

3. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Fill in your configuration details
```bash
cp .env.example .env
```

4. **Build and start the bot**
```bash
bun start
```

## 📝 Available Scripts

| Command | Description |
|---|---|
| `bun start` | Build the bot and start it from the executable |
| `bun start:exec` | Start the bot from the executable |
| `bun dev` | Start in development mode with hot reload |
| `bun build` | Compile TypeScript to a single executable |
| `bun test` | Run the test suite |

## 🔒 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TOKEN` | Discord bot token | Yes |
| `MONGODB_TOKEN` | MongoDB connection URI | Yes |
| `NODE_ENV` | Environment (development/production) | Yes |
| `ERROR_WEBHOOK` | Discord webhook for error logging | Yes |

## 🛡️ Security

We take security seriously. Please review our [Security Policy](SECURITY.md) for details.

## 🤝 Contributing

Contributions are welcome! Please check out our [Contributing Guidelines](CONTRIBUTING.md).

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Discord.js](https://discord.js.org/) for the amazing Discord API library
- [TypeScript](https://www.typescriptlang.org/) for the type safety
- [MongoDB](https://www.mongodb.com/) for the database solution