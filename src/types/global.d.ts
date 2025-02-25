import { ErrorHandler } from '../handlers/errorHandler';

declare global {
  // Import command types from our organized structure
  type LocalCommand = import('./discord/commands').LocalCommand;
  type LocalContextMenu = import('./discord/commands').LocalContextMenu;

  interface Window {
    errorHandler: ErrorHandler;
  }

  namespace NodeJS {
    interface Global {
      errorHandler: ErrorHandler;
    }
  }
  // eslint-disable-next-line no-var
  var errorHandler: ErrorHandler;
}

export {};
