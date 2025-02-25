import {
  WebhookClient,
  EmbedBuilder,
  Events,
  Client,
  DiscordAPIError,
} from 'discord.js';
import { createHash } from 'crypto';
import {
  ErrorSeverity,
  ErrorHandlerConfig,
  ErrorDetails,
  ErrorInfo,
  ErrorGroup,
  PerformanceMetrics,
  ErrorMetrics,
  ErrorContext,
} from '../types/index.js';
import determineErrorCategory from '../services/error/determineErrorCategory.js';
import getRecoverySuggestions from '../services/error/getRecoverySuggestions.js';
import { PerformanceMonitor } from '../services/error/performanceMonitor.js';
import { MetricsFormatter } from '../services/error/metricsFormatter.js';
import { ErrorMetricsService } from '../services/error/ErrorMetricsService.js';
import os from 'os';

class ErrorHandler {
  private webhook: WebhookClient | null = null;
  private client: Client | null = null;
  private errorCache: Map<string, ErrorInfo>;
  private errorGroups: Map<string, ErrorGroup>;
  private config: ErrorHandlerConfig;
  private metrics: Map<string, ErrorMetrics>;
  private performanceMonitor: PerformanceMonitor | null = null;
  private metricsService: ErrorMetricsService | null = null;

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
    this.metrics = new Map();
    if (this.config.webhook) {
      this.setupWebhook();
    }
  }

  private setupWebhook(): void {
    try {
      if (!this.config.webhook || this.config.webhook.trim() === '') {
        console.error('ErrorHandler: No valid webhook URL provided.');
        return;
      }
      this.webhook = new WebhookClient({ url: this.config.webhook });
      // Uncomment the following lines to send a test message on initialization:
      // this.webhook.send({ content: 'Error handler initialized' }).catch((err) => {
      //   console.error('ErrorHandler: Failed to send test message to webhook:', err);
      //   this.webhook = null;
      // });
    } catch (error) {
      console.error('ErrorHandler: Exception during webhook setup:', error);
      this.webhook = null;
    }
  }

  public initialize(client: Client): void {
    this.client = client;
    this.performanceMonitor = new PerformanceMonitor(
      client,
      this.config.performanceThresholds,
    );
    this.metricsService = new ErrorMetricsService(this.config.cacheExpiration);
    this.setupEventListeners();
    this.startPerformanceMonitoring();
  }

  private setupEventListeners(): void {
    this.client.on(Events.Error, (error) =>
      this.handleError(error, 'ClientError'),
    );
    process.on('unhandledRejection', (error) =>
      this.handleError(error, 'UnhandledRejection'),
    );
    process.on('uncaughtException', (error) =>
      this.handleError(error, 'UncaughtException'),
    );
  }

  private startPerformanceMonitoring(): void {
    if (this.config.environment === 'production') {
      setInterval(async () => {
        await this.checkPerformance();
        await this.generateMetricsReport();
      }, this.config.production.metricsInterval);
    }
  }

  private async generateMetricsReport(): Promise<void> {
    if (!this.metricsService || !this.webhook) return;

    const report = this.metricsService.generateReport();
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle('Error Metrics Report')
      .setDescription('Summary of error metrics for the last 24 hours')
      .addFields(
        {
          name: 'Hourly Rate',
          value: report.hourlyRate.toString(),
          inline: true,
        },
        {
          name: 'Daily Rate',
          value: report.dailyRate.toString(),
          inline: true,
        },
        {
          name: 'By Severity',
          value: `Critical: ${report.bySeverity[ErrorSeverity.CRITICAL]}\nHigh: ${report.bySeverity[ErrorSeverity.HIGH]}\nMedium: ${report.bySeverity[ErrorSeverity.MEDIUM]}\nLow: ${report.bySeverity[ErrorSeverity.LOW]}`,
          inline: true,
        },
        {
          name: 'Top Errors',
          value:
            report.topErrors
              .slice(0, 5)
              .map(
                (error) =>
                  `• ${error.message} (${error.count}x, last: <t:${Math.floor(
                    error.lastOccurrence.getTime() / 1000,
                  )}:R>)`,
              )
              .join('\n') || 'No errors recorded',
        },
      );

    await this.webhook.send({ embeds: [embed] });
  }

  public async handleError(
    error: Error | unknown,
    type: string,
  ): Promise<void> {
    try {
      const errorDetails = await this.formatError(error, type);

      // Track error metrics
      if (this.metricsService) {
        this.metricsService.trackError(errorDetails);
      }

      if (this.config.environment === 'development') {
        console.error('Development Error:', errorDetails);
        return;
      }

      await this.processError(errorDetails);
    } catch (err) {
      console.error('ErrorHandler: Error in handleError:', err);
    }
  }

  private async formatError(
    error: unknown,
    type: string,
    context?: ErrorContext,
  ): Promise<ErrorDetails> {
    const err = error instanceof Error ? error : new Error(String(error));
    const isDiscordError = error instanceof DiscordAPIError;
    const category = determineErrorCategory(
      isDiscordError ? (error as DiscordAPIError) : undefined,
    );
    const recoverySuggestions = await getRecoverySuggestions(err);
    const performance = await this.capturePerformanceMetrics();

    const groupHash = this.generateErrorHash(err, context || {});
    const errorId = createHash('md5')
      .update(`${Date.now()}:${err.message}`)
      .digest('hex');

    return {
      type,
      message: err.message,
      stack: err.stack || 'No stack trace available',
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
    console.log('ErrorHandler: Sending error notification via webhook...');

    if (!this.webhook) {
      console.warn(
        'ErrorHandler: Webhook client not available, attempting reinitialization...',
      );
      this.setupWebhook();
      if (!this.webhook) {
        console.error(
          'ErrorHandler: Webhook reinitialization failed. Aborting error notification.',
        );
        return;
      }
    }
    await this.sendWithRetry(errorDetails);
  }

  private async sendWithRetry(errorDetails: ErrorDetails): Promise<void> {
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        await this.sendErrorToWebhook(errorDetails);
        console.log(
          `ErrorHandler: Successfully sent error notification on attempt ${attempt}.`,
        );
        return;
      } catch (error) {
        console.error(`ErrorHandler: Attempt ${attempt} failed:`, error);
        if (attempt < this.config.retryAttempts) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.config.retryDelay),
          );
        }
      }
    }
    console.error(
      'ErrorHandler: All retry attempts failed for sending error notification.',
    );
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
    const now = Date.now();
    const existing = this.errorCache.get(key);
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
    if (this.errorCache.size > this.config.maxCacheSize) {
      const oldestKey = Array.from(this.errorCache.keys()).sort((a, b) => {
        const aTime = this.errorCache.get(a)?.lastOccurrence ?? 0;
        const bTime = this.errorCache.get(b)?.lastOccurrence ?? 0;
        return aTime - bTime;
      })[0];
      this.errorCache.delete(oldestKey);
    }
  }

  private async sendErrorToWebhook(errorDetails: ErrorDetails): Promise<void> {
    if (!this.webhook) {
      console.error(
        'ErrorHandler: No webhook client available for sending error notification.',
      );
      return;
    }

    try {
      const performanceMetrics = await this.capturePerformanceMetrics();
      const formattedMetrics =
        MetricsFormatter.formatPerformanceMetrics(performanceMetrics);

      const embed = new EmbedBuilder()
        .setColor(this.getSeverityColor(errorDetails.severity))
        .setTitle(`Error: ${errorDetails.type}`)
        .setDescription(`\`\`\`diff\n- ${errorDetails.message}\`\`\``)
        .addFields(
          {
            name: 'Error ID',
            value: errorDetails.errorId || 'Unknown',
            inline: true,
          },
          {
            name: 'Category',
            value: errorDetails.category || 'Unknown',
            inline: true,
          },
          {
            name: 'Severity',
            value: errorDetails.severity.toString(),
            inline: true,
          },
          {
            name: 'Stack Trace',
            value: `\`\`\`\n${errorDetails.stack.substring(0, 1000)}${errorDetails.stack.length > 1000 ? '...' : ''}\`\`\``,
          },
        );

      // Add recovery suggestions if available
      if (
        errorDetails.recoverySuggestions &&
        Array.isArray(errorDetails.recoverySuggestions) &&
        errorDetails.recoverySuggestions.length > 0
      ) {
        embed.addFields({
          name: 'Recovery Suggestions',
          value: errorDetails.recoverySuggestions
            .map((s) => `• ${s}`)
            .join('\n'),
        });
      }

      // Add performance metrics
      embed.addFields({
        name: 'Performance Metrics',
        value: `\`\`\`\n${formattedMetrics.substring(0, 1024)}\`\`\``,
      });

      await this.webhook.send({ embeds: [embed] });
    } catch (error) {
      console.error('ErrorHandler: Error in sendErrorToWebhook:', error);
    }
  }

  private getSeverityColor(severity: ErrorSeverity): number {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 0xff0000;
      case ErrorSeverity.HIGH:
        return 0xffa500;
      case ErrorSeverity.MEDIUM:
        return 0xffff00;
      case ErrorSeverity.LOW:
        return 0x00ff00;
      default:
        return 0x0000ff;
    }
  }

  private determineSeverity(
    error: Error,
    performance: PerformanceMetrics,
  ): ErrorSeverity {
    // Determine severity based on error type
    if (error instanceof DiscordAPIError) {
      const code = (error as DiscordAPIError).code;
      // Critical Discord API errors
      if (
        [50001, 50013, 50007, 40007, 10003, 10008, 10011, 10026].includes(
          code as number,
        )
      ) {
        return ErrorSeverity.CRITICAL;
      }
      // High severity Discord API errors
      if (
        [50035, 50036, 40001, 40002, 50003, 50004, 50006].includes(
          code as number,
        )
      ) {
        return ErrorSeverity.HIGH;
      }
      // Medium severity Discord API errors
      if (
        [50007, 50008, 50009, 50010, 50014, 50021, 50025, 50034].includes(
          code as number,
        )
      ) {
        return ErrorSeverity.MEDIUM;
      }
      // Default to LOW for other API errors
      return ErrorSeverity.LOW;
    }

    // Check for critical performance issues
    const memoryUsagePercent =
      performance.memoryUsage.heapUsed / performance.memoryUsage.heapTotal;
    if (
      memoryUsagePercent > 0.95 || // Memory usage over 95%
      performance.cpu.usage > 95 || // CPU usage over 95%
      performance.cpu.load[0] > 10 // High load average
    ) {
      return ErrorSeverity.CRITICAL;
    }

    // Check for high performance issues
    if (
      memoryUsagePercent > 0.85 ||
      performance.cpu.usage > 80 ||
      performance.cpu.load[0] > 5
    ) {
      return ErrorSeverity.HIGH;
    }

    // Check error message for keywords suggesting severity
    const errorMsg = error.message.toLowerCase();
    if (
      errorMsg.includes('critical') ||
      errorMsg.includes('fatal') ||
      errorMsg.includes('crash') ||
      errorMsg.includes('corruption') ||
      errorMsg.includes('permission denied') ||
      errorMsg.includes('access violation')
    ) {
      return ErrorSeverity.CRITICAL;
    }

    if (
      errorMsg.includes('failed') ||
      errorMsg.includes('timeout') ||
      errorMsg.includes('exception') ||
      errorMsg.includes('invalid') ||
      errorMsg.includes('unauthorized')
    ) {
      return ErrorSeverity.HIGH;
    }

    if (
      errorMsg.includes('warning') ||
      errorMsg.includes('deprecated') ||
      errorMsg.includes('retry')
    ) {
      return ErrorSeverity.MEDIUM;
    }

    // Default to MEDIUM severity for unknown errors
    return ErrorSeverity.MEDIUM;
  }

  private generateErrorHash(error: Error, context: ErrorContext): string {
    // Extract key components from the error for grouping
    const errorName = error.name || 'Unknown';
    const errorMessage = error.message || 'No message';

    // Extract the most relevant part of the stack trace for grouping
    // We'll use the first frame which likely points to our code
    const stackLines = (error.stack || '').split('\n').slice(1, 3);
    const stackSignature = stackLines
      .map((line: string) => {
        // Extract just the file path and line number, removing variable parts
        const match = line.match(
          /at\s+(?:\w+\.)?(\w+)\s+\(([^:]+):(\d+):(\d+)\)/,
        );
        if (match) {
          const [, funcName, filePath, lineNum] = match;
          // Use function name, file path, and approximate line number range (within 5 lines)
          const lineRange = Math.floor(parseInt(lineNum, 10) / 5) * 5;
          return `${funcName}@${filePath}#${lineRange}`;
        }
        return line.trim();
      })
      .join('|');

    // Filter to include only relevant context keys
    const relevantContextKeys = [
      'command',
      'channel',
      'guild',
      'interaction',
      'module',
    ];

    // Include relevant context in the hash if available
    const contextSignature = Object.entries(context)
      .filter(([key]) => relevantContextKeys.includes(key))
      .map(([key, value]) => {
        // For objects, just use type/id, not the full object
        if (typeof value === 'object' && value !== null) {
          const objValue = value as { id?: string | number; name?: string };
          return `${key}:${objValue.id || objValue.name || typeof value}`;
        }
        return `${key}:${String(value)}`;
      })
      .sort() // Sort for consistency
      .join('&');

    // If it's a Discord API error, include the code in the hash
    const apiErrorCode =
      error instanceof DiscordAPIError
        ? `DiscordAPI:${(error as DiscordAPIError).code}:`
        : '';

    // Combine all components and create a hash
    const hashInput = `${apiErrorCode}${errorName}:${errorMessage.substring(0, 100)}|${stackSignature}|${contextSignature}`;
    return createHash('md5').update(hashInput).digest('hex');
  }

  private capturePerformanceMetrics(): Promise<PerformanceMetrics> {
    if (this.performanceMonitor) {
      return this.performanceMonitor.captureMetrics();
    }

    // Fallback if performance monitor is not available
    return Promise.resolve({
      memoryUsage: {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
      },
      cpu: {
        usage: 0, // Not available without the monitor
        load: os.loadavg(),
      },
      uptime: process.uptime(),
      responseTime: 0,
    });
  }

  private async checkPerformance(): Promise<void> {
    if (!this.performanceMonitor || !this.webhook) return;

    try {
      // Check for performance issues
      const alerts = await this.performanceMonitor.checkThresholds();

      if (alerts.length > 0) {
        // Create a performance alert embed
        const embed = new EmbedBuilder()
          .setColor(0xff9900) // Orange for warnings
          .setTitle('⚠️ Performance Alert')
          .setDescription('The following performance issues were detected:')
          .addFields({
            name: 'Alerts',
            value: alerts.map((alert) => `• ${alert}`).join('\n'),
          });

        // Add metrics data
        const metrics = await this.performanceMonitor.captureMetrics();
        const formattedMetrics =
          MetricsFormatter.formatPerformanceMetrics(metrics);

        embed.addFields({
          name: 'Current Metrics',
          value: `\`\`\`\n${formattedMetrics.substring(0, 1024)}\`\`\``,
        });

        // Send the performance alert
        await this.webhook.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error('ErrorHandler: Error in checkPerformance:', error);
    }
  }
}

export default ErrorHandler;
