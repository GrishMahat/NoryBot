/**
 * @file Types related to Discord commands and interactions
 * @description Defines types for Discord commands, command options, and interactions
 */

import type {
	ApplicationCommandOptionType,
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	Client,
	CommandInteraction,
	ContextMenuCommandBuilder,
	ContextMenuCommandInteraction,
	Guild,
	GuildMember,
	Message,
	PermissionResolvable,
	SlashCommandBuilder,
	SlashCommandOptionsOnlyBuilder,
	SlashCommandSubcommandsOnlyBuilder,
	TextBasedChannel,
	User,
} from 'discord.js';

/**
 * Represents a command option choice for application commands
 */
export interface ApplicationCommandOptionChoice {
	name: string;
	value: string | number;
}

/**
 * Defines the structure of individual command options
 */
export interface CommandOption {
	type: ApplicationCommandOptionType;
	name: string;
	description: string;
	required?: boolean;
	choices?: ApplicationCommandOptionChoice[];
	options?: CommandOption[];
}

/**
 * Defines the structure of application command options
 */
export interface ApplicationCommandOption {
	type: ApplicationCommandOptionType;
	name: string;
	description: string;
	required?: boolean;
	choices?: ApplicationCommandOptionChoice[];
	options?: ApplicationCommandOption[];
}

/**
 * Defines the structure of a command
 */
export interface Command {
	name: string;
	description?: string;
	options?: CommandOption[];
	type?: ApplicationCommandType;
	contexts?: number[];
	integrationTypes?: number[];
	run: (client: Client, interaction: CommandInteraction) => Promise<void>;
}

/**
 * Literal types for application command types
 */
export type ApplicationCommandType = 1 | 2 | 3 | 4;

/**
 * Literal types for application command context types
 */
export type ApplicationCommandContextType = 0 | 1 | 2;

/**
 * Literal types for application command integration types
 */
export type ApplicationCommandIntegrationType = 0 | 1;

/**
 * Base interface for all command-related configurations
 */
export interface BaseCommandConfig {
	/** User permissions required to use this command */
	userPermissions?: PermissionResolvable[];
	/** Bot permissions required to execute this command */
	botPermissions?: PermissionResolvable[];

	/** Whether the command contains NSFW content */
	nsfwMode?: boolean;
	/** Cooldown period in seconds */
	cooldown?: number;

	/** Whether the command is only for developers */
	devOnly?: boolean;
	/** Whether the command is only for premium users/guilds */
	premiumOnly?: boolean;
	/** Whether the command is in test mode */
	testMode?: boolean;

	/**
	 * Whether the command is experimental/beta
	 * Handles adding disclaimers or restricting access automatically
	 */
	experimental?: boolean;

	/**
	 * Automatically defer the reply before running the command
	 * @default false
	 */
	autoDefer?: boolean;

	/** Whether the user must be in a voice channel */
	voiceChannelOnly?: boolean;

	/** Whether the command is marked as deleted */
	deleted?: boolean;
}

/**
 * Represents a compiled permission check result
 */
export interface CompiledChecks<T> {
	userPermissions: (interaction: T) => boolean;
	botPermissions: (interaction: T) => boolean;
}

/**
 * Represents a local command implementation with full type safety
 */
export interface LocalCommand extends BaseCommandConfig {
	data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | SlashCommandOptionsOnlyBuilder;
	category?: string;
	run: (client: Client, interaction: ChatInputCommandInteraction) => Promise<void>;
	autocomplete?: (client: Client, interaction: AutocompleteInteraction) => Promise<void>;
}

/**
 * Represents a context menu command implementation
 */
export interface LocalContextMenu extends BaseCommandConfig {
	data: ContextMenuCommandBuilder;
	run: (client: Client, interaction: ContextMenuCommandInteraction) => Promise<void>;
}

/**
 * @file Discord Command Types
 * @description Type definitions for Discord bot commands
 */

// Command Categories
export type CommandCategory =
	| 'general'
	| 'moderation'
	| 'fun'
	| 'utility'
	| 'admin'
	| 'music'
	| 'games'
	| 'economy';

// Command Permission Levels
export type PermissionLevel = 'everyone' | 'moderator' | 'administrator' | 'owner';

// Command Cooldown Types
export interface CommandCooldown {
	type: 'user' | 'guild' | 'channel';
	duration: number;
}

// Command Options
export interface CommandOptions {
	name: string;
	description: string;
	category: CommandCategory;
	permissionLevel: PermissionLevel;
	cooldown?: CommandCooldown;
	aliases?: string[];
	usage?: string;
	examples?: string[];
	enabled?: boolean;
	guildOnly?: boolean;
	nsfw?: boolean;
	requireArgs?: boolean;
	minArgs?: number;
	maxArgs?: number;
}

// Command Context
export interface CommandContext {
	message: Message;
	args: string[];
	prefix: string;
	command: CommandOptions;
	guild?: Guild | null;
	channel: TextBasedChannel;
	author: User;
	member?: GuildMember | null;
}

// Command Handler Types
export interface CommandHandler {
	name: string;
	execute: (context: CommandContext) => Promise<void>;
	options: CommandOptions;
}

// Command Collection
export interface CommandCollection {
	[key: string]: CommandHandler;
}

// Command Registry
export interface CommandRegistry {
	commands: CommandCollection;
	categories: Map<CommandCategory, CommandHandler[]>;
	aliases: Map<string, string>;
}
