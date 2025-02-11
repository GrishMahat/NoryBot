import {
  EmbedBuilder,
  PermissionsBitField,
  Client,
  ButtonInteraction,
  GuildMember,
  ColorResolvable,
  PermissionResolvable,
  MessageFlags,
  InteractionReplyOptions,
} from 'discord.js';
import { config } from '../../config/config.js';
import mConfig from '../../config/messageConfig.js';
import getButtons from '../../utils/getButtons.js';
import { Button } from '../../types/index.js';
import LRUCache from '../../utils/Cache/LRUCache.js';
import cooldownManager from '../../utils/CooldownManager.js';

// Enhanced button interface
interface ButtonMetrics {
  uses: number;
  lastUsed: Date;
  averageResponseTime: number;
  failures: number;
}

class ButtonManager {
  private buttons: Map<string, Button>;
  private buttonCache: LRUCache<string, Button>;
  private metrics: Map<string, ButtonMetrics>;
  private isLoaded: boolean;

  constructor() {
    this.buttons = new Map();
    this.metrics = new Map();
    this.isLoaded = false;
    this.buttonCache = new LRUCache<string, Button>({
      capacity: 1000,
      defaultTTL: 2 * 60 * 60 * 1000, // 2 hour TTL
      cleanupIntervalMs: 15 * 60 * 1000, // Cleanup every 15 minutes
      evictionPolicy: 'LRU',
      resetTTLOnAccess: true,
      onExpiry: (key) => this.handleCacheExpiry(key),
    });
  }

  private async handleCacheExpiry(key: string): Promise<void> {
    const metrics = this.metrics.get(key);
    if (metrics) {
      console.log(`Button ${key} expired from cache. Usage stats:`, metrics);
    }
  }

  private async createEmbed(
    interaction: ButtonInteraction,
    color: ColorResolvable,
    description: string,
    options: Partial<InteractionReplyOptions> = {}
  ): Promise<InteractionReplyOptions> {
    const embed = new EmbedBuilder()
      .setColor(color)
      .setDescription(description)
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL({ forceStatic: false }),
      })
      .setTimestamp();

    return {
      embeds: [embed],
      flags: options.ephemeral ? MessageFlags.Ephemeral : undefined,
      ...options,
    };
  }

  private updateMetrics(
    customId: string,
    responseTime: number,
    failed: boolean = false
  ): void {
    let metrics = this.metrics.get(customId) || {
      uses: 0,
      lastUsed: new Date(),
      averageResponseTime: 0,
      failures: 0,
    };

    metrics.uses++;
    metrics.lastUsed = new Date();
    metrics.averageResponseTime =
      (metrics.averageResponseTime * (metrics.uses - 1) + responseTime) /
      metrics.uses;
    if (failed) metrics.failures++;

    this.metrics.set(customId, metrics);
  }

  public async loadButtons(retryCount: number = 0): Promise<void> {
    try {
      const buttonFiles = await getButtons();
      for (const button of buttonFiles) {
        this.registerButton(button);
      }
      this.isLoaded = true;
      console.log(`Successfully loaded ${buttonFiles.length} buttons`);
    } catch (error) {
      if (retryCount < 3) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return this.loadButtons(retryCount + 1);
      }
      throw error;
    }
  }

  private registerButton(button: Button): void {
    button.compiledChecks = {
      userPermissions: button.userPermissions
        ? (interaction: ButtonInteraction) =>
            this.checkPermissions(
              interaction.member as GuildMember,
              button.userPermissions!
            )
        : () => true,
      botPermissions: button.botPermissions
        ? (interaction: ButtonInteraction) =>
            this.checkPermissions(
              interaction.guild!.members.me!,
              button.botPermissions!
            )
        : () => true,
    };
    this.buttons.set(button.customId, button);
  }

  private checkPermissions(
    member: GuildMember,
    permissions: PermissionResolvable[]
  ): boolean {
    return permissions.every((permission) =>
      member.permissions.has(
        PermissionsBitField.Flags[
          permission as keyof typeof PermissionsBitField.Flags
        ]
      )
    );
  }

  public async handleInteraction(
    client: Client,
    interaction: ButtonInteraction
  ): Promise<void> {
    if (!this.isLoaded) {
      await this.loadButtons();
    }

    const startTime = Date.now();
    const { customId } = interaction;

    try {
      const button =
        this.buttonCache.get(customId) || this.buttons.get(customId);
      if (!button) {
        await interaction.reply(
          await this.createEmbed(
            interaction,
            'Red',
            'This button is no longer valid.',
            { ephemeral: true }
          )
        );
        return;
      }

      // Validate button usage
      const validationError = await this.validateButtonUse(button, interaction);
      if (validationError) {
        await interaction.reply(validationError);
        return;
      }

      // Execute button logic
      await button.run(client, interaction);

      // Update metrics
      this.updateMetrics(customId, Date.now() - startTime);
    } catch (error) {
      this.updateMetrics(customId, Date.now() - startTime, true);
      await global.errorHandler.handleError(error, 'ButtonExecutionError');

      await interaction.reply(
        await this.createEmbed(
          interaction,
          'Red',
          'An error occurred while processing your request.',
          { ephemeral: true }
        )
      );
    }
  }

  private async validateButtonUse(
    button: Button,
    interaction: ButtonInteraction
  ): Promise<InteractionReplyOptions | null> {
    const { developersId, testServerId } = config;

    // Dev-only check
    if (button.devOnly && !developersId.includes(interaction.user.id)) {
      return this.createEmbed(interaction, 'Red', mConfig.commandDevOnly, {
        ephemeral: true,
      });
    }

    // Test mode check
    if (button.testMode && interaction.guild!.id !== testServerId) {
      return this.createEmbed(interaction, 'Red', mConfig.commandTestMode, {
        ephemeral: true,
      });
    }

    // Permission checks
    if (!button.compiledChecks!.userPermissions(interaction)) {
      return this.createEmbed(interaction, 'Red', mConfig.userNoPermissions, {
        ephemeral: true,
      });
    }

    if (!button.compiledChecks!.botPermissions(interaction)) {
      return this.createEmbed(interaction, 'Red', mConfig.botNoPermissions, {
        ephemeral: true,
      });
    }

    // Original user check
    if (
      interaction.message.interaction &&
      interaction.message.interaction.user.id !== interaction.user.id
    ) {
      return this.createEmbed(interaction, 'Red', mConfig.cannotUseButton, {
        ephemeral: true,
      });
    }

    // Cooldown check
    if (button.cooldown) {
      if (cooldownManager.isOnCooldown(interaction.user.id, button.customId)) {
        const remainingTime = cooldownManager.getRemainingTime(
          interaction.user.id,
          button.customId
        );
        return this.createEmbed(
          interaction,
          'Red',
          `Please wait ${remainingTime} seconds before using this button again.`,
          { ephemeral: true }
        );
      }
      cooldownManager.setCooldown(
        interaction.user.id,
        button.customId,
        button.cooldown
      );
    }

    return null;
  }

  public getMetrics(): Map<string, ButtonMetrics> {
    return this.metrics;
  }

  public clearMetrics(): void {
    this.metrics.clear();
  }
}

// Export a singleton instance
const buttonManager = new ButtonManager();

export default async (
  client: Client,
  interaction: ButtonInteraction
): Promise<void> => {
  if (!interaction.isButton()) return;
  await buttonManager.handleInteraction(client, interaction);
};
