import {
  Client,
  ModalSubmitInteraction,
  PermissionsBitField,
} from 'discord.js';
import modalValidator from '@/events/validations/ModalCommandValidator';

// Mock the global errorHandler
global.errorHandler = {
  handleError: jest.fn().mockResolvedValue(undefined),
  initialize: jest.fn(),
};

// Mock the getModals function
jest.mock('@/utils/helpers/getModals', () => jest.fn().mockImplementation(() => [
  {
    customId: 'test_modal',
    run: jest
      .fn()
      .mockImplementation((client, interaction) => {
        interaction.deferReply();
        return Promise.resolve();
      }),
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

// Mock interaction methods
const mockDefer = jest.fn().mockResolvedValue(undefined);
const mockReply = jest.fn().mockResolvedValue(undefined);
const mockEditReply = jest.fn().mockResolvedValue(undefined);

// Create mock client
const mockClient = new Client({ intents: [] });

describe('Modal Validator', () => {
  const createMockInteraction = (customId: string, hasPerms = true): ModalSubmitInteraction => ({
    customId,
    user: {
      id: 'user-id',
      tag: 'User#0000',
      username: 'TestUser',
      displayAvatarURL: jest
        .fn()
        .mockImplementation(() => 'https://example.com/avatar.png'),
    },
    guild: { id: 'guild-id' },
    member: {
      permissions: new PermissionsBitField(hasPerms ? ['Administrator'] : []),
    },
    deferReply: mockDefer,
    reply: mockReply,
    editReply: mockEditReply,
    createdTimestamp: Date.now(),
    isModalSubmit: () => true,
    replied: false,
    deferred: false,
  } as unknown as ModalSubmitInteraction);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle valid modal interaction', async () => {
    const interaction = createMockInteraction('test_modal');
    await modalValidator(mockClient, interaction);

    // For a valid modal, either the deferReply or reply should be called
    const interactionHandled =
      mockDefer.mock.calls.length > 0 || mockReply.mock.calls.length > 0;
    expect(interactionHandled).toBeTruthy();
  });

  it('should reject interaction without proper permissions', async () => {
    const interaction = createMockInteraction('admin_modal', false);
    await modalValidator(mockClient, interaction);

    // For a permissions error, we expect a reply with an error message
    expect(mockReply.mock.calls.length > 0).toBeTruthy();
  });
});
