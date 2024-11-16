import 'colors';
import {
  EmbedBuilder,
  PermissionsBitField,
  Client,
  ModalSubmitInteraction,
  GuildMember,
  ColorResolvable,
  PermissionResolvable,
} from 'discord.js';
import { config } from '../../config/config.js';
import mConfig from '../../config/messageConfig.js';
import getModals from '../../utils/getModals.js';

export interface Modal {
  customId: string;
  cooldown?: number;
  devOnly?: boolean;
  testMode?: boolean;
  userPermissions?: PermissionResolvable[];
  botPermissions?: PermissionResolvable[];
  compiledChecks?: {
    userPermissions: (interaction: ModalSubmitInteraction) => boolean;
    botPermissions: (interaction: ModalSubmitInteraction) => boolean;
  };
  run: (client: Client, interaction: ModalSubmitInteraction) => Promise<void>;
}

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

const modals = new Map<string, Modal>();
const cooldowns = new Map<string, number>();
const modalCache = new LRUCache<string, Modal>(100); // Adjust capacity as needed
let modalsLoaded = false;

const sendEmbedReply = async (
  interaction: ModalSubmitInteraction,
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
  permissions.every((permission) => member.permissions.has(permission));

const loadModals = async (retryCount: number = 0): Promise<void> => {
  try {
    const modalFiles: Modal[] = await getModals();
    for (const modal of modalFiles) {
      modal.compiledChecks = {
        userPermissions: modal.userPermissions
          ? (interaction: ModalSubmitInteraction) =>
              checkPermissions(
                interaction.member as GuildMember,
                modal.userPermissions!
              )
          : () => true,
        botPermissions: modal.botPermissions
          ? (interaction: ModalSubmitInteraction) =>
              checkPermissions(
                interaction.guild!.members.me!,
                modal.botPermissions!
              )
          : () => true,
      };
      modals.set(modal.customId, modal);
    }
    console.log(`Loaded ${modals.size} modals`.green);
    modalsLoaded = true;
  } catch (error) {
    console.error('Error loading modals:'.red, error);

    if (retryCount < 3) {
      console.log(`Retrying modal load... (Attempt ${retryCount + 1})`.yellow);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await loadModals(retryCount + 1);
    } else {
      console.error('Failed to load modals after 3 attempts'.red);
    }
  }
};

const handleModal = async (
  client: Client,
  interaction: ModalSubmitInteraction
): Promise<void> => {
  const { customId } = interaction;
  let modal = modalCache.get(customId);
  if (!modal) {
    modal = modals.get(customId);
    if (modal) modalCache.set(customId, modal);
  }

  if (!modal) return;
  const { developersId, testServerId } = config;

  if (modal.devOnly && !developersId.includes(interaction.user.id)) {
    return sendEmbedReply(interaction, 'Red', mConfig.commandDevOnly, true);
  }

  if (modal.testMode && interaction.guild!.id !== testServerId) {
    return sendEmbedReply(interaction, 'Red', mConfig.commandTestMode, true);
  }

  if (!modal.compiledChecks!.userPermissions(interaction)) {
    return sendEmbedReply(interaction, 'Red', mConfig.userNoPermissions, true);
  }

  if (!modal.compiledChecks!.botPermissions(interaction)) {
    return sendEmbedReply(interaction, 'Red', mConfig.botNoPermissions, true);
  }

  if (modal.cooldown) {
    const cooldownKey = `${interaction.user.id}-${customId}`;
    const cooldownTime = cooldowns.get(cooldownKey);
    if (cooldownTime && Date.now() < cooldownTime) {
      const remainingTime = Math.ceil((cooldownTime - Date.now()) / 1000);
      return sendEmbedReply(
        interaction,
        'Red',
        `Please wait ${remainingTime} seconds before using this modal again.`,
        true
      );
    }
    cooldowns.set(cooldownKey, Date.now() + modal.cooldown * 1000);
  }

  try {
    console.log(
      `Executing modal ${customId} for user ${interaction.user.tag}`.cyan
    );
    await modal.run(client, interaction);
  } catch (error) {
    console.error(`Error executing modal ${customId}:`.red, error);

    sendEmbedReply(
      interaction,
      'Red',
      'There was an error while processing this modal!',
      true
    );
  }
};

export default async (
  client: Client,
  interaction: ModalSubmitInteraction
): Promise<void> => {
  if (!interaction.isModalSubmit()) return;

  if (!modalsLoaded) {
    await loadModals();
  }

  await handleModal(client, interaction);
};
