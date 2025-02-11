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
  private webhook: WebhookClient | null = null;
  private client: Client | null = null;
  private errorCache: Map<string, ErrorInfo>;
  private errorGroups: Map<string, ErrorGroup>;
  private config: ErrorHandlerConfig;
  private metrics: Map<string, ErrorMetrics>;
  private performanceMonitor: PerformanceMonitor | null = null;

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
        console.error('No webhook URL provided');
        return;
      }

      this.webhook = new WebhookClient({ url: this.config.webhook });

      // Test webhook connection
      // this.webhook.send({ content: 'Error handler initialized' }).catch(error => {
      //   console.error('Failed to send test message to webhook:', error);
      //   this.webhook = null;
      // });
    } catch (error) {
      console.error('Failed to setup webhook:', error);
      this.webhook = null;
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
    try {
      const errorDetails = await this.formatError(error, type);

      if (this.config.environment === 'development') {
        console.error('Development Error:', errorDetails);
        return;
      }

      await this.processError(errorDetails);
    } catch (err) {
      console.error('Error in handleError:', err);
    }
  }

  private async formatError(
    error: unknown,
    type: string,
    context?: ErrorContext
  ): Promise<ErrorDetails> {
    // First ensure we have an Error object
    const err = error instanceof Error ? error : new Error(String(error));

    // Safely check for DiscordAPIError
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
    // Safely check for DiscordAPIError
    const isDiscordError = error instanceof DiscordAPIError;

    if (isDiscordError) {
      const discordError = error as DiscordAPIError;
      const recoverableCodes = [
        50001, 50013, 50014, 40001, 40002, 10003, 10008, 10011, 10015, 50035,
        50036,
      ];
      return (
        typeof discordError.code === 'number' &&
        !recoverableCodes.includes(discordError.code)
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

    // Log before sending to webhook
    console.log('Attempting to send error to webhook...');

    if (!this.webhook) {
      console.log('No webhook client available');
      // Try to reinitialize webhook
      this.setupWebhook();
      if (!this.webhook) {
        return;
      }
    }

    try {
      await this.sendErrorToWebhook(errorDetails);
      console.log('Successfully sent error to webhook');
    } catch (error) {
      console.error('Failed to send to webhook:', error);
      // Retry once with a delay
      setTimeout(async () => {
        try {
          await this.sendErrorToWebhook(errorDetails);
          console.log('Successfully sent error to webhook on retry');
        } catch (retryError) {
          console.error('Failed to send to webhook on retry:', retryError);
        }
      }, 5000);
    }
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
    if (!this.webhook) {
      console.error('No webhook client available');
      return;
    }

    try {
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle(`Error: ${errorDetails.type}`)
        .setDescription(`\`\`\`diff\n- ${errorDetails.message}\`\`\``);

      if (errorDetails.category) {
        embed.addFields({
          name: 'Category',
          value: `\`${errorDetails.category}\``,
          inline: true,
        });
      }

      if (errorDetails.stack) {
        const formattedStack = errorDetails.stack
          .split('\n')
          .map((line) => {
            if (line.includes('at ')) {
              return line.replace('at ', '→ at '); // Add arrow for stack frames
            }
            return line;
          })
          .join('\n');

        embed.addFields({
          name: 'Stack Trace',
          value: `\`\`\`js\n${formattedStack.slice(0, 1000)}\`\`\``,
        });
      }

      if (errorDetails.environment) {
        embed.addFields({
          name: 'Environment',
          value: `\`${errorDetails.environment}\``,
        });
      }

      if (errorDetails.timestamp) {
        embed.addFields({
          name: 'Timestamp',
          value: `<t:${Math.floor(new Date(errorDetails.timestamp).getTime() / 1000)}:F>`,
        });
      }

      if (errorDetails.recoverySuggestions) {
        embed.addFields({
          name: 'Recovery Suggestions',
          value: `\`\`\`yaml\n${errorDetails.recoverySuggestions}\`\`\``,
        });
      }

      const contextStr = this.formatContext(errorDetails.context);
      if (contextStr && contextStr !== 'No context available') {
        embed.addFields({
          name: 'Context',
          value: `\`\`\`json\n${contextStr}\`\`\``,
          inline: false,
        });
      }

      const performanceStr = this.formatPerformanceMetrics(
        errorDetails.performance
      );
      if (performanceStr) {
        embed.addFields({
          name: 'Performance',
          value: `\`\`\`ml\n${performanceStr}\`\`\``,
          inline: false,
        });
      }

      if (errorDetails.severity) {
        const severityEmojis = {
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

      await this.webhook.send({
        embeds: [embed],
        username: 'Error Handler',
        avatarURL: this.client?.user?.displayAvatarURL(),
      });
    } catch (error: unknown) {
      console.error('Detailed webhook error:', error);
      if (
        error instanceof Error &&
        error.message.includes('Invalid Webhook Token')
      ) {
        console.log('Attempting to re-initialize webhook...');
        this.setupWebhook();
      }
      throw error;
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
    if (this.webhook) {
      this.webhook.send = null;
      this.webhook = null;
    }
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
