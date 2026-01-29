import axios from 'axios';
import fs from 'fs';
import path from 'path';
import util from 'util';
import winston, { format } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import Transport from 'winston-transport';

// --- 1. Public Types & Constants ---

export const LEVELS = {
	TRACE: 0,
	DEBUG: 1,
	INFO: 2,
	WARN: 3,
	ERROR: 4,
	FATAL: 5,
} as const;

export type LevelName = keyof typeof LEVELS;

export interface LogOptions {
	tag?: string;
	source?: string;
	ids?: Record<string, string | number>;
	context?: unknown;
}

// --- Configuration ---

const CONFIG = {
	NODE_ENV: process.env.NODE_ENV || 'development',
	LOG_LEVEL: (process.env.LOG_LEVEL || 'INFO') as LevelName,
	LOG_OUTPUT: process.env.LOG_OUTPUT, // Optional override ("stdout" or file path)
};

const ERROR_WEBHOOK = process.env.ERROR_WEBHOOK;

const WINSTON_LEVELS = {
	fatal: 0,
	error: 1,
	warn: 2,
	info: 3,
	debug: 4,
	trace: 5,
} as const;

type WinstonLevel = keyof typeof WINSTON_LEVELS;

const LOG_DIR = path.join(process.cwd(), 'logs');

const REDACT_KEYS = /token|secret|password|authorization|apikey|api_key|clientsecret/i;
const MAX_CONTEXT_DEPTH = 6;
const MAX_CONTEXT_LENGTH = 10000;

const ORIGINAL_CONSOLE = {
	log: console.log,
	info: console.info,
	warn: console.warn,
	error: console.error,
	debug: console.debug,
	trace: console.trace,
};

const ensureLogDir = (): void => {
	if (!fs.existsSync(LOG_DIR)) {
		fs.mkdirSync(LOG_DIR, { recursive: true });
	}
};

const getWinstonLevel = (levelName: LevelName): WinstonLevel => {
	const lower = levelName.toLowerCase() as WinstonLevel;
	return WINSTON_LEVELS[lower] !== undefined ? lower : 'info';
};

const redactValue = (value: unknown, depth = 0, seen = new WeakSet<object>()): unknown => {
	if (value === null || value === undefined) return value;
	if (typeof value !== 'object') return value;
	if (value instanceof Error) {
		return {
			name: value.name,
			message: value.message,
			stack: value.stack,
		};
	}
	if (depth >= MAX_CONTEXT_DEPTH) return '[Truncated]';
	if (seen.has(value as object)) return '[Circular]';
	seen.add(value as object);

	if (Array.isArray(value)) {
		return value.map((item) => redactValue(item, depth + 1, seen));
	}

	const result: Record<string, unknown> = {};
	for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
		if (REDACT_KEYS.test(key)) {
			result[key] = '[Redacted]';
			continue;
		}
		result[key] = redactValue(val, depth + 1, seen);
	}

	return result;
};

const safeStringify = (value: unknown): string => {
	try {
		const redacted = redactValue(value);
		const stringified = JSON.stringify(redacted);
		if (stringified.length > MAX_CONTEXT_LENGTH) {
			return `${stringified.slice(0, MAX_CONTEXT_LENGTH)}...[Truncated]`;
		}
		return stringified;
	} catch {
		return '[Unserializable]';
	}
};

const formatForConsole = (value: unknown): string =>
	util.inspect(value, {
		depth: 4,
		colors: false,
		compact: true,
		breakLength: 120,
	});

const baseFormat = format((info) => {
	info.pid = process.pid;
	info.env = CONFIG.NODE_ENV;
	return info;
});

const redactFormat = format((info) => {
	if (typeof info.message === 'object') {
		info.message = safeStringify(info.message);
	}
	if (info.context) {
		info.context = redactValue(info.context);
	}
	return info;
});

const devFormat = format.combine(
	baseFormat(),
	redactFormat(),
	format.errors({ stack: true }),
	format.splat(),
	format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
	format.colorize({ all: true }),
	format.printf((info) => {
		const metaParts = [
			info.tag ? `[${info.tag}]` : '',
			info.source ? `[src:${info.source}]` : '',
			info.ids ? `[ids:${formatForConsole(info.ids)}]` : '',
		].filter(Boolean);
		const meta = metaParts.length ? ` ${metaParts.join(' ')}` : '';
		const contextValue = info.context ? formatForConsole(info.context) : '';
		const contextInline =
			contextValue && contextValue.length <= 200 ? ` | ctx=${contextValue}` : '';
		const contextBlock =
			contextValue && contextValue.length > 200 ? `\n  ctx: ${contextValue}` : '';
		const stack = info.stack ? `\n${info.stack}` : '';
		return `[${info.timestamp}] [${info.level}]${meta} ${info.message}${contextInline}${contextBlock}${stack}`;
	}),
);

const jsonFormat = format.combine(
	baseFormat(),
	redactFormat(),
	format.timestamp(),
	format.errors({ stack: true }),
	format.json(),
);

interface DiscordWebhookTransportOptions extends Transport.TransportStreamOptions {
	webhookUrl: string;
	username?: string;
}

class DiscordWebhookTransport extends Transport {
	private webhookUrl: string;
	private username?: string;

	constructor(options: DiscordWebhookTransportOptions) {
		super(options);
		this.webhookUrl = options.webhookUrl;
		this.username = options.username;
	}

	public async log(info: winston.Logform.TransformableInfo, callback: () => void): Promise<void> {
		setImmediate(() => {
			this.emit('logged', info);
		});

		const payload = this.buildPayload(info);
		try {
			await axios.post(this.webhookUrl, payload, {
				headers: { 'Content-Type': 'application/json' },
			});
		} catch (error) {
			if (CONFIG.NODE_ENV !== 'production') {
				ORIGINAL_CONSOLE.error('Discord webhook log failed:', error);
			}
		}

		callback();
	}

