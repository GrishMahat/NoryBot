export enum ErrorSeverity {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

export interface PerformanceThresholds {
    memory: number;     // Percentage (0-1)
    cpu: number;        // Percentage (0-1)
    responseTime: number; // Milliseconds
    heapGrowthRate?: number;
    eventLoopDelay?: number;
    networkLatency?: number;
}

export interface RateLimitConfig {
    maxErrors: number;
    timeWindow: number;
    perRoute?: boolean;
    cooldownPeriod?: number;
}

export interface ErrorTrackingStats {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<ErrorSeverity, number>;
    timeDistribution: {
        lastHour: number;
        lastDay: number;
        lastWeek: number;
    };
    performance: {
        averageResponseTime: number;
        peakMemoryUsage: number;
        errorRate: number;
    };
}

export interface ErrorHandlerConfig {
    webhook: string;
    environment: string;
    maxCacheSize: number;
    retryAttempts: number;
    retryDelay: number;
    groupingThreshold: number;
    rateLimit: RateLimitConfig;
    cacheExpiration: number;
    performanceThresholds: PerformanceThresholds;
    development: {
        logToConsole: boolean;
        verbose: boolean;
        stackTraceLimit: number;
    };
    production: {
        logToFile: boolean;
        alertThreshold: number;
        metricsInterval: number;
    };
    tracking?: {
        enabled: boolean;
        storageLimit: number;
        retentionPeriod: number;
    };
}

export interface ErrorDetails {
    type: string;
    message: string;
    stack: string;
    timestamp: string;
    environment: string;
    category: string;
    recoverySuggestions: string;
    metadata: {
        nodeVersion: string;
        clientId: string;
    };
    context: ErrorContext;
    performance: PerformanceMetrics;
    groupHash: string;
    severity: ErrorSeverity;
    retryCount: number;
    recoverable: boolean;
    errorId: string;
    correlationId?: string;
}

export interface ErrorInfo {
    details: ErrorDetails;
    occurrences: number;
    lastOccurrence: number;
    resolved: boolean;
    resolvedAt?: Date | null;
    resolution?: string;
    retryAttempts: number;
    retryCount: number;
    lastRetryAt?: Date | null;
    recoverable?: boolean;
}

export interface ErrorGroup {
    errors: ErrorDetails[];
    count: number;
    firstOccurrence: number;
    lastOccurrence: number;
}

export interface PerformanceMetrics {
    memoryUsage: {
        heapUsed: number;
        heapTotal: number;
        external: number;
    };
    cpu: {
        usage: number;
        load: number[];
    };
    uptime: number;
    responseTime: number;
    shardStats?: {
        id: number;
        ping: number;
        status: string;
    }[];
    eventLoop?: {
        lag: number;
        utilization: number;
    };
    network?: {
        latency: number;
        requests: number;
        failures: number;
    };
    resourceUsage?: {
        handles: number;
        threads: number;
        heapGrowthRate: number;
    };
}

export interface ErrorContext {
    command?: {
        name: string;
        args?: string[];
    };
    user?: {
        id: string;
        tag: string;
    };
    guild?: {
        id: string;
        name: string;
    };
    channel?: {
        id: string;
        name: string;
        type: string;
    };
}

export interface ErrorMetrics {
    hourlyRate: number;
    dailyRate: number;
    topErrors: Array<{
        message: string;
        count: number;
        lastOccurrence: Date;
    }>;
    performance: PerformanceMetrics;
    bySeverity: {
        [ErrorSeverity.LOW]: number;
        [ErrorSeverity.MEDIUM]: number;
        [ErrorSeverity.HIGH]: number;
        [ErrorSeverity.CRITICAL]: number;
    };
}

export type ShardStatus = 'CONNECTING' | 'READY' | 'IDLE' | 'NEARLY' | 'DISCONNECTED' | 'UNKNOWN' | 'ERROR';

export interface ShardStats {
    id: number;
    ping: number;
    status: ShardStatus;
}
