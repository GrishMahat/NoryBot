import path from 'path';
import getAllFiles from './getAllFiles';
import { Button, SelectMenu, Modal } from '../../types/index';

/**
 * Component type definitions for unified loading
 */
export type ComponentType = 'buttons' | 'selects' | 'modals';
export type Component = Button | SelectMenu | Modal;

/**
 * Unified component loader that can load any component type
 * @param componentType - The type of components to load ('buttons', 'selects', 'modals')
 * @param exceptions - Array of customId strings to exclude from loading
 * @returns Promise<Component[]> - Array of loaded components
 */
export async function loadComponents<T extends Component>(
	componentType: ComponentType,
	exceptions: string[] = [],
): Promise<T[]> {
	const components: T[] = [];
	const componentDir = path.resolve(
		__dirname,
		'..',
		'..',
		'components',
		componentType,
	);

	try {
		// Get all files in the component directory
		const componentFiles = getAllFiles(componentDir, false)
			// only .js or .ts files (getAllFiles already excludes .d.ts and .map)
			.filter((file) => file.endsWith('.js') || file.endsWith('.ts'))
			// ignore barrel index files (they are not components)
			.filter((file) => !/\/(index\.(js|ts))$/.test(file));

		// Load each component file
		for (const componentFile of componentFiles) {
			try {
				const importedModule = await import(componentFile);
				const componentObject: T = importedModule.default;

				// Validate the imported object
				if (!isValidComponent(componentObject, componentType)) {
					console.warn(
						`Skipped importing ${componentFile} as it does not export a valid ${componentType.slice(0, -1)} object.`,
					);
					continue;
				}

				// Skip if customId is in exceptions
				if (exceptions.includes(componentObject.customId)) continue;

				components.push(componentObject);
			} catch (error) {
				console.error(
					`Failed to import ${componentFile}: ${(error as Error).message}`,
				);
			}
		}

		console.log(`Loaded ${components.length} ${componentType}`.green);
		return components;
	} catch (error) {
		console.error(`Failed to load ${componentType}:`, error);
		return [];
	}
}

/**
 * Validates if an object is a valid component of the specified type
 * @param obj - The object to validate
 * @param componentType - The expected component type
 * @returns boolean - True if valid, false otherwise
 */
function isValidComponent(obj: any, componentType: ComponentType): boolean {
	if (
		!obj ||
		typeof obj !== 'object' ||
		!obj.customId ||
		typeof obj.run !== 'function'
	) {
		return false;
	}

	// Additional type-specific validation could be added here if needed
	return true;
}

/**
 * Convenience functions for loading specific component types
 */
export const loadButtons = (exceptions: string[] = []) =>
	loadComponents<Button>('buttons', exceptions);

export const loadSelects = (exceptions: string[] = []) =>
	loadComponents<SelectMenu>('selects', exceptions);

export const loadModals = (exceptions: string[] = []) =>
	loadComponents<Modal>('modals', exceptions);

/**
 * Load all components of all types
 * @param exceptions - Array of customId strings to exclude from loading
 * @returns Promise<{buttons: Button[], selects: SelectMenu[], modals: Modal[]}>
 */
export async function loadAllComponents(exceptions: string[] = []) {
	const [buttons, selects, modals] = await Promise.all([
		loadButtons(exceptions),
		loadSelects(exceptions),
		loadModals(exceptions),
	]);

	return { buttons, selects, modals };
}
