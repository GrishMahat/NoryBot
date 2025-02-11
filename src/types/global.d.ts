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
  // eslint-disable-next-line no-var
  var errorHandler: ErrorHandler;
}

export {};
