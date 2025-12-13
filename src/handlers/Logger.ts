import { createHash } from 'crypto';
import { type Client, DiscordAPIError, EmbedBuilder, Events, WebhookClient } from 'discord.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import determineErrorCategory from '@/services/error/determineErrorCategory';
import determineSeverity from '@/services/error/determineSeverity';
import { ErrorMetricsService } from '@/services/error/ErrorMetricsService';
import getRecoverySuggestions from '@/services/error/getRecoverySuggestions';
import { MetricsFormatter } from '@/services/error/metricsFormatter';
import { PerformanceMonitor } from '@/services/error/performanceMonitor';
import {
	type ErrorContext,
	type ErrorDetails,
	type ErrorGroup,
	type ErrorHandlerConfig,
	type ErrorInfo,
	ErrorSeverity,
	type PerformanceMetrics,
} from '@/types/index';
import { DevLogger } from '@/utils/DevLogger';

// Interface for Discord rate limit errors
interface DiscordRateLimitError extends Error {
	code: number;
	retry_after?: number;
}

/**
 * Handles error reporting, performance monitoring, and metrics generation for the Discord bot.
 * Also serves as the central logger for the application.
 */
export class Logger {
	private webhook: WebhookClient | null = null;
	private client: Client | null = null;
	private errorCache: Map<string, ErrorInfo>;
	private errorGroups: Map<string, ErrorGroup>;
	private config: ErrorHandlerConfig;
	private performanceMonitor: PerformanceMonitor | null = null;
	private metricsService: ErrorMetricsService | null = null;
	private logDirectory: string;

	/**
	 * Creates an instance of Logger.
	 * @param config Partial configuration to override defaults.
	 */
	constructor(config: Partial<ErrorHandlerConfig> = {}) {
		// Merge provided config with defaults
		this.config = {
			webhook: process.env.ERROR_WEBHOOK || '',
			environment: process.env.NODE_ENV || 'development',
			maxCacheSize: 100,
			retryAttempts: 3,
			retryDelay: 5000, // ms
			groupingThreshold: 3, // Number of errors needed to trigger a group report
			rateLimit: {
				maxErrors: 10,
				timeWindow: 60000, // ms
			},
			cacheExpiration: 24 * 60 * 60 * 1000, // 24 hours in ms
			performanceThresholds: {
				memory: 0.9, // 90% of heap usage
				cpu: 0.8, // 80% CPU usage
				responseTime: 1000, // 1 second API response time
			},
			development: {
				logToConsole: true,
				verbose: true,
				stackTraceLimit: 20,
			},
			production: {
				logToFile: true,
				alertThreshold: 10, // TODO: Implement alert threshold logic
				metricsInterval: 5 * 60 * 1000, // 5 minutes in ms
			},
			...config,
		};

		this.errorCache = new Map();
		this.errorGroups = new Map();
		this.metrics = new Map();

		this.logDirectory = path.join(process.cwd(), 'logs');
		this.ensureLogDirectory();

		// Initialize webhook if URL is provided
		if (this.config.webhook) {
			this.setupWebhook();
		} else {
			this.warn('Logger', 'No webhook URL provided. Error reporting will be limited.');
		}
	}

	private ensureLogDirectory(): void {
		if (!fs.existsSync(this.logDirectory)) {
			try {
				fs.mkdirSync(this.logDirectory, { recursive: true });
			} catch (error) {
				console.error('Logger: Failed to create logs directory:', error);
			}
		}
	}

	private async logToFile(
		level: string,
		message: string,
		context?: Record<string, unknown>,
	): Promise<void> {
		if (!this.config.production.logToFile) return;

		const date = new Date();
		const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
		const logFile = path.join(this.logDirectory, `${dateString}.log`);
		const timestamp = date.toISOString();

		let logMessage = `[${timestamp}] [${level}] ${message}`;
		if (context) {
			try {
				logMessage += `\nContext: ${JSON.stringify(context)}`;
			} catch {
				logMessage += `\nContext: [Circular or Invalid JSON]`;
			}
		}
		logMessage += '\n';

		try {
			await fs.promises.appendFile(logFile, logMessage, 'utf8');
		} catch (error) {
			console.error('Logger: Failed to write to log file:', error);
		}
	}

	public info(title: string, message: string, context?: Record<string, unknown>): void {
		if (this.config.environment === 'development') {
			DevLogger.info(title, message);
			if (context && this.config.development.verbose) console.log(context);
		} else {
			// Production logging
			this.logToFile('INFO', `${title}: ${message}`, context);
			// Info logs generally don't go to webhook to avoid spam, unless CRITICAL context is passed
		}
	}

	public success(title: string, message: string): void {
		if (this.config.environment === 'development') {
			DevLogger.success(title, message);
		} else {
			this.logToFile('SUCCESS', `${title}: ${message}`);
		}
	}

	public warn(title: string, message: string, context?: Record<string, unknown>): void {
		if (this.config.environment === 'development') {
			DevLogger.warn(title, message);
			if (context) console.warn(context);
		} else {
			console.warn(`[WARN] ${title}: ${message}`);
			// Send warnings to webhook in production
			this.sendCustomWebhook('WARN', title, message, 0xffaa00, context).catch((err) =>
				console.error('Failed to send warning webhook', err),
			);
		}
	}

	public debug(title: string, message: string, context?: Record<string, unknown>): void {
		if (this.config.environment === 'development' && this.config.development.verbose) {
			DevLogger.info(title, message); // Use info style for now, maybe add debug style later
			if (context) console.log(context);
		}
	}

