import {
  ApplicationCommandOptionType,
  EmbedBuilder,
  SlashCommandBuilder,
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
  TimestampStylesString,
  AutocompleteInteraction,
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

export interface ApplicationCommandOption {
  type: ApplicationCommandOptionType;
  name: string;
  description: string;
  required?: boolean;
  choices?: ApplicationCommandOptionChoice[];
  options?: ApplicationCommandOption[];
}

// Define types for context and integration types
export type ApplicationCommandType = 1 | 2 | 3 | 4;
export type ApplicationCommandContextType = 0 | 1 | 2;
export type ApplicationCommandIntegrationType = 0 | 1;

// Define the structure for a local command implementation
export interface LocalCommand {
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
    name_localizations?: { [key: string]: string } | null;
    description_localizations?: { [key: string]: string } | null;
  };
  userPermissions?: PermissionResolvable[];
  botPermissions?: PermissionResolvable[];
  cooldown?: number;
  devOnly?: boolean;
  testMode?: boolean;
  deleted?: boolean;
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

export interface LocalContextMenu {
  data: ContextMenuCommandBuilder;
  userPermissions?: PermissionResolvable[];
  botPermissions?: PermissionResolvable[];
  cooldown?: number;
  devOnly?: boolean;
  testMode?: boolean;
  deleted?: boolean;
  run: (
    client: Client,
    interaction: ContextMenuCommandInteraction
  ) => Promise<void>;
}

export interface SelectMenu {
  customId: string;
  run: (
    client: Client,
    interaction: StringSelectMenuInteraction
  ) => Promise<void>;
  cooldown?: number;
  devOnly?: boolean;
  testMode?: boolean;
  userPermissions?: PermissionResolvable[];
  botPermissions?: PermissionResolvable[];
  compiledChecks?: {
    userPermissions: (interaction: StringSelectMenuInteraction) => boolean;
    botPermissions: (interaction: StringSelectMenuInteraction) => boolean;
  };
}

export interface Button {
  customId: string;
  devOnly?: boolean;
  testMode?: boolean;
  cooldown?: number;
  userPermissions?: PermissionResolvable[];
  botPermissions?: PermissionResolvable[];
  run: (client: Client, interaction: ButtonInteraction) => Promise<void>;
  compiledChecks?: {
    userPermissions: (interaction: ButtonInteraction) => boolean;
    botPermissions: (interaction: ButtonInteraction) => boolean;
  };
}

export interface Modal {
  customId: string;
  cooldown?: number;
  devOnly?: boolean;
  testMode?: boolean;
  userPermissions?: PermissionResolvable[];
  botPermissions?: PermissionResolvable[];
  compiledChecks?: {
    userPermissions: (interaction: ModalSubmitInteraction) => boolean;
    botPermissions: (interaction: ModalSubmitInteraction) => boolean;
  };
  run: (client: Client, interaction: ModalSubmitInteraction) => Promise<void>;
}
