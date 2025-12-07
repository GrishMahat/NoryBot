import type { PerformanceMetrics } from '@/types';

export class MetricsFormatter {
	public static formatPerformanceMetrics(metrics: PerformanceMetrics): string {
		const sections = [
			'Memory Usage:',
			`  Heap Used: ${this.formatBytes(metrics.memoryUsage.heapUsed)} (${((metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal) * 100).toFixed(1)}%)`,
			`  Heap Total: ${this.formatBytes(metrics.memoryUsage.heapTotal)}`,
			`  External: ${this.formatBytes(metrics.memoryUsage.external)}`,
			'',
			'CPU:',
			`  Usage: ${metrics.cpu.usage.toFixed(2)}%`,
			`  Load Avg (1m, 5m, 15m): ${metrics.cpu.load.map((l) => l.toFixed(2)).join(', ')}`,
			'',
			`Uptime: ${this.formatUptime(metrics.uptime)}`,
			`Response Time: ${metrics.responseTime.toFixed(2)}ms`,
		];

		if (metrics.shardStats) {
			sections.push(
				'',
				'Shard Stats:',
				...metrics.shardStats.map(
					(shard) => `  Shard ${shard.id}: ${shard.status} (Latency: ${shard.ping}ms)`,
				),
			);
		}

		return sections.join('\n');
	}

	private static formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const units = ['B', 'KB', 'MB', 'GB', 'TB'];
		let value = bytes;
		let unitIndex = 0;
		while (value >= 1024 && unitIndex < units.length - 1) {
			value /= 1024;
			unitIndex++;
		}
		return `${value.toFixed(2)} ${units[unitIndex]}`;
	}

	private static formatUptime(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		return `${hours}h ${minutes}m`;
	}
}
