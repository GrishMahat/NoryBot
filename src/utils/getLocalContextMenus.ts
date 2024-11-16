import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import getAllFiles from './getAllFiles.js';
import { LocalContextMenu } from '../types/index.js';

// Helper to get the current directory path in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Dynamically imports a single command file and returns the command object if it is valid.
 * This function checks if the command file is valid by ensuring it exports a default object with a 'name' property.
 * It also checks if the command name is in the list of exceptions provided.
 *
 * @param {string} commandFile - The path to the command file.
 * @param {string[]} exceptions - An array of command names to exclude from the import process.
 * @returns {Promise<ContextMenu | null>} The command object if valid, otherwise null.
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
  exceptions: string[]
): Promise<LocalContextMenu | null> {
  try {
    const commandFileURL = pathToFileURL(commandFile).href;
    const commandModule = await import(commandFileURL);

    if (!commandModule?.default) {
      console.error(
        `Context menu module at ${commandModule} is missing a default export.`
      );
      return null;
    }

    const commandObject: LocalContextMenu = commandModule.default;

    // Validate the command file by checking if it exports a default object with a 'name' property.
    if (!commandObject?.data?.name) {
      throw new Error(
        `Context menu file ${commandFile} is invalid or missing a 'name' property.`
      );
    }

    // Check if the command name is in the list of exceptions provided.
    if (exceptions.includes(commandObject.data.name)) {
      throw new Error(
        `Context menu ${commandObject.data.name} is in the exception list.`
      );
    }

    return commandObject;
  } catch (error) {
    console.error(`Failed to import Context menu file ${commandFile}:`, error);
    return null;
  }
}

export default async function loadCommands(
  exceptions: string[] = []
): Promise<LocalContextMenu[]> {
  const commandsDir = path.resolve(__dirname, '..', 'contextmenus');
  const allCommandFiles = getAllFiles(commandsDir, false).filter(
    (file) => file.endsWith('.js') || file.endsWith('.ts') // Filter out files that do not end with '.js' or '.ts'
  );

  const commands: LocalContextMenu[] = [];
  for (const file of allCommandFiles) {
    try {
      const command = await importCommandFile(file, exceptions);
      if (command) {
        commands.push(command);
      }
    } catch (error) {
      console.error(`Error processing command file ${file}:`, error);
    }
  }

  return commands;
}
