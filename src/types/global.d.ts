import { ErrorHandler } from '../handlers/errorHandler';

declare global {
  type LocalCommand = import('./index').LocalCommand;
  type LocalContextMenu = import('./index').LocalContextMenu;

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