	public table(headers: string[], rows: string[][]): void {
		if (this.config.environment === 'development') {
			DevLogger.table(headers, rows);
		}
	}

	/**
	 * Log an error. This is an alias/wrapper for handleError.
	 */
	public async error(error: unknown, title = 'Error', context?: ErrorContext): Promise<void> {
		await this.handleError(error, title, context);
	}

	/**
	 * Sets up the Discord Webhook client for sending error reports.
	 */
	private setupWebhook(): void {
		try {
			if (!this.config.webhook || this.config.webhook.trim() === '') {
				this.error('Webhook Setup', 'Attempted to set up webhook, but no valid URL was provided.');
				this.webhook = null;
				return;
			}
			this.webhook = new WebhookClient({ url: this.config.webhook });
		} catch (error) {
			console.error('Logger: Failed to create WebhookClient:', error);
			this.webhook = null;
		}
	}

	/**
	 * Initializes the error handler with the Discord client and sets up listeners.
	 * @param client The Discord Client instance.
	 */
	public initialize(client: Client): void {
		if (!client) {
			console.error('Logger: Initialization failed - Discord client instance is required.');
			return;
		}
		this.client = client;
		this.performanceMonitor = new PerformanceMonitor(client, this.config.performanceThresholds);
		this.metricsService = new ErrorMetricsService(this.config.cacheExpiration);
		this.setupEventListeners();
		this.startPerformanceMonitoring();
		this.success('Logger', 'Initialized successfully.');
	}

	/**
	 * Sets up global error event listeners.
	 */
	private setupEventListeners(): void {
		if (!this.client) {
			console.error('Logger: Cannot setup event listeners without a client.');
			return;
		}
		this.client.on(Events.Error, (error) => this.handleError(error, 'ClientError'));
		process.on('unhandledRejection', (reason, _promise) => {
			this.handleError(
				reason instanceof Error ? reason : new Error(String(reason)),
				'UnhandledRejection',
			);
		});
		process.on('uncaughtException', (error, _origin) => {
			this.handleError(error, 'UncaughtException');
		});
		this.info('Logger', 'Global error event listeners attached.');
	}

	/**
	 * Starts periodic performance checks and metrics reporting in production environment.
	 */
	private startPerformanceMonitoring(): void {
		if (this.config.environment === 'production' && this.config.production.metricsInterval > 0) {
			console.log(
				`ErrorHandler: Starting performance monitoring and metrics reporting every ${this.config.production.metricsInterval / 1000} seconds.`,
			);
			setInterval(async () => {
				await this.checkPerformance();
				await this.generateMetricsReport();
			}, this.config.production.metricsInterval);
		} else {
			console.log(
				'ErrorHandler: Performance monitoring and metrics reporting interval is disabled or not in production environment.',
			);
		}
	}

	/**
	 * Generates and sends a periodic report summarizing error metrics.
	 */
	private async generateMetricsReport(): Promise<void> {
		if (!this.metricsService) {
			console.warn('ErrorHandler: Metrics service not available for generating report.');
			return;
		}
		if (!this.webhook) {
			console.warn('ErrorHandler: Webhook not available for sending metrics report.');
			return;
		}

		try {
			const report = this.metricsService.generateReport();
			const groupStats = this.getErrorGroupStats();

			const embed = new EmbedBuilder()
				.setColor(0x4caf50) // Green color for success/info
				.setTitle('📊 Error Metrics Report')
				.setDescription(
					`Summary of error metrics over the last 24 hours. Environment: \`${this.config.environment}\``,
				)
				.addFields(
					{
						name: 'Hourly Rate (avg)',
						value: report.hourlyRate.toFixed(2),
						inline: true,
					},
					{
						name: 'Daily Count',
						value: report.dailyRate.toString(), // Assuming dailyRate is total count
						inline: true,
					},
					{
						name: 'Error Groups',
						value: `Total: ${groupStats.totalGroups} | Active (24h): ${groupStats.activeLast24h}`,
						inline: true,
					},
					{
						name: 'Errors by Severity',
						value: `Crit: ${report.bySeverity[ErrorSeverity.CRITICAL]} | High: ${report.bySeverity[ErrorSeverity.HIGH]} | Med: ${report.bySeverity[ErrorSeverity.MEDIUM]} | Low: ${report.bySeverity[ErrorSeverity.LOW]}`,
						inline: false, // Make it wider for readability
					},
					{
						name: `Top ${report.topErrors.length} Errors`,
						value:
							report.topErrors.length > 0
								? report.topErrors
										.map(
											(error) =>
												`• \`${error.message.substring(0, 50)}${error.message.length > 50 ? '...' : ''}\` (${error.count}x, last: <t:${Math.floor(
													error.lastOccurrence.getTime() / 1000,
												)}:R>)`,
										)
										.join('\n')
								: 'No significant errors recorded.',
					},
					{
						name: 'Top Error Groups',
						value:
							groupStats.topGroups.length > 0
								? groupStats.topGroups
										.map(
											(g) =>
												`• \`${g.message.substring(0, 50)}${g.message.length > 50 ? '...' : ''}\` (${g.count}x, last: <t:${Math.floor(g.lastSeen.getTime() / 1000)}:R>)`,
										)
										.join('\n')
								: 'No significant error groups recorded.',
					},
				)
				.setTimestamp();

			await this.webhook.send({ embeds: [embed] });
			console.log('ErrorHandler: Successfully sent metrics report.');
		} catch (error) {
			console.error('ErrorHandler: Failed to send metrics report:', error);
		}
	}

