/**
 * @file Types related to Discord events
 * @description Defines types for Discord event handlers and event registry
 */

import type { Client, ClientEvents } from 'discord.js';

/**
 * Represents information about a Discord event handler
 */
export interface EventOptions {
	/** Whether the event should only run once */
	once?: boolean;
	/** Priority of the event handler (lower numbers execute first) */
	priority?: number;
}

/**
 * Represents information about a Discord event handler
 */
export interface EventInfo extends EventOptions {
	/** The event handler function */
	function: EventHandler;
	/** The name of the file containing the event handler */
	fileName: string;
	/** The name of the event */
	name: keyof ClientEvents;
}

/**
 * Type for event handler functions that can be async or sync
 */
export type EventHandler = (client: Client, ...args: unknown[]) => Promise<void> | void;

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
