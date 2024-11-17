import { Client } from 'discord.js';

export interface EventInfo {
  function: EventHandler;
  fileName: string;
  priority: number;
}

export type EventHandler = (
  client: Client,
  ...args: any[]
) => Promise<void> | void;

export interface EventRegistry extends Map<string, EventInfo[]> {}

export class EventError extends Error {
  constructor(
    message: string,
    public readonly context?: any
  ) {
    super(message);
    this.name = 'EventError';
  }
}
