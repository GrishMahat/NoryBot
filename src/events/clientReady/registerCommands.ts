import 'colors';
import {
	ApplicationCommand,
	Client,
	ApplicationCommandType,
	ApplicationCommandOptionData,
	PermissionsBitField,
	PermissionResolvable,
} from 'discord.js';
import getLocalCommands from '../../utils/helpers/getLocalCommands';
import getApplicationCommands from '../../utils/helpers/getApplicationCommands';
import compareCommands from '../../utils/validators/commandComparing';
import { LocalCommand } from '../../types/index';

/**
 * Synchronizes local command definitions with the Discord application's registered commands.
 *
 * This function performs the following steps:
 * - Fetches local command definitions and registered application commands.
 * - Deletes commands from the application that are no longer present locally or that are marked as deleted.
 * - Updates existing commands if there are any changes.
 * - Registers new commands that are defined locally but not yet registered.
 * - Logs the changes made during the synchronization process.
 *
 * @async
 * @param {Client} client - The Discord.js client instance.
 * @returns {Promise<void>} Resolves when the synchronization process is complete.
 *
 * @note Call this function after the client is ready and ensure you have the necessary permissions.
 */
export default async (client: Client): Promise<void> => {
	try {
		// Measure data fetching time
		const fetchStartTime = process.hrtime.bigint();
		const [localCommands, applicationCommands] = await Promise.all([
			getLocalCommands(),
			getApplicationCommands(client),
		]);
		const fetchEndTime = process.hrtime.bigint();
		const fetchTime = Number(fetchEndTime - fetchStartTime) / 1_000_000;

		if (!localCommands || !applicationCommands) {
			throw new Error('Failed to fetch commands');
		}

		const deletedCommands: string[] = [];
		const updatedCommands: string[] = [];
		const newCommands: string[] = [];

		// Measure processing time (excluding Discord API calls)
		const processStartTime = process.hrtime.bigint();

		// Delete commands that either no longer exist locally or are marked as deleted
		await deleteObsoleteCommands(
			applicationCommands,
			localCommands,
			deletedCommands,
		);

		// Process the valid (non-deleted) commands for update or creation
		await updateOrCreateCommands(
			applicationCommands,
			localCommands,
			client,
			updatedCommands,
			newCommands,
		);

		const processEndTime = process.hrtime.bigint();
		const processTime = Number(processEndTime - processStartTime) / 1_000_000;
		const totalTime = Number(processEndTime - fetchStartTime) / 1_000_000;

		logCommandChanges(
			localCommands,
			updatedCommands,
			newCommands,
			deletedCommands,
			fetchTime,
			processTime,
			totalTime,
		);
	} catch (err: unknown) {
		console.error(
			`[${new Date().toISOString()}] Error during command sync: ${
				err instanceof Error ? err.message : 'Unknown error'
			}`.red,
		);
		await global.errorHandler.handleError(err, 'EventHandlerSetupError');
	}
};

/**
 * Deletes application commands that are no longer defined locally or are marked as deleted.
 * We create a set of valid command names from local commands that are NOT marked as deleted,
 * then remove all application commands which do not appear in this set.
 *
 * @async
 * @param {ApplicationCommand[]} applicationCommands - The list of commands registered with Discord.
 * @param {LocalCommand[]} localCommands - The list of local command definitions.
 * @param {string[]} deletedCommands - An array to store the names of deleted commands.
 * @returns {Promise<void>}
 */
async function deleteObsoleteCommands(
	applicationCommands: ApplicationCommand[],
	localCommands: LocalCommand[],
	deletedCommands: string[],
): Promise<void> {
	// Build a set of command names that we want to keep (only those not marked as deleted)
	const validCommandNames = new Set(
		localCommands
			.filter((cmd) => !cmd.deleted)
			.map((cmd) => cmd.data?.name)
			.filter(Boolean),
	);

	// Identify commands that should be deleted:
	// - They are ChatInput type,
	// - They have a valid name,
	// - Their name is not present in the validCommandNames set.
	const commandsToDelete = applicationCommands.filter(
		(cmd) =>
			cmd.type === ApplicationCommandType.ChatInput &&
			cmd.name &&
			!validCommandNames.has(cmd.name),
	);

	await Promise.all(
		commandsToDelete.map(async (cmd) => {
			try {
				await cmd.delete();
				deletedCommands.push(cmd.name);
			} catch (err: unknown) {
				console.error(
					`[${new Date().toISOString()}] Failed to delete command ${cmd.name}: ${
						err instanceof Error ? err.message : 'Unknown error'
					}`.red,
				);
			}
		}),
	);
}

