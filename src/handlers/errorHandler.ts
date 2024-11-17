import {
  WebhookClient,
  EmbedBuilder,
  Events,
  Client,
  DiscordAPIError,
} from 'discord.js';
import { createHash } from 'crypto';
import {
  ErrorInfo,
  ErrorHandlerConfig,
  ErrorSeverity,
  ErrorDetails,
  ErrorGroup,
  ErrorContext,
  ErrorMetrics,
  PerformanceMetrics,
  ShardStats,
  ShardStatus,
} from '../types/error.js';
import determineErrorCategory from '../utils/error/determineErrorCategory.js';
import getRecoverySuggestions from '../utils/error/getRecoverySuggestions.js';
import { PerformanceMonitor } from '../utils/error/performanceMonitor.js';
import { MetricsFormatter } from '../utils/error/metricsFormatter.js';

class ErrorHandler {
  private webhook: WebhookClient;
  private client: Client;
  private errorCache: Map<string, ErrorInfo>;
  private errorGroups: Map<string, ErrorGroup>;
  private config: ErrorHandlerConfig;
  private metrics: Map<string, ErrorMetrics>;
  private performanceMonitor: PerformanceMonitor;

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      webhook: process.env.ERROR_WEBHOOK || '',
      environment: process.env.NODE_ENV || 'development',
      maxCacheSize: 100,
      retryAttempts: 3,
      retryDelay: 5000,
      groupingThreshold: 3,
      rateLimit: {
        maxErrors: 10,
        timeWindow: 60000,
      },
      cacheExpiration: 24 * 60 * 60 * 1000, // 24 hours
      performanceThresholds: {
        memory: 0.9, // 90% of heap
        cpu: 0.8, // 80% CPU usage
        responseTime: 1000, // 1 second
      },
      development: {
        logToConsole: true,
        verbose: true,
        stackTraceLimit: 20,
      },
      production: {
        logToFile: true,
        alertThreshold: 10,
        metricsInterval: 5 * 60 * 1000, // 5 minutes
      },
      ...config,
    };

    this.errorCache = new Map();
    this.errorGroups = new Map();
    this.setupWebhook();
    this.metrics = new Map();
  }

  private setupWebhook(): void {
    if (this.config.webhook) {
      this.webhook = new WebhookClient({ url: this.config.webhook });
    }
  }

  public initialize(client: Client): void {
    this.client = client;
    this.performanceMonitor = new PerformanceMonitor(
      client,
      this.config.performanceThresholds
    );
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.client.on(Events.Error, (error) =>
      this.handleError(error, 'ClientError')
    );
    process.on('unhandledRejection', (error) =>
      this.handleError(error, 'UnhandledRejection')
    );
    process.on('uncaughtException', (error) =>
      this.handleError(error, 'UncaughtException')
    );
  }

  public async handleError(
    error: Error | unknown,
    type: string
  ): Promise<void> {
    const errorDetails = await this.formatError(error, type);

    if (this.config.environment === 'development') {
      console.error(errorDetails);
      return;
    }

    await this.processError(errorDetails);
  }

  private async formatError(
    error: unknown,
    type: string,
    context?: ErrorContext
  ): Promise<ErrorDetails> {
    const err = error instanceof Error ? error : new Error(String(error));
    // Proper type checking
    const isDiscordError = err instanceof DiscordAPIError;
    const category = determineErrorCategory(isDiscordError ? err : undefined);
    const recoverySuggestions = await getRecoverySuggestions(err);
    const performance = await this.performanceMonitor.captureMetrics();
    const groupHash = this.generateErrorHash(err, context || {});
    const errorId = createHash('md5')
      .update(`${Date.now()}:${err.message}`)
      .digest('hex');

    return {
      type,
      message: err.message,
      stack: err.stack || 'No stack trace',
      timestamp: new Date().toISOString(),
      environment: this.config.environment,
      category,
      recoverySuggestions,
      metadata: {
        nodeVersion: process.version,
        clientId: this.client?.user?.id || 'Unknown',
      },
      context: context || {},
      performance,
      groupHash,
      severity: this.determineSeverity(err, performance),
      errorId,
      recoverable: this.isErrorRecoverable(err),
      retryCount: 0,
    };
  }

  private isErrorRecoverable(error: Error): boolean {
    if (error instanceof DiscordAPIError) {
      // Check if error.code is a number before performing the includes check
      const recoverableCodes = [
        50001, 50013, 50014, 40001, 40002, 10003, 10008, 10011, 10015, 50035,
        50036,
      ];
      return (
        typeof error.code === 'number' && !recoverableCodes.includes(error.code)
      );
    }
    return true;
  }

  private async processError(errorDetails: ErrorDetails): Promise<void> {
    const errorKey = `${errorDetails.type}:${errorDetails.message}`;

    if (this.shouldRateLimit(errorKey)) {
      return;
    }

    this.updateErrorCache(errorKey, errorDetails);
    await this.sendErrorToWebhook(errorDetails);
  }

  private shouldRateLimit(errorKey: string): boolean {
    const errorInfo = this.errorCache.get(errorKey);
    if (!errorInfo) return false;

    const timeWindow = Date.now() - this.config.rateLimit.timeWindow;
    return (
      errorInfo.occurrences > this.config.rateLimit.maxErrors &&
      errorInfo.lastOccurrence > timeWindow
    );
  }

  private updateErrorCache(key: string, details: ErrorDetails): void {
    const existing = this.errorCache.get(key);
    const now = Date.now();

    if (existing) {
      this.errorCache.set(key, {
        ...existing,
        occurrences: existing.occurrences + 1,
        lastOccurrence: now,
        retryAttempts: existing.retryAttempts ?? 0,
        lastRetryAt: existing.lastRetryAt ?? null,
        details,
        resolved: false,
        recoverable: details.recoverable,
      });
    } else {
      this.errorCache.set(key, {
        details,
        occurrences: 1,
        lastOccurrence: now,
        resolved: false,
        retryAttempts: 0,
        retryCount: 0,
        recoverable: details.recoverable,
      });
    }

    // Cleanup old entries
    if (this.errorCache.size > this.config.maxCacheSize) {
      const oldestKey = Array.from(this.errorCache.keys()).sort(
        (a, b) =>
          this.errorCache.get(a)!.lastOccurrence -
          this.errorCache.get(b)!.lastOccurrence
      )[0];
      this.errorCache.delete(oldestKey);
    }
  }

  private async sendErrorToWebhook(errorDetails: ErrorDetails): Promise<void> {
    if (!this.webhook) return;

    const embed = new EmbedBuilder()
      .setColor(0xff0000)
      .setTitle(`Error: ${errorDetails.type}`)
      .setDescription(`\`\`\`${errorDetails.message}\`\`\``)
      .addFields(
        { name: 'Category', value: errorDetails.category, inline: true },
        {
          name: 'Stack Trace',
          value: `\`\`\`${errorDetails.stack.slice(0, 1000)}\`\`\``,
        },
        { name: 'Environment', value: errorDetails.environment },
        { name: 'Timestamp', value: errorDetails.timestamp },
        {
          name: 'Recovery Suggestions',
          value: errorDetails.recoverySuggestions,
        },
        {
          name: 'Context',
          value: this.formatContext(errorDetails.context),
          inline: false,
        },
        {
          name: 'Performance',
          value: this.formatPerformanceMetrics(errorDetails.performance),
          inline: false,
        },
        {
          name: 'Severity',
          value: errorDetails.severity.toUpperCase(), // Ensure it's a string
          inline: true,
        }
      );

    try {
      await this.webhook.send({ embeds: [embed] });
    } catch (error) {
      console.error('Failed to send error to webhook:', error);
    }
  }

  private async capturePerformanceMetrics(): Promise<PerformanceMetrics> {
    return this.performanceMonitor.captureMetrics();
  }

  private async checkPerformance(): Promise<void> {
    const alerts = await this.performanceMonitor.checkThresholds();

    if (alerts.length > 0) {
      await this.handleError(
        new Error(`Performance alerts: ${alerts.join(', ')}`),
        'PerformanceAlert'
      );
    }
  }

  private generateErrorHash(error: Error, context: ErrorContext): string {
    const stackLines = error.stack?.split('\n').slice(0, 3) || [];
    const hashContent = `${error.message}:${stackLines.join()}:${JSON.stringify(
      context
    )}`;
    return createHash('sha256').update(hashContent).digest('hex').slice(0, 10);
  }

  private determineSeverity(
    error: Error,
    performance: PerformanceMetrics
  ): ErrorSeverity {
    // Check performance metrics
    if (
      performance.memoryUsage.heapUsed / performance.memoryUsage.heapTotal >
        0.95 ||
      performance.cpu.usage > 0.95
    ) {
      return ErrorSeverity.CRITICAL;
    }

    // Check error type
    if (error instanceof DiscordAPIError) {
      const code = Number(error.code);
      if (isNaN(code)) return ErrorSeverity.LOW;

      // Critical Discord API errors
      if ([50001, 50013, 50014, 40001, 40002].includes(code)) {
        return ErrorSeverity.CRITICAL;
      }
      // High severity Discord API errors
      if ([50007, 50008, 50033, 50035].includes(code)) {
        return ErrorSeverity.HIGH;
      }
      // Medium severity Discord API errors
      if ([50016, 50019, 50034].includes(code)) {
        return ErrorSeverity.MEDIUM;
      }
    }

    // Check error cache frequency
    const errorKey = `${error.name}:${error.message}`;
    const cached = this.errorCache.get(errorKey);
    if (cached && cached.occurrences > 10) {
      return ErrorSeverity.HIGH;
    }
    if (cached && cached.occurrences > 5) {
      return ErrorSeverity.MEDIUM;
    }

    return ErrorSeverity.LOW;
  }

  private formatContext(context: ErrorContext): string {
    if (!context) return 'No context available';

    const sections: string[] = [];

    if (context.command) {
      sections.push(
        `Command: ${context.command.name}${
          context.command.args
            ? ` (Args: ${context.command.args.join(', ')})`
            : ''
        }`
      );
    }

    if (context.user) {
      sections.push(`User: ${context.user.tag} (${context.user.id})`);
    }

    if (context.guild) {
      sections.push(`Guild: ${context.guild.name} (${context.guild.id})`);
    }

    if (context.channel) {
      sections.push(
        `Channel: ${context.channel.name} (${context.channel.id}, Type: ${context.channel.type})`
      );
    }

    return sections.length ? sections.join('\n') : 'No context available';
  }

  private formatPerformanceMetrics(metrics: PerformanceMetrics): string {
    return MetricsFormatter.formatPerformanceMetrics(metrics);
  }

  private async getShardStats(): Promise<ShardStats[]> {
    if (!this.client.shard) return [];

    try {
      const shardManager = this.client.shard;

      const [pings, statuses] = await Promise.all([
        shardManager.broadcastEval((c) => c.ws.ping),
        shardManager.broadcastEval((c) => c.ws.status),
      ]);

      return shardManager.ids.map((id, index) => ({
        id,
        ping: typeof pings[index] === 'number' ? pings[index] : 0,
        status: this.normalizeShardStatus(statuses[index]),
      }));
    } catch (error) {
      console.error('Failed to fetch shard stats:', error);
      return [];
    }
  }

  private normalizeShardStatus(status: number | unknown): ShardStatus {
    if (typeof status === 'number') {
      // Map WebSocket status codes to status strings
      switch (status) {
        case 0:
          return 'CONNECTING';
        case 1:
          return 'READY';
        case 2:
          return 'IDLE';
        case 3:
          return 'NEARLY';
        case 4:
          return 'DISCONNECTED';
        default:
          return 'UNKNOWN';
      }
    }
    return 'ERROR';
  }

  public destroy(): void {
    this.webhook?.destroy();
  }

  // Add method to get error statistics
  public getErrorStats(): {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<keyof typeof ErrorSeverity, number>;
  } {
    const stats = {
      total: 0,
      byCategory: {} as Record<string, number>,
      bySeverity: {
        [ErrorSeverity.LOW]: 0,
        [ErrorSeverity.MEDIUM]: 0,
        [ErrorSeverity.HIGH]: 0,
        [ErrorSeverity.CRITICAL]: 0,
      },
    };

    for (const [_, error] of this.errorCache) {
      stats.total++;
      const category = error.details.category;
      const severity = error.details.severity;

      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      stats.bySeverity[severity]++;
    }

    return stats;
  }
}

export default ErrorHandler;