	private buildPayload(info: winston.Logform.TransformableInfo) {
		const timestamp = info.timestamp ?? new Date().toISOString();
		const level = String(info.level).toUpperCase();
		const tag = info.tag ? ` [${info.tag}]` : '';
		const source = info.source ? ` [src:${info.source}]` : '';
		const ids = info.ids ? ` ids=${safeStringify(info.ids)}` : '';
		const context = info.context ? `\nctx=${safeStringify(info.context)}` : '';
		const stack = info.stack ? `\n${info.stack}` : '';
		const message = `${timestamp} [${level}]${tag}${source}${ids}\n${info.message}${context}${stack}`;

		return {
			username: this.username ?? 'NoryBot Logger',
			content: this.truncateMessage(message),
		};
	}

	private truncateMessage(message: string): string {
		if (message.length <= 1990) return message;
		return `${message.slice(0, 1990)}...`;
	}
}

const getTransports = (): winston.transport[] => {
	const transports: winston.transport[] = [];
	const output = CONFIG.LOG_OUTPUT?.toLowerCase();
	const webhookFormat = format.combine(baseFormat(), redactFormat(), format.timestamp());

	if (CONFIG.NODE_ENV === 'production') {
		if (ERROR_WEBHOOK) {
			transports.push(
				new DiscordWebhookTransport({
					level: 'error',
					webhookUrl: ERROR_WEBHOOK,
					format: webhookFormat,
				}),
			);
		}
		if (output === 'stdout' || output === 'console') {
			transports.push(
				new winston.transports.Console({
					format: jsonFormat,
				}),
			);
			return transports;
		}

		ensureLogDir();
		if (CONFIG.LOG_OUTPUT) {
			transports.push(
				new winston.transports.File({
					filename: CONFIG.LOG_OUTPUT,
					format: jsonFormat,
				}),
			);
			return transports;
		}

		transports.push(
			new DailyRotateFile({
				dirname: LOG_DIR,
				filename: 'latest-%DATE%.log',
				datePattern: 'YYYY-MM-DD',
				zippedArchive: true,
				maxFiles: '14d',
				maxSize: '10m',
				format: jsonFormat,
			}),
		);
		return transports;
	}

	transports.push(
		new winston.transports.Console({
			format: devFormat,
		}),
	);
	if (ERROR_WEBHOOK) {
		transports.push(
			new DiscordWebhookTransport({
				level: 'error',
				webhookUrl: ERROR_WEBHOOK,
				format: webhookFormat,
			}),
		);
	}

	if (CONFIG.LOG_OUTPUT) {
		ensureLogDir();
		transports.push(
			new winston.transports.File({
				filename: CONFIG.LOG_OUTPUT,
				format: jsonFormat,
			}),
		);
	}

	return transports;
};

const logger = winston.createLogger({
	levels: WINSTON_LEVELS,
	level: getWinstonLevel(CONFIG.LOG_LEVEL),
	transports: getTransports(),
	exitOnError: false,
});

class Logs {
	private consoleHooked = false;

	public log(level: LevelName, messageOrError: unknown, options?: LogOptions) {
		const levelKey = getWinstonLevel(level);
		const normalized = this.normalize(messageOrError, options);
		logger.log({
			level: levelKey,
			message: normalized.message,
			tag: normalized.tag,
			source: normalized.source,
			ids: normalized.ids,
			context: normalized.context,
			error: normalized.error,
			stack: normalized.stack,
		});
	}

	public trace(messageOrError: unknown, options?: LogOptions) {
		this.log('TRACE', messageOrError, options);
	}

	public debug(messageOrError: unknown, options?: LogOptions) {
		this.log('DEBUG', messageOrError, options);
	}

	public info(messageOrError: unknown, options?: LogOptions) {
		this.log('INFO', messageOrError, options);
	}

	public warn(messageOrError: unknown, options?: LogOptions) {
		this.log('WARN', messageOrError, options);
	}

	public error(messageOrError: unknown, options?: LogOptions) {
		this.log('ERROR', messageOrError, options);
	}

	public fatal(messageOrError: unknown, options?: LogOptions) {
		this.log('FATAL', messageOrError, options);
	}

	public hookConsole(): void {
		if (this.consoleHooked) return;
		this.consoleHooked = true;

		console.log = (...args: unknown[]) => this.info(this.formatConsoleArgs(args));
		console.info = (...args: unknown[]) => this.info(this.formatConsoleArgs(args));
		console.warn = (...args: unknown[]) => this.warn(this.formatConsoleArgs(args));
		console.error = (...args: unknown[]) => this.error(this.formatConsoleArgs(args));
		console.debug = (...args: unknown[]) => this.debug(this.formatConsoleArgs(args));
		console.trace = (...args: unknown[]) => this.trace(this.formatConsoleArgs(args));
	}

	private normalize(input: unknown, options?: LogOptions) {
		let message = '';
		let error: Error | undefined;
		let stack: string | undefined;

		if (input instanceof Error) {
			error = input;
			message = input.message;
			stack = input.stack;
		} else if (typeof input === 'string') {
			message = input;
		} else {
			message = safeStringify(input);
		}

		return {
			message,
			error,
			stack,
			tag: options?.tag,
			source: options?.source,
			ids: options?.ids,
			context: options?.context,
		};
	}

	private formatConsoleArgs(args: unknown[]): unknown {
		if (args.length === 1) return args[0];
		return util.format(...args);
	}
}

export const logs = new Logs();
