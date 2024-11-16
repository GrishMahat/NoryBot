declare module 'smtp-server' {
  import { Server, ServerOptions } from 'net';
  import { Readable } from 'stream';
  import { TLSSocket } from 'tls';

  export class SMTPServer extends Server {
    constructor(options: SMTPServerOptions);

    close(callback?: (error?: Error) => void): void;

    listen(port: number, hostname?: string, callback?: () => void): void;
    listen(port: number, callback?: () => void): void;
  }

  export interface SMTPServerOptions extends ServerOptions {
    // Authentication options
    authOptional?: boolean;
    allowInsecureAuth?: boolean;
    authMethods?: string[];

    // TLS options
    secure?: boolean;
    needsUpgrade?: boolean;
    key?: string | Buffer;
    cert?: string | Buffer;
    ca?: string | Buffer;

    // Size limits
    size?: number;
    maxAllowedSize?: number;

    // Connection handling
    maxClients?: number;
    maxConnections?: number;
    connTimeout?: number;

    // Session handling
    banner?: string;
    disabledCommands?: string[];
    hideSTARTTLS?: boolean;

    // Event handlers
    onAuth?(
      auth: AuthenticationData,
      session: SMTPServerSession,
      callback: (error: Error | null, response?: AuthenticationResponse) => void
    ): void;
    onConnect?(
      session: SMTPServerSession,
      callback: (error?: Error) => void
    ): void;
    onData?(
      stream: Readable,
      session: SMTPServerSession,
      callback: (error?: Error) => void
    ): void;
    onMailFrom?(
      address: Address,
      session: SMTPServerSession,
      callback: (error?: Error) => void
    ): void;
    onRcptTo?(
      address: Address,
      session: SMTPServerSession,
      callback: (error?: Error) => void
    ): void;
  }

  export interface SMTPServerSession {
    id: string;
    remoteAddress: string;
    clientHostname: string;
    openingCommand: string;
    secure: boolean;
    transmissionType: string;
    transaction: number;
    envelope: Envelope;
    socket: TLSSocket;
  }

  export interface AuthenticationData {
    method: string;
    username: string;
    password: string;
    accessToken?: string;
  }

  export interface AuthenticationResponse {
    user: string | object;
    data?: object;
  }

  export interface Address {
    address: string;
    args?: object;
  }

  export interface Envelope {
    mailFrom: Address;
    rcptTo: Address[];
  }
}