	/**
	 * Handles an incoming error, formats it, tracks metrics, and processes it for reporting.
	 * @param error The error object or unknown value caught.
	 * @param type A string indicating the source/type of the error (e.g., 'ClientError').
	 * @param context Optional additional context about the error.
	 */
	public async handleError(error: unknown, type: string, context?: ErrorContext): Promise<void> {
		try {
			const errorDetails = await this.formatError(error, type, context);

			// Track error metrics regardless of environment
			if (this.metricsService) {
				this.metricsService.trackError(errorDetails);
			}

			// Handle development logging separately
			if (this.config.environment === 'development' && this.config.development.logToConsole) {
				const contextString =
					context && Object.keys(context).length > 0 ? JSON.stringify(context, null, 2) : '';

				const lines = [
					`Message: ${errorDetails.message}`,
					`Type: ${errorDetails.type}`,
					`Severity: ${errorDetails.severity}`,
				];

				if (contextString) {
					lines.push('Context:', ...contextString.split('\n'));
				}

				if (this.config.development.verbose) {
					lines.push('Stack Trace:', ...errorDetails.stack.split('\n').slice(0, 5)); // First 5 stack lines
				}

				DevLogger.box(`Error: ${errorDetails.errorId}`, lines, 'red');

				return; // Don't send to webhook in dev unless specifically configured
			}

			// Process for production (rate limiting, caching, sending)
			await this.processError(errorDetails);
		} catch (processingError) {
			// Catch errors within the error handler itself
			console.error('ErrorHandler: CRITICAL - Error occurred within handleError:', processingError);
			// Attempt a fallback log to console
			console.error('Original Error Type:', type);
			console.error('Original Error:', error);
		}
	}

	/**
	 * Formats an error into a standardized ErrorDetails object.
	 * @param error The raw error.
	 * @param type The type/source of the error.
	 * @param context Optional context.
	 * @returns A promise resolving to the formatted ErrorDetails.
	 */
	private async formatError(
		error: unknown,
		type: string,
		context: ErrorContext = {},
	): Promise<ErrorDetails> {
		// Ensure we're working with an Error object
		const err = error instanceof Error ? error : new Error(String(error ?? 'Unknown error'));

		const isDiscordError = err instanceof DiscordAPIError;
		const category = determineErrorCategory(isDiscordError ? err : undefined);
		const performance = await this.capturePerformanceMetrics();
		const severity = determineSeverity(err, performance); // Determine severity early

		// Run potentially async operations concurrently
		const [recoverySuggestions] = await Promise.all([
			Promise.resolve()
				.then(() => getRecoverySuggestions(err))
				.catch((e) => {
					console.error('ErrorHandler: Failed to get recovery suggestions', e);
					return ['Failed to retrieve suggestions.'];
				}),
			// Add other async formatting tasks here if needed
		]);

		const groupHash = this.generateErrorHash(err, context);
		const errorId = createHash('md5')
			.update(`${Date.now()}:${Math.random()}:${err.message}`) // Add randomness to avoid collisions
			.digest('hex');

		// Limit stack trace length based on environment config
		const stackTraceLimit =
			this.config.environment === 'development'
				? this.config.development.stackTraceLimit
				: undefined; // Use default limit in production unless specified
		let stack = err.stack || 'No stack trace available';
		if (stackTraceLimit && stackTraceLimit > 0) {
			const stackLines = stack.split('\n');
			stack = stackLines.slice(0, stackTraceLimit + 1).join('\n'); // +1 to include the error message line
			if (stackLines.length > stackTraceLimit + 1) {
				stack += '\n... (stack trace truncated)';
			}
		}

		return {
			errorId,
			type,
			message: err.message,
			stack,
			timestamp: new Date().toISOString(),
			environment: this.config.environment,
			severity,
			category,
			recoverySuggestions,
			metadata: {
				nodeVersion: process.version,
				os: `${os.platform()} ${os.release()}`,
				arch: os.arch(),
				clientId: this.client?.user?.id || 'Unknown',
				// Add shard ID if applicable: this.client?.shard?.ids.join(',') || 'N/A'
			},
			context,
			performance,
			groupHash,
			recoverable: this.isErrorRecoverable(err),
			retryCount: 0, // Initial retry count
		};
	}

