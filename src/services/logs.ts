import fs from 'fs';
import path from 'path';

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

// Normalized internal log object (frozen)
interface NormalizedLog {
	level: LevelName;
	message: string;
	error?: Error;
	stack?: string;
	tag?: string;
	source?: string;
	ids?: Record<string, string | number>;
	context?: unknown;
	timestamp: string;
}

// Decisions
enum Decision {
	CONTINUE,
	CRASH,
}

// Configuration (Read Once)
const CONFIG = {
	NODE_ENV: process.env.NODE_ENV || 'development',
	LOG_LEVEL: (process.env.LOG_LEVEL || 'INFO') as LevelName,
	LOG_OUTPUT: process.env.LOG_OUTPUT, // Optional override
};

// Ensure log directory exists if in production
const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'latest.log');

if (CONFIG.NODE_ENV === 'production') {
	try {
		if (!fs.existsSync(LOG_DIR)) {
			fs.mkdirSync(LOG_DIR, { recursive: true });
		}
	} catch (err) {
		console.error('FATAL: Could not create log directory (Sync)', err);
		process.exit(1);
	}
}

// --- The Service ---

class Logs {
	// 1. Public API
	public log(level: LevelName, messageOrError: unknown, options?: LogOptions) {
		// 1. Normalize
		const normalized = this.normalize(level, messageOrError, options);

		// 2. Output
		this.output(normalized);

		// 3. Decide (Errors Only)
		if (level === 'ERROR' || level === 'FATAL') {
			const decision = this.decide(normalized);
			// 4. Act
			this.act(decision, normalized);
		}
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

	// Phase 1: Normalize
	private normalize(level: LevelName, input: unknown, options?: LogOptions): NormalizedLog {
		const timestamp = new Date().toISOString();
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
			try {
				message = JSON.stringify(input);
			} catch {
				message = String(input);
			}
		}

		// If level is error-like but no Error object provided, create one for stack trace if missing
		if ((level === 'ERROR' || level === 'FATAL') && !error) {
			// Optional: We could fabricate an error here to get a stack trace,
			// but for strictness we just pass what we have.
		}

		return Object.freeze({
			level,
			message,
			error,
			stack,
			tag: options?.tag,
			source: options?.source,
			ids: options?.ids,
			context: options?.context,
			timestamp,
		});
	}

	// Phase 2: Output
	private output(log: NormalizedLog) {
		// Check level threshold
		if (LEVELS[log.level] < LEVELS[CONFIG.LOG_LEVEL]) {
			return;
		}

		if (CONFIG.NODE_ENV === 'production') {
			const line = JSON.stringify(log) + '\n';
			// Append to file, async, fire-and-forget
			fs.appendFile(LOG_FILE, line, () => {});
		} else {
			// Development: Pretty Print
			const color = this.getColor(log.level);
			const prefix = `[${log.timestamp}] [${log.level}]`;
			const meta = [log.tag ? `[${log.tag}]` : '', log.source ? `[src:${log.source}]` : '']
				.filter(Boolean)
				.join(' ');

			console.log(`${color(prefix)} ${meta} ${log.message}`);

			if (log.error) {
				console.error(log.stack || log.error);
			}
			if (log.context) {
				console.log('Context:', log.context);
			}
		}
	}

	// Phase 3: Decide
	private decide(log: NormalizedLog): Decision {
		if (log.level === 'FATAL') {
			return Decision.CRASH;
		}
		// Strict rules: specific boundary errors could trigger CRASH here if needed.
		// Default to CONTINUE.
		return Decision.CONTINUE;
	}

	// Phase 4: Act
	private act(decision: Decision, log: NormalizedLog) {
		if (decision === Decision.CONTINUE) return;

		if (decision === Decision.CRASH) {
			// Last gasp log to console if in prod, just in case file didn't catch it
			if (CONFIG.NODE_ENV === 'production') {
				console.error('FATAL CRASH DECISION EXECUTED', log);
			}
			process.exit(1);
		}
	}

	// Helper for colors (Development only)
	private getColor(level: LevelName): (str: string) => string {
		// rudimentary color map for Node console
		// strictly visual, no logic dependency
		const colors: Record<LevelName, string> = {
			TRACE: '\x1b[90m', // Gray
			DEBUG: '\x1b[35m', // Magenta
			INFO: '\x1b[36m', // Cyan
			WARN: '\x1b[33m', // Yellow
			ERROR: '\x1b[31m', // Red
			FATAL: '\x1b[41m\x1b[37m', // BgRed
		};
		const reset = '\x1b[0m';
		const code = colors[level] || '';
		return (str: string) => `${code}${str}${reset}`;
	}
}

export const logs = new Logs();
