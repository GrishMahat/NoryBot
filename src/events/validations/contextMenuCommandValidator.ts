import 'colors';
import {
  EmbedBuilder,
  Collection,
  Client,
  Interaction,
  ColorResolvable,
  PermissionsBitField,
  TextChannel,
  NewsChannel,
  MessageFlags,
} from 'discord.js';
import { config } from '../../config/config.js';
import mConfig from '../../config/messageConfig.js';
import getLocalContextMenus from '../../utils/getLocalContextMenus.js';

/**
 * A simple LRU Cache implementation.
 *
 * @class LRUCache<K, V>
 * @template K - The type of the keys in the cache.
 * @template V - The type of the values in the cache.
 */
class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map<K, V>();
  }

  /**
   * Retrieves a value from the cache by its key.
   *
   * @param {K} key - The key of the value to retrieve.
   * @returns {V | undefined} The value associated with the key or undefined if not found.
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  /**
   * Sets a value in the cache by its key.
   *
   * @param {K} key - The key of the value to set.
   * @param {V} value - The value to set.
   */
  set(key: K, value: V): void {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.capacity) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}

const cache = new LRUCache<string, any>(100); // Adjust capacity as needed
const cooldowns = new Collection<string, Collection<string, number>>();
const permissionLevels = new Collection<string, number>();
const contextMenuMap = new Map<string, any>();

/**
 * Sends an embed reply to a Discord interaction. The embed includes a color, a description,
 * the author's username, their avatar, and a timestamp. It supports ephemeral (hidden) responses.
 * This function handles errors gracefully by catching and logging any issues that occur during
 * the reply process.
 */
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

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  } catch (err) {
    await global.errorHandler.handleError(err, 'EmbedReplyError');
  }
};

/**
 * Retrieves data from the cache or fetches it if not cached.
 */
const getCachedData = async <T>(
  key: string,
  fetchFunction: () => Promise<T>
): Promise<T> => {
  try {
    const cachedItem = cache.get(key);
    if (cachedItem) return cachedItem as T;

    const data = await fetchFunction();
    cache.set(key, data);
    return data;
  } catch (err) {
    await global.errorHandler.handleError(err, 'CacheError');
    throw err;
  }
};

/**
 * Retrieves cached local context menus.
 */
const getCachedLocalContextMenus = (): Promise<any[]> =>
  getCachedData('localContextMenus', getLocalContextMenus);

/**
 * Initializes the context menu map with local context menus.
 */
const initializeContextMenuMap = async (): Promise<void> => {
  try {
    const localContextMenus = await getCachedLocalContextMenus();
    localContextMenus.forEach((menu) => {
      contextMenuMap.set(menu.data.name, menu);
    });
  } catch (err) {
    await global.errorHandler.handleError(err, 'ContextMenuInitError');
  }
};

/**
 * Applies a cooldown to a context menu for a user.
 */
const applyCooldown = (
  interaction: Interaction,
  contextMenuName: string,
  cooldownAmount: number
): { active: boolean; timeLeft?: string } => {
  try {
    if (isNaN(cooldownAmount) || cooldownAmount <= 0) {
      throw new Error('Invalid cooldown amount');
    }

    const userCooldowns =
      cooldowns.get(contextMenuName) || new Collection<string, number>();
    const now = Date.now();
    const userId = `${interaction.user.id}-${
      interaction.guild ? interaction.guild.id : 'DM'
    }`;

    if (userCooldowns.has(userId)) {
      const expirationTime = userCooldowns.get(userId)! + cooldownAmount;
      if (now < expirationTime) {
        return {
          active: true,
          timeLeft: ((expirationTime - now) / 1000).toFixed(1),
        };
      }
    }

    userCooldowns.set(userId, now);
    setTimeout(() => userCooldowns.delete(userId), cooldownAmount);
    cooldowns.set(contextMenuName, userCooldowns);
    return { active: false };
  } catch (err) {
    global.errorHandler.handleError(err, 'CooldownError');
    return { active: false };
  }
};

/**
 * Checks if a member has the required permissions.
 */
const checkPermissions = (
  interaction: Interaction,
  permissions: bigint[],
  type: 'user' | 'bot'
): boolean => {
  try {
    if (!interaction.guild) return false;
    const member =
      type === 'user' ? interaction.member : interaction.guild.members.me;
    if (!member) return false;
    if (typeof member.permissions === 'string') return false;
    return permissions.every((permission) =>
      (member.permissions as Readonly<PermissionsBitField>).has(permission)
    );
  } catch (err) {
    global.errorHandler.handleError(err, 'PermissionCheckError');
    return false;
  }
};

/**
 * The main function to validate and execute context menu commands.
 */
export default async (
  client: Client,
  interaction: Interaction
): Promise<void> => {
  try {
    if (!interaction || !interaction.isContextMenuCommand()) {
      return;
    }

    if (contextMenuMap.size === 0) {
      await initializeContextMenuMap();
    }

    const { developersId, testServerId, maintenance } = config;

    const contextMenuObject = contextMenuMap.get(interaction.commandName);
    if (!contextMenuObject) {
      return sendEmbedReply(
        interaction,
        mConfig.embedColors.error,
        'Context menu not found.'
      );
    }

    if (maintenance && !developersId.includes(interaction.user.id)) {
      return sendEmbedReply(
        interaction,
        mConfig.embedColors.error,
        'Bot is currently in maintenance mode. Please try again later.'
      );
    }

    const cooldown = applyCooldown(
      interaction,
      contextMenuObject.data.name,
      (contextMenuObject.cooldown || 3) * 1000
    );
    if (cooldown.active) {
      return sendEmbedReply(
        interaction,
        mConfig.embedColors.error,
        mConfig.commandCooldown.replace('{time}', cooldown.timeLeft!)
      );
    }

    if (
      contextMenuObject.devOnly &&
      !developersId.includes(interaction.user.id)
    ) {
      return sendEmbedReply(
        interaction,
        mConfig.embedColors.error,
        mConfig.commandDevOnly
      );
    }

    if (contextMenuObject.testMode && interaction.guild?.id !== testServerId) {
      return sendEmbedReply(
        interaction,
        mConfig.embedColors.error,
        mConfig.commandTestMode
      );
    }

    if (contextMenuObject.nsfwMode) {
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
      contextMenuObject.userPermissions?.length &&
      !checkPermissions(interaction, contextMenuObject.userPermissions, 'user')
    ) {
      return sendEmbedReply(
        interaction,
        mConfig.embedColors.error,
        mConfig.userNoPermissions
      );
    }

    if (
      contextMenuObject.botPermissions?.length &&
      !checkPermissions(interaction, contextMenuObject.botPermissions, 'bot')
    ) {
      return sendEmbedReply(
        interaction,
        mConfig.embedColors.error,
        mConfig.botNoPermissions
      );
    }

    try {
      await contextMenuObject.run(client, interaction);
      console.log(
        `Context menu executed: ${interaction.commandName} by ${interaction.user.tag}`
          .green
      );
    } catch (err) {
      await global.errorHandler.handleError(err, 'ContextMenuExecutionError');
      await sendEmbedReply(
        interaction,
        mConfig.embedColors.error,
        'An error occurred while executing the context menu.'
      );
    }
  } catch (err) {
    await global.errorHandler.handleError(err, 'ContextMenuValidationError');
    await sendEmbedReply(
      interaction,
      mConfig.embedColors.error,
      'An error occurred while processing the context menu.'
    );
  }
};
