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

} from '../types/error.js';
import determineErrorCategory from '../services/error/determineErrorCategory.js';
import getRecoverySuggestions from '../services/error/getRecoverySuggestions.js';
import { PerformanceMonitor } from '../services/error/performanceMonitor.js';
import { MetricsFormatter } from '../services/error/metricsFormatter.js';
import { ErrorMetricsService } from '../services/error/ErrorMetricsService.js';

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
      this.config.performanceThresholds
    );
    this.metricsService = new ErrorMetricsService(this.config.cacheExpiration);
    this.setupEventListeners();
    this.startPerformanceMonitoring();
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
        { name: 'Hourly Rate', value: report.hourlyRate.toString(), inline: true },
        { name: 'Daily Rate', value: report.dailyRate.toString(), inline: true },
        {
          name: 'Top Errors',
          value: report.topErrors
            .slice(0, 5)
            .map(
              (error) =>
                `• ${error.message} (${error.count}x, last: <t:${Math.floor(
                  error.lastOccurrence.getTime() / 1000
                )}:R>)`
            )
            .join('\n') || 'No errors recorded',
        }
      );

    await this.webhook.send({ embeds: [embed] });
  }

  public async handleError(
    error: Error | unknown,
    type: string
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
    context?: ErrorContext
  ): Promise<ErrorDetails> {
    const err = error instanceof Error ? error : new Error(String(error));
    const isDiscordError = error instanceof DiscordAPIError;
    const category = determineErrorCategory(
      isDiscordError ? (error as DiscordAPIError) : undefined
    );
    const recoverySuggestions = await getRecoverySuggestions(err);
    const performance = this.performanceMonitor
      ? await this.performanceMonitor.captureMetrics()
      : {
          memoryUsage: { heapUsed: 0, heapTotal: 0, external: 0 },
          cpu: { usage: 0, load: [0, 0, 0] },
          uptime: 0,
          responseTime: 0,
        };

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
        typeof error.code === 'number' &&
        !recoverableCodes.includes(error.code)
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
      console.warn('ErrorHandler: Webhook client not available, attempting reinitialization...');
      this.setupWebhook();
      if (!this.webhook) {
        console.error('ErrorHandler: Webhook reinitialization failed. Aborting error notification.');
        return;
      }
    }
    await this.sendWithRetry(errorDetails);
  }

  private async sendWithRetry(errorDetails: ErrorDetails): Promise<void> {
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        await this.sendErrorToWebhook(errorDetails);
        console.log(`ErrorHandler: Successfully sent error notification on attempt ${attempt}.`);
        return;
      } catch (error) {
        console.error(`ErrorHandler: Attempt ${attempt} failed:`, error);
        if (attempt < this.config.retryAttempts) {
          await new Promise((resolve) => setTimeout(resolve, this.config.retryDelay));
        }
      }
    }
    console.error('ErrorHandler: All retry attempts failed for sending error notification.');
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
      console.error('ErrorHandler: No webhook client available for sending error notification.');
      return;
    }

    try {
      const performanceMetrics = await this.capturePerformanceMetrics();
      const embed = new EmbedBuilder()
        .setColor(this.getSeverityColor(errorDetails.severity))
        .setTitle(`Error: ${errorDetails.type}`)
        .setDescription(`\`\`\`diff\n- ${errorDetails.message}\`\`\``);

      // Add error category and recovery suggestions
      if (errorDetails.category) {
        embed.addFields({
          name: 'Category',
          value: `\`${errorDetails.category}\``,
          inline: true,
        });
      }

      if (errorDetails.recoverySuggestions) {
        embed.addFields({
          name: 'Recovery Suggestions',
          value: `\`\`\`yaml\n${errorDetails.recoverySuggestions}\`\`\``,
        });
      }

      // Add performance metrics
      const performanceStr = MetricsFormatter.formatPerformanceMetrics(performanceMetrics);
      if (performanceStr) {
        embed.addFields({
          name: 'Performance Metrics',
          value: `\`\`\`ml\n${performanceStr}\`\`\``,
          inline: false,
        });
      }

      // Add error context
      const contextStr = this.formatContext(errorDetails.context);
      if (contextStr && contextStr !== 'No context available') {
        embed.addFields({
          name: 'Context',
          value: `\`\`\`json\n${contextStr}\`\`\``,
          inline: false,
        });
      }

      // Add stack trace with better formatting
      if (errorDetails.stack) {
        const formattedStack = this.formatStackTrace(errorDetails.stack);
        embed.addFields({
          name: 'Stack Trace',
          value: `\`\`\`js\n${formattedStack}\`\`\``,
        });
      }

      // Add severity indicator
      if (errorDetails.severity) {
        const severityEmojis: Record<string, string> = {
          LOW: '🟢',
          MEDIUM: '🟡',
          HIGH: '🔴',
          CRITICAL: '⛔',
        };
        embed.addFields({
          name: 'Severity',
          value: `${severityEmojis[errorDetails.severity]} **${errorDetails.severity}**`,
          inline: true,
        });
      }

      // Add timestamp
      embed.setTimestamp(new Date(errorDetails.timestamp));

      await this.webhook.send({
        embeds: [embed],
        username: 'Error Handler',
        avatarURL: this.client?.user?.displayAvatarURL() ?? '',
      });
    } catch (error: unknown) {
      console.error('ErrorHandler: Detailed webhook error:', error);
      if (
        error instanceof Error &&
        error.message.includes('Invalid Webhook Token')
      ) {
        console.warn('ErrorHandler: Invalid webhook token detected, reinitializing webhook...');
        this.setupWebhook();
      }
      throw error;
    }
  }

  private formatStackTrace(stack: string): string {
    return stack
      .split('\n')
      .map((line) => {
        if (line.includes('at ')) {
          const parts = line.split('at ');
          return `→ ${parts[1].trim()}`;
        }
        return line;
      })
      .slice(0, this.config.development.stackTraceLimit)
      .join('\n');
  }

  private getSeverityColor(severity: ErrorSeverity): number {
    const colors = {
      [ErrorSeverity.LOW]: 0x00ff00,
      [ErrorSeverity.MEDIUM]: 0xffff00,
      [ErrorSeverity.HIGH]: 0xff9900,
      [ErrorSeverity.CRITICAL]: 0xff0000,
    };
    return colors[severity] || 0xff0000;
  }

  private capturePerformanceMetrics(): Promise<PerformanceMetrics> {
    if (!this.performanceMonitor) {
      return Promise.resolve({
        memoryUsage: { heapUsed: 0, heapTotal: 0, external: 0 },
        cpu: { usage: 0, load: [0, 0, 0] },
        uptime: 0,
        responseTime: 0,
      });
    }
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
    if (
      performance.memoryUsage.heapUsed / performance.memoryUsage.heapTotal > 0.95 ||
      performance.cpu.usage > 0.95
    ) {
      return ErrorSeverity.CRITICAL;
    }

    if (error instanceof DiscordAPIError) {
      const code = Number(error.code);
      if (isNaN(code)) return ErrorSeverity.LOW;
      if ([50001, 50013, 50014, 40001, 40002].includes(code)) {
        return ErrorSeverity.CRITICAL;
      }
      if ([50007, 50008, 50033, 50035].includes(code)) {
        return ErrorSeverity.HIGH;
      }
      if ([50016, 50019, 50034].includes(code)) {
        return ErrorSeverity.MEDIUM;
      }
    }

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

  public destroy(): void {
    if (this.webhook) {
      this.webhook.destroy();
      this.webhook = null;
    }
    if (this.metricsService) {
      this.metricsService.destroy();
      this.metricsService = null;
    }
    if (this.performanceMonitor) {
      this.performanceMonitor = null;
    }
  }

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

    for (const error of this.errorCache.values()) {
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
