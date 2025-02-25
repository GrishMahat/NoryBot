/**
 * @file Types related to Discord commands and interactions
 * @description Defines types for Discord commands, command options, and interactions
 */

import {
  ApplicationCommandOptionType,
  Client,
  PermissionsBitField,
  ContextMenuCommandBuilder,
  PermissionResolvable,
  ContextMenuCommandInteraction,
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  CommandInteraction,
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
  /** Whether the command is in test mode */
  testMode?: boolean;
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
  data: {
    name: string;
    description?: string;
    options?: ApplicationCommandOption[];
    type?: ApplicationCommandType;
    contexts?: ApplicationCommandContextType[] | null;
    integration_types?: ApplicationCommandIntegrationType[] | null;
    nsfw?: boolean;
    dm_permission?: boolean;
    default_member_permissions?: PermissionsBitField | string | null;
    name_localizations?: Record<string, string> | null;
    description_localizations?: Record<string, string> | null;
  };
  category?: string;
  run: (
    client: Client,
    interaction: ChatInputCommandInteraction,
  ) => Promise<void>;
  autocomplete?: (
    client: Client,
    interaction: AutocompleteInteraction,
  ) => Promise<void>;
}

/**
 * Represents a context menu command implementation
 */
export interface LocalContextMenu extends BaseCommandConfig {
  data: ContextMenuCommandBuilder;
  run: (
    client: Client,
    interaction: ContextMenuCommandInteraction,
  ) => Promise<void>;
}

/**
 * Represents a select menu component implementation
 */
export interface SelectMenu extends BaseCommandConfig {
  customId: string;
  run: (
    client: Client,
    interaction: StringSelectMenuInteraction,
  ) => Promise<void>;
  compiledChecks?: CompiledChecks<StringSelectMenuInteraction>;
}

/**
 * Represents a button component implementation
 */
export interface Button extends BaseCommandConfig {
  customId: string;
  run: (client: Client, interaction: ButtonInteraction) => Promise<void>;
  compiledChecks?: CompiledChecks<ButtonInteraction>;
}

/**
 * Represents a modal component implementation
 */
export interface Modal extends BaseCommandConfig {
  customId: string;
  run: (client: Client, interaction: ModalSubmitInteraction) => Promise<void>;
  compiledChecks?: CompiledChecks<ModalSubmitInteraction>;
}