	/**
	 * Determines if an error, particularly a DiscordAPIError, is likely recoverable by retrying.
	 * Note: This logic might need refinement based on specific Discord API behaviors.
	 * @param error The error instance.
	 * @returns True if the error is considered potentially recoverable, false otherwise.
	 */
	private isErrorRecoverable(error: Error): boolean {
		if (error instanceof DiscordAPIError) {
			// List of Discord API error codes generally considered *not* recoverable by simple retry
			// (e.g., permission issues, invalid input, not found errors, authorization issues)
			const nonRecoverableDiscordApiCodes: number[] = [
				// 10xxx General Errors (Unknown entities, invalid states)
				10001, // Unknown Account
				10003, // Unknown Channel
				10004, // Unknown Guild
				10005, // Unknown Integration
				10006, // Unknown Invite
				10007, // Unknown Member
				10008, // Unknown Message
				10009, // Unknown Permission Overwrite
				10010, // Unknown Provider
				10011, // Unknown Role
				10012, // Unknown Token
				10013, // Unknown User
				10014, // Unknown Webhook
				10015, // Unknown Webhook (Duplicate?)

				// 20xxx Endpoint/Action Specific Errors
				20001, // Bots cannot use this endpoint
				20002, // Only bots can use this endpoint
				20009, // Explicit content cannot be sent
				20012, // Not authorized for this application
				20018, // Only owner can perform action
				20022, // Announcement rate limits (retrying won't fix)
				20024, // Under minimum age

				// 40xxx Client Errors (Authorization, Bad Request)
				40001, // Unauthorized
				40002, // Account verification required
				40003, // Opening DMs too fast (might be recoverable after delay, but often indicates user setting)
				40005, // Request entity too large
				40032, // Target user is not connected to voice

				// 50xxx Discord Application Errors (Permissions, Invalid State, Bad Input)
				50001, // Missing Access
				50005, // Cannot edit message by another user
				50007, // Cannot send messages to this user (DMs disabled/blocked)
				50008, // Cannot send messages in a voice channel
				50013, // Missing Permissions
				50019, // Message can only be pinned in its channel
				50033, // Invalid recipients
				50035, // Invalid Form Body (indicates a bug in payload)
				50036, // Invalid file uploaded

				// 60xxx Authentication Errors
				60003, // Two-factor authentication required

				// Add more codes as needed based on experience and API documentation
			];

			// Consider recoverable if it's a Discord error AND its code is NOT in the non-recoverable list.
			// This assumes server errors (5xx), rate limits (429), and potentially overloaded errors (130000)
			// are potentially recoverable by retrying later.
			return typeof error.code === 'number' && !nonRecoverableDiscordApiCodes.includes(error.code);
		}

		// Default assumption for non-Discord errors (e.g., network issues like ECONNRESET, timeout)
		// These are often transient and potentially recoverable.
		// This might be too optimistic for some error types (e.g., persistent DNS issues - ENOTFOUND).
		// Consider adding specific checks for non-Discord error codes/messages if needed.
		if (error instanceof Error) {
			// Example: Explicitly mark certain Node.js errors as non-recoverable if needed
			// if (error.code === 'ENOTFOUND' || error.code === 'EHOSTUNREACH') {
			//     return false; // Persistent network/DNS issues might not be recoverable by simple retry
			// }
			// if (error.name === 'SyntaxError' || error.name === 'ReferenceError' || error.name === 'TypeError') {
			//     return false; // Code errors are not recoverable by retry
			// }
		}

		// Default to true for network errors, etc., unless specified otherwise.
		return true;
	}

	/**
	 * Processes a formatted error: checks rate limits, updates cache, and triggers sending.
	 * @param errorDetails The formatted error details.
	 */
	private async processError(errorDetails: ErrorDetails): Promise<void> {
		// Use groupHash for rate limiting and caching to group similar errors
		const errorKey = errorDetails.groupHash;

		if (this.shouldRateLimit(errorKey)) {
			console.warn(
				`ErrorHandler: Rate limit exceeded for error group ${errorKey}. Suppressing notification.`,
			);
			// Still update cache but mark as rate limited
			this.updateErrorCache(errorKey, errorDetails);
			this.updateErrorGroup(errorKey, errorDetails);
			return;
		}

		this.updateErrorCache(errorKey, errorDetails);
		this.updateErrorGroup(errorKey, errorDetails);

		// Check if webhook is available, attempt setup if not
		if (!this.webhook) {
			console.warn('ErrorHandler: Webhook client not available. Attempting reinitialization...');
			this.setupWebhook();
			if (!this.webhook) {
				console.error(
					'ErrorHandler: Webhook reinitialization failed. Cannot send error notification.',
				);
				// Even if webhook fails, try to log to file
				this.logToFile(
					'ERROR',
					`[${errorDetails.type}] ${errorDetails.message}`,
					errorDetails.context,
				);
				return; // Abort sending if webhook setup fails
			}
		}

		// Log to file in production
		this.logToFile('ERROR', `[${errorDetails.type}] ${errorDetails.message}`, {
			...errorDetails.context,
			errorId: errorDetails.errorId,
			stack: errorDetails.stack,
			severity: errorDetails.severity,
		});

		console.log(
			`ErrorHandler: Processing error ${errorDetails.errorId} (Group: ${errorKey}). Severity: ${errorDetails.severity}.`,
		);
		await this.sendWithRetry(errorDetails);

		// Check if we should send a group summary based on threshold
		const group = this.errorGroups.get(errorKey);
		if (group && group.count >= this.config.groupingThreshold && !group.reportSent) {
			await this.sendErrorGroupSummary(group);
		}
	}

