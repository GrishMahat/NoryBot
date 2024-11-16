import { PerformanceMetrics } from '../../types/error.js';

export class MetricsFormatter {
    private static formatBytes(bytes: number): string {
        const units = ['B', 'KB', 'MB', 'GB'];
        let value = bytes;
        let unitIndex = 0;
        while (value > 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex++;
        }
        return `${value.toFixed(2)} ${units[unitIndex]}`;
    }

    public static formatPerformanceMetrics(metrics: PerformanceMetrics): string {
        const sections = [
            'Memory Usage:',
            `  Heap Used: ${this.formatBytes(metrics.memoryUsage.heapUsed)}`,
            `  Heap Total: ${this.formatBytes(metrics.memoryUsage.heapTotal)}`,
            `  External: ${this.formatBytes(metrics.memoryUsage.external)}`,
            '',
            'CPU:',
            `  Usage: ${metrics.cpu.usage.toFixed(2)}%`,
            `  Load Avg: ${metrics.cpu.load.map(l => l.toFixed(2)).join(', ')}`,
            '',
            `Uptime: ${(metrics.uptime / 3600).toFixed(2)} hours`,
            `Response Time: ${metrics.responseTime.toFixed(2)}ms`
        ];

        if (metrics.shardStats) {
            sections.push(
                '',
                'Shard Stats:',
                ...metrics.shardStats.map(shard => 
                    `  Shard ${shard.id}: ${shard.status} (${shard.ping}ms)`
                )
            );
        }

        return `\`\`\`\n${sections.join('\n')}\n\`\`\``;
    }
}