/**
 * Updates existing commands or creates new commands based on local command definitions.
 * Optimized to process commands in parallel for better performance.
 *
 * @async
 * @param {ApplicationCommand[]} applicationCommands - The list of commands registered with Discord.
 * @param {LocalCommand[]} localCommands - The list of local command definitions.
 * @param {Client} client - The Discord.js client instance.
 * @param {string[]} updatedCommands - An array to collect names of updated commands.
 * @param {string[]} newCommands - An array to collect names of newly registered commands.
 * @returns {Promise<void>}
 */
async function updateOrCreateCommands(
	applicationCommands: ApplicationCommand[],
	localCommands: LocalCommand[],
	client: Client,
	updatedCommands: string[],
	newCommands: string[],
): Promise<void> {
	// Filter valid commands first
	const validCommands = localCommands.filter(
		(cmd) => cmd && cmd.data && cmd.data.name && cmd.deleted !== true,
	);

	// Create a map for faster lookup of existing commands
	const existingCommandsMap = new Map(
		applicationCommands.map((cmd) => [cmd.name, cmd]),
	);

	// Process all commands in parallel
	const commandPromises = validCommands.map(async (localCommand, index) => {
		try {
			const { data } = localCommand;
			const commandName = data.name;
			const existingCommand = existingCommandsMap.get(commandName);

			if (existingCommand) {
				const isUpdated = await handleExistingCommand(
					existingCommand,
					localCommand,
				);
				if (isUpdated) {
					updatedCommands.push(commandName);
				}
			} else {
				await createCommand(client, data);
				newCommands.push(commandName);
			}
		} catch (error: unknown) {
			console.error(
				`[${new Date().toISOString()}] Error processing command ${index + 1}: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`.red,
			);
		}
	});

	// Wait for all commands to be processed
	await Promise.all(commandPromises);
}

/**
 * Compares an existing command with its local definition and applies updates if needed.
 *
 * @async
 * @param {ApplicationCommand} existingCommand - The command as registered with Discord.
 * @param {LocalCommand} localCommand - The locally defined command data.
 * @returns {Promise<boolean>} Returns true if the command was updated, false otherwise.
 */
async function handleExistingCommand(
	existingCommand: ApplicationCommand,
	localCommand: LocalCommand,
): Promise<boolean> {
	const needsUpdate = compareCommands(existingCommand, localCommand);

	if (needsUpdate) {
		try {
			const defaultMemberPermissions = localCommand.data
				.default_member_permissions
				? new PermissionsBitField(
						localCommand.data
							.default_member_permissions as PermissionResolvable,
					)
				: null;

			await existingCommand.edit({
				name: localCommand.data.name,
				description: localCommand.data.description ?? '',
				contexts: localCommand.data.contexts ?? [0, 1, 2],
				integrationTypes: localCommand.data.integration_types ?? [0, 1],
				options:
					(localCommand.data.options as ApplicationCommandOptionData[]) ?? [],
				dmPermission: localCommand.data.dm_permission ?? true,
				defaultMemberPermissions,
			});
			return true;
		} catch (error: unknown) {
			console.error(
				`[${new Date().toISOString()}] Error updating command ${
					localCommand.data.name
				}: ${error instanceof Error ? error.message : 'Unknown error'}`.red,
			);
			return false;
		}
	}
	return false;
}

/**
 * Creates a new command based on the provided local command data.
 *
 * @async
 * @param {Client} client - The Discord.js client instance.
 * @param {LocalCommand['data']} data - The local command definition data.
 * @returns {Promise<void>}
 */