	/**
	 * Sends an error notification to the webhook with automatic retries on failure.
	 * @param errorDetails The error details to send.
	 */
	private async sendWithRetry(errorDetails: ErrorDetails): Promise<void> {
		const errorKey = errorDetails.groupHash;
		const errorInfo = this.errorCache.get(errorKey);

		// Start retrying from the stored retry count (if exists) or from the beginning
		const startAttempt = (errorInfo?.retryCount || 0) + 1;

		for (let attempt = startAttempt; attempt <= this.config.retryAttempts; attempt++) {
			try {
				await this.sendErrorToWebhook(errorDetails);
				console.log(
					`ErrorHandler: Successfully sent error notification for ${errorDetails.errorId} on attempt ${attempt}.`,
				);
				// Reset retry count on success
				this.updateErrorRetryInfo(errorKey, 0);
				return; // Exit loop on success
			} catch (sendError) {
				console.error(
					`ErrorHandler: Attempt ${attempt}/${this.config.retryAttempts} failed for error ${errorDetails.errorId}:`,
					sendError,
				);
				// Update cache with retry attempt info
				this.updateErrorRetryInfo(errorKey, attempt);

				// Check if it's a rate limit error from Discord
				const isRateLimit =
					sendError instanceof Error &&
					((sendError as DiscordAPIError).code === 429 || sendError.message.includes('rate limit'));

				if (isRateLimit) {
					const rateLimitError = sendError as DiscordRateLimitError;
					const retryAfter = rateLimitError.retry_after
						? rateLimitError.retry_after * 1000
						: this.config.retryDelay * 2;

					console.log(`ErrorHandler: Rate limited. Retrying in ${retryAfter / 1000} seconds...`);
					await new Promise((resolve) => setTimeout(resolve, retryAfter));
				} else if (attempt < this.config.retryAttempts) {
					// Use exponential backoff for non-rate-limit errors
					const backoff = this.config.retryDelay * 1.5 ** (attempt - 1);
					console.log(`ErrorHandler: Retrying in ${backoff / 1000} seconds...`);
					await new Promise((resolve) => setTimeout(resolve, backoff));
				} else {
					console.error(
						`ErrorHandler: All ${this.config.retryAttempts} retry attempts failed for error ${errorDetails.errorId}.`,
					);
					// Potentially trigger a different alert mechanism for persistent send failures
				}
			}
		}
	}

	/**
	 * Checks if an error matching the key should be rate-limited based on cache frequency.
	 * @param errorKey The key (groupHash) representing the error group.
	 * @returns True if the error should be rate-limited, false otherwise.
	 */
	private shouldRateLimit(errorKey: string): boolean {
		const errorInfo = this.errorCache.get(errorKey);
		if (!errorInfo) return false; // Not in cache, not rate-limited yet

		const now = Date.now();
		const timeWindowStart = now - this.config.rateLimit.timeWindow;

		// Check if the error occurred frequently within the time window
		// This simple check uses total occurrences. A more robust check might count occurrences *within* the window.
		const occurrencesInWindow = errorInfo.occurrences; // Approximation, could be refined
		const isFrequent = occurrencesInWindow > this.config.rateLimit.maxErrors;
		const isRecent = errorInfo.lastOccurrence > timeWindowStart;

		// Rate limit if it's frequent AND the last occurrence was within the window
		// This prevents old, frequent errors from being permanently suppressed.
		return isFrequent && isRecent;
	}

	/**
	 * Updates the error cache with information about a new or recurring error.
	 * Handles cache size limits by evicting the least recently occurred error.
	 * @param key The key (groupHash) for the error group.
	 * @param details The latest details of the error occurrence.
	 */
	private updateErrorCache(key: string, details: ErrorDetails): void {
		const now = Date.now();
		const existing = this.errorCache.get(key);

		if (existing) {
			// Update existing entry
			existing.occurrences += 1;
			existing.lastOccurrence = now;
			existing.details = details; // Update with the latest details
			existing.resolved = false; // Mark as unresolved if it occurs again
			// Reset retry count if needed based on time passed since last retry
			if (
				existing.lastRetryAt &&
				now - existing.lastRetryAt.getTime() > this.config.retryDelay * 3
			) {
				existing.retryCount = 0; // Reset if it's been a while since last retry
			}
			this.errorCache.set(key, existing);
		} else {
			// Add new entry
			const newInfo: ErrorInfo = {
				details,
				occurrences: 1,
				firstOccurrence: now,
				lastOccurrence: now,
				resolved: false,
				retryCount: 0,
				lastRetryAt: null,
				recoverable: details.recoverable,
			};
			this.errorCache.set(key, newInfo);
		}

		// Enforce cache size limit - evict least recently seen
		if (this.errorCache.size > this.config.maxCacheSize) {
			let oldestKey: string | undefined;
			let oldestTime = Number.POSITIVE_INFINITY;

			for (const [k, v] of this.errorCache.entries()) {
				if (v.lastOccurrence < oldestTime) {
					oldestTime = v.lastOccurrence;
					oldestKey = k;
				}
			}

			if (oldestKey) {
				this.errorCache.delete(oldestKey);
				console.log(`ErrorHandler: Cache limit reached. Evicted oldest error group: ${oldestKey}`);
			}
		}
	}

	/**
	 * Updates the retry information for an error
	 * @param key The error group hash
	 * @param attempt The current attempt number
	 */
	private updateErrorRetryInfo(key: string, attempt: number): void {
		const errorInfo = this.errorCache.get(key);
		if (!errorInfo) return;

		errorInfo.retryCount = attempt;
		errorInfo.lastRetryAt = new Date();
		this.errorCache.set(key, errorInfo);
	}

