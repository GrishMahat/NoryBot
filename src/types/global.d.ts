import { ErrorHandler } from '../handlers/errorHandler';

declare global {
	// Import command types from our organized structure
	type LocalCommand = import('./discord/commands').LocalCommand;
	type LocalContextMenu = import('./discord/commands').LocalContextMenu;
	//New type   and old type  with  new name
	// !todo  change all the LocalCommand  => Command; LocalContextMenu => ContextMenu
	type Command = import('./discord/commands').LocalCommand;
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

export {};
