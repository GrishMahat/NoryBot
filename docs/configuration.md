# Configuration Guide

This guide explains all configuration options available in NoryBot.

## Environment Variables

NoryBot uses environment variables for configuration. Create a `.env` file in the root directory with the following options:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TOKEN` | Discord bot token | `NzkyNzE1NDU...` |
| `MONGODB_TOKEN` | MongoDB connection URI | `mongodb+srv://user:pass@cluster...` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `ERROR_WEBHOOK` | Discord webhook for error logging | `https://discord.com/api/webhooks/...` |

### Optional Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `LOG_LEVEL` | Logging verbosity | `info` | `debug` |
| `PREFIX` | Command prefix | `!` | `$` |
| `OWNER_ID` | Bot owner's Discord ID | none | `123456789` |

## Discord Bot Configuration

### Required Intents

The following Discord intents must be enabled in the [Discord Developer Portal](https://discord.com/developers/applications):

- Presence Intent
- Server Members Intent
- Message Content Intent

### Bot Permissions

Minimum required permissions for full functionality:

- Manage Roles
- Manage Channels
- Send Messages
- Embed Links
- Attach Files
- Read Message History
- Add Reactions

### Permission Integer

For all required permissions: `537259064`

## MongoDB Configuration

### Database Structure

```
norybot/
├── users/
│   ├── settings
│   └── statistics
├── guilds/
│   ├── config
│   └── stats
└── logs/
```

### Indexes

Required indexes for optimal performance:

```javascript
db.users.createIndex({ "userId": 1 });
db.guilds.createIndex({ "guildId": 1 });
db.logs.createIndex({ "timestamp": 1 });
```

## Logging Configuration

### Log Levels

Available log levels in order of verbosity:
1. error
2. warn
3. info
4. debug
5. trace

### Error Webhook

The error webhook sends notifications for:
- Critical errors
- API failures
- Database connection issues
- Command failures

## Development Configuration

### TypeScript Configuration

Key `tsconfig.json` options:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### Prettier Configuration

Key `.prettierrc` options:
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "printWidth": 100
}
```

## Production Deployment

### PM2 Configuration

Example `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'norybot',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
```

## Security Considerations

1. Never commit `.env` file
2. Rotate tokens regularly
3. Use restrictive MongoDB user permissions
4. Enable Discord bot token reset detection
5. Monitor error logs for suspicious activity

## Next Steps

- [Command Configuration](./features/commands.md)
- [Deployment Guide](./deployment.md)
- [Troubleshooting](./troubleshooting.md) 