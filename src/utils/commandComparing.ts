import {
  ApplicationCommand,
  ApplicationCommandOptionType,
  PermissionsBitField,
} from 'discord.js';
import {
  LocalCommand,
  ApplicationCommandOption,
  ApplicationCommandOptionChoice,
} from '../types/index.js';

/**
 * Compares an existing application command with a local command to determine if there are any differences.
 *
 * @param {ApplicationCommand} existing - The existing application command.
 * @param {LocalCommand} local - The local command to compare against.
 * @returns {boolean} - Returns true if there are differences, otherwise false.
 * @example
 * // Basic usage
 * const existingCommand = { name: 'test', description: 'A test command' };
 * const localCommand = { data: { name: 'test', description: 'A test command' } };
 * const hasChanged = compareCommands(existingCommand, localCommand);
 * // hasChanged: false
 *
 * @note
 * This function checks for differences in name, description, type, contexts, integration types, nsfw status, dm permission, default member permissions, and options.
 */
const compareCommands = (
  existing: ApplicationCommand,
  local: LocalCommand
): boolean => {
  const defaultValues = {
    name: null,
    description: null,
    type: 1,
    contexts: [0, 1],
    integration_types: [0, 1],
    nsfw: false,
    dm_permission: true,
    default_member_permissions: null,
  };

  const changed = <T>(
    a: T | null | undefined,
    b: T | undefined,
    defaultValue: T | null = null
  ): boolean => {
    if (b === undefined) {
      return JSON.stringify(a) !== JSON.stringify(defaultValue);
    }
    return JSON.stringify(a) !== JSON.stringify(b);
  };

  const comparisons = [
    {
      key: 'name',
      existing: existing.name,
      local: local.data.name,
      defaultValue: defaultValues.name,
    },
    {
      key: 'description',
      existing: existing.description,
      local: local.data.description,
      defaultValue: defaultValues.description,
    },
    {
      key: 'type',
      existing: existing.type,
      local: local.data.type,
      defaultValue: defaultValues.type,
    },
    {
      key: 'contexts',
      existing: existing.contexts,
      local: local.data.contexts,
      defaultValue: defaultValues.contexts,
    },
    {
      key: 'integrationTypes',
      existing: existing.integrationTypes,
      local: local.data.integration_types,
      defaultValue: defaultValues.integration_types,
    },
    {
      key: 'nsfw',
      existing: existing.nsfw,
      local: local.data.nsfw,
      defaultValue: defaultValues.nsfw,
    },
    {
      key: 'dmPermission',
      existing: existing.dmPermission,
      local: local.data.dm_permission,
      defaultValue: defaultValues.dm_permission,
    },
    {
      key: 'defaultMemberPermissions',
      existing: existing.defaultMemberPermissions,
      local: local.data.default_member_permissions,
      defaultValue: defaultValues.default_member_permissions,
    },
  ];

  for (const comparison of comparisons) {
    if (
      changed(comparison.existing, comparison.local, comparison.defaultValue)
    ) {
      console.log(`Difference found in ${comparison.key}:`, {
        existing: comparison.existing,
        local: comparison.local,
      });
      return true;
    }
  }

  // Check if options have changed
  const optionsChanged = changed(
    optionsArray(existing),
    local.data.options ? optionsArray(local.data) : undefined,
    []
  );

  if (optionsChanged) {
    console.log('Options have changed');
    return true;
  }

  return false;
};

/**
 * Recursively removes undefined or empty properties from an object.
 *
 * @param {any} obj - The object to clean.
 */
function cleanObject(obj: any): void {
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      cleanObject(obj[key]);
      if (!obj[key] || (Array.isArray(obj[key]) && !obj[key].length)) {
        delete obj[key];
      }
    } else if (obj[key] === undefined) {
      delete obj[key];
    }
  }
}

/**
 * Normalizes an application command option or an array of options.
 *
 * @param {ApplicationCommandOption | ApplicationCommandOption[]} input - The command option(s) to normalize.
 * @returns {Partial<ApplicationCommandOption> | Partial<ApplicationCommandOption>[]} - The normalized command option(s).
 */
function normalizeObject(
  input: ApplicationCommandOption | ApplicationCommandOption[]
): Partial<ApplicationCommandOption> | Partial<ApplicationCommandOption>[] {
  if (Array.isArray(input)) {
    return input.map(
      (item) => normalizeObject(item) as Partial<ApplicationCommandOption>
    );
  }
  return {
    type: input.type,
    name: input.name,
    description: input.description,
    options: input.options
      ? (normalizeObject(input.options) as Partial<ApplicationCommandOption[]>)
      : undefined,
    required: input.required,
  };
}

/**
 * Converts command options into an array format for comparison.
 *
 * @param {ApplicationCommand | LocalCommand['data']} cmd - The command whose options need to be processed.
 * @returns {any[]} - The processed array of command options.
 */
function optionsArray(cmd: ApplicationCommand | LocalCommand['data']): any[] {
  return (cmd.options || []).map((option) => {
    const cleanedOption = normalizeObject(
      option
    ) as Partial<ApplicationCommandOption>;
    cleanObject(cleanedOption);
    return {
      ...cleanedOption,
      choices: cleanedOption.choices
        ? stringifyChoices(cleanedOption.choices)
        : null,
    };
  });
}

/**
 * Converts the command choices into a JSON string for consistent comparison.
 *
 * @param {ApplicationCommandOptionChoice[]} choices - The choices to stringify.
 * @returns {string} - The stringified version of the choice values.
 */
function stringifyChoices(choices: ApplicationCommandOptionChoice[]): string {
  return JSON.stringify(choices.map((c) => c.value));
}

export default compareCommands;
