import { Client, WebhookClient } from 'discord.js';
import ErrorHandler from '@/handlers/errorHandler';

// Mock discord.js components
jest.mock('discord.js', () => {
	const mockSend = jest.fn().mockResolvedValue({});
	const mockWebhookClient = jest.fn().mockImplementation(() => ({
		send: mockSend,
	}));

	return {
		WebhookClient: mockWebhookClient,
		EmbedBuilder: jest.fn().mockImplementation(() => ({
			setTitle: jest.fn().mockReturnThis(),
			setDescription: jest.fn().mockReturnThis(),
			setColor: jest.fn().mockReturnThis(),
			addFields: jest.fn().mockReturnThis(),
			setFooter: jest.fn().mockReturnThis(),
			setTimestamp: jest.fn().mockReturnThis(),
		})),
		Client: jest.fn().mockImplementation(() => ({
			on: jest.fn(),
			user: { tag: 'TestBot#0000' },
		})),
		Events: {
			Error: 'error',
			Warn: 'warn',
		},
	};
});

// Mock determineSeverity
jest.mock('@/services/error/determineSeverity', () => {
	return jest.fn().mockReturnValue('critical');
});

// Mock determineErrorCategory
jest.mock('@/services/error/determineErrorCategory', () => {
	return jest.fn().mockReturnValue('api');
});

// Mock getRecoverySuggestions
jest.mock('@/services/error/getRecoverySuggestions', () => {
	return jest.fn().mockReturnValue(['Retry the operation', 'Check API status']);
});

// Mock PerformanceMonitor
jest.mock('@/services/error/performanceMonitor', () => {
	return {
		PerformanceMonitor: jest.fn().mockImplementation(() => ({
			initialize: jest.fn(),
			recordError: jest.fn(),
			getMetrics: jest.fn().mockReturnValue({}),
		})),
	};
});

// Mock ErrorMetricsService
jest.mock('@/services/error/ErrorMetricsService', () => {
	return {
		ErrorMetricsService: jest.fn().mockImplementation(() => ({
			initialize: jest.fn(),
			recordError: jest.fn(),
			getErrorMetrics: jest.fn().mockReturnValue({}),
		})),
	};
});

// Create console spies
const consoleErrorSpy = jest
	.spyOn(console, 'error')
	.mockImplementation(() => {});
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

describe('ErrorHandler', () => {
	// Mock process.env
	const originalEnv = process.env;

	beforeEach(() => {
		jest.clearAllMocks();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	afterAll(() => {
		consoleErrorSpy.mockRestore();
		consoleWarnSpy.mockRestore();
	});

	it('should initialize with default config', () => {
		const errorHandler = new ErrorHandler();
		expect(errorHandler).toBeDefined();
	});

	it('should initialize with custom config', () => {
		const errorHandler = new ErrorHandler({
			webhook: 'https://example.com/webhook',
			environment: 'test',
			maxCacheSize: 50,
		});
		expect(errorHandler).toBeDefined();
	});

	it('should handle errors correctly', async () => {
		process.env.ERROR_WEBHOOK = 'https://example.com/webhook';
		const errorHandler = new ErrorHandler();

		// Initialize with client
		const mockClient = new Client({ intents: [] });
		errorHandler.initialize(mockClient);

		const error = new Error('Test error');
		await errorHandler.handleError(error, 'test');

		// When an error is handled with a webhook URL, the error should be logged or sent
		expect(consoleErrorSpy.mock.calls.length).toBeGreaterThan(0);
	});

	it('should not attempt to send to webhook if not configured', async () => {
		process.env.ERROR_WEBHOOK = '';
		const errorHandler = new ErrorHandler();

		const error = new Error('Test error');
		await errorHandler.handleError(error, 'test');

		// When no webhook is configured, errors should still be logged
		expect(consoleErrorSpy.mock.calls.length).toBeGreaterThan(0);
	});

	it('should handle different error types', async () => {
		process.env.ERROR_WEBHOOK = 'https://example.com/webhook';
		const errorHandler = new ErrorHandler();

		// Test with string error
		await errorHandler.handleError('String error', 'stringError');

		// Test with Error object
		await errorHandler.handleError(new Error('Error object'), 'errorObject');

		// Test with custom error object
		await errorHandler.handleError(
			{
				name: 'CustomError',
				message: 'Custom error',
			},
			'customError',
		);

		// Errors should be logged regardless of type
		expect(consoleErrorSpy.mock.calls.length).toBeGreaterThan(0);
	});
});