	/**
	 * Constructs and sends an error embed to the configured webhook.
	 * @param errorDetails The formatted error details.
	 */
	private async sendErrorToWebhook(errorDetails: ErrorDetails): Promise<void> {
		if (!this.webhook) {
			// This check is technically redundant due to processError, but good for safety
			throw new Error('ErrorHandler: Cannot send error, webhook is not available.');
		}

		try {
			// Capture fresh performance metrics at the time of sending
			const performanceMetrics = await this.capturePerformanceMetrics();
			const formattedMetrics = MetricsFormatter.formatPerformanceMetrics(performanceMetrics);

			const embed = new EmbedBuilder()
				.setColor(this.getSeverityColor(errorDetails.severity))
				.setTitle(`🚨 ${errorDetails.severity} Error: ${errorDetails.type}`)
				.setDescription(`**Message:**\n\`\`\`\n${errorDetails.message}\n\`\`\``)
				.addFields(
					{
						name: 'Error ID',
						value: `\`${errorDetails.errorId}\``,
						inline: true,
					},
					{
						name: 'Category',
						value: errorDetails.category || 'Unknown',
						inline: true,
					},
					{
						name: 'Environment',
						value: `\`${errorDetails.environment}\``,
						inline: true,
					},
					{
						name: 'Timestamp',
						value: `<t:${Math.floor(new Date(errorDetails.timestamp).getTime() / 1000)}:F>`,
						inline: false,
					}, // Full timestamp
					{
						name: 'Stack Trace',
						// Use code block with language hint if possible (e.g., 'js')
						value: `\`\`\`js\n${errorDetails.stack.substring(0, 1000)}${errorDetails.stack.length > 1000 ? '...' : ''}\n\`\`\``,
					},
				)
				.setFooter({ text: `Group Hash: ${errorDetails.groupHash}` })
				.setTimestamp(new Date(errorDetails.timestamp)); // Set timestamp of the error occurrence

			// Add Context if available
			if (errorDetails.context && Object.keys(errorDetails.context).length > 0) {
				// Format context nicely, limit length
				let contextString = '';
				try {
					contextString = JSON.stringify(errorDetails.context, null, 2);
				} catch {
					contextString = 'Could not stringify context.';
				}
				if (contextString !== null && contextString !== undefined) {
					embed.addFields({
						name: 'Context',
						value: `\`\`\`json\n${contextString.substring(0, 1000)}${contextString.length > 1000 ? '...' : ''}\n\`\`\``,
					});
				}
			}

			// Add Recovery Suggestions if available
			if (errorDetails.recoverySuggestions && errorDetails.recoverySuggestions.length > 0) {
				embed.addFields({
					name: '💡 Recovery Suggestions',
					value: errorDetails.recoverySuggestions
						.map((s) => `• ${s}`)
						.join('\n')
						.substring(0, 1024),
				});
			}

			// Add Performance Metrics
			embed.addFields({
				name: '⚙️ Performance Snapshot',
				value: `\`\`\`\n${formattedMetrics.substring(0, 1000)}\n\`\`\``, // Limit length
			});

			// Add Metadata
			embed.addFields({
				name: 'Metadata',
				value: `Node: ${errorDetails.metadata.nodeVersion} | OS: ${errorDetails.metadata.os} | Arch: ${errorDetails.metadata.arch} | Client ID: ${errorDetails.metadata.clientId}`,
				inline: false,
			});

			await this.webhook.send({ embeds: [embed] });
		} catch (error) {
			// Log the error during sending, but re-throw to allow retry logic to catch it
			console.error('ErrorHandler: Error occurred within sendErrorToWebhook:', error);
			throw error; // Re-throw the error to be caught by sendWithRetry
		}
	}

	/**
	 * Sends a custom log message to the webhook.
	 */
	private async sendCustomWebhook(
		level: string,
		title: string,
		message: string,
		color: number,
		context?: Record<string, unknown>,
	): Promise<void> {
		if (!this.webhook) return;

		try {
			const embed = new EmbedBuilder()
				.setColor(color)
				.setTitle(`[${level}] ${title}`)
				.setDescription(message)
				.setTimestamp();

			if (context) {
				const contextString = JSON.stringify(context, null, 2);
				if (contextString.length < 1000) {
					embed.addFields({ name: 'Context', value: `\`\`\`json\n${contextString}\n\`\`\`` });
				}
			}

			await this.webhook.send({ embeds: [embed] });
		} catch (error) {
			console.error('Logger: Failed to send custom webhook message:', error);
		}
	}

	/**
	 * Gets the appropriate color for an embed based on error severity.
	 * @param severity The error severity level.
	 * @returns A hexadecimal color code number.
	 */
	private getSeverityColor(severity: ErrorSeverity): number {
		switch (severity) {
			case ErrorSeverity.CRITICAL:
				return 0xff0000; // Red
			case ErrorSeverity.HIGH:
				return 0xffa500; // Orange
			case ErrorSeverity.MEDIUM:
				return 0xffee00; // Yellow
			case ErrorSeverity.LOW:
				return 0x00bfff; // Deep Sky Blue (Info-like)
			default:
				return 0x808080; // Gray for unknown/default
		}
	}

