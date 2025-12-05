import os from 'os';
import type { Client } from 'discord.js';
import { performance } from 'perf_hooks';
import type {
	PerformanceMetrics,
	PerformanceThresholds,
	ShardStats,
	ShardStatus,
} from '../../types/index';

export class PerformanceMonitor {
	private client: Client;
	private thresholds: PerformanceThresholds;
	private lastMetricsTimestamp: number;
	private cachedMetrics: PerformanceMetrics | null;
	private readonly CACHE_TTL = 1000; // 1 second cache

	constructor(client: Client, thresholds: PerformanceThresholds) {
		this.client = client;
		this.thresholds = thresholds;
		this.lastMetricsTimestamp = 0;
		this.cachedMetrics = null;
	}

	public async captureMetrics(): Promise<PerformanceMetrics> {
		// Return cached metrics if within TTL
		const now = Date.now();
		if (this.cachedMetrics && now - this.lastMetricsTimestamp < this.CACHE_TTL) {
			return this.cachedMetrics;
		}

		const startTime = performance.now();
		const memoryUsage = process.memoryUsage();
		const cpuUsage = process.cpuUsage();

		const metrics: PerformanceMetrics = {
			memoryUsage: {
				heapUsed: memoryUsage.heapUsed,
				heapTotal: memoryUsage.heapTotal,
				external: memoryUsage.external,
			},
			cpu: {
				usage: this.calculateCPUPercentage(cpuUsage),
				load: os.loadavg(),
			},
			uptime: process.uptime(),
			responseTime: performance.now() - startTime,
		};

		if (this.client.shard) {
			metrics.shardStats = await this.getShardStats();
		}

		// Cache the metrics
		this.cachedMetrics = metrics;
		this.lastMetricsTimestamp = now;

		return metrics;
	}

	public async checkThresholds(): Promise<string[]> {
		const metrics = await this.captureMetrics();
		const alerts: string[] = [];

		const memoryUsagePercent = metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal;
		if (memoryUsagePercent > this.thresholds.memory) {
			alerts.push(
				`Critical: Memory usage at ${(memoryUsagePercent * 100).toFixed(2)}% (${this.formatBytes(metrics.memoryUsage.heapUsed)}/${this.formatBytes(metrics.memoryUsage.heapTotal)})`,
			);
		}

		if (metrics.cpu.usage > this.thresholds.cpu) {
			alerts.push(
				`Warning: CPU usage at ${metrics.cpu.usage.toFixed(2)}% across ${os.cpus().length} cores`,
			);
		}

		if (metrics.responseTime > this.thresholds.responseTime) {
			alerts.push(
				`Performance: High response time of ${metrics.responseTime.toFixed(2)}ms (threshold: ${this.thresholds.responseTime}ms)`,
			);
		}

		return alerts;
	}

	private calculateCPUPercentage(cpuUsage: NodeJS.CpuUsage): number {
		const totalUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
		return (totalUsage / os.cpus().length) * 100; // Normalize by CPU cores
	}

	private formatBytes(bytes: number): string {
		const units = ['B', 'KB', 'MB', 'GB'];
		let value = bytes;
		let unitIndex = 0;

		while (value >= 1024 && unitIndex < units.length - 1) {
			value /= 1024;
			unitIndex++;
		}

		return `${value.toFixed(2)}${units[unitIndex]}`;
	}

	private async getShardStats(): Promise<ShardStats[]> {
		if (!this.client.shard) return [];

		try {
			const shardManager = this.client.shard;
			const shardIds = Array.from(shardManager.ids);

			const [pings, statuses, guildCounts] = await Promise.all([
				shardManager.broadcastEval((client) => client.ws.ping),
				shardManager.broadcastEval((client) => client.ws.status),
				shardManager.broadcastEval((client) => client.guilds.cache.size),
			]);

			return shardIds.map((id, index) => ({
				id,
				ping: typeof pings[index] === 'number' ? pings[index] : 0,
				status: this.normalizeShardStatus(statuses[index]),
				guildCount: guildCounts[index] || 0,
				lastUpdate: Date.now(),
			}));
		} catch (error) {
			console.error('Failed to fetch shard stats:', error);
			return [];
		}
	}

	private normalizeShardStatus(status: unknown): ShardStatus {
		const statusMap: Record<number, ShardStatus> = {
			0: 'CONNECTING',
			1: 'READY',
			2: 'IDLE',
			3: 'NEARLY',
			4: 'DISCONNECTED',
		};

		return statusMap[status as number] || 'UNKNOWN';
	}
}
