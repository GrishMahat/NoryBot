import { type ApplicationCommand, ApplicationCommandType } from 'discord.js';
import type { LocalContextMenu } from '@/types';

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
		integration_types: [0], // Default: Guild Install only
		contexts: [0], // Default: Guild only
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

	// Helper to compare arrays (order-insensitive)
	const arraysChanged = (
		existingArr: unknown[] | undefined | null,
		localArr: unknown[] | undefined | null,
		defaultArr: unknown[] | null,
	): boolean => {
		const normalize = (arr: unknown[] | undefined | null) => {
			if (!arr || arr.length === 0) return defaultArr ? [...defaultArr].sort() : [];
			return [...arr].sort();
		};
		const sortedExisting = normalize(existingArr);
		const sortedLocal = normalize(localArr);
		return JSON.stringify(sortedExisting) !== JSON.stringify(sortedLocal);
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
		isArray?: boolean; // Flag for array comparison
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
			local: local.data.integration_types,
			defaultValue: defaultValues.integration_types,
			description: 'Integration types',
			isArray: true,
		},
		{
			key: 'contexts',
			existing: existing.contexts,
			local: local.data.contexts,
			defaultValue: defaultValues.contexts,
			description: 'Contexts',
			isArray: true,
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
			existing: existing.defaultMemberPermissions
				? 'bitfield' in existing.defaultMemberPermissions
					? existing.defaultMemberPermissions.bitfield.toString()
					: existing.defaultMemberPermissions.toString()
				: null,
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
			// Infer default dmPermission based on contexts
			// If contexts are provided and don't include Bot DM (1) or Private Channel (2), default is false
			const contexts = local.data.contexts ?? defaultValues.contexts;
			const impliesNoDM = contexts && !contexts.includes(1) && !contexts.includes(2);
			const effectiveLocalDmPermission = local.data.dm_permission ?? !impliesNoDM;

			if (comparison.existing !== effectiveLocalDmPermission) {
				return true;
			}
			continue;
		}

		if (comparison.isArray) {
			if (
				arraysChanged(
					comparison.existing as unknown[],
					comparison.local as unknown[],
					comparison.defaultValue as unknown[],
				)
			) {
				return true;
			}
			continue;
		}

		// For other properties, handle normally
		const localValue = comparison.local === undefined ? comparison.defaultValue : comparison.local;

		if (changed(comparison.existing, localValue, comparison.defaultValue)) {
			console.log(
				`[DEBUG] Context Menu mismatch for ${local.data.name} on key '${comparison.key}'`,
			);
			console.log(`  Existing: ${JSON.stringify(comparison.existing)}`);
			console.log(`  Local:    ${JSON.stringify(localValue)}`);
			return true;
		}
	}

	return false;
};

export default compareContextMenuCommands;
