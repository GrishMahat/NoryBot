/**
 * @file Error handling types
 * @description Defines types for error tracking, reporting, and handling
 */

/**
 * Error severity levels
 */
/* eslint-disable no-unused-vars */
export enum ErrorSeverity {
	LOW = 'LOW',
	MEDIUM = 'MEDIUM',
	HIGH = 'HIGH',
	CRITICAL = 'CRITICAL',
}
/* eslint-enable no-unused-vars */

/**
 * Performance thresholds for monitoring and alerting
 */
export interface PerformanceThresholds {
	/** Memory usage threshold (0-1) */
	memory: number;
	/** CPU usage threshold (0-1) */
	cpu: number;
	/** Response time threshold in milliseconds */
	responseTime: number;
	/** Optional heap growth rate threshold */
	heapGrowthRate?: number;
	/** Optional event loop delay threshold */
	eventLoopDelay?: number;
	/** Optional network latency threshold */
	networkLatency?: number;
}

/**
 * Rate limiting configuration for error handlers
 */
export interface RateLimitConfig {
	/** Maximum number of errors allowed within the time window */
	maxErrors: number;
	/** Time window in milliseconds */
	timeWindow: number;
	/** Whether to apply rate limits per route */
	perRoute?: boolean;
	/** Cooldown period after rate limit is hit */
	cooldownPeriod?: number;
}

/**
 * Statistics for error tracking
 */
export interface ErrorTrackingStats {
	/** Total number of errors */
	total: number;
	/** Error counts by category */
	byCategory: Record<string, number>;
	/** Error counts by severity */
	bySeverity: Record<ErrorSeverity, number>;
	/** Distribution of errors over time */
	timeDistribution: {
		lastHour: number;
		lastDay: number;
		lastWeek: number;
	};
	/** Performance metrics */
	performance: {
		averageResponseTime: number;
		peakMemoryUsage: number;
		errorRate: number;
	};
}

/**
 * Configuration options for the error handler
 */
export interface ErrorHandlerConfig {
	/** Discord webhook URL for error reporting */
	webhook: string;
	/** Current environment (development, staging, production) */
	environment: string;
	/** Maximum number of errors to cache */
	maxCacheSize: number;
	/** Number of retry attempts for recoverable errors */
	retryAttempts: number;
	/** Delay between retry attempts in milliseconds */
	retryDelay: number;
	/** Threshold for grouping similar errors */
	groupingThreshold: number;
	/** Rate limiting configuration */
	rateLimit: RateLimitConfig;
	/** Cache expiration time in milliseconds */
	cacheExpiration: number;
	/** Performance thresholds for alerting */
	performanceThresholds: PerformanceThresholds;
	/** Development-specific settings */
	development: {
		logToConsole: boolean;
		verbose: boolean;
		stackTraceLimit: number;
	};
	/** Production-specific settings */
	production: {
		logToFile: boolean;
		alertThreshold: number;
		metricsInterval: number;
	};
	/** Optional tracking settings */
	tracking?: {
		enabled: boolean;
		storageLimit: number;
		retentionPeriod: number;
	};
}

/**
 * Detailed information about an error
 */
export interface ErrorDetails {
	/** Error type/name */
	type: string;
	/** Error message */
	message: string;
	/** Stack trace */
	stack: string;
	/** Timestamp when the error occurred */
	timestamp: string;
	/** Environment where the error occurred */
	environment: string;
	/** Error category for grouping */
	category: string;
	/** Suggestions for resolving the error */
	recoverySuggestions: string;
	/** Additional metadata */
	metadata: {
		nodeVersion: string;
		clientId: string;
	};
	/** Contextual information about the error */
	context: ErrorContext;
	/** Performance metrics at the time of the error */
	performance: PerformanceMetrics;
	/** Hash for grouping similar errors */
	groupHash: string;
	/** Error severity level */
	severity: ErrorSeverity;
	/** Number of retry attempts made */
	retryCount: number;
	/** Whether the error is potentially recoverable */
	recoverable: boolean;
	/** Unique identifier for the error */
	errorId: string;
	/** Optional correlation ID for tracking related errors */
	correlationId?: string;
}

/**
 * Information about an error for tracking and resolution
 */
export interface ErrorInfo {
	/** Error details */
	details: ErrorDetails;
	/** Number of occurrences */
	occurrences: number;
	/** Timestamp of the last occurrence */
	lastOccurrence: number;
	/** Whether the error has been resolved */
	resolved: boolean;
	/** When the error was resolved */
	resolvedAt?: Date | null;
	/** How the error was resolved */
	resolution?: string;
	/** Number of retry attempts made */
	retryAttempts: number;
	/** Current retry count */
	retryCount: number;
	/** Timestamp of the last retry attempt */
	lastRetryAt?: Date | null;
	/** Whether the error is recoverable */
	recoverable?: boolean;
}

/**
 * Group of similar errors
 */
export interface ErrorGroup {
	/** Collection of errors in the group */
	errors: ErrorDetails[];
	/** Number of errors in the group */
	count: number;
	/** Timestamp of first occurrence */
	firstOccurrence: number;
	/** Timestamp of last occurrence */
	lastOccurrence: number;
}

/**
 * Performance metrics at the time of an error
 */
export interface PerformanceMetrics {
	/** Memory usage statistics */
	memoryUsage: {
		heapUsed: number;
		heapTotal: number;
		external: number;
	};
	/** CPU statistics */
	cpu: {
		usage: number;
		load: number[];
	};
	/** Process uptime in seconds */
	uptime: number;
	/** Response time in milliseconds */
	responseTime: number;
	/** Optional shard statistics */
	shardStats?: {
		id: number;
		ping: number;
		status: string;
	}[];
	/** Optional event loop statistics */
	eventLoop?: {
		lag: number;
		utilization: number;
	};
	/** Optional network statistics */
	network?: {
		latency: number;
		requests: number;
		failures: number;
	};
	/** Optional resource usage statistics */
	resourceUsage?: {
		handles: number;
		threads: number;
		heapGrowthRate: number;
	};
}

/**
 * Context information for an error
 */
export interface ErrorContext {
	/** Command that triggered the error */
	command?: {
		name: string;
		args?: string[];
	};
	/** User who triggered the error */
	user?: {
		id: string;
		tag: string;
	};
	/** Guild where the error occurred */
	guild?: {
		id: string;
		name: string;
	};
	/** Channel where the error occurred */
	channel?: {
		id: string;
		name: string;
		type: string;
	};
}

/**
 * Metrics for error reporting and analysis
 */
export interface ErrorMetrics {
	/** Error rate per hour */
	hourlyRate: number;
	/** Error rate per day */
	dailyRate: number;
	/** Most frequent errors */
	topErrors: Array<{
		message: string;
		count: number;
		lastOccurrence: Date;
	}>;
	/** Performance metrics */
	performance: PerformanceMetrics;
	/** Error counts by severity */
	bySeverity: {
		LOW: number;
		MEDIUM: number;
		HIGH: number;
		CRITICAL: number;
	};
}

/**
 * Possible shard status values
 */
export type ShardStatus =
	| 'CONNECTING'
	| 'READY'
	| 'IDLE'
	| 'NEARLY'
	| 'DISCONNECTED'
	| 'UNKNOWN'
	| 'ERROR';

/**
 * Statistics for a Discord shard
 */
export interface ShardStats {
	/** Shard ID */
	id: number;
	/** Latency in milliseconds */
	ping: number;
	/** Current status */
	status: ShardStatus;
}
