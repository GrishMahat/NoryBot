import path from 'path';
import getAllFiles from './getAllFiles';
import { Modal } from '../../types/index';

/**
 * Dynamically imports and returns an array of modal objects from files in the 'modals' directory.
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
	const modals: Modal[] = [];
	const modalDir = path.resolve(__dirname, '..', '..', 'modals');

	// Retrieve all files in the 'modals' directory
	const modalFiles = getAllFiles(modalDir, false).filter(
		(file) => file.endsWith('.js') || file.endsWith('.ts'), // Filter by JS or TS files
	);

	// Iterate through each modal file
	for (const modalFile of modalFiles) {
		try {
			// Dynamically import the modal file directly
			const importedModule = await import(modalFile);
			const modalObject: Modal = importedModule.default;

			// Validate the imported object
			if (
				!modalObject ||
				typeof modalObject !== 'object' ||
				!modalObject.customId ||
				typeof modalObject.run !== 'function'
			) {
				console.warn(
					`Skipped importing ${modalFile} as it does not export a valid modal object.`,
				);
				continue;
			}

			// Skip the modal if its customId is in the exceptions array
			if (exceptions.includes(modalObject.customId)) continue;

			// Add the valid modal object to the modals array
			modals.push(modalObject);
		} catch (error) {
			console.error(
				`Failed to import ${modalFile}: ${(error as Error).message}`,
			);
		}
	}

	return modals;
};

export default getModals;
