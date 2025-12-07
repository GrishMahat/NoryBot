import type { LocalContextMenu } from '@/types';
import { type ApplicationCommand, ApplicationCommandType } from 'discord.js';

/**
 * Compares an existing context menu command with a local command to determine if there are any differences.
 * This function performs a deep comparison of all relevant properties and provides detailed logging of differences.
 *
 * @param {ApplicationCommand} existing - The existing context menu command from Discord.
 * @param {LocalContextMenu} local - The local context menu command definition.
 * @returns {boolean} - Returns true if there are differences, otherwise false.
 * @throws {Error} - Throws an error if the command is not a valid context menu type.
 */
const compareContextMenuCommands = (
	existing: ApplicationCommand,
	local: LocalContextMenu,
): boolean => {
	// Default values for context menu commands with type safety
	const defaultValues = {
		name: null,
		type: null,
		integration_types: [0, 1],
		nsfw: false,
		dm_permission: true,
		default_member_permissions: null,
	} as const;

	/**
	 * Generic comparison function that handles null, undefined, and deep object comparison
	 * @template T - The type of values being compared
	 */
	const changed = <T>(
		existingValue: T | null | undefined,
		localValue: T | undefined,
		defaultValue: T | null = null,
	): boolean => {
		// Special handling for dmPermission
		if (existingValue === true && (localValue === undefined || localValue === true)) {
			// Both are effectively true (existing is true, local is undefined or true)
			return false;
		}

		// Handle undefined/null equality
		if (
			(existingValue === undefined || existingValue === null) &&
			(localValue === undefined || localValue === null)
		) {
			return false;
		}

		// Handle default value comparison for undefined localValue
		if (localValue === undefined) {
			// If localValue is undefined, use the defaultValue for comparison
			return JSON.stringify(existingValue) !== JSON.stringify(defaultValue);
		}

		// Deep comparison of values
		return JSON.stringify(existingValue) !== JSON.stringify(localValue);
	};

	// Validate context menu type
	if (
		!local.data ||
		(local.data.type !== ApplicationCommandType.User &&
			local.data.type !== ApplicationCommandType.Message)
	) {
		throw new Error('Invalid context menu command type. Must be either USER (2) or MESSAGE (3)');
	}

	// Define comparison structure with type safety
	interface Comparison {
		key: string;
		existing: unknown;
		local: unknown;
		defaultValue: unknown;
		description?: string;
		specialHandling?: boolean;
	}

	// Define all properties to compare with descriptions
	const comparisons: Comparison[] = [
		{
			key: 'name',
			existing: existing.name,
			local: local.data.name,
			defaultValue: defaultValues.name,
			description: 'Command name',
		},
		{
			key: 'type',
			existing: existing.type,
			local: local.data.type,
			defaultValue: defaultValues.type,
			description: 'Command type',
		},
		{
			key: 'integrationTypes',
			existing: existing.integrationTypes,
			local: local.data.integration_types ?? defaultValues.integration_types,
			defaultValue: defaultValues.integration_types,
			description: 'Integration types',
		},
		{
			key: 'dmPermission',
			existing: existing.dmPermission,
			local: local.data.dm_permission,
			defaultValue: defaultValues.dm_permission,
			description: 'DM permission',
			specialHandling: true,
		},
		{
			key: 'defaultMemberPermissions',
			existing: existing.defaultMemberPermissions?.toString() ?? null,
			local: local.data.default_member_permissions?.toString() ?? null,
			defaultValue: defaultValues.default_member_permissions,
			description: 'Default member permissions',
		},
	];

	// Check for name localizations with detailed logging
	if (changed(existing.nameLocalizations, local.data.name_localizations, null)) {
		return true;
	}

	// Compare all properties with detailed logging
	for (const comparison of comparisons) {
		// Special handling for dmPermission
		if (comparison.key === 'dmPermission') {
			// If existing is true and local is undefined or true, they're the same
			if (
				comparison.existing === true &&
				(comparison.local === undefined || comparison.local === true)
			) {
				continue;
			}

			// If explicit false in local, keep it for comparison
			if (comparison.local === false) {
				if (comparison.existing !== false) {
					return true;
				}
				continue;
			}
		}

		// For other properties, handle normally
		const localValue = comparison.local === undefined ? comparison.defaultValue : comparison.local;

		if (changed(comparison.existing, localValue, comparison.defaultValue)) {
			// Log differences with context
			return true;
		}
	}

	return false;
};

export default compareContextMenuCommands;
