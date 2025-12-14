import type { ErrorHandler } from '@/handlers/errorHandler';

declare global {
	// Import command types from our organized structure
	type Command = import('./discord/commands').Command;
	type LocalContextMenu = import('./discord/commands').LocalContextMenu;
	//New type   and old type  with  new name
	// TODO: Rename LocalContextMenu to ContextMenu throughout the codebase
	type ContextMenu = import('./discord/commands').LocalContextMenu;
	type SelectMenu = import('./discord/commands').SelectMenu;
	type Button = import('./discord/commands').Button;
	type Modal = import('./discord/commands').Modal;
	interface Window {
		errorHandler: ErrorHandler;
	}

	namespace NodeJS {
		interface Global {
			errorHandler: ErrorHandler;
		}
	}
	var errorHandler: ErrorHandler;
}
