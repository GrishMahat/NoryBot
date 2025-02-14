export const BOT_CONSTANTS = {
  DEFAULT_PREFIX: '!',
  DEFAULT_LANGUAGE: 'en',
  OWNER_ID: process.env.OWNER_ID || '',
  MAX_CUSTOM_COMMANDS: 50,
  COMMAND_COOLDOWN: 3000, // 3 seconds
  MAX_WARNINGS: 3,
} as const;

export const EMBED_COLORS = {
  DEFAULT: '#5865F2', // Discord Blurple
  SUCCESS: '#57F287', // Green
  ERROR: '#ED4245', // Red
  WARNING: '#FEE75C', // Yellow
  INFO: '#5865F2', // Blurple
  MODERATION: '#F47FFF', // Pink
  MUSIC: '#44E3E3', // Cyan
} as const;

export const TIME_CONSTANTS = {
  MILLISECOND: 1,
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  MONTH: 30 * 24 * 60 * 60 * 1000,
} as const;

export const PERMISSION_LEVELS = {
  EVERYONE: 0,
  MODERATOR: 1,
  ADMINISTRATOR: 2,
  SERVER_OWNER: 3,
  BOT_OWNER: 4,
} as const;

export const MESSAGE_TYPES = {
  DEFAULT: 'DEFAULT',
  WELCOME: 'WELCOME',
  GOODBYE: 'GOODBYE',
  LEVEL_UP: 'LEVEL_UP',
  WARNING: 'WARNING',
  MODERATION: 'MODERATION',
} as const;

import { ButtonStyle } from 'discord.js';

export const BUTTON_STYLES = ButtonStyle;
