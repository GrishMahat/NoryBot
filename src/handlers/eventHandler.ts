import type { Client, ClientEvents } from 'discord.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logs } from '@/services/logs';
import { EventError, type EventInfo, type EventRegistry } from '@/types';
import getAllFiles from '@/utils/helpers/getAllFiles';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { isValidEventName } from '@/utils/validators/isValidEventName';

export class EventManager {
	private client: Client;
	private eventRegistry: EventRegistry;
	private loadedEvents: Set<string>;

	constructor(client: Client) {
		this.client = client;
		/**
		 * Registry to store event handlers mapped by event name
		 * @type {EventRegistry}
		 */
		this.eventRegistry = new Map();
		this.loadedEvents = new Set();
	}

	/**
	 * Initializes the event manager by loading all events from the events directory
	 */
	public async init(): Promise<void> {
		try {
			const eventFolders = getAllFiles(path.join(__dirname, '..', 'events'), true);
			await Promise.all(eventFolders.map((folder) => this.processEventFolder(folder)));
			this.registerEvents();
		} catch (error) {
			logs.error(error, { tag: 'EventManager', context: 'init' });
		}
	}

	/**
	 * Reloads all events by clearing the registry and reloading files
	 */
	public async reloadEvents(): Promise<void> {
		this.client.removeAllListeners();
		this.eventRegistry.clear();
		this.loadedEvents.clear();
		await this.init();
		await this.init();
		logs.info('Reload: Events reloaded successfully.', { tag: 'EventManager' });
	}

	private async processEventFolder(eventFolder: string): Promise<void> {
		try {
			const files = await fs.readdir(eventFolder);
			const folderName = path.basename(eventFolder);
			// Map 'validations' folder to 'interactionCreate' event, otherwise use folder name
			const eventName = folderName === 'validations' ? 'interactionCreate' : folderName;

			if (!isValidEventName(eventName)) {
				throw new EventError(`Invalid event name: ${eventName}`, { eventFolder });
			}

			const eventFiles = files.filter((file) => {
				return (
					file &&
					typeof file === 'string' &&
					/\.(js|ts)$/.test(file) &&
					!file.endsWith('.d.ts') &&
					!file.endsWith('.js.map')
				);
			});

			await Promise.all(
				eventFiles.map((file) =>
					this.loadEventFile(path.join(eventFolder, file), eventName as keyof ClientEvents),
				),
			);
		} catch (error) {
			logs.error(error, { tag: 'EventManager', context: 'processEventFolder' });
		}
	}

	private async loadEventFile(eventFile: string, eventName: keyof ClientEvents): Promise<void> {
		try {
			// Delete from require cache to support reloading
			// Note: In ESM/Bun, we rely on native hot reloading or re-importing with cache busting if needed.
			// For now, we simply import.
			// delete require.cache[require.resolve(eventFile)];

			const eventModule = await import(eventFile);
			const eventFunction = eventModule.default;

			if (typeof eventFunction !== 'function') {
				logs.warn(
					`Skipping invalid event handler in ${path.basename(eventFile)}: default export is not a function.`,
					{ tag: 'EventManager' },
				);
				return;
			}

			const eventInfo: EventInfo = {
				function: eventFunction,
				fileName: path.basename(eventFile),
				name: eventName,
				priority: eventFunction.priority ?? 0,
				once: eventFunction.once ?? false,
			};

			const handlers = this.eventRegistry.get(eventName) ?? [];
			handlers.push(eventInfo);
			this.eventRegistry.set(eventName, handlers);
		} catch (error) {
			logs.error(error, { tag: 'EventManager', context: 'loadEventFile' });
		}
	}

	private registerEvents(): void {
		let loadedCount = 0;

		for (const [eventName, handlers] of this.eventRegistry.entries()) {
			const typedEventName = eventName as keyof ClientEvents;

			// Sort by priority (descending logic: b - a)
			handlers.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

			handlers.forEach(() => {
				loadedCount++;
			});

			// biome-ignore lint/suspicious/noExplicitAny: Generic event wrapper requires any
			const wrapper = async (...args: any[]) => {
				for (const handlerInfo of handlers) {
					try {
						await handlerInfo.function(this.client, ...args);
					} catch (error) {
						logs.error(error, {
							tag: 'EventManager',
							context: `Execution:${typedEventName}`,
							source: handlerInfo.fileName,
						});
					}
				}
			};

			this.client.on(typedEventName, wrapper);
			this.loadedEvents.add(typedEventName);
		}

		if (process.env.NODE_ENV === 'development') {
			logs.info(
				`Event Manager: Loaded ${loadedCount} events across ${this.eventRegistry.size} types.`,
				{ tag: 'EventManager' },
			);
		}
	}
}

export default EventManager;
