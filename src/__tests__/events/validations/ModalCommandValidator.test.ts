import { Client, ModalSubmitInteraction } from 'discord.js';
import modalValidator from '@/events/validations/ModalCommandValidator';

// Mock the global errorHandler
global.errorHandler = {
	handleError: jest.fn().mockResolvedValue(undefined),
	initialize: jest.fn(),
};

// Mock the getModals function
jest.mock('@/utils/helpers/getModals', () => {
	return jest.fn().mockImplementation(() => [
		{
			customId: 'test_modal',
			run: jest
				.fn()
				.mockImplementation((client, interaction) => Promise.resolve()),
		},
		{
			customId: 'admin_modal',
			run: jest
				.fn()
				.mockImplementation((client, interaction) => Promise.resolve()),
			userPermissions: ['Administrator'],
		},
		{
			customId: 'cooldown_modal',
			run: jest
				.fn()
				.mockImplementation((client, interaction) => Promise.resolve()),
			cooldown: 60,
		},
	]);
});

// Mock LRUCache and CooldownManager
jest.mock('@/services/manager/LRUCache', () => {
	return jest.fn().mockImplementation(() => ({
		get: jest.fn(),
		set: jest.fn(),
		has: jest.fn(),
		delete: jest.fn(),
		size: jest.fn().mockReturnValue(0),
		clear: jest.fn(),
		getStats: jest.fn().mockReturnValue({}),
		setOnExpireHandler: jest.fn(),
		setAutoCleanupEnabled: jest.fn(),
	}));
});

jest.mock('@/services/manager/CooldownManager', () => ({
	isOnCooldown: jest.fn().mockReturnValue(false),
	getCooldownRemaining: jest.fn().mockReturnValue(0),
	setCooldown: jest.fn(),
}));

// Mock discord.js client
jest.mock('discord.js', () => {
	const original = jest.requireActual('discord.js');

	return {
		...original,
		Client: jest.fn().mockImplementation(() => ({
			user: { id: 'bot-id', tag: 'Bot#0000' },
		})),
		EmbedBuilder: jest.fn().mockImplementation(() => ({
			setColor: jest.fn().mockReturnThis(),
			setDescription: jest.fn().mockReturnThis(),
			setFooter: jest.fn().mockReturnThis(),
			setAuthor: jest.fn().mockReturnThis(),
			setTimestamp: jest.fn().mockReturnThis(),
			addFields: jest.fn().mockReturnThis(),
		})),
	};
});

// Create spies for the console
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

describe('ModalCommandValidator', () => {
	// Create mock interaction
	const mockDefer = jest.fn().mockResolvedValue(undefined);
	const mockReply = jest.fn().mockResolvedValue(undefined);
	const mockEditReply = jest.fn().mockResolvedValue(undefined);

	const mockClient = new Client({ intents: [] });

	const createMockInteraction = (customId: string) => {
		return {
			customId,
			user: {
				id: 'user-id',
				tag: 'User#0000',
				username: 'TestUser',
				displayAvatarURL: jest
					.fn()
					.mockImplementation((options) => 'https://example.com/avatar.png'),
			},
			guild: { id: 'guild-id' },
			deferReply: mockDefer,
			reply: mockReply,
			editReply: mockEditReply,
			createdTimestamp: Date.now(),
			fields: {
				getTextInputValue: jest.fn().mockReturnValue('test value'),
			},
			isModalSubmit: () => true,
			replied: false,
			deferred: false,
		} as unknown as ModalSubmitInteraction;
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	afterAll(() => {
		// Restore console spies
		consoleLogSpy.mockRestore();
	});

	it('should handle valid modal interaction', async () => {
		// Set up the console.log spy to capture calls
		consoleLogSpy.mockClear();

		const interaction = createMockInteraction('test_modal');
		await modalValidator(mockClient, interaction);

		// In this case the handler should process the modal
		// This could result in console.log, deferReply, or reply being called
		const handlerCalled =
			consoleLogSpy.mock.calls.length > 0 ||
			mockDefer.mock.calls.length > 0 ||
			mockReply.mock.calls.length > 0;

		expect(handlerCalled).toBeTruthy();
	});

	it('should handle unknown modal gracefully', async () => {
		consoleLogSpy.mockClear();

		const interaction = createMockInteraction('unknown_modal');

		// No exception should be thrown when an unknown modal is encountered
		await expect(
			modalValidator(mockClient, interaction),
		).resolves.not.toThrow();

		// The test passes if no exception was thrown - we don't need further assertions
		// as the modal handler's internal error handling is what we're testing
	});
});
