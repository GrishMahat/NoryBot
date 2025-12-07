# Getting Started with NoryBot

Welcome to **NoryBot**! This guide will help you get the bot up and running on your local machine in minutes.

## Prerequisites

Before you begin, ensure you have the following installed:

1.  **[Bun](https://bun.sh/)**: This project uses Bun as its runtime and package manager. It's fast and compatible with Node.js.
    ```bash
    curl -fsSL https://bun.sh/install | bash
    ```
2.  **[MongoDB](https://www.mongodb.com/try/download/community)**: You need a MongoDB database. You can run it locally or use [MongoDB Atlas](https://www.mongodb.com/atlas) for a free cloud database.
3.  **Discord Bot Token**:
    - Go to the [Discord Developer Portal](https://discord.com/developers/applications).
    - Create a new Application.
    - Go to the "Bot" tab and click "Reset Token" to get your token.
    - Enable **Message Content Intent**, **Server Members Intent**, and **Presence Intent** under "Privileged Gateway Intents".

## Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/GrishMahat/NoryBot.git
    cd NoryBot
    ```

2.  **Install Dependencies**
    Using Bun, this is extremely fast:
    ```bash
    bun install
    ```

3.  **Configuration**
    Copy the example environment file to create your own configuration:
    ```bash
    cp .env.example .env
    ```
    Open `.env` in your text editor and fill in the required values:
    - `TOKEN`: Your Discord Bot Token.
    - `MONGODB_TOKEN`: Your MongoDB connection string (e.g., `mongodb://localhost:27017/norybot` or your Atlas URI).
    - `NODE_ENV`: Set to `development` for local testing.
    - `ERROR_WEBHOOK`: A Discord Webhook URL where the bot will send error logs (create one in a channel in your test server).

## Running the Bot

### Development Mode
For development, use the `dev` command. This uses `bun --watch`, which will automatically restart the bot when you make changes to the code.
```bash
bun dev
```

### Production Build
To run the bot in a production-like environment (or to test the built executable):
```bash
bun start
```
This builds the bot into the `dist/` directory and runs it.

## Troubleshooting

-   **"Command not found: bun"**: Make sure Bun is in your system's PATH. You might need to restart your terminal after installing Bun.
-   **MongoNetworkError**: Check if your MongoDB service is running (`sudo systemctl status mongod` on Linux) or if your Atlas IP whitelist allows your current IP.
-   **"Invalid Token"**: Double-check that you copied the token correctly from the Discord Developer Portal and that there are no extra spaces in the `.env` file.

## Next Steps

Now that your bot is running, check out the [Architecture Overview](./architecture.md) to understand how it works, or dive into the [Guides](./guides/) to start adding features!
