import { loadModals } from './loadComponents';
import { Modal } from '../../types/index';

/**
 * Dynamically imports and returns an array of modal objects from files in the 'components/modals' directory.
 * Filters out files that do not export a valid modal object or are explicitly excluded.
 *
 * @param {string[]} exceptions - An array of customId strings to exclude from the returned modals.
 * @returns {Promise<Modal[]>} A promise that resolves to an array of valid modal objects.
 * @example
 * // Basic usage
 * getModals(['exceptionCustomId']).then(modals => {
 *   console.log('Imported modals:', modals);
 * }).catch(error => {
 *   console.error('Error importing modals:', error);
 * });
 */
const getModals = async (exceptions: string[] = []): Promise<Modal[]> => {
	return loadModals(exceptions);
};

export default getModals;
