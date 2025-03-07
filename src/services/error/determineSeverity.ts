import { DiscordAPIError } from 'discord.js';
import { ErrorSeverity, PerformanceMetrics } from '../../types/index.js';

export default function determineSeverity(
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
			[50035, 50036, 40001, 40002, 50003, 50004, 50006].includes(code as number)
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
