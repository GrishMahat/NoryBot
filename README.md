# NoryBot
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Discord.js](https://img.shields.io/badge/Discord.js-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)

A powerful Discord bot built with Discord.js v14, TypeScript, and MongoDB, featuring a modern and scalable architecture.

## ✨ Features

- **Custom Image Generation** - Dynamic image generation capabilities
- **MongoDB Integration** - Robust database integration for data persistence
- **TypeScript Support** - Full TypeScript support for better development experience
- **Modern Architecture** - Built with the latest Discord.js v14 features

## 🔧 Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) v16.9.0 or higher
- [PNPM](https://pnpm.io/) package manager
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
pnpm install
```

3. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Fill in your configuration details
```bash
cp .env.example .env
```

4. **Build and start the bot**
```bash
pnpm build
pnpm start
```

## 📝 Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm start` | Start the bot from compiled JavaScript |
| `pnpm test` | Run the test suite |
| `pnpm start:ts` | Start the bot directly with TypeScript |
| `pnpm dev` | Start in development mode with hot reload |
| `pnpm build` | Compile TypeScript to JavaScript |
| `pnpm pre` | Run Prettier code formatting |

## 🔒 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TOKEN` | Discord bot token | Yes |
| `MONGODB_TOKEN` | MongoDB connection URI | Yes |
| `NODE_ENV` | Environment (development/production) | Yes |
| `ERROR_WEBHOOK` | Discord webhook for error logging | Yes |

## 🛡️ Security

We take security seriously. Please review our [Security Policy](SECURITY.md) for:
- Reporting vulnerabilities
- Supported versions
- Security update policy

## 🤝 Contributing

Contributions are welcome and appreciated! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Discord.js](https://discord.js.org/) for the amazing Discord API library
- [TypeScript](https://www.typescriptlang.org/) for the type safety
- [MongoDB](https://www.mongodb.com/) for the database solution 