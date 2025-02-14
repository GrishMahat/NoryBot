import { PermissionFlagsBits, PermissionResolvable } from 'discord.js';

export const PERMISSION_FLAGS = {
  // Text Channel Permissions
  VIEW_CHANNEL: PermissionFlagsBits.ViewChannel,
  SEND_MESSAGES: PermissionFlagsBits.SendMessages,
  SEND_MESSAGES_IN_THREADS: PermissionFlagsBits.SendMessagesInThreads,
  CREATE_PUBLIC_THREADS: PermissionFlagsBits.CreatePublicThreads,
  CREATE_PRIVATE_THREADS: PermissionFlagsBits.CreatePrivateThreads,
  EMBED_LINKS: PermissionFlagsBits.EmbedLinks,
  ATTACH_FILES: PermissionFlagsBits.AttachFiles,
  ADD_REACTIONS: PermissionFlagsBits.AddReactions,
  USE_EXTERNAL_EMOJIS: PermissionFlagsBits.UseExternalEmojis,
  USE_EXTERNAL_STICKERS: PermissionFlagsBits.UseExternalStickers,
  MENTION_EVERYONE: PermissionFlagsBits.MentionEveryone,
  MANAGE_MESSAGES: PermissionFlagsBits.ManageMessages,
  MANAGE_THREADS: PermissionFlagsBits.ManageThreads,
  READ_MESSAGE_HISTORY: PermissionFlagsBits.ReadMessageHistory,

  // Voice Channel Permissions
  CONNECT: PermissionFlagsBits.Connect,
  SPEAK: PermissionFlagsBits.Speak,
  STREAM: PermissionFlagsBits.Stream,
  USE_VAD: PermissionFlagsBits.UseVAD,
  PRIORITY_SPEAKER: PermissionFlagsBits.PrioritySpeaker,
  MUTE_MEMBERS: PermissionFlagsBits.MuteMembers,
  DEAFEN_MEMBERS: PermissionFlagsBits.DeafenMembers,
  MOVE_MEMBERS: PermissionFlagsBits.MoveMembers,

  // General Server Permissions
  KICK_MEMBERS: PermissionFlagsBits.KickMembers,
  BAN_MEMBERS: PermissionFlagsBits.BanMembers,
  MANAGE_NICKNAMES: PermissionFlagsBits.ManageNicknames,
  MANAGE_ROLES: PermissionFlagsBits.ManageRoles,
  MANAGE_CHANNELS: PermissionFlagsBits.ManageChannels,
  MANAGE_GUILD: PermissionFlagsBits.ManageGuild,
  VIEW_AUDIT_LOG: PermissionFlagsBits.ViewAuditLog,
  MANAGE_WEBHOOKS: PermissionFlagsBits.ManageWebhooks,
  MANAGE_EMOJIS_AND_STICKERS: PermissionFlagsBits.ManageEmojisAndStickers,
  MODERATE_MEMBERS: PermissionFlagsBits.ModerateMembers,
} as const;

export const COMMAND_PERMISSIONS = {
  // Moderation Commands
  BAN: [PERMISSION_FLAGS.BAN_MEMBERS],
  KICK: [PERMISSION_FLAGS.KICK_MEMBERS],
  MUTE: [PERMISSION_FLAGS.MODERATE_MEMBERS],
  WARN: [PERMISSION_FLAGS.MODERATE_MEMBERS],
  CLEAR: [PERMISSION_FLAGS.MANAGE_MESSAGES],

  // Music Commands
  PLAY: [PERMISSION_FLAGS.CONNECT, PERMISSION_FLAGS.SPEAK],
  VOLUME: [PERMISSION_FLAGS.CONNECT, PERMISSION_FLAGS.SPEAK],
  SKIP: [PERMISSION_FLAGS.CONNECT, PERMISSION_FLAGS.SPEAK],

  // Admin Commands
  SETTINGS: [PERMISSION_FLAGS.MANAGE_GUILD],
  ROLES: [PERMISSION_FLAGS.MANAGE_ROLES],
  CHANNELS: [PERMISSION_FLAGS.MANAGE_CHANNELS],
} as const;

export const BOT_REQUIRED_PERMISSIONS: PermissionResolvable[] = [
  PERMISSION_FLAGS.VIEW_CHANNEL,
  PERMISSION_FLAGS.SEND_MESSAGES,
  PERMISSION_FLAGS.EMBED_LINKS,
  PERMISSION_FLAGS.ATTACH_FILES,
  PERMISSION_FLAGS.READ_MESSAGE_HISTORY,
  PERMISSION_FLAGS.ADD_REACTIONS,
  PERMISSION_FLAGS.USE_EXTERNAL_EMOJIS,
  PERMISSION_FLAGS.CONNECT,
  PERMISSION_FLAGS.SPEAK,
] as const;

export const PERMISSION_NAMES: Record<number, string> = {
  [Number(PermissionFlagsBits.ViewChannel)]: 'View Channels',
  [Number(PermissionFlagsBits.SendMessages)]: 'Send Messages',
  [Number(PermissionFlagsBits.ManageMessages)]: 'Manage Messages',
  [Number(PermissionFlagsBits.EmbedLinks)]: 'Embed Links',
  [Number(PermissionFlagsBits.AttachFiles)]: 'Attach Files',
  [Number(PermissionFlagsBits.ReadMessageHistory)]: 'Read Message History',
  [Number(PermissionFlagsBits.AddReactions)]: 'Add Reactions',
  [Number(PermissionFlagsBits.Connect)]: 'Connect to Voice',
  [Number(PermissionFlagsBits.Speak)]: 'Speak in Voice',
  [Number(PermissionFlagsBits.BanMembers)]: 'Ban Members',
  [Number(PermissionFlagsBits.KickMembers)]: 'Kick Members',
  [Number(PermissionFlagsBits.ManageGuild)]: 'Manage Server',
  [Number(PermissionFlagsBits.ManageRoles)]: 'Manage Roles',
  [Number(PermissionFlagsBits.ManageChannels)]: 'Manage Channels',
  [Number(PermissionFlagsBits.ModerateMembers)]: 'Timeout Members',
} as const;
