/**
 * @module eventHandler
 * @description Handles the dynamic loading and registration of Discord.js event handlers.
 * Supports automatic event discovery, priority-based execution, and error handling.
 */

import path from 'path';
import fs from 'fs/promises';
import { Client, ClientEvents } from 'discord.js';
import { EventInfo, EventRegistry, EventError } from '@/types';
import LRUCache from '../services/manager/LRUCache';
import { isValidEventName } from '../utils/validators/isValidEventName';
import getAllFiles from '../utils/helpers/getAllFiles';

/**
 * Cache to store loaded event modules to prevent redundant imports
 * @type {LRUCache<string, EventInfo>}
 */
const eventModuleCache = new LRUCache<string, EventInfo>({
	capacity: 500,
	defaultTTL: 3600000, // 1 hour
	cleanupIntervalMs: 300000, // 5 minutes
	evictionPolicy: 'LRU',
	onExpiry: (key): void => {
		console.log(`Event module cache expired: ${key} `.yellow);
	},
});

/**
 * Registers an event handler in the event registry
 * @param {EventRegistry} eventRegistry - The registry storing all event handlers
 * @param {keyof ClientEvents} eventName - The name of the Discord.js event
 * @param {EventInfo} eventInfo - Information about the event handler
 */
const registerEvent = (
	eventRegistry: EventRegistry,
	eventName: keyof ClientEvents,
	eventInfo: EventInfo,
): void => {
	const events = eventRegistry.get(eventName) ?? [];
	events.push(eventInfo);
	eventRegistry.set(eventName, events);
};

/**
 * Loads and registers a single event file
 * @param {string} eventFile - Path to the event handler file
 * @param {keyof ClientEvents} eventName - Name of the Discord.js event
 * @param {EventRegistry} eventRegistry - Registry to store the event handler
 * @throws {EventError} When the event file cannot be loaded or is invalid
 */
const loadEventFile = async (
	eventFile: string,
	eventName: keyof ClientEvents,
	eventRegistry: EventRegistry,
): Promise<void> => {
	try {
		const cachedEvent = eventModuleCache.get(eventFile);
		if (cachedEvent) {
			registerEvent(eventRegistry, eventName, cachedEvent);
			return;
		}

		const eventObject = await import(eventFile);

		if (!eventObject?.default) {
			console.error(`Error module at ${eventFile} is missing a default expoer`);
			return null;
		}
		const eventFunction = eventObject.default;

		if (typeof eventFunction !== 'function') {
			console.error('Invalid event handler', { eventFile });
		}

		const eventInfo: EventInfo = {
			function: eventFunction,
			fileName: path.basename(eventFile),
			priority: eventFunction.priority ?? 0,
		};

		eventModuleCache.set(eventFile, eventInfo);
		registerEvent(eventRegistry, eventName, eventInfo);
	} catch (error) {
		await global.errorHandler.handleError(error, 'EventFileLoadError');
	}
};

/**
 * Processes an event folder and loads all valid event handlers
 * @param {string} eventFolder - Path to the folder containing event handlers
 * @param {EventRegistry} eventRegistry - Registry to store the event handlers
 * @throws {EventError} When the folder cannot be processed
 */
const processEventFolder = async (
	eventFolder: string,
	eventRegistry: EventRegistry,
): Promise<void> => {
	try {
		const files = await fs.readdir(eventFolder);
		const folderName = path.basename(eventFolder);
		const eventName =
			folderName === 'validations' ? 'interactionCreate' : folderName;

		// Validate event name is a valid Discord.js event
		if (!isValidEventName(eventName)) {
			throw new EventError(`Invalid event name: ${eventName}`, {
				eventFolder,
			});
		}
		const eventFiles = files.filter((file) => {
				try {
			return (
					file &&
					typeof file === 'string' &&
					/\.(js|ts)$/.test(file) &&
					!file.endsWith('.d.ts') &&
					!file.endsWith('.js.map')
			);
				} catch (error) {
			console.error(`Error processing file: ${file}`, error);
			return false;
				}
		}).filter(Boolean);

		await Promise.all(
			eventFiles.map((file) =>
				loadEventFile(
					path.join(eventFolder, file),
					eventName as keyof ClientEvents,
					eventRegistry,
				).catch(async (error) => {
					await global.errorHandler.handleError(error, 'EventFileProcessError');
				}),
			),
		);
	} catch (error) {
		await global.errorHandler.handleError(error, 'EventFolderProcessError');
	}
};

/**
 * Main function to load and register all event handlers for the Discord client
 * @param {Client} client - The Discord.js client instance
 * @throws {EventError} When event handler setup fails
 *
 * @remarks
 * This function performs the following steps:
 * 1. Discovers all event folders in the events directory
 * 2. Loads and validates event handler files
 * 3. Registers handlers with the client, respecting priority order
 * 4. Sets up error handling for each event handler
 */
const loadEventHandlers = async (client: Client): Promise<void> => {
	const eventRegistry: EventRegistry = new Map();
	const loadedEvents = new Set<keyof ClientEvents>();

	try {
		const eventFolders = getAllFiles(
			path.join(__dirname, '..', 'events'),
			true,
		);

		await Promise.all(
			eventFolders.map((folder) => processEventFolder(folder, eventRegistry)),
		);

		for (const [eventName, handlers] of eventRegistry.entries()) {
			const typedEventName = eventName as keyof ClientEvents;
			if (loadedEvents.has(typedEventName)) continue;

			handlers.sort((a, b) => b.priority - a.priority);

			client.on(typedEventName, async (...args) => {
				for (const { function: handler, fileName } of handlers) {
					try {
						await Promise.resolve(handler(client, ...args));
					} catch (error) {
						await global.errorHandler.handleError(
							error,
							'EventHandlerExecutionError',
							{
								eventName: typedEventName,
								fileName,
								handler: handler.name,
							},
						);
					}
				}
			});

			loadedEvents.add(typedEventName);
		}
	} catch (error) {
		await global.errorHandler.handleError(error, 'EventHandlerSetupError');
	}
};

export const cleanup = (): void => {
	eventModuleCache.close();
};

export default loadEventHandlers;
