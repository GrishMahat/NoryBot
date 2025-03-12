import {
	Client,
	ChatInputCommandInteraction,
	PermissionsBitField,
} from 'discord.js';
import commandValidator from '@/events/validations/chatInputCommandValidator';

// Mock the global errorHandler
global.errorHandler = {
	handleError: jest.fn().mockResolvedValue(undefined),
	initialize: jest.fn(),
};

// Mock the getLocalCommands function
jest.mock('@/utils/helpers/getLocalCommands', () => jest.fn().mockImplementation(() => [
	{
		name: 'test',
		run: jest
			.fn()
			.mockImplementation((client, interaction) => Promise.resolve()),
	},
	{
		name: 'admin',
		run: jest
			.fn()
			.mockImplementation((client, interaction) => Promise.resolve()),
		userPermissions: ['Administrator'],
	},
	{
		name: 'dev',
		run: jest
			.fn()
			.mockImplementation((client, interaction) => Promise.resolve()),
		devOnly: true,
	},
	{
		name: 'cooldown',
		run: jest
			.fn()
			.mockImplementation((client, interaction) => Promise.resolve()),
		cooldown: 60,
	},
	{
		name: 'nsfw',
		run: jest
			.fn()
			.mockImplementation((client, interaction) => Promise.resolve()),
		nsfwOnly: true,
	},
]));

// Mock LRUCache and CooldownManager
jest.mock('@/services/manager/LRUCache', () => jest.fn().mockImplementation(() => ({
	get: jest.fn().mockReturnValue([]),
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

// Mock console.log to avoid test output clutter
const originalConsoleLog = console.log;
console.log = jest.fn();

describe('ChatInputCommandValidator', () => {
	// Create mock interaction mocks
	const mockDefer = jest.fn().mockResolvedValue(undefined);
	const mockReply = jest.fn().mockResolvedValue(undefined);
	const mockEditReply = jest.fn().mockResolvedValue(undefined);

	const mockClient = new Client({ intents: [] });

	const createMockInteraction = (
		commandName: string,
		hasPerms = true,
		isNsfw = false,
	): ChatInputCommandInteraction => ({
		commandName,
		user: {
			id: 'user-id',
			tag: 'User#0000',
			username: 'TestUser',
			displayAvatarURL: jest
				.fn()
				.mockImplementation((options) => 'https://example.com/avatar.png'),
		},
		guild: { id: 'guild-id' },
		channel: { nsfw: isNsfw },
		member: {
			permissions: new PermissionsBitField(hasPerms ? ['Administrator'] : []),
		},
		deferReply: mockDefer,
		reply: mockReply,
		editReply: mockEditReply,
		createdTimestamp: Date.now(),
		isChatInputCommand: () => true,
		options: {
			getSubcommand: jest.fn().mockReturnValue(''),
		},
		replied: false,
		deferred: false,
	} as unknown as ChatInputCommandInteraction);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	afterAll(() => {
		// Restore console.log after tests
		console.log = originalConsoleLog;
	});

	it('should handle valid command interaction', async () => {
		const interaction = createMockInteraction('test');
		await commandValidator(mockClient, interaction);

		// For valid commands, the command handler should attempt to process the command
		// Check if either deferReply or reply was called
		expect(
			mockDefer.mock.calls.length > 0 || mockReply.mock.calls.length > 0,
		).toBeTruthy();
	});

	it('should reject interaction for admin-only command without permissions', async () => {
		const interaction = createMockInteraction('admin', false);
		await commandValidator(mockClient, interaction);

		// For commands with missing permissions, should reply with error
		expect(mockReply).toHaveBeenCalled();
	});

	it('should reject nsfw command in non-nsfw channel', async () => {
		const interaction = createMockInteraction('nsfw', true, false);
		await commandValidator(mockClient, interaction);

		// For NSFW commands in non-NSFW channel, should reply with error
		expect(mockReply).toHaveBeenCalled();
	});
});
