import { ApplicationCommand, ApplicationCommandType } from 'discord.js';
import { LocalContextMenu } from '../types/index.js';

/**
 * Compares an existing context menu command with a local command to determine if there are any differences.
 *
 * @param {ApplicationCommand} existing - The existing context menu command.
 * @param {LocalContextMenu} local - The local context menu command to compare against.
 * @returns {boolean} - Returns true if there are differences, otherwise false.
 */
const compareContextMenuCommands = (
  existing: ApplicationCommand,
  local: LocalContextMenu
): boolean => {
  // Default values for context menu commands
  const defaultValues = {
    name: null,
    type: null,
    integration_types: [0],
    nsfw: false,
    dm_permission: true,
    default_member_permissions: null,
  } as const;

  const changed = <T>(
    existingValue: T | null | undefined,
    localValue: T | undefined,
    defaultValue: T | null = null
  ): boolean => {
    // If both values are undefined or null, they're equal
    if (
      (existingValue === undefined || existingValue === null) &&
      (localValue === undefined || localValue === null)
    ) {
      return false;
    }

    // If local is undefined, compare existing to default
    if (localValue === undefined) {
      return JSON.stringify(existingValue) !== JSON.stringify(defaultValue);
    }

    // Compare existing to local value
    return JSON.stringify(existingValue) !== JSON.stringify(localValue);
  };

  // Verify that this is a context menu command
  if (
    !local.data ||
    (local.data.type !== ApplicationCommandType.User &&
      local.data.type !== ApplicationCommandType.Message)
  ) {
    throw new Error(
      'Not a context menu command. Type must be USER (2) or MESSAGE (3)'
    );
  }

  interface Comparison {
    key: string;
    existing: unknown;
    local: unknown;
    defaultValue: unknown;
  }

  const comparisons: Comparison[] = [
    {
      key: 'name',
      existing: existing.name,
      local: local.data.name,
      defaultValue: defaultValues.name,
    },
    {
      key: 'type',
      existing: existing.type,
      local: local.data.type,
      defaultValue: defaultValues.type,
    },
    {
      key: 'integrationTypes',
      existing: existing.integrationTypes,
      local: local.data.integration_types,
      defaultValue: defaultValues.integration_types,
    },
    {
      key: 'dmPermission',
      existing: existing.dmPermission,
      local: local.data.dm_permission,
      defaultValue: defaultValues.dm_permission,
    },
    {
      key: 'defaultMemberPermissions',
      existing: existing.defaultMemberPermissions?.toString() ?? null,
      local: local.data.default_member_permissions?.toString() ?? null,
      defaultValue: defaultValues.default_member_permissions,
    },
  ];

  // Check for name localizations
  if (
    changed(existing.nameLocalizations, local.data.name_localizations, null)
  ) {
    console.log('Difference found in name localizations:', {
      existing: existing.nameLocalizations,
      local: local.data.name_localizations,
    });
    return true;
  }

  // Compare all other properties
  for (const comparison of comparisons) {
    if (
      changed(comparison.existing, comparison.local, comparison.defaultValue)
    ) {
      // Only log if values are actually different
      if (comparison.existing !== comparison.local) {
        console.log(`Difference found in ${comparison.key}:`, {
          existing: comparison.existing,
          local: comparison.local,
        });
      }
      return true;
    }
  }

  return false;
};

export default compareContextMenuCommands;
