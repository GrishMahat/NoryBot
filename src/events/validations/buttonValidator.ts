import 'colors';
import {
  EmbedBuilder,
  PermissionsBitField,
  Client,
  ButtonInteraction,
  GuildMember,
  ColorResolvable,
  PermissionResolvable,
} from 'discord.js';
import { config } from '../../config/config.js';
import mConfig from '../../config/messageConfig.js';
import getButtons from '../../utils/getButtons.js';
import { Button } from '../../types/index.js';


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

const buttons = new Map<string, Button>();
const cooldowns = new Map<string, number>();
const buttonCache = new LRUCache<string, Button>(100); // Adjust capacity as needed
let buttonsLoaded = false;

const sendEmbedReply = async (
  interaction: ButtonInteraction,
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

const loadButtons = async (
  retryCount: number = 0
): Promise<void> => {
  try {
    const buttonFiles: Button[] = await getButtons();
    for (const button of buttonFiles) {
      button.compiledChecks = {
        userPermissions: button.userPermissions
          ? (interaction: ButtonInteraction) =>
              checkPermissions(
                interaction.member as GuildMember,
                button.userPermissions!
              )
          : () => true,
        botPermissions: button.botPermissions
          ? (interaction: ButtonInteraction) =>
              checkPermissions(
                interaction.guild!.members.me!,
                button.botPermissions!
              )
          : () => true,
      };
      buttons.set(button.customId, button);
    }
    console.log(`Loaded ${buttons.size} buttons`.green);
    buttonsLoaded = true;
  } catch (error) {
    console.error('Error loading buttons:'.red, error);

    if (retryCount < 3) {
      console.log(`Retrying button load... (Attempt ${retryCount + 1})`.yellow);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await loadButtons( retryCount + 1);
    } else {
      console.error('Failed to load buttons after 3 attempts'.red);
    }
  }
};

const handleButton = async (
  client: Client,
  interaction: ButtonInteraction
): Promise<void> => {
  const { customId } = interaction;
  let button = buttonCache.get(customId);
  if (!button) {
    button = buttons.get(customId);
    if (button) buttonCache.set(customId, button);
  }

  if (!button) return;
  const { developersId, testServerId } = config;

  if (button.devOnly && !developersId.includes(interaction.user.id)) {
    return sendEmbedReply(interaction, 'Red', mConfig.commandDevOnly, true);
  }

  if (button.testMode && interaction.guild!.id !== testServerId) {
    return sendEmbedReply(interaction, 'Red', mConfig.commandTestMode, true);
  }

  if (!button.compiledChecks!.userPermissions(interaction)) {
    return sendEmbedReply(interaction, 'Red', mConfig.userNoPermissions, true);
  }

  if (!button.compiledChecks!.botPermissions(interaction)) {
    return sendEmbedReply(interaction, 'Red', mConfig.botNoPermissions, true);
  }

  if (
    interaction.message.interaction &&
    interaction.message.interaction.user.id !== interaction.user.id
  ) {
    return sendEmbedReply(interaction, 'Red', mConfig.cannotUseButton, true);
  }

  if (button.cooldown) {
    const cooldownKey = `${interaction.user.id}-${customId}`;
    const cooldownTime = cooldowns.get(cooldownKey);
    if (cooldownTime && Date.now() < cooldownTime) {
      const remainingTime = Math.ceil((cooldownTime - Date.now()) / 1000);
      return sendEmbedReply(
        interaction,
        'Red',
        `Please wait ${remainingTime} seconds before using this button again.`,
        true
      );
    }
    cooldowns.set(cooldownKey, Date.now() + button.cooldown * 1000);
  }

  try {
    console.log(
      `Executing button ${customId} for user ${interaction.user.tag}`.cyan
    );
    await button.run(client, interaction);
  } catch (error) {
    console.error(`Error executing button ${customId}:`.red, error);

    sendEmbedReply(
      interaction,
      'Red',
      'There was an error while executing this button!',
      true
    );
  }
};

export default async (
  client: Client,
  interaction: ButtonInteraction
): Promise<void> => {
  if (!interaction.isButton()) return;

  if (!buttonsLoaded) {
    await loadButtons();
  }

  await handleButton(client, interaction);
};
