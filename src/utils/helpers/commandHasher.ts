import { createHash } from 'node:crypto';
import {
	type ApplicationCommand,
	PermissionsBitField,
	type RESTPostAPIChatInputApplicationCommandsJSONBody,
	type RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord.js';
import type { Command, LocalContextMenu } from '@/types/index';

type CanonicalCommand = {
	name: string;
	description: string;
	type: number;
	options: unknown[];
	contexts: number[];
	integration_types: number[];
	nsfw: boolean;
	dm_permission: boolean;
	default_member_permissions: string | null;
	name_localizations: Record<string, string> | null;
	description_localizations: Record<string, string> | null;
};

/**
 * Creates a stable SHA-1 hash of a command's canonical structure.
 * This hash can be used to efficiently compare local and remote commands.
 */
export function hashCommand(command: Command | LocalContextMenu | ApplicationCommand): string {
	const canonical = canonicalizeCommand(command);
	const json = JSON.stringify(canonical);
	return createHash('sha1').update(json).digest('hex');
}

/**
 * Converts any command representation into a stable, canonical structure.
 * Handles normalization of defaults, sorting of arrays, and stripping of variable fields.
 */
export function canonicalizeCommand(
	command: Command | LocalContextMenu | ApplicationCommand,
): CanonicalCommand {
	let data:
		| RESTPostAPIChatInputApplicationCommandsJSONBody
		| RESTPostAPIContextMenuApplicationCommandsJSONBody
		| ApplicationCommand;

	if ('data' in command) {
		// It's a local Command or LocalContextMenu
		// We use toJSON() to get the raw data structure from the builder
		data = command.data.toJSON() as
			| RESTPostAPIChatInputApplicationCommandsJSONBody
			| RESTPostAPIContextMenuApplicationCommandsJSONBody;
	} else {
		// It's an existing ApplicationCommand from Discord API
		data = command;
	}

	// Determine type first to set correct defaults
	// Default to 1 (ChatInput) if missing
	const type = (data.type as number) ?? 1;

	// biome-ignore lint/suspicious/noExplicitAny: Handling varied data types (API vs Builders) requires loose typing for reading
	const anyData = data as any;

	// 1. Contexts
	// ChatInput (1) defaults to [0, 1, 2] (Guild, BotDM, PrivateChannel)
	// ContextMenu (2/3) defaults to [0] (Guild)
	const defaultContexts = type === 1 ? [0, 1, 2] : [0];
	const rawContexts = anyData.contexts;
	const contexts = normalizeArray(rawContexts, defaultContexts);

	// 2. Integration Types
	// ChatInput (1) defaults to [0] (Guild Only) - based on observation of existing commands
	// ContextMenu (2/3) defaults to [0, 1] (Guild + User) - based on observation
	const defaultIntegrationTypes = type === 1 ? [0] : [0, 1];
	const rawIntegrationTypes = anyData.integration_types ?? anyData.integrationTypes;
	const integration_types = normalizeArray(rawIntegrationTypes, defaultIntegrationTypes);

	// 3. DM Permission
	// derived from contexts if missing
	let dm_permission = anyData.dm_permission ?? anyData.dmPermission;
	if (dm_permission === undefined || dm_permission === null) {
		// If contexts exclude BotDM(1) AND PrivateChannel(2), then dm_permission is false by default
		// Otherwise true
		const hasDMContext = contexts.includes(1) || contexts.includes(2);
		dm_permission = hasDMContext;
	}

	// 4. Default Member Permissions
	const rawPermissions = anyData.default_member_permissions ?? anyData.defaultMemberPermissions;

	let default_member_permissions: string | null = null;
	if (rawPermissions) {
		if (typeof rawPermissions === 'object' && 'bitfield' in rawPermissions) {
			default_member_permissions = rawPermissions.bitfield.toString();
		} else {
			default_member_permissions = new PermissionsBitField(rawPermissions).toJSON();
		}
	}

	// 5. Options (Deep normalization)
	const options = normalizeOptions(anyData.options);

	return {
		name: data.name,
		description: anyData.description ?? '',
		type,
		options,
		contexts,
		integration_types,
		nsfw: !!data.nsfw,
		dm_permission: !!dm_permission,
		default_member_permissions,
		name_localizations: sortObjectKeys(anyData.name_localizations ?? anyData.nameLocalizations),
		description_localizations: sortObjectKeys(
			anyData.description_localizations ?? anyData.descriptionLocalizations,
		),
	};
}

function normalizeArray(arr: unknown[] | undefined | null, defaultValue: number[]): number[] {
	if (!arr || arr.length === 0) {
		return [...defaultValue].sort((a, b) => a - b);
	}
	// valid values are numbers
	return (arr as number[]).sort((a, b) => a - b);
}

function sortObjectKeys(
	obj: Record<string, string> | undefined | null,
): Record<string, string> | null {
	if (!obj) return null;
	const sorted: Record<string, string> = {};
	Object.keys(obj)
		.sort()
		.forEach((key) => {
			sorted[key] = obj[key];
		});
	return sorted;
}

// biome-ignore lint/suspicious/noExplicitAny: Recursion requires loose typing
function normalizeOptions(options: any[] | undefined): any[] {
	if (!options || options.length === 0) return [];

	return options.map((opt) => {
		const normalized = {
			type: opt.type,
			name: opt.name,
			description: opt.description,
			required: !!opt.required, // Default to false
			autocomplete: !!opt.autocomplete, // Default to false
			choices: normalizeChoices(opt.choices),
			options: normalizeOptions(opt.options),
			channel_types: normalizeArray(opt.channel_types ?? opt.channelTypes, []),
			min_value: opt.min_value ?? opt.minValue,
			max_value: opt.max_value ?? opt.maxValue,
			min_length: opt.min_length ?? opt.minLength,
			max_length: opt.max_length ?? opt.maxLength,
		};

		// Remove undefined keys to ensure stable stringify
		// (JSON.stringify removes them anyway, but cleaning helps debugging)
		Object.keys(normalized).forEach((key) => {
			// biome-ignore lint/suspicious/noExplicitAny: allow undefined check
			if ((normalized as any)[key] === undefined) {
				// biome-ignore lint/suspicious/noExplicitAny: safe delete
				delete (normalized as any)[key];
			}
		});

		return normalized;
	});
}

// biome-ignore lint/suspicious/noExplicitAny: Choices structure varies
function normalizeChoices(choices: any[] | undefined): any[] {
	if (!choices || choices.length === 0) return [];
	// biome-ignore lint/suspicious/noExplicitAny: safe
	return choices.map((c: any) => ({
		name: c.name,
		value: c.value,
		name_localizations: sortObjectKeys(c.name_localizations ?? c.nameLocalizations),
	}));
}
