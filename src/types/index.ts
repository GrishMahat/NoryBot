import type { Logger } from '@/handlers/Logger';

declare global {
	var logger: Logger;
	var errorHandler: Logger; // Keep for backward compatibility if needed, or remove
}

/**
 * @file NoryBot Type Definitions
 * @description Central export point for all type definitions used in the bot
 */

// Core Discord Types
export * from './discord/commands';
export * from './discord/events';

// Feature Types
export * from './features/currency';
// Feature Types
export * from './features/currency';
export * from './features/image';
export * from './discord/components';
export * from './interactive';

// API Integration Types
export * from './api/reddit';

// Error Handling Types
export * from './error/index';

// Utility Types
export * from './utils/index';
