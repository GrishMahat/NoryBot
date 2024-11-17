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
 *
 * @async
 * @function sendEmbedReply
 * @param {Interaction} interaction - The Discord interaction to reply to. Must be repliable.
 * @param {string} color - The color of the embed. Must be a valid hexadecimal color code or
 *                         Discord.js color constants (e.g., 'RANDOM', 'BLUE').
 * @param {string} description - The description text to display inside the embed.
 * @param {boolean} [ephemeral=true] - Whether the reply should be ephemeral (visible only to the user).
 *                                      Defaults to true.
 * @throws {Error} Throws an error if the interaction is not repliable or there are issues
 *                 in sending the embed reply.
 * @returns {Promise<void>} Returns a Promise that resolves when the embed is successfully sent.
 *
 * @example
 * // Sending an ephemeral success message
 * await sendEmbedReply(interaction, '#00FF00', 'Operation successful!', true);
 *
 * @example
 * // Sending a non-ephemeral error message
 * await sendEmbedReply(interaction, 'RED', 'Something went wrong!', false);
 *
 * @example
 * // Using Discord.js color constants for the embed color
 * await sendEmbedReply(interaction, 'BLUE', 'Here is some information.');
 *
 * @example
 * // Handling an interaction that is not repliable
 * try {
 *   await sendEmbedReply(nonRepliableInteraction, '#FF0000', 'You cannot reply to this.');
 * } catch (error) {
 *   console.error('Failed to send reply:', error);
 * }
 *
 * @note
 * - This function checks if the interaction is repliable (e.g., chat commands or slash commands).
 * - If the interaction is not repliable, the function will exit early without throwing an error.
 * - The color of the embed can be provided as a string that represents a valid hexadecimal color
 *   (e.g., `#00FF00` for green) or a Discord.js constant like `'RANDOM'` or `'RED'`.
 * - Ephemeral responses are private, meaning only the user who triggered the interaction can see them.
 * - The author's username and avatar are automatically added to the embed for a personalized touch.
 *
 * @version 0.0.1
 * @since 2023-10-11
 *
 * @dependencies
 * - discord.js: Must be installed and configured to use `EmbedBuilder` and handle Discord interactions.
 *
 * @performance
 * - Since the function relies on the Discord API to send replies, its performance may vary based on
 *   API response times and rate limits.
 *
 * @edge-cases
 * - If the `interaction` is not repliable, the function will exit silently, and no reply will be sent.
 * - If an invalid color string is provided (e.g., an incorrect hex code), Discord.js may throw an error.
 *
 * @related
 * - {@link https://discord.js.org/#/docs/discord.js/main/class/Interaction Interaction}
 * - {@link https://discord.js.org/#/docs/discord.js/main/class/EmbedBuilder EmbedBuilder}
 *
 * @deprecated
 * - No deprecations as of the current version. Future updates may change the default behavior of ephemeral responses.
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

    await interaction.reply({ embeds: [embed], ephemeral });
  } catch (err) {
    console.error('Error sending embed reply:', err);
  }
};

/**
 * Retrieves data from the cache or fetches it if not cached.
 *
 * @param {string} key - The key of the data to retrieve.
 * @param {() => Promise<T>} fetchFunction - The function to fetch the data if not cached.
 * @returns {Promise<T>} A promise that resolves to the data.
 * @template T - The type of the data being cached and retrieved.
 */
const getCachedData = async <T>(
  key: string,
  fetchFunction: () => Promise<T>
): Promise<T> => {
  const cachedItem = cache.get(key);
  if (cachedItem) return cachedItem as T;

  const data = await fetchFunction();
  cache.set(key, data);
  return data;
};

/**
 * Retrieves cached local context menus.
 *
 * @returns {Promise<any[]>} A promise that resolves to the cached local context menus.
 */
const getCachedLocalContextMenus = (): Promise<any[]> =>
  getCachedData('localContextMenus', getLocalContextMenus);

/**
 * Initializes the context menu map with local context menus.
 */
const initializeContextMenuMap = async (): Promise<void> => {
  const localContextMenus = await getCachedLocalContextMenus();
  localContextMenus.forEach((menu) => {
    contextMenuMap.set(menu.data.name, menu);
  });
};

/**
 * Applies a cooldown to a context menu for a user.
 *
 * @param {Interaction} interaction - The interaction to apply the cooldown for.
 * @param {string} contextMenuName - The name of the context menu.
 * @param {number} cooldownAmount - The amount of time in milliseconds for the cooldown.
 * @returns {{active: boolean, timeLeft: string}} An object indicating if the cooldown is active and the time left.
 */
const applyCooldown = (
  interaction: Interaction,
  contextMenuName: string,
  cooldownAmount: number
): { active: boolean; timeLeft?: string } => {
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
};

/**
 * Checks if a member has the required permissions.
 *
 * @param {Interaction} interaction - The interaction to check permissions for.
 * @param {Array<string>} permissions - The required permissions.
 * @param {'user'|'bot'} type - The type of member to check permissions for.
 * @returns {boolean} True if the member has all the required permissions, false otherwise.
 */
const checkPermissions = (
  interaction: Interaction,
  permissions: bigint[],
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

/**
 * The main function to validate and execute context menu commands.
 *
 * @param {Client} client - The Discord client.
 * @param {Interaction} interaction - The interaction to validate and execute.
 */
export default async (
  client: Client,
  interaction: Interaction
): Promise<void> => {
  if (!interaction) {
    return;
  }

  if (!interaction.isContextMenuCommand()) {
    return;
  }

  if (contextMenuMap.size === 0) {
    await initializeContextMenuMap();
  }

  const { developersId, testServerId, maintenance } = config;

  try {
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
    } catch (err) {
      console.error('Error executing context menu:', err);

      await sendEmbedReply(
        interaction,
        mConfig.embedColors.error,
        'An error occurred while executing the context menu.'
      );
    }

    console.log(
      `Context menu executed: ${interaction.commandName} by ${interaction.user.tag}`
        .green
    );
  } catch (err) {
    await sendEmbedReply(
      interaction,
      mConfig.embedColors.error,
      'An error occurred while processing the context menu.'
    );
  }
};
