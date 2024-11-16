import { LocalCommand } from './index'; 

declare global {
  type LocalCommand = import('./index').LocalCommand;
}

