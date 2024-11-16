import 'colors';
import {
  EmbedBuilder,
  PermissionsBitField,
  Client,
  StringSelectMenuInteraction,
  GuildMember,
  ColorResolvable,
  PermissionResolvable,
} from 'discord.js';
import { config } from '../../config/config.js';
import mConfig from '../../config/messageConfig.js';
import getSelects from '../../utils/getSelects.js';
import { SelectMenu } from '../../types/index.js';

class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map<K, V>();
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    const item = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, item);
    return item;
  }

  set(key: K, value: V): void {
    if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }
}

const selectMenus = new Map<string, SelectMenu>();
const cooldowns = new Map<string, number>();
const selectMenuCache = new LRUCache<string, SelectMenu>(100); // Adjust capacity as needed
let selectMenusLoaded = false;

const sendEmbedReply = async (
  interaction: StringSelectMenuInteraction,
  color: ColorResolvable,
  description: string,
  ephemeral: boolean = true
): Promise<void> => {
  try {
    const embed = new EmbedBuilder()
      .setColor(color)
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

const checkPermissions = (
  member: GuildMember,
  permissions: PermissionResolvable[]
): boolean =>
  permissions.every((permission) =>
    member.permissions.has(
      PermissionsBitField.Flags[
        permission as keyof typeof PermissionsBitField.Flags
      ]
    )
  );

const loadSelectMenus = async (retryCount: number = 0): Promise<void> => {
  try {
    // Load select menus from external source
    const selectMenuFiles: SelectMenu[] = await getSelects();

    for (const selectMenu of selectMenuFiles) {
      // Define compiled permission checks
      selectMenu.compiledChecks = {
        userPermissions: selectMenu.userPermissions
          ? (interaction: StringSelectMenuInteraction) =>
              checkPermissions(
                interaction.member as GuildMember,
                selectMenu.userPermissions || []
              )
          : () => true,

        botPermissions: selectMenu.botPermissions
          ? (interaction: StringSelectMenuInteraction) => {
              // Check if the bot member is available
              const botMember = interaction.guild?.members.me;
              if (!botMember) {
                console.error('Bot member not found in the guild');
                return false;
              }
              return checkPermissions(
                botMember,
                selectMenu.botPermissions || []
              );
            }
          : () => true,
      };
      // Store the select menu in the map
      selectMenus.set(selectMenu.customId, selectMenu);
    }

    console.log(`Loaded ${selectMenus.size} select menus`.green);
    selectMenusLoaded = true;
  } catch (error) {
    console.error('Error loading select menus:'.red, error);

    // Retry logic if it fails
    if (retryCount < 3) {
      console.log(
        `Retrying select menu load... (Attempt ${retryCount + 1})`.yellow
      );
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait for 5 seconds before retrying
      await loadSelectMenus(retryCount + 1); // Recursive retry
    } else {
      console.error('Failed to load select menus after 3 attempts'.red);
    }
  }
};


const handleSelectMenu = async (
  client: Client,
  interaction: StringSelectMenuInteraction
): Promise<void> => {
  const { customId } = interaction;
  let selectMenu = selectMenuCache.get(customId);
  if (!selectMenu) {
    selectMenu = selectMenus.get(customId);
    if (selectMenu) selectMenuCache.set(customId, selectMenu);
  }

  if (!selectMenu) return;
  const { developersId, testServerId } = config;

  if (selectMenu.devOnly && !developersId.includes(interaction.user.id)) {
    return sendEmbedReply(interaction, 'Red', mConfig.commandDevOnly, true);
  }

  if (selectMenu.testMode && interaction.guild!.id !== testServerId) {
    return sendEmbedReply(interaction, 'Red', mConfig.commandTestMode, true);
  }

  if (!selectMenu.compiledChecks!.userPermissions(interaction)) {
    return sendEmbedReply(interaction, 'Red', mConfig.userNoPermissions, true);
  }

  if (!selectMenu.compiledChecks!.botPermissions(interaction)) {
    return sendEmbedReply(interaction, 'Red', mConfig.botNoPermissions, true);
  }

  if (
    interaction.message.interaction &&
    interaction.message.interaction.user.id !== interaction.user.id
  ) {
    return sendEmbedReply(interaction, 'Red', mConfig.cannotUseSelect, true); // Changed to 'cannotUseSelect'
  }

  if (selectMenu.cooldown) {
    const cooldownKey = `${interaction.user.id}-${customId}`;
    const cooldownTime = cooldowns.get(cooldownKey);
    if (cooldownTime && Date.now() < cooldownTime) {
      const remainingTime = Math.ceil((cooldownTime - Date.now()) / 1000);
      return sendEmbedReply(
        interaction,
        'Red',
        `Please wait ${remainingTime} seconds before using this select menu again.`,
        true
      );
    }
    cooldowns.set(cooldownKey, Date.now() + selectMenu.cooldown * 1000);
  }

  try {
    console.log(
      `Executing select menu ${customId} for user ${interaction.user.tag}`.cyan
    );
    await selectMenu.run(client, interaction);
  } catch (error) {
    console.error(`Error executing select menu ${customId}:`.red, error);

    sendEmbedReply(
      interaction,
      'Red',
      'There was an error while executing this select menu!',
      true
    );
  }
};

export default async (
  client: Client,
  interaction: StringSelectMenuInteraction
): Promise<void> => {
  if (!interaction.isStringSelectMenu()) return;

  if (!selectMenusLoaded) {
    await loadSelectMenus();
  }

  await handleSelectMenu(client, interaction);
};
