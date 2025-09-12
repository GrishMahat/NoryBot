import {
	ApplicationCommand,
	// ApplicationCommandOptionType, commante becouse of eslint
	// PermissionsBitField,
} from 'discord.js';
import {
	LocalCommand,
	ApplicationCommandOption,
	ApplicationCommandOptionChoice,
} from '../../types/index';

/**
 * Compares an existing application command with a local command to determine if there are any differences.
 * Optimized for better performance with early returns and efficient comparisons.
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
	local: LocalCommand,
): boolean => {
	// const commandName = local.data.name;

	// Quick checks for basic properties with early returns
	if (existing.name !== local.data.name) {
		return true;
	}

	if (existing.description !== (local.data.description ?? '')) {
		return true;
	}

	if (existing.type !== (local.data.type ?? 1)) {
		return true;
	}

	if (existing.nsfw !== (local.data.nsfw ?? false)) {
		return true;
	}

	if (existing.dmPermission !== (local.data.dm_permission ?? true)) {
		return true;
	}

	// Check contexts with normalized comparison
	// Discord API might return different default contexts than our local commands
	const existingContexts = normalizeContexts(existing.contexts);
	const localContexts = normalizeContexts(local.data.contexts);
	if (!arraysEqual(existingContexts, localContexts)) {
		return true;
	}

	// Check integration types with normalized comparison
	const existingIntegrationTypes = normalizeIntegrationTypes(
		existing.integrationTypes,
	);
	const localIntegrationTypes = normalizeIntegrationTypes(
		local.data.integration_types,
	);
	if (!arraysEqual(existingIntegrationTypes, localIntegrationTypes)) {
		return true;
	}

	// Check default member permissions
	const existingPerms = existing.defaultMemberPermissions?.toString() || null;
	const localPerms = local.data.default_member_permissions?.toString() || null;
	if (existingPerms !== localPerms) {
		return true;
	}

	// Check options only if they exist (most expensive operation)
	const existingOptions = existing.options || [];
	const localOptions = local.data.options || [];

	if (existingOptions.length !== localOptions.length) {
		return true;
	}

	// Only do deep comparison if options exist
	if (existingOptions.length > 0) {
		const existingOptionsArray = optionsArray(existing);
		const localOptionsArray = optionsArray(local.data);
		const optionsEqual = arraysEqual(existingOptionsArray, localOptionsArray);
		return !optionsEqual;
	}

	return false;
};

/**
 * Normalizes contexts to handle Discord API vs local command differences
 * @param {number[] | undefined} contexts - The contexts array
 * @returns {number[]} - Normalized contexts array
 */
function normalizeContexts(contexts: number[] | undefined): number[] {
	if (!contexts || contexts.length === 0) {
		return [0, 1, 2]; // Default: Guild, Bot DM, Private Channel
	}
	return [...contexts].sort(); // Sort for consistent comparison
}

/**
 * Normalizes integration types to handle Discord API vs local command differences
 * @param {number[] | undefined} integrationTypes - The integration types array
 * @returns {number[]} - Normalized integration types array
 */
function normalizeIntegrationTypes(
	integrationTypes: number[] | undefined,
): number[] {
	if (!integrationTypes || integrationTypes.length === 0) {
		return [0, 1]; // Default: Guild Install, User Install
	}
	return [...integrationTypes].sort(); // Sort for consistent comparison
}

/**
 * Efficiently compares two arrays for equality
 * @param {any[]} a - First array
 * @param {any[]} b - Second array
 * @returns {boolean} - True if arrays are equal
 */
function arraysEqual(a: any[], b: any[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) return false;
	}
	return true;
}

/**
 * Recursively removes undefined or empty properties from an object.
 *
 * @param {any} obj - The object to clean.
 */
function cleanObject(obj: Record<string, unknown>): void {
	for (const key in obj) {
		if (typeof obj[key] === 'object' && obj[key] !== null) {
			cleanObject(obj[key] as Record<string, unknown>);
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
	input: ApplicationCommandOption | ApplicationCommandOption[],
): Partial<ApplicationCommandOption> | Partial<ApplicationCommandOption>[] {
	if (Array.isArray(input)) {
		return input.map(
			(item) => normalizeObject(item) as Partial<ApplicationCommandOption>,
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
 * @returns {unknown[]} - The processed array of command options.
 */
function optionsArray(
	cmd: ApplicationCommand | LocalCommand['data'],
): unknown[] {
	return (cmd.options || []).map((option) => {
		const cleanedOption = normalizeObject(
			option,
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
