import type { Logger } from '@/handlers/Logger';

declare global {
	var logger: Logger;
	var errorHandler: Logger; // Keep for backward compatibility if needed, or remove
}

/**
 * @file NoryBot Type Definitions
 * @description Central export point for all type definitions used in the bot
 */

// API Integration Types
export * from './api/reddit';
// Core Discord Types
export * from './discord/commands';
export * from './discord/components';
export * from './discord/events';
// Error Handling Types
export * from './error/index';
// Feature Types
export * from './features/currency';
// Feature Types
export * from './features/currency';
export * from './features/image';

// Utility Types
export * from './utils/index';
