import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import getAllFiles from './getAllFiles.js';
import { SelectMenu } from '../types/index.js';

// Helper to get the current directory path in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Dynamically imports and returns an array of select menu objects from files in the 'selects' directory.
 * Filters out files that do not export a valid select menu object or are explicitly excluded.
 *
 * @param {string[]} exceptions - An array of customId strings to exclude from the returned select menus.
 * @returns {Promise<SelectMenu[]>} A promise that resolves to an array of valid select menu objects.
 * @example
 * // Basic usage
 * importSelectMenus(['exceptionCustomId']).then(selectMenus => {
 *   console.log('Imported select menus:', selectMenus);
 * }).catch(error => {
 *   console.error('Error importing select menus:', error);
 * });
 */
const importSelectMenus = async (
  exceptions: string[] = []
): Promise<SelectMenu[]> => {
  const selectMenus: SelectMenu[] = [];
  const selectMenuDir = path.resolve(__dirname, '..', 'selects');

  // Retrieve all files in the 'selects' directory
  const selectMenuFiles = getAllFiles(selectMenuDir, false).filter(
    (file) => file.endsWith('.js') || file.endsWith('.ts') // Filter by JS or TS files
  );

  // Iterate through each select menu file
  for (const selectMenuFile of selectMenuFiles) {
    const selectMenuFileURL = pathToFileURL(selectMenuFile).href;

    try {
      // Dynamically import the select menu file
      const importedModule = await import(selectMenuFileURL);
      const selectMenuObject: SelectMenu = importedModule.default;

      // Validate the imported object
      if (
        !selectMenuObject ||
        typeof selectMenuObject !== 'object' ||
        !selectMenuObject.customId ||
        typeof selectMenuObject.run !== 'function'
      ) {
        console.warn(
          `Skipped importing ${selectMenuFileURL} as it does not export a valid select menu object.`
        );
        continue;
      }

      // Skip the select menu if its customId is in the exceptions array
      if (exceptions.includes(selectMenuObject.customId)) continue;

      // Add the valid select menu object to the selectMenus array
      selectMenus.push(selectMenuObject);
    } catch (error) {
      console.error(
        `Failed to import ${selectMenuFileURL}: ${(error as Error).message}`
      );
    }
  }

  return selectMenus;
};

export default importSelectMenus;