	/**
	 * Generates a stable hash for grouping similar errors based on key characteristics.
	 * @param error The error instance.
	 * @param context Associated context.
	 * @returns A hex string representing the error group hash.
	 */
	private generateErrorHash(error: Error, context: ErrorContext): string {
		const errorName = error.name || 'UnknownError';
		// Use a smaller portion of the message to avoid minor variations splitting groups
		const errorMessageSignature = error.message.substring(0, 150) || 'No message';

		// Use top 2-3 stack frames relevant to the application code if possible
		const stackLines = (error.stack || '').split('\n').slice(1, 4); // Look at first 3 frames after message
		const stackSignature = stackLines
			.map((line: string) => {
				// Try to extract file and line, normalize path separators
				const match = line.match(/\(?(.+?):(\d+):(\d+)\)?$/);
				if (match) {
					const filePath = match[1].replace(/\\/g, '/');
					// Use filename and line number range
					const fileName = filePath.split('/').pop() || filePath;
					const lineNum = Number.parseInt(match[2], 10);
					const lineRange = Math.floor(lineNum / 10) * 10; // Group lines in blocks of 10
					return `${fileName}#${lineRange}`;
				}
				// Fallback for lines without clear file:line format
				return line.trim().substring(0, 100);
			})
			.join('|');

		// Include relevant context keys for grouping
		const relevantContextKeys = ['command', 'module', 'guildId', 'channelId', 'userId'];
		const contextSignature = Object.entries(context)
			.filter(
				([key]) =>
					relevantContextKeys.includes(key) && context[key] !== null && context[key] !== undefined,
			) // Ensure key is relevant and value exists
			.map(([key, value]) => `${key}:${String(value)}`) // Simple string conversion
			.sort() // Ensure consistent order
			.join('&');

		// Include Discord API error code if applicable
		const apiErrorCode = error instanceof DiscordAPIError ? `DAPI:${error.code}:` : '';

		// Combine components into the final string for hashing
		const hashInput = `${apiErrorCode}${errorName}|${errorMessageSignature}|${stackSignature}|${contextSignature}`;

		return createHash('md5').update(hashInput).digest('hex');
	}

	/**
	 * Captures current performance metrics using the PerformanceMonitor or falls back to basic process info.
	 * @returns A promise resolving to PerformanceMetrics.
	 */
	private async capturePerformanceMetrics(): Promise<PerformanceMetrics> {
		try {
			if (this.performanceMonitor) {
				return await this.performanceMonitor.captureMetrics();
			}

			// Fallback if performance monitor is not initialized
			console.warn('ErrorHandler: PerformanceMonitor not available, using basic process metrics.');
			const memUsage = process.memoryUsage();
			const metrics: PerformanceMetrics = {
				memoryUsage: {
					heapUsed: memUsage.heapUsed,
					heapTotal: memUsage.heapTotal,
					external: memUsage.external,
				},
				cpu: {
					usage: 0, // Cannot reliably get CPU usage without a dedicated monitor/sampling
					load: os.loadavg(), // System load average
				},
				uptime: process.uptime(),
				responseTime: 0, // No client context here
			};
			return metrics;
		} catch (error) {
			console.error('ErrorHandler: Failed to capture performance metrics', error);
			// Return minimal metrics if everything fails
			return {
				memoryUsage: { heapUsed: 0, heapTotal: 0, external: 0 },
				cpu: { usage: 0, load: [0, 0, 0] },
				uptime: process.uptime(),
				responseTime: 0,
			};
		}
	}

	/**
	 * Checks performance thresholds using the PerformanceMonitor and sends alerts if needed.
	 */
	private async checkPerformance(): Promise<void> {
		if (!this.performanceMonitor) {
			// console.log('ErrorHandler: Performance monitor not available, skipping check.');
			return;
		}
		if (!this.webhook) {
			console.warn('ErrorHandler: Webhook not available for sending performance alerts.');
			return;
		}

		try {
			const alerts = await this.performanceMonitor.checkThresholds();

			if (alerts.length > 0) {
				console.warn(`ErrorHandler: Performance thresholds exceeded: ${alerts.join(', ')}`);

				// Capture current metrics to include in the alert
				const metrics = await this.performanceMonitor.captureMetrics();
				const formattedMetrics = MetricsFormatter.formatPerformanceMetrics(metrics);

				const embed = new EmbedBuilder()
					.setColor(0xff9900) // Orange for warning
					.setTitle('⚠️ Performance Alert')
					.setDescription(
						`The following performance thresholds were exceeded in \`${this.config.environment}\`:`,
					)
					.addFields(
						{
							name: 'Alerts Triggered',
							value: alerts.map((alert) => `• ${alert}`).join('\n'),
						},
						{
							name: 'Current Metrics Snapshot',
							value: `\`\`\`\n${formattedMetrics.substring(0, 1000)}\n\`\`\``, // Limit length
						},
					)
					.setTimestamp();

				await this.webhook.send({ embeds: [embed] });
				console.log('ErrorHandler: Sent performance alert webhook.');
			}
		} catch (error) {
			console.error('ErrorHandler: Error during performance check:', error);
			// Consider sending a meta-error report about the failure in checkPerformance
			await this.handleError(error, 'ErrorHandlerInternal_CheckPerformance');
		}
	}

	/**
	 * Updates or creates an error group entry based on the error details.
	 * Groups similar errors together for analysis and reporting.
	 * @param groupKey The hash key identifying the error group
	 * @param details The new error details to add to the group
	 */
	private updateErrorGroup(groupKey: string, details: ErrorDetails): void {
		const now = Date.now();
		const existing = this.errorGroups.get(groupKey);

		if (existing) {
			// Update existing group
			existing.count += 1;
			existing.lastOccurrence = now;

			// Keep only the most recent errors up to a reasonable limit
			const maxErrorsToKeep = 10;
			existing.errors.unshift(details); // Add to the front
			if (existing.errors.length > maxErrorsToKeep) {
				existing.errors = existing.errors.slice(0, maxErrorsToKeep);
			}

			// Update severity distribution
			existing.severityDistribution[details.severity] =
				(existing.severityDistribution[details.severity] || 0) + 1;

			this.errorGroups.set(groupKey, existing);
		} else {
			// Create new group
			const newGroup: ErrorGroup = {
				errors: [details],
				count: 1,
				firstOccurrence: now,
				lastOccurrence: now,
				severityDistribution: {
					[ErrorSeverity.LOW]: 0,
					[ErrorSeverity.MEDIUM]: 0,
					[ErrorSeverity.HIGH]: 0,
					[ErrorSeverity.CRITICAL]: 0,
					[details.severity]: 1, // Set the count for the current severity
				},
				reportSent: false,
			};
			this.errorGroups.set(groupKey, newGroup);
		}

		// Clean up old groups periodically
		if (Math.random() < 0.1) {
			// 10% chance to run cleanup on any update
			this.cleanupOldErrorGroups();
		}
	}

