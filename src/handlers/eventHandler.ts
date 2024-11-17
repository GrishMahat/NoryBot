/**
 * @module eventHandler
 * @description Handles the dynamic loading and registration of Discord.js event handlers.
 * Supports automatic event discovery, priority-based execution, and error handling.
 */

import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import getAllFiles from '../utils/getAllFiles.js';
import fs from 'fs/promises';
import { Client } from 'discord.js';
import { EventInfo, EventRegistry, EventError } from '../types/events.js';
import LRUCache from '../utils/Cache/LRUCache.js';

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = path.dirname(__filename);

/**
 * Cache to store loaded event modules to prevent redundant imports
 * @type {LRUCache<string, EventInfo>}
 */
const eventModuleCache = new LRUCache<string, EventInfo>({
  capacity: 500,
  defaultTTL: 3600000, // 1 hour
  cleanupIntervalMs: 300000, // 5 minutes
  evictionPolicy: 'LRU',
  onExpiry: (key, value) => {
    console.log(`Event module cache expired: ${key}`.yellow);
  },
});

/**
 * Registers an event handler in the event registry
 * @param {EventRegistry} eventRegistry - The registry storing all event handlers
 * @param {string} eventName - The name of the Discord.js event
 * @param {EventInfo} eventInfo - Information about the event handler
 */
const registerEvent = (
  eventRegistry: EventRegistry,
  eventName: string,
  eventInfo: EventInfo
): void => {
  const events = eventRegistry.get(eventName) ?? [];
  events.push(eventInfo);
  eventRegistry.set(eventName, events);
};

/**
 * Loads and registers a single event file
 * @param {string} eventFile - Path to the event handler file
 * @param {string} eventName - Name of the Discord.js event
 * @param {EventRegistry} eventRegistry - Registry to store the event handler
 * @throws {EventError} When the event file cannot be loaded or is invalid
 */
const loadEventFile = async (
  eventFile: string,
  eventName: string,
  eventRegistry: EventRegistry
): Promise<void> => {
  try {
    const cachedEvent = eventModuleCache.get(eventFile);
    if (cachedEvent) {
      registerEvent(eventRegistry, eventName, cachedEvent);
      return;
    }

    const fileUrl = pathToFileURL(eventFile).href;
    const { default: eventFunction } = await import(fileUrl);

    if (typeof eventFunction !== 'function') {
      throw new EventError('Invalid event handler', { eventFile });
    }

    const eventInfo: EventInfo = {
      function: eventFunction,
      fileName: path.basename(eventFile),
      priority: eventFunction.priority ?? 0,
    };

    eventModuleCache.set(eventFile, eventInfo);
    registerEvent(eventRegistry, eventName, eventInfo);
  } catch (error) {
    throw new EventError(`Failed to load event file: ${eventFile}`, {
      cause: error,
    });
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
  eventRegistry: EventRegistry
): Promise<void> => {
  try {
    const files = await fs.readdir(eventFolder);
    const eventName =
      path.basename(eventFolder) === 'validations'
        ? 'interactionCreate'
        : path.basename(eventFolder);

    const eventFiles = files.filter(
      (file) =>
        /\.(js|ts)$/.test(file) &&
        !file.endsWith('.d.ts') &&
        !file.endsWith('.js.map')
    );

    await Promise.all(
      eventFiles.map((file) =>
        loadEventFile(
          path.join(eventFolder, file),
          eventName,
          eventRegistry
        ).catch((error) => console.error(error))
      )
    );
  } catch (error) {
    throw new EventError(`Failed to process event folder: ${eventFolder}`, {
      cause: error,
    });
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
  const loadedEvents = new Set<string>();

  try {
    const eventFolders = getAllFiles(
      path.join(__dirname, '..', 'events'),
      true
    );

    await Promise.all(
      eventFolders.map((folder) => processEventFolder(folder, eventRegistry))
    );

    for (const [eventName, handlers] of eventRegistry) {
      if (loadedEvents.has(eventName)) continue;

      handlers.sort((a, b) => b.priority - a.priority);

      client.on(eventName, async (...args) => {
        for (const { function: handler, fileName } of handlers) {
          try {
            await Promise.resolve(handler(client, ...args));
          } catch (error) {
            console.error(
              new EventError(`Handler execution failed: ${fileName}`, {
                eventName,
                error,
              })
            );
          }
        }
      });

      loadedEvents.add(eventName);
    }
  } catch (error) {
    throw new EventError('Failed to setup event handlers', { cause: error });
  }
};

export const cleanup = () => {
  eventModuleCache.close();
};

export default loadEventHandlers;
