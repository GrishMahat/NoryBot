import 'colors';
import {
	ApplicationCommand,
	Client,
	ApplicationCommandType,
	ApplicationCommandOptionData,
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
		const [localCommands, applicationCommands] = await Promise.all([
			getLocalCommands(),
			getApplicationCommands(client),
		]);

		if (!localCommands || !applicationCommands) {
			throw new Error('Failed to fetch commands');
		}

		const deletedCommands: string[] = [];
		const updatedCommands: string[] = [];
		const newCommands: string[] = [];

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

		logCommandChanges(
			localCommands,
			updatedCommands,
			newCommands,
			deletedCommands,
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
	for (const [index, localCommand] of localCommands.entries()) {
		try {
			// Ensure local command is properly defined and not marked as deleted
			if (
				!localCommand ||
				!localCommand.data ||
				!localCommand.data.name ||
				localCommand.deleted === true
			) {
				continue;
			}

			const { data } = localCommand;
			const commandName = data.name;
			const existingCommand = applicationCommands.find(
				(cmd) => cmd.name === commandName,
			);

			if (existingCommand) {
				const isUpdated = await handleExistingCommand(
					existingCommand,
					localCommand,
				);
				if (isUpdated) updatedCommands.push(commandName);
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
	}
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
			await existingCommand.edit({
				name: localCommand.data.name,
				description: localCommand.data.description ?? '',
				contexts: localCommand.data.contexts ?? [0, 1],
				integrationTypes: localCommand.data.integration_types ?? [0, 1],
				options:
					(localCommand.data.options as ApplicationCommandOptionData[]) ?? [],
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
		await client.application?.commands.create({
			name: data.name,
			description: data.description ?? '',
			contexts: data.contexts ?? [0, 1],
			integrationTypes: data.integration_types ?? [0, 1],
			options: (data.options as ApplicationCommandOptionData[]) ?? [],
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
 * Logs a formatted report of command synchronization changes.
 *
 * @param {LocalCommand[]} localCommands - The complete list of local command definitions.
 * @param {string[]} updatedCommands - Names of updated commands.
 * @param {string[]} newCommands - Names of newly registered commands.
 * @param {string[]} deletedCommands - Names of deleted commands.
 */
function logCommandChanges(
	localCommands: LocalCommand[],
	updatedCommands: string[],
	newCommands: string[],
	deletedCommands: string[],
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
