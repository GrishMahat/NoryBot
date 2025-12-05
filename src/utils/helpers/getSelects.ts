import type { SelectMenu } from '../../types/index';
import { loadSelects } from './loadComponents';

/**
 * Dynamically imports and returns an array of select menu objects from files in the 'components/selects' directory.
 * Filters out files that do not export a valid select menu object or are explicitly excluded.
 * remove this later
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
const importSelectMenus = async (exceptions: string[] = []): Promise<SelectMenu[]> => {
	return loadSelects(exceptions);
};

export default importSelectMenus;
