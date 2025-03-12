import {
	Client,
	ButtonInteraction,
	PermissionsBitField,
} from 'discord.js';
import buttonValidator from '@/events/validations/buttonValidator';

// Mock the global errorHandler
global.errorHandler = {
	handleError: jest.fn().mockResolvedValue(undefined),
	initialize: jest.fn(),
};

// Mock the getButtons function
jest.mock('@/utils/helpers/getButtons', () => jest.fn().mockImplementation(() => [
	{
		customId: 'test_button',
		run: jest
			.fn()
			.mockImplementation((client, interaction) => Promise.resolve()),
	},
	{
		customId: 'admin_button',
		run: jest
			.fn()
			.mockImplementation((client, interaction) => Promise.resolve()),
		userPermissions: ['Administrator'],
	},
	{
		customId: 'dev_button',
		run: jest
			.fn()
			.mockImplementation((client, interaction) => Promise.resolve()),
		devOnly: true,
	},
	{
		customId: 'cooldown_button',
		run: jest
			.fn()
			.mockImplementation((client, interaction) => Promise.resolve()),
		cooldown: 60,
	},
]));

// Mock LRUCache and CooldownManager
jest.mock('@/services/manager/LRUCache', () => jest.fn().mockImplementation(() => ({
	get: jest.fn(),
	set: jest.fn(),
	has: jest.fn(),
	delete: jest.fn(),
	size: jest.fn().mockReturnValue(0),
	clear: jest.fn(),
	getStats: jest.fn().mockReturnValue({}),
	setOnExpireHandler: jest.fn(),
	setAutoCleanupEnabled: jest.fn(),
})));

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

describe('ButtonValidator', () => {
	// Create mock interaction
	const mockDefer = jest.fn().mockResolvedValue(undefined);
	const mockReply = jest.fn().mockResolvedValue(undefined);
	const mockEditReply = jest.fn().mockResolvedValue(undefined);

	const mockClient = new Client({ intents: [] });

	const createMockInteraction = (customId: string, hasPerms = true): ButtonInteraction => ({
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
		member: {
			permissions: new PermissionsBitField(hasPerms ? ['Administrator'] : []),
		},
		deferReply: mockDefer,
		reply: mockReply,
		editReply: mockEditReply,
		createdTimestamp: Date.now(),
		isButton: () => true,
		replied: false,
		deferred: false,
	} as unknown as ButtonInteraction);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	afterAll(() => {
		// Restore console spies
		consoleLogSpy.mockRestore();
	});

	it('should handle valid button interaction', async () => {
		const interaction = createMockInteraction('test_button');
		await buttonValidator(mockClient, interaction);

		// For a valid button, either the deferReply or reply should be called
		const interactionHandled =
			mockDefer.mock.calls.length > 0 || mockReply.mock.calls.length > 0;
		expect(interactionHandled).toBeTruthy();
	});

	it('should reject interaction without proper permissions', async () => {
		const interaction = createMockInteraction('admin_button', false);
		await buttonValidator(mockClient, interaction);

		// For a permissions error, we expect a reply with an error message
		expect(mockReply.mock.calls.length > 0).toBeTruthy();
	});
});
