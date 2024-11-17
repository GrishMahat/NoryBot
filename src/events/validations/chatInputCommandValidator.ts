import 'colors';
import {
  EmbedBuilder,
  Client,
  Interaction,
  ColorResolvable,
  PermissionsBitField,
  TextChannel,
  NewsChannel,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  PermissionResolvable,
} from 'discord.js';
import { config } from '../../config/config.js';
import mConfig from '../../config/messageConfig.js';
import getLocalCommands from '../../utils/getLocalCommands.js';
import LRUCache from '../../utils/Cache/LRUCache.js';
import { LocalCommand } from '../../types/index.js';
import cooldownManager from '../../utils/CooldownManager.js';

const commandMap = new Map<string, LocalCommand>();

const commandCache = new LRUCache<string, LocalCommand>({
  capacity: 100,
  defaultTTL: 60000, // 1 minute TTL
  cleanupIntervalMs: 30000, // Cleanup every 30 seconds
  evictionPolicy: 'LRU',
  resetTTLOnAccess: true,
  onExpiry: (key, value) => {},
});

const sendEmbedReply = async (
  interaction: Interaction,
  color: string,
  description: string,
  ephemeral: boolean = true
): Promise<void> => {
  try {
    if (!interaction.isRepliable()) return;
    const embed = new EmbedBuilder()
      .setColor(color as ColorResolvable)
      .setDescription(description)
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL({ forceStatic: false }),
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral });
  } catch (err) {
    console.error('Error sending embed reply:', err);
  }
};

const getCachedData = async <T>(
  key: string,
  fetchFunction: () => Promise<T>
): Promise<T> => {
  try {
    const cachedItem = commandCache.get(key);
    if (cachedItem) return cachedItem as T;

    const data = await fetchFunction();
    commandCache.set(key, data as LocalCommand);
    return data;
  } catch (error) {
    console.error('Cache operation failed:', error);
    return fetchFunction(); // Fallback to direct fetch
  }
};

const getCachedLocalCommands = (): Promise<LocalCommand[]> =>
  getCachedData('localCommands', getLocalCommands);

const initializeCommandMap = async (): Promise<void> => {
  const localCommands = await getCachedLocalCommands();
  localCommands.forEach((cmd) => {
    commandMap.set(cmd.data.name, cmd);
  });
};

const checkPermissions = (
  interaction: Interaction,
  permissions: PermissionResolvable[],
  type: 'user' | 'bot'
): boolean => {
  if (!interaction.guild) return false;
  const member =
    type === 'user' ? interaction.member : interaction.guild.members.me;
  if (!member) return false;
  if (typeof member.permissions === 'string') return false;
  return permissions.every((permission) =>
    (member.permissions as Readonly<PermissionsBitField>).has(permission)
  );
};

export default async (
  client: Client,
  interaction: Interaction
): Promise<void> => {
  if (!interaction) {
    return;
  }

  if (!interaction.isChatInputCommand() && !interaction.isAutocomplete()) {
    return;
  }

  if (commandMap.size === 0) {
    await initializeCommandMap();
  }

  const { developersId, testServerId, maintenance } = config;

  try {
    const commandObject = commandMap.get(interaction.commandName);

    if (!commandObject) {
      return sendEmbedReply(
        interaction,
        mConfig.embedColors.error,
        'Command not found.'
      );
    }

    if (interaction.isAutocomplete() && commandObject.autocomplete) {
      return await commandObject.autocomplete(client, interaction);
    }

    if (maintenance && !developersId.includes(interaction.user.id)) {
      return sendEmbedReply(
        interaction,
        mConfig.embedColors.error,
        'Bot is currently in maintenance mode. Please try again later.'
      );
    }

    // Check cooldown using CooldownManager
    const remainingCooldown = cooldownManager.checkCooldown(
      interaction.user.id,
      commandObject.data.name
    );

    if (remainingCooldown > 0) {
      return sendEmbedReply(
        interaction,
        mConfig.embedColors.error,
        mConfig.commandCooldown.replace('{time}', remainingCooldown.toString())
      );
    }

    // Set cooldown if passed check
    cooldownManager.setCooldown(
      interaction.user.id,
      commandObject.data.name,
      commandObject.cooldown || 3
    );

    if (commandObject.devOnly && !developersId.includes(interaction.user.id)) {
      return sendEmbedReply(
        interaction,
        mConfig.embedColors.error,
        mConfig.commandDevOnly
      );
    }

    if (commandObject.testMode && interaction.guild?.id !== testServerId) {
      return sendEmbedReply(
        interaction,
        mConfig.embedColors.error,
        mConfig.commandTestMode
      );
    }

    if (commandObject.nsfwMode) {
      const channel = interaction.channel;
      if (
        !(channel instanceof TextChannel || channel instanceof NewsChannel) ||
        !channel.nsfw
      ) {
        return sendEmbedReply(
          interaction,
          mConfig.embedColors.error,
          mConfig.nsfw
        );
      }
    }

    if (
      commandObject.userPermissions?.length &&
      !checkPermissions(interaction, commandObject.userPermissions, 'user')
    ) {
      return sendEmbedReply(
        interaction,
        mConfig.embedColors.error,
        mConfig.userNoPermissions
      );
    }

    if (
      commandObject.botPermissions?.length &&
      !checkPermissions(interaction, commandObject.botPermissions, 'bot')
    ) {
      return sendEmbedReply(
        interaction,
        mConfig.embedColors.error,
        mConfig.botNoPermissions
      );
    }

    try {
      if (interaction.isChatInputCommand()) {
        await commandObject.run(client, interaction);
      }
    } catch (err) {
      console.error('Error executing command:', err);

      await sendEmbedReply(
        interaction,
        mConfig.embedColors.error,
        'An error occurred while executing the command.'
      );
    }

    console.log(
      `Command executed: ${interaction.commandName} by ${interaction.user.tag}`
        .green
    );
  } catch (err) {
    await sendEmbedReply(
      interaction,
      mConfig.embedColors.error,
      'An error occurred while processing the command.'
    );
  }
};