	/**
	 * Removes error groups that haven't occurred in a long time
	 */
	private cleanupOldErrorGroups(): void {
		const now = Date.now();
		const maxAge = this.config.cacheExpiration * 2; // Keep groups 2x longer than individual errors

		for (const [key, group] of this.errorGroups.entries()) {
			if (now - group.lastOccurrence > maxAge) {
				this.errorGroups.delete(key);
			}
		}
	}

	/**
	 * Sends a summary of an error group when the threshold is exceeded
	 * @param group The error group to summarize
	 */
	private async sendErrorGroupSummary(group: ErrorGroup): Promise<void> {
		if (!this.webhook) {
			console.warn('ErrorHandler: Cannot send group summary, webhook not available');
			return;
		}

		try {
			// Get the most recent error for reference
			const latestError = group.errors[0];

			// Calculate time span
			const timeSpanMs = group.lastOccurrence - group.firstOccurrence;
			const timeSpanMinutes = Math.max(1, Math.round(timeSpanMs / (1000 * 60))); // At least 1 minute
			const rate = (group.count / timeSpanMinutes).toFixed(2);

			// Format severity distribution
			const severityCounts = Object.entries(group.severityDistribution)
				.map(([severity, count]) => `${severity}: ${count}`)
				.join(' | ');

			// Create embed for the group summary
			const embed = new EmbedBuilder()
				.setColor(0xffa500) // Orange for group summaries
				.setTitle('⚠️ Recurring Error Pattern Detected')
				.setDescription(
					`A group of similar errors has occurred ${group.count} times (${rate}/min).`,
				)
				.addFields(
					{
						name: 'Error Pattern',
						value: `\`\`\`\n${latestError.message.substring(0, 500)}\n\`\`\``,
					},
					{
						name: 'Category & Type',
						value: `${latestError.category || 'Unknown'} | ${latestError.type}`,
						inline: true,
					},
					{
						name: 'First Seen',
						value: `<t:${Math.floor(group.firstOccurrence / 1000)}:R>`,
						inline: true,
					},
					{
						name: 'Last Seen',
						value: `<t:${Math.floor(group.lastOccurrence / 1000)}:R>`,
						inline: true,
					},
					{
						name: 'Severity Distribution',
						value: severityCounts || 'Unknown',
						inline: false,
					},
					{
						name: 'Recovery Suggestions',
						value:
							latestError.recoverySuggestions
								.map((s) => `• ${s}`)
								.join('\n')
								.substring(0, 1024) || 'No suggestions available',
						inline: false,
					},
				)
				.setFooter({ text: `Group Hash: ${latestError.groupHash}` })
				.setTimestamp();

			await this.webhook.send({ embeds: [embed] });

			// Mark the group as having had a report sent
			group.reportSent = true;
			this.errorGroups.set(latestError.groupHash, group);

			console.log(
				`ErrorHandler: Sent summary for error group ${latestError.groupHash} (${group.count} occurrences)`,
			);
		} catch (error) {
			console.error('ErrorHandler: Failed to send error group summary:', error);
		}
	}

	/**
	 * Gets statistics about error groups for reporting and analysis
	 * @returns Object containing statistics about error groups
	 */
	public getErrorGroupStats(): {
		totalGroups: number;
		activeLast24h: number;
		topGroups: Array<{
			hash: string;
			count: number;
			lastSeen: Date;
			message: string;
		}>;
	} {
		const now = Date.now();
		const last24h = now - 24 * 60 * 60 * 1000;

		let activeLast24h = 0;
		const topGroups: Array<{
			hash: string;
			count: number;
			lastSeen: Date;
			message: string;
		}> = [];

		// Process all groups
		for (const [hash, group] of this.errorGroups.entries()) {
			if (group.lastOccurrence > last24h) {
				activeLast24h++;
			}

			topGroups.push({
				hash,
				count: group.count,
				lastSeen: new Date(group.lastOccurrence),
				message: group.errors[0]?.message || 'Unknown error',
			});
		}

		// Sort and limit top groups
		topGroups.sort((a, b) => b.count - a.count);
		const limitedTopGroups = topGroups.slice(0, 5);

		return {
			totalGroups: this.errorGroups.size,
			activeLast24h,
			topGroups: limitedTopGroups,
		};
	}

	/**
	 * Resets the reportSent flag for all error groups to allow new summaries to be sent
	 * Useful when restarting the bot or after a maintenance period
	 */
	public resetErrorGroupReports(): void {
		for (const [hash, group] of this.errorGroups.entries()) {
			group.reportSent = false;
			this.errorGroups.set(hash, group);
		}
	}
}

export default Logger;
