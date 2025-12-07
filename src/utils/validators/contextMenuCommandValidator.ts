import { config } from '@/config/config';
import mConfig from '@/config/messageConfig';
import cooldownManager from '@/services/manager/CooldownManager';
import LRUCache from '@/services/manager/LRUCache';
import type { LocalContextMenu } from '@/types';
import getLocalContextMenus from '@/utils/helpers/getLocalContextMenus';
import {
	type Client,
	type ColorResolvable,
	EmbedBuilder,
	GuildMember,
	type Interaction,
	type InteractionReplyOptions,
	MessageFlags,
	NewsChannel,
	type PermissionResolvable,
	TextChannel,
} from 'discord.js';

interface ContextMenuMetrics {
	uses: number;
	lastUsed: Date;
	averageResponseTime: number;
	failures: number;
}

class ContextMenuManager {
	private contextMenus: Map<string, LocalContextMenu>;
	private menuCache: LRUCache<string, LocalContextMenu>;
	private metrics: Map<string, ContextMenuMetrics>;
	private isLoaded: boolean;

	constructor() {
		this.contextMenus = new Map();
		this.metrics = new Map();
		this.isLoaded = false;
		this.menuCache = new LRUCache<string, LocalContextMenu>({
			capacity: 1000,
			defaultTTL: 2 * 60 * 60 * 1000, // 2 hour TTL
			cleanupIntervalMs: 15 * 60 * 1000, // Cleanup every 15 minutes
			evictionPolicy: 'LRU',
			resetTTLOnAccess: true,
			onExpiry: async (key): Promise<void> => {
				await this.handleCacheExpiry(key);
			},
		});
	}

	private async handleCacheExpiry(key: string): Promise<void> {
		const metrics = await this.metrics.get(key);
		if (metrics) {
			await Promise.resolve(
				console.log(`Context menu ${key} expired from cache. Usage stats:`, metrics),
			);
		}
	}

	private createEmbed(
		interaction: Interaction,
		color: ColorResolvable,
		description: string,
		options: Partial<InteractionReplyOptions> = {},
	): InteractionReplyOptions {
		const embed = new EmbedBuilder()
			.setColor(color)
			.setDescription(description)
			.setAuthor({
				name: interaction.user.username,
				iconURL: interaction.user.displayAvatarURL({ forceStatic: false }),
			})
			.setTimestamp();

		const { ephemeral, flags, ...rest } = options;
		const finalFlags = ephemeral ? MessageFlags.Ephemeral : flags;

		return {
			embeds: [embed],
			flags: finalFlags,
			...rest,
		};
	}

	private updateMetrics(commandName: string, responseTime: number, failed = false): void {
		const metrics = this.metrics.get(commandName) || {
			uses: 0,
			lastUsed: new Date(),
			averageResponseTime: 0,
			failures: 0,
		};

		metrics.uses++;
		metrics.lastUsed = new Date();
		metrics.averageResponseTime =
			(metrics.averageResponseTime * (metrics.uses - 1) + responseTime) / metrics.uses;
		if (failed) metrics.failures++;

		this.metrics.set(commandName, metrics);
	}

	private async loadContextMenus(retryCount = 0): Promise<void> {
		try {
			const menus = await getLocalContextMenus();
			for (const menu of menus) {
				this.contextMenus.set(menu.data.name, menu);
			}
			this.isLoaded = true;
			console.log(`Successfully loaded ${menus.length} context menus`);
		} catch (error) {
			if (retryCount < 3) {
				await new Promise((resolve) => setTimeout(resolve, 5000));
				return this.loadContextMenus(retryCount + 1);
			}
			throw error;
		}
	}

	private checkPermissions(
		interaction: Interaction,
		permissions: PermissionResolvable[],
		type: 'user' | 'bot',
	): boolean {
		if (!interaction.guild) return false;
		const member = type === 'user' ? interaction.member : interaction.guild.members.me;
		if (!member || !(member instanceof GuildMember)) return false;
		return permissions.every((permission) => member.permissions.has(permission));
	}

	private validateContextMenu(
		menu: LocalContextMenu,
		interaction: Interaction,
	): InteractionReplyOptions | null {
		const { developersId, testServerId } = config;

		if (menu.devOnly && !developersId.includes(interaction.user.id)) {
			return this.createEmbed(interaction, 'Red', mConfig.commandDevOnly, {
				ephemeral: true,
			});
		}

		if (menu.testMode && interaction.guild?.id !== testServerId) {
			return this.createEmbed(interaction, 'Red', mConfig.commandTestMode, {
				ephemeral: true,
			});
		}

		if (menu.nsfwMode) {
			const channel = interaction.channel;
			if (!(channel instanceof TextChannel || channel instanceof NewsChannel) || !channel.nsfw) {
				return this.createEmbed(interaction, 'Red', mConfig.nsfw, {
					ephemeral: true,
				});
			}
		}

		if (
			menu.userPermissions?.length &&
			!this.checkPermissions(interaction, menu.userPermissions, 'user')
		) {
			return this.createEmbed(interaction, 'Red', mConfig.userNoPermissions, {
				ephemeral: true,
			});
		}

		if (
			menu.botPermissions?.length &&
			!this.checkPermissions(interaction, menu.botPermissions, 'bot')
		) {
			return this.createEmbed(interaction, 'Red', mConfig.botNoPermissions, {
				ephemeral: true,
			});
		}

		if (menu.cooldown) {
			if (cooldownManager.isOnCooldown(interaction.user.id, menu.data.name)) {
				const remainingTime = cooldownManager.getRemainingTime(interaction.user.id, menu.data.name);
				return this.createEmbed(
					interaction,
					'Red',
					`Please wait ${remainingTime} seconds before using this menu again.`,
					{ ephemeral: true },
				);
			}
			cooldownManager.setCooldown(interaction.user.id, menu.data.name, menu.cooldown);
		}

		return null;
	}

	public async handleInteraction(client: Client, interaction: Interaction): Promise<void> {
		if (!interaction.isContextMenuCommand()) return;
		if (!this.isLoaded) {
			await this.loadContextMenus();
		}

		const startTime = Date.now();
		const { commandName } = interaction;

		try {
			const menu = this.menuCache.get(commandName) || this.contextMenus.get(commandName);
			if (!menu) {
				await interaction.reply(
					this.createEmbed(interaction, 'Red', 'Context menu not found.', {
						ephemeral: true,
					}),
				);
				return;
			}

			const validationError = this.validateContextMenu(menu, interaction);
			if (validationError) {
				await interaction.reply(validationError);
				return;
			}

			await menu.run(client, interaction);
			this.updateMetrics(commandName, Date.now() - startTime);
			console.log(`Context menu executed: ${commandName} by ${interaction.user.tag}`.green);
		} catch (error) {
			this.updateMetrics(commandName, Date.now() - startTime, true);
			await global.errorHandler.handleError(error, 'ContextMenuExecutionError');

			if (!interaction.replied) {
				await interaction.reply(
					this.createEmbed(interaction, 'Red', 'An error occurred while processing your request.', {
						ephemeral: true,
					}),
				);
			}
		}
	}

	public getMetrics(): Map<string, ContextMenuMetrics> {
		return this.metrics;
	}

	public clearMetrics(): void {
		this.metrics.clear();
	}
}

const contextMenuManager = new ContextMenuManager();

export const contextMenuCommandValidator = async (
	client: Client,
	interaction: Interaction,
): Promise<void> => {
	await contextMenuManager.handleInteraction(client, interaction);
};
