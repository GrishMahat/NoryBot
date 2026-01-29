import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { logs } from '@/services/logs';
import type { Command } from '@/types';
import getAllFiles from './getAllFiles';

/**
 * Dynamically imports a single command file and returns the command object if it is valid.
 * This function checks if the command file is valid by ensuring it exports a default object with a 'name' property.
 * It also checks if the command name is in the list of exceptions provided.
 *
 * @param {string} commandFile - The path to the command file.
 * @param {string[]} exceptions - An array of command names to exclude from the import process.
 * @returns {Promise<Command | null>} The command object if valid, otherwise null.
 * @throws {Error} Throws an error if there's a problem importing or processing the file, or if the command is in the exception list.
 * @example
 * // Basic usage
 * importCommandFile('/path/to/commandFile.js', ['exceptionCommand']).then(command => {
 *   if (command) {
 *     console.log('Imported command:', command);
 *   } else {
 *     console.log('Command is invalid or in the exception list.');
 *   }
 * }).catch(error => {
 *   console.error('Error importing command file:', error);
 * });
 *
 * @note
 * Ensure that the command file exports a default object with a 'name' property.
 */
async function importCommandFile(
	commandFile: string,
	exceptions: string[],
): Promise<Command | null> {
	try {
		// Use dynamic import instead of pathToFileURL and require
		const commandModule = await import(commandFile);

		if (!commandModule?.default) {
			logs.error(`Command module at ${commandFile} is missing a default export.`, {
				tag: 'CommandLoader',
			});
			return null;
		}

		const commandObject: Command = commandModule.default;

		// Validate the command file by checking if it exports a default object with a 'name' property.
		if (!commandObject?.data?.name) {
			throw new Error(`Command file ${commandFile} is invalid or missing a 'name' property.`);
		}

		// Check if the command name is in the list of exceptions provided.
		if (exceptions.includes(commandObject.data.name)) {
			throw new Error(`Command ${commandObject.data.name} is in the exception list.`);
		}

		// Make sure we're not returning the toJSON function as a command
		if (commandObject.data.name === 'toJSON') {
			logs.warn(
				`Skipping toJSON method that was incorrectly treated as a ${commandObject.data}command.`,
				{ tag: 'CommandLoader' },
			);
			return null;
		}

		return commandObject;
	} catch (error) {
		logs.error(`Failed to import command file ${commandFile}`, {
			tag: 'CommandLoader',
			context: error,
		});
		return null;
	}
}

export default async function loadCommands(exceptions: string[] = []): Promise<Command[]> {
	// Update path to point to the src/commands directory
	const commandsPath = path.join(__dirname, '..', '..', 'commands');

	try {
		const commandFiles = getAllFiles(commandsPath);

		// Process all command files in parallel for better performance
		const commandPromises = commandFiles.map((commandFile) =>
			importCommandFile(commandFile, exceptions),
		);

		const commandResults = await Promise.all(commandPromises);

		// Filter out null results and return valid commands
		return commandResults.filter((command): command is Command => command !== null);
	} catch (error) {
		logs.error('Error loading commands', { tag: 'CommandLoader', context: error });
		return [];
	}
}
