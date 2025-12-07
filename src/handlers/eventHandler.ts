import path from 'path';
import { EventError, type EventInfo, type EventRegistry } from '@/types';
import type { Client, ClientEvents } from 'discord.js';
import fs from 'fs/promises';
import getAllFiles from '@/utils/helpers/getAllFiles';
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
			await global.logger.error(error, 'EventManagerInitError');
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
		global.logger.success('Reload', 'Events reloaded successfully.');
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
			await global.logger.error(error, 'EventFolderProcessError', { eventFolder });
		}
	}

	private async loadEventFile(eventFile: string, eventName: keyof ClientEvents): Promise<void> {
		try {
			// Delete from require cache to support reloading
			delete require.cache[require.resolve(eventFile)];

			const eventModule = await import(eventFile);
			const eventFunction = eventModule.default;

			if (typeof eventFunction !== 'function') {
				global.logger.warn(
					'Event Handler',
					`Skipping invalid event handler in ${path.basename(eventFile)}: default export is not a function.`,
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
			await global.logger.error(error, 'EventFileLoadError', { eventFile });
		}
	}

	private registerEvents(): void {
		const tableData: string[][] = [];

		for (const [eventName, handlers] of this.eventRegistry.entries()) {
			const typedEventName = eventName as keyof ClientEvents;

			// Sort by priority (descending logic: b - a)
			handlers.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

			handlers.forEach((h) => {
				tableData.push([
					eventName,
					h.fileName,
					(h.priority ?? 0).toString(),
					h.once ? 'ONCE' : 'ON',
					'✅',
				]);
			});

			// biome-ignore lint/suspicious/noExplicitAny: Generic event wrapper requires any
			const wrapper = async (...args: any[]) => {
				for (const handlerInfo of handlers) {
					try {
						await handlerInfo.function(this.client, ...args);
					} catch (error) {
						await global.logger.error(error, 'EventHandlerExecutionError', {
							eventName: typedEventName,
							fileName: handlerInfo.fileName,
						});
					}
				}
			};

			this.client.on(typedEventName, wrapper);
			this.loadedEvents.add(typedEventName);
		}

		if (process.env.NODE_ENV === 'development') {
			global.logger.info('Event Manager', 'Loaded Events:');
			global.logger.table(['Event', 'File', 'Priority', 'Type', 'Status'], tableData);
		}
	}
}

export default EventManager;
