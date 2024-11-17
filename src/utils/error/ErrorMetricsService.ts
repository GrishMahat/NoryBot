import { ErrorMetrics, ErrorDetails, ErrorSeverity } from '../../types/error';

export class ErrorMetricsService {
  private metrics: Map<string, ErrorMetrics>;
  private readonly retentionPeriod: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(retentionPeriod: number = 24 * 60 * 60 * 1000) {
    this.metrics = new Map();
    this.retentionPeriod = retentionPeriod;
    this.startCleanupInterval();
  }

  public trackError(error: ErrorDetails): void {
    const hourKey = this.getHourKey();
    const dayKey = this.getDayKey();

    // Update hourly metrics
    this.updateRateMetrics(hourKey, error);
    // Update daily metrics
    this.updateRateMetrics(dayKey, error);
    // Update top errors
    this.updateTopErrors(error);
  }

  private updateRateMetrics(timeKey: string, error: ErrorDetails): void {
    const existing = this.metrics.get(timeKey) || this.createNewMetrics();
    if (timeKey.startsWith('hour:')) {
      existing.hourlyRate++;
    } else if (timeKey.startsWith('day:')) {
      existing.dailyRate++;
    }
    this.metrics.set(timeKey, existing);
  }

  private updateTopErrors(error: ErrorDetails): void {
    const dayKey = this.getDayKey();
    const metrics = this.metrics.get(dayKey) || this.createNewMetrics();

    const existingError = metrics.topErrors.find(
      (e) => e.message === error.message
    );
    if (existingError) {
      existingError.count++;
      existingError.lastOccurrence = new Date();
    } else {
      metrics.topErrors.push({
        message: error.message,
        count: 1,
        lastOccurrence: new Date(),
      });
    }

    // Sort and limit top errors
    metrics.topErrors.sort((a, b) => b.count - a.count);
    metrics.topErrors = metrics.topErrors.slice(0, 10);

    this.metrics.set(dayKey, metrics);
  }

  public generateReport(): ErrorMetrics {
    const dayKey = this.getDayKey();
    const currentMetrics = this.metrics.get(dayKey) || this.createNewMetrics();

    // Calculate rates
    const hourlyRate = this.calculateHourlyRate();
    const dailyRate = this.calculateDailyRate();

    return {
      ...currentMetrics,
      hourlyRate,
      dailyRate,
    };
  }

  private calculateHourlyRate(): number {
    const hourKey = this.getHourKey();
    const metrics = this.metrics.get(hourKey);
    return metrics?.hourlyRate || 0;
  }

  private calculateDailyRate(): number {
    const dayKey = this.getDayKey();
    const metrics = this.metrics.get(dayKey);
    return metrics?.dailyRate || 0;
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.retentionPeriod;
    for (const [key, _] of this.metrics) {
      const timestamp = parseInt(key.split(':')[1]);
      if (timestamp < cutoff) {
        this.metrics.delete(key);
      }
    }
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, this.retentionPeriod / 24); // Run cleanup every hour
  }

  private getHourKey(): string {
    const now = new Date();
    return `hour:${now.setMinutes(0, 0, 0)}`;
  }

  private getDayKey(): string {
    const now = new Date();
    return `day:${now.setHours(0, 0, 0, 0)}`;
  }

  private createNewMetrics(): ErrorMetrics {
    return {
      hourlyRate: 0,
      dailyRate: 0,
      topErrors: [],
      performance: {
        memoryUsage: { heapUsed: 0, heapTotal: 0, external: 0 },
        cpu: { usage: 0, load: [] },
        uptime: 0,
        responseTime: 0,
      },
      bySeverity: {
        [ErrorSeverity.LOW]: 0,
        [ErrorSeverity.MEDIUM]: 0,
        [ErrorSeverity.HIGH]: 0,
        [ErrorSeverity.CRITICAL]: 0,
      },
    };
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
