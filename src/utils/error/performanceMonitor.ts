import { Client, WebSocketShard } from 'discord.js';
import os from 'os';
import { performance } from 'perf_hooks';
import { PerformanceMetrics, PerformanceThresholds, ShardStats, ShardStatus } from '../../types/error.js';

export class PerformanceMonitor {
    private client: Client;
    private thresholds: PerformanceThresholds;

    constructor(client: Client, thresholds: PerformanceThresholds) {
        this.client = client;
        this.thresholds = thresholds;
    }

    public async captureMetrics(): Promise<PerformanceMetrics> {
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        const metrics: PerformanceMetrics = {
            memoryUsage: {
                heapUsed: memoryUsage.heapUsed,
                heapTotal: memoryUsage.heapTotal,
                external: memoryUsage.external
            },
            cpu: {
                usage: (cpuUsage.user + cpuUsage.system) / 1000000,
                load: os.loadavg()
            },
            uptime: process.uptime(),
            responseTime: performance.now()
        };

        if (this.client.shard) {
            metrics.shardStats = await this.getShardStats();
        }

        return metrics;
    }

    public async checkThresholds(): Promise<string[]> {
        const metrics = await this.captureMetrics();
        const alerts: string[] = [];

        if (metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal > this.thresholds.memory) {
            alerts.push(`High memory usage: ${((metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal) * 100).toFixed(2)}%`);
        }

        if (metrics.cpu.usage > this.thresholds.cpu) {
            alerts.push(`High CPU usage: ${(metrics.cpu.usage * 100).toFixed(2)}%`);
        }

        if (metrics.responseTime > this.thresholds.responseTime) {
            alerts.push(`High response time: ${metrics.responseTime.toFixed(2)}ms`);
        }

        return alerts;
    }

    private async getShardStats(): Promise<ShardStats[]> {
        if (!this.client.shard) return [];

        try {
            const shardManager = this.client.shard;
            const shardIds = Array.from(shardManager.ids);
            
            const [pings, statuses] = await Promise.all([
                shardManager.broadcastEval(client => client.ws.ping),
                shardManager.broadcastEval(client => client.ws.status)
            ]);

            const shardData: ShardStats[] = shardIds.map((id, index) => ({
                id,
                ping: typeof pings[index] === 'number' ? pings[index] : 0,
                status: this.normalizeShardStatus(statuses[index])
            }));

            return shardData;
        } catch (error) {
            console.error('Failed to fetch shard stats:', error);
            return [];
        }
    }

    private normalizeShardStatus(status: any): ShardStatus {
        // Map numerical WebSocket status codes to ShardStatus strings
        switch (status) {
            case 0: return 'CONNECTING';
            case 1: return 'READY';
            case 2: return 'IDLE';
            case 3: return 'NEARLY';
            case 4: return 'DISCONNECTED';
            default: return 'UNKNOWN';
        }
    }
}