async function createCommand(
	client: Client,
	data: LocalCommand['data'],
): Promise<void> {
	if (!data || !data.name) {
		return;
	}

	try {
		const defaultMemberPermissions = data.default_member_permissions
			? new PermissionsBitField(
					data.default_member_permissions as PermissionResolvable,
				)
			: null;

		await client.application?.commands.create({
			name: data.name,
			description: data.description ?? '',
			contexts: data.contexts ?? [0, 1, 2],
			integrationTypes: data.integration_types ?? [0, 1],
			options: (data.options as ApplicationCommandOptionData[]) ?? [],
			dmPermission: data.dm_permission ?? true,
			defaultMemberPermissions,
		});
	} catch (err: unknown) {
		console.error(
			`[${new Date().toISOString()}] Failed to create command ${data.name}: ${
				err instanceof Error ? err.message : 'Unknown error'
			}`.red,
		);
	}
}

/**
 * Logs a formatted report of command synchronization changes with detailed performance metrics.
 *
 * @param {LocalCommand[]} localCommands - The complete list of local command definitions.
 * @param {string[]} updatedCommands - Names of updated commands.
 * @param {string[]} newCommands - Names of newly registered commands.
 * @param {string[]} deletedCommands - Names of deleted commands.
 * @param {number} fetchTime - Data fetching time in milliseconds.
 * @param {number} processTime - Processing time in milliseconds.
 * @param {number} totalTime - Total execution time in milliseconds.
 */
function logCommandChanges(
	localCommands: LocalCommand[],
	updatedCommands: string[],
	newCommands: string[],
	deletedCommands: string[],
	fetchTime: number,
	processTime: number,
	totalTime: number,
): void {
	const header = '╔════════════════ Command Sync Report ════════════════╗'.cyan;
	const footer = '╚══════════════════════════════════════════════════════╝'
		.cyan;
	const divider = '╟──────────────────────────────────────────────────────╢'
		.cyan;

	console.log(header);
	console.log(
		`║ Total Commands: ${localCommands.length.toString().yellow}${' '.repeat(
			35 - localCommands.length.toString().length,
		)} ║`.cyan,
	);
	console.log(divider);
	console.log(
		`║ Data Fetch Time: ${fetchTime.toFixed(2).toString().blue}ms${' '.repeat(
			30 - fetchTime.toFixed(2).toString().length,
		)} ║`.cyan,
	);
	console.log(
		`║ Process Time: ${processTime.toFixed(2).toString().green}ms${' '.repeat(
			33 - processTime.toFixed(2).toString().length,
		)} ║`.cyan,
	);
	console.log(
		`║ Total Time: ${totalTime.toFixed(2).toString().yellow}ms${' '.repeat(
			35 - totalTime.toFixed(2).toString().length,
		)} ║`.cyan,
	);

	if (updatedCommands.length || newCommands.length || deletedCommands.length) {
		console.log(divider);
	}

	if (updatedCommands.length) {
		console.log(`║ Updated Commands:${' '.repeat(34)} ║`.cyan);
		updatedCommands.forEach((cmd) =>
			console.log(`║   • ${cmd.yellow}${' '.repeat(45 - cmd.length)} ║`.cyan),
		);
	}

	if (newCommands.length) {
		if (updatedCommands.length) console.log(divider);
		console.log(`║ New Commands:${' '.repeat(37)} ║`.cyan);
		newCommands.forEach((cmd) =>
			console.log(`║   • ${cmd.green}${' '.repeat(45 - cmd.length)} ║`.cyan),
		);
	}

	if (deletedCommands.length) {
		if (updatedCommands.length || newCommands.length) console.log(divider);
		console.log(`║ Deleted Commands:${' '.repeat(34)} ║`.cyan);
		deletedCommands.forEach((cmd) =>
			console.log(`║   • ${cmd.red}${' '.repeat(45 - cmd.length)} ║`.cyan),
		);
	}
	console.log(footer);
}
