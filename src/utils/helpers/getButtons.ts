import type { Button } from '@/types';
import { loadButtons } from './loadComponents';

/**
 * Dynamically imports and returns an array of button objects from files in the 'components/buttons' directory.
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
export default async function importButtons(exceptions: string[] = []): Promise<Button[]> {
	return loadButtons(exceptions);
}
