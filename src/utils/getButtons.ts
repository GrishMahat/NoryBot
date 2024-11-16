import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import getAllFiles from './getAllFiles.js';
import { Button } from '../types/index.js';

// Helper to get the current directory path in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Dynamically imports and returns an array of button objects from files in the 'buttons' directory.
 * Filters out files that do not export a valid button object or are explicitly excluded.
 *
 * @param {string[]} exceptions - An array of customId strings to exclude from the returned buttons.
 * @returns {Promise<Button[]>} A promise that resolves to an array of valid button objects.
 * @example
 * // Basic usage
 * importButtons(['exceptionCustomId']).then(buttons => {
 *   console.log('Imported buttons:', buttons);
 * }).catch(error => {
 *   console.error('Error importing buttons:', error);
 * });
 */
export default async function importButtons(
  exceptions: string[] = []
): Promise<Button[]> {
  const buttons: Button[] = [];
  const buttonDir = path.resolve(__dirname, '..', 'buttons');

  // Retrieve all files in the 'buttons' directory
  const buttonFiles = getAllFiles(buttonDir, false).filter(
    (file) => file.endsWith('.js') || file.endsWith('.ts') // Filter by JS or TS files
  );

  // Iterate through each button file
  for (const buttonFile of buttonFiles) {
    const buttonFileURL = pathToFileURL(buttonFile).href;

    try {
      // Dynamically import the button file
      const importedModule = await import(buttonFileURL);
      const buttonObject: Button = importedModule.default;

      // Validate the imported object
      if (
        !buttonObject ||
        typeof buttonObject !== 'object' ||
        !buttonObject.customId ||
        typeof buttonObject.run !== 'function'
      ) {
        console.warn(
          `Skipped importing ${buttonFileURL} as it does not export a valid button object.`
        );
        continue;
      }

      // Skip the button if its customId is in the exceptions array
      if (exceptions.includes(buttonObject.customId)) continue;

      // Add the valid button object to the buttons array
      buttons.push(buttonObject);
    } catch (error) {
      console.error(
        `Failed to import ${buttonFileURL}: ${(error as Error).message}`
      );
    }
  }

  return buttons;
}
