import { ErrorHandler } from '../handlers/errorHandler';

declare global {
  type LocalCommand = import('./index').LocalCommand;

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
