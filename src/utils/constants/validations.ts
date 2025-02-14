export const REGEX_PATTERNS = {
  URL: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  DISCORD_ID: /^\d{17,19}$/,
  YOUTUBE_URL: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/,
  SPOTIFY_URL: /^(https?:\/\/)?(open\.)?spotify\.com\/.+$/,
  SOUNDCLOUD_URL: /^(https?:\/\/)?(www\.)?(soundcloud\.com)\/.+$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  CUSTOM_EMOJI: /<a?:\w+:\d+>/,
  MENTION: /<@!?\d+>/,
  CHANNEL_MENTION: /<#\d+>/,
  ROLE_MENTION: /<@&\d+>/,
  PHONE_NUMBER: /^\+?[\d\s-]{10,}$/,
  IP_ADDRESS:
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  DATE: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  TIME_24H: /^([01]\d|2[0-3]):([0-5]\d)$/,
  STRONG_PASSWORD:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
} as const;

export const VALIDATION_LIMITS = {
  MIN_USERNAME_LENGTH: 2,
  MAX_USERNAME_LENGTH: 32,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 72,
  MAX_MESSAGE_LENGTH: 2000,
  MAX_EMBED_DESCRIPTION: 4096,
  MAX_EMBED_FIELDS: 25,
  MAX_EMBED_FIELD_NAME: 256,
  MAX_EMBED_FIELD_VALUE: 1024,
  MAX_EMBED_FOOTER: 2048,
  MAX_EMBED_AUTHOR: 256,
  MAX_EMBED_TITLE: 256,
  MIN_NICKNAME_LENGTH: 2,
  MAX_NICKNAME_LENGTH: 32,
  MAX_CHANNEL_NAME_LENGTH: 100,
  MAX_ROLE_NAME_LENGTH: 100,
  MAX_REASON_LENGTH: 512,
  MAX_TOPIC_LENGTH: 1024,
  MAX_CUSTOM_STATUS_LENGTH: 128,
  MAX_WEBHOOK_NAME_LENGTH: 80,
} as const;

export const FILE_LIMITS = {
  MAX_FILE_SIZE: 8 * 1024 * 1024, // 8MB
  MAX_FILES_PER_MESSAGE: 10,
  ALLOWED_FILE_EXTENSIONS: [
    'png',
    'jpg',
    'jpeg',
    'gif',
    'webp',
    'mp3',
    'wav',
    'ogg',
    'mp4',
    'webm',
    'txt',
    'json',
    'yaml',
    'yml',
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'zip',
    'rar',
    'md',
    'csv',
  ],
  MAX_IMAGE_SIZE: {
    WIDTH: 4096,
    HEIGHT: 4096,
  },
  MAX_VIDEO_DURATION: 300, // 5 minutes in seconds
  MAX_AUDIO_DURATION: 600, // 10 minutes in seconds
  MAX_TOTAL_ATTACHMENTS_SIZE: 50 * 1024 * 1024, // 50MB
} as const;

export const RATE_LIMITS = {
  COMMANDS: {
    DEFAULT: 3000, // 3 seconds
    MODERATION: 5000, // 5 seconds
    MUSIC: 2000, // 2 seconds
    ADMIN: 10000, // 10 seconds
    ECONOMY: 15000, // 15 seconds
    GAMES: 5000, // 5 seconds
  },
  API_REQUESTS: {
    DEFAULT: 60000, // 1 minute
    YOUTUBE: 30000, // 30 seconds
    SPOTIFY: 30000, // 30 seconds
    DISCORD: 15000, // 15 seconds
    TWITCH: 30000, // 30 seconds
    WEATHER: 300000, // 5 minutes
  },
  MAX_REQUESTS_PER_MINUTE: 120,
  MAX_MESSAGES_PER_MINUTE: 60,
  MAX_REACTIONS_PER_MINUTE: 30,
  COOLDOWN_BYPASS_ROLES: ['ADMINISTRATOR', 'MODERATOR'],
} as const;
