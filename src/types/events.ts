import { Client, ClientEvents } from 'discord.js';

/**
 * Represents information about a Discord event handler
 */
export interface EventInfo {
  /** The event handler function */
  function: EventHandler;
  /** The name of the file containing the event handler */
  fileName: string;
  /** Priority of the event handler (lower numbers execute first) */
  priority: number;
}

/**
 * Type for event handler functions that can be async or sync
 */
export type EventHandler = (
  client: Client,
  ...args: unknown[]
) => Promise<void> | void;

/**
 * Type-safe event handler with proper event parameter typing
 */
export type TypedEventHandler<K extends keyof ClientEvents> = (
  client: Client,
  ...args: ClientEvents[K]
) => Promise<void> | void;

/**
 * Registry for storing event handlers with their associated information
 */
export interface EventRegistry extends Map<string, EventInfo[]> {
  get<K extends keyof ClientEvents>(key: K): EventInfo[] | undefined;
  set<K extends keyof ClientEvents>(key: K, value: EventInfo[]): this;
}

/**
 * Custom error class for event-related errors
 */
export class EventError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'EventError';
  }
}
