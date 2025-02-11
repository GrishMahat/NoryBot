import {
  ApplicationCommandOptionType,
  CommandInteraction,
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
  // ApplicationCommandOption, we are  use the custom one below
} from 'discord.js';

// Define the structure of individual command options
export interface CommandOption {
  type: ApplicationCommandOptionType;
  name: string;
  description: string;
  required?: boolean;
  choices?: ApplicationCommandOptionChoice[];
  options?: CommandOption[];
}

// Define the structure of command option choices
export interface ApplicationCommandOptionChoice {
  name: string;
  value: string | number;
}

export interface ApplicationCommandOption {
  type: ApplicationCommandOptionType;
  name: string;
  description: string;
  required?: boolean;
  choices?: ApplicationCommandOptionChoice[];
  options?: ApplicationCommandOption[];
}
// Define the structure of a command
export interface Command {
  name: string;
  description?: string;
  options?: CommandOption[];
  type?: ApplicationCommandType;
  contexts?: number[];
  integrationTypes?: number[];
  run: (client: Client, interaction: CommandInteraction) => Promise<void>;
}

// Define literal types for better type safety
export type ApplicationCommandType = 1 | 2 | 3 | 4;
export type ApplicationCommandContextType = 0 | 1 | 2;
export type ApplicationCommandIntegrationType = 0 | 1;

/**
 * Base interface for all command-related configurations
 */
export interface BaseCommandConfig {
  userPermissions?: PermissionResolvable[];
  botPermissions?: PermissionResolvable[];
  cooldown?: number;
  devOnly?: boolean;
  testMode?: boolean;
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
  nsfwMode?: boolean;
  category?: string;
  run: (
    client: Client,
    interaction: ChatInputCommandInteraction
  ) => Promise<void>;
  autocomplete?: (
    client: Client,
    interaction: AutocompleteInteraction
  ) => Promise<void>;
}

/**
 * Represents a context menu command implementation
 */
export interface LocalContextMenu extends BaseCommandConfig {
  data: ContextMenuCommandBuilder;
  run: (
    client: Client,
    interaction: ContextMenuCommandInteraction
  ) => Promise<void>;
}

/**
 * Represents a select menu component implementation
 */
export interface SelectMenu extends BaseCommandConfig {
  customId: string;
  run: (
    client: Client,
    interaction: StringSelectMenuInteraction
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
