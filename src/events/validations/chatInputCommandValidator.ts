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
	PermissionResolvable,
	InteractionReplyOptions,
	Colors,
} from 'discord.js';
import { config } from '../../config/config';
import mConfig from '../../config/messageConfig';
import getLocalCommands from '../../utils/helpers/getLocalCommands';
import LRUCache from '../../services/manager/LRUCache';
import { LocalCommand } from '../../types/index';
import cooldownManager from '../../services/manager/CooldownManager';

interface CommandMetrics {
	uses: number;
	lastUsed: Date;
	averageResponseTime: number;
	failures: number;
}

class CommandValidator {
	private commandMap: Map<string, LocalCommand>;
	private commandCache: LRUCache<string, LocalCommand[]>;
	private metrics: Map<string, CommandMetrics>;
	private isInitialized: boolean;

	constructor() {
		this.commandMap = new Map();
		this.metrics = new Map();
		this.isInitialized = false;
		this.commandCache = new LRUCache<string, LocalCommand[]>({
			capacity: 1000,
			defaultTTL: 2 * 60 * 60 * 1000, // 2 hour TTL
			cleanupIntervalMs: 15 * 60 * 1000, // Cleanup every 15 minutes
			evictionPolicy: 'LRU',
			resetTTLOnAccess: true,
			onExpiry: (key): Promise<void> => this.handleCacheExpiry(key),
		});
	}

	private async handleCacheExpiry(key: string): Promise<void> {
		const metrics = await this.metrics.get(key);
		if (metrics) {
			console.log(`Command ${key} expired from cache. Usage stats:`, metrics);
		}
	}

	private createEmbed(
		interaction: Interaction,
		color: ColorResolvable,
		description: string,
		options: Partial<InteractionReplyOptions> = {},
	): InteractionReplyOptions {
		return {
			embeds: [
				new EmbedBuilder()
					.setColor(color)
					.setDescription(description)
					.setAuthor({
						name: interaction.user.username,
						iconURL: interaction.user.displayAvatarURL({
							forceStatic: false,
						}),
					})
					.setTimestamp(),
			],
			ephemeral: options.ephemeral ?? true,
			...options,
		};
	}

	private updateMetrics(
		commandName: string,
		responseTime: number,
		failed: boolean = false,
	): void {
		const metrics = this.metrics.get(commandName) || {
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

		this.metrics.set(commandName, metrics);
	}

	private async initializeCommands(): Promise<void> {
		try {
			const localCommands = await this.getCachedLocalCommands();
			localCommands.forEach((cmd) => {
				this.commandMap.set(cmd.data.name, cmd);
			});
			this.isInitialized = true;
		} catch (error) {
			await global.errorHandler.handleError(
				error,
				'CommandInitializationError',
			);
			throw error;
		}
	}

	private async getCachedLocalCommands(): Promise<LocalCommand[]> {
		const cachedCommands = this.commandCache.get('localCommands');
		if (cachedCommands) return cachedCommands;

		const commands = await getLocalCommands();
		this.commandCache.set('localCommands', commands);
		return commands;
	}

	private checkPermissions(
		interaction: Interaction,
		permissions: PermissionResolvable[],
		type: 'user' | 'bot',
	): boolean {
		if (!interaction.guild) return false;
		const member =
			type === 'user' ? interaction.member : interaction.guild.members.me;
		if (!member) return false;
		if (typeof member.permissions === 'string') return false;
		return permissions.every((permission) =>
			(member.permissions as Readonly<PermissionsBitField>).has(permission),
		);
	}

	private validateCommand(
		interaction: ChatInputCommandInteraction,
		command: LocalCommand,
	): InteractionReplyOptions | null {
		const { developersId, testServerId, maintenance } = config;

		if (maintenance && !developersId.includes(interaction.user.id)) {
			return this.createEmbed(
				interaction,
				Colors.Red,
				'Bot is currently in maintenance mode. Please try again later.',
			);
		}

		const remainingCooldown = cooldownManager.checkCooldown(
			interaction.user.id,
			command.data.name,
		);
		if (remainingCooldown > 0) {
			return this.createEmbed(
				interaction,
				Colors.Red,
				mConfig.commandCooldown.replace('{time}', remainingCooldown.toString()),
			);
		}

		if (command.devOnly && !developersId.includes(interaction.user.id)) {
			return this.createEmbed(interaction, Colors.Red, mConfig.commandDevOnly);
		}

		if (command.testMode && interaction.guild?.id !== testServerId) {
			return this.createEmbed(interaction, Colors.Red, mConfig.commandTestMode);
		}

		if (
			command.nsfwMode &&
			!(
				interaction.channel instanceof TextChannel ||
				interaction.channel instanceof NewsChannel
			)
		) {
			return this.createEmbed(interaction, Colors.Red, mConfig.nsfw);
		}

		if (
			command.userPermissions?.length &&
			!this.checkPermissions(interaction, command.userPermissions, 'user')
		) {
			return this.createEmbed(
				interaction,
				Colors.Red,
				mConfig.userNoPermissions,
			);
		}

		if (
			command.botPermissions?.length &&
			!this.checkPermissions(interaction, command.botPermissions, 'bot')
		) {
			return this.createEmbed(
				interaction,
				Colors.Red,
				mConfig.botNoPermissions,
			);
		}

		return null;
	}

	public async handleInteraction(
		client: Client,
		interaction: Interaction,
	): Promise<void> {
		if (!interaction.isChatInputCommand() && !interaction.isAutocomplete()) {
			return;
		}

		if (!this.isInitialized) {
			await this.initializeCommands();
		}

		const startTime = Date.now();
		const commandName = interaction.commandName;

		try {
			const command = this.commandMap.get(commandName);
			if (!command) {
				if (interaction.isChatInputCommand()) {
					await interaction.reply(
						this.createEmbed(interaction, Colors.Red, 'Command not found.'),
					);
				}
				return;
			}

			if (interaction.isChatInputCommand()) {
				const validationError = this.validateCommand(interaction, command);
				if (validationError) {
					await interaction.reply(validationError);
					return;
				}

				cooldownManager.setCooldown(
					interaction.user.id,
					command.data.name,
					command.cooldown || 3,
				);

				await command.run(client, interaction);
				this.updateMetrics(commandName, Date.now() - startTime);

				console.log(
					`Command executed: ${commandName} by ${interaction.user.tag}`.green,
				);
			}
		} catch (error) {
			this.updateMetrics(commandName, Date.now() - startTime, true);
			await global.errorHandler.handleError(error, 'CommandExecutionError');

			if (interaction.isChatInputCommand() && !interaction.replied) {
				await interaction.reply(
					this.createEmbed(
						interaction,
						Colors.Red,
						'An error occurred while executing the command.',
					),
				);
			}
		}
	}

	public getMetrics(): Map<string, CommandMetrics> {
		return this.metrics;
	}

	public clearMetrics(): void {
		this.metrics.clear();
	}
}

const commandValidator = new CommandValidator();

export default async (
	client: Client,
	interaction: Interaction,
): Promise<void> => {
	await commandValidator.handleInteraction(client, interaction);
};
