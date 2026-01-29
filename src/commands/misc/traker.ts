import axios from 'axios';
import {
	ApplicationIntegrationType,
	ChannelType,
	type ChatInputCommandInteraction,
	type Client,
	EmbedBuilder,
	InteractionContextType,
	MessageFlags,
	SlashCommandBuilder,
} from 'discord.js';
import HypixelSkyBlockConfig, {
	type IApiKeyEntry,
	type IHypixelSkyBlockConfig,
} from '@/database/schemas/hypixelSkyBlockSchema';
import HypixelTracker from '@/database/schemas/hypixelTrackerSchema';
import type { Command } from '@/types';

const normalizePlayerInput = (value: string): string => value.trim();
const uuidRegex = /^[0-9a-f]{32}$/i;

const normalizeUuid = (value: string): string => value.replace(/-/g, '').toLowerCase();

const HYPIXEL_STATUS_ENDPOINT = 'https://api.hypixel.net/status';

const resolveUuid = async (
	playerInput: string,
): Promise<{ uuid: string; name?: string } | null> => {
	const normalized = normalizeUuid(playerInput);
	if (uuidRegex.test(normalized)) {
		return { uuid: normalized };
	}

	const response = await axios.get<{ id: string; name: string }>(
		`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(playerInput)}`,
		{ timeout: 8000, validateStatus: () => true },
	);

	if (response.status !== 200 || !response.data?.id) {
		return null;
	}

	return { uuid: response.data.id.toLowerCase(), name: response.data.name };
};

type HypixelStatusResponse = {
	success: boolean;
	cause?: string;
	statusCode?: number;
	invalidKey?: boolean;
	session?: {
		online: boolean;
		gameType?: string;
	};
};

const getActiveKeyEntry = (config: IHypixelSkyBlockConfig): IApiKeyEntry | null => {
	const entries = config.apiKeys as IApiKeyEntry[];
	const lastUsed = config.lastUsedApiKey
		? entries.find((entry) => entry.key === config.lastUsedApiKey)
		: undefined;

	if (lastUsed && lastUsed.status === 'active' && !lastUsed.disabled) {
		return lastUsed;
	}

	return entries.find((entry) => entry.status === 'active' && !entry.disabled) ?? null;
};

const maskKey = (key: string): string => {
	if (key.length <= 4) return `****${key}`;
	return `${'*'.repeat(Math.max(0, key.length - 4))}${key.slice(-4)}`;
};

const formatKeyLabel = (keyEntry: IApiKeyEntry): string => {
	const masked = maskKey(keyEntry.key);
	return keyEntry.label ? `${keyEntry.label} (${masked})` : masked;
};

const fetchStatus = async (key: string, uuid: string): Promise<HypixelStatusResponse> => {
	try {
		const response = await axios.get<HypixelStatusResponse>(HYPIXEL_STATUS_ENDPOINT, {
			params: { uuid },
			headers: { 'API-Key': key },
			timeout: 15000,
			validateStatus: () => true,
		});

		if (response.data?.success === true) {
			return { ...response.data, statusCode: response.status, invalidKey: false };
		}

		const cause = response.data?.cause ?? `HTTP ${response.status}`;
		const invalidKey =
			response.status === 403 ||
			response.data?.cause?.toLowerCase().includes('invalid') ||
			response.data?.cause?.toLowerCase().includes('expired');

		return {
			success: false,
			cause,
			statusCode: response.status,
			invalidKey,
		};
	} catch (error) {
		return {
			success: false,
			cause: error instanceof Error ? error.message : 'Request failed',
			invalidKey: false,
		};
	}
};

const trakerCommand: Command = {
	data: new SlashCommandBuilder()
		.setName('traker')
		.setDescription('Track Hypixel player online status')
		.setContexts(InteractionContextType.Guild)
		.setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('start')
				.setDescription('Start tracking a player')
				.addStringOption((option) =>
					option.setName('player').setDescription('Player UUID or IGN').setRequired(true),
				)
				.addChannelOption((option) =>
					option
						.setName('channel')
						.setDescription('Channel for online/offline updates')
						.addChannelTypes(ChannelType.GuildText)
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('stop')
				.setDescription('Stop tracking a player')
				.addStringOption((option) =>
					option.setName('player').setDescription('Player UUID or IGN').setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand.setName('list').setDescription('List tracked players'),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('status')
				.setDescription('Check a player online status')
				.addStringOption((option) =>
					option.setName('player').setDescription('Player UUID or IGN').setRequired(true),
				),
		),
	userPermissions: [],
	devOnly: false,

	run: async (_client: Client, interaction: ChatInputCommandInteraction) => {
		if (!interaction.guildId) {
			await interaction.reply({
				content: 'This command can only be used in a server.',
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		const subcommand = interaction.options.getSubcommand();

		if (subcommand === 'start') {
			const playerInput = normalizePlayerInput(interaction.options.getString('player', true));
			const channel = interaction.options.getChannel('channel', true);

			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			const resolved = await resolveUuid(playerInput);
			if (!resolved) {
				await interaction.editReply({
					content: 'Could not resolve that player. Check the UUID or IGN and try again.',
				});
				return;
			}

			const playerUuid = resolved.uuid;
			const playerName = resolved.name ?? playerInput;

			const existing = await HypixelTracker.findOne({
				guildID: interaction.guildId,
				playerUuid: playerUuid,
				trackedByUserId: interaction.user.id,
			});

			if (existing) {
				existing.channelId = channel.id;
				existing.trackedByUserId = interaction.user.id;
				existing.status = 'active';
				existing.playerName = playerName;
				await existing.save();
				await interaction.editReply({
					content: `Tracking updated for ${playerName} in <#${channel.id}> and will tag <@${interaction.user.id}>.`,
				});
				return;
			}

			await HypixelTracker.create({
				guildID: interaction.guildId,
				playerUuid: playerUuid,
				playerName,
				trackedByUserId: interaction.user.id,
				channelId: channel.id,
				status: 'active',
			});

			await interaction.editReply({
				content: `Tracking started for ${playerName} in <#${channel.id}> and will tag <@${interaction.user.id}>.`,
			});
			return;
		}

		if (subcommand === 'stop') {
			const playerInput = normalizePlayerInput(interaction.options.getString('player', true));
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const resolved = await resolveUuid(playerInput);
			if (!resolved) {
				await interaction.editReply({
					content: 'Could not resolve that player. Check the UUID or IGN and try again.',
				});
				return;
			}

			const result = await HypixelTracker.findOneAndDelete({
				guildID: interaction.guildId,
				playerUuid: resolved.uuid,
				trackedByUserId: interaction.user.id,
			});

			if (!result) {
				await interaction.editReply({ content: 'That player is not being tracked.' });
				return;
			}

			await interaction.editReply({
				content: `Tracking stopped for ${playerInput}.`,
			});
			return;
		}

		if (subcommand === 'list') {
			const trackers = await HypixelTracker.find({ guildID: interaction.guildId }).lean();

			if (!trackers.length) {
				await interaction.reply({
					content: 'No players are being tracked.',
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			const lines = trackers.map((tracker) => {
				const name = tracker.playerName ?? tracker.playerUuid;
				const channel = tracker.channelId ? `<#${tracker.channelId}>` : 'Unknown channel';
				const user = tracker.trackedByUserId ? `<@${tracker.trackedByUserId}>` : 'Unknown user';
				return `${name} • ${channel} • ${user} • ${tracker.status}`;
			});

			await interaction.reply({ content: lines.join('\n'), flags: MessageFlags.Ephemeral });
			return;
		}

		if (subcommand === 'status') {
			const playerInput = normalizePlayerInput(interaction.options.getString('player', true));
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const resolved = await resolveUuid(playerInput);
			if (!resolved) {
				await interaction.editReply({
					content: 'Could not resolve that player. Check the UUID or IGN and try again.',
				});
				return;
			}

			const config = await HypixelSkyBlockConfig.findOne({ guildID: interaction.guildId });
			if (!config || config.apiKeys.length === 0) {
				await interaction.editReply({
					content: 'No Hypixel API key is saved. Add one with `/hypixel api-key add`.',
				});
				return;
			}

			const keyEntry = getActiveKeyEntry(config);
			if (!keyEntry) {
				await interaction.editReply({
					content: 'No active Hypixel API key is available. Use `/hypixel api-key set-active`.',
				});
				return;
			}

			const statusResponse = await fetchStatus(keyEntry.key, resolved.uuid);
			const name = resolved.name ?? playerInput;
			const profileUrl = `https://namemc.com/profile/${resolved.uuid}`;
			const thumbnailUrl = `https://visage.surgeplay.com/head/128/${resolved.uuid}`;
			const keyLabel = formatKeyLabel(keyEntry);
			const now = new Date();

			if (!statusResponse.success) {
				const apiStatus = statusResponse.invalidKey ? '⚠️ Invalid API key' : '⚠️ API issue';
				const embed = new EmbedBuilder()
					.setTitle(`API issue while checking ${name}`)
					.setColor(0xf1c40f)
					.setThumbnail(thumbnailUrl)
					.setDescription(`${apiStatus} - ${statusResponse.cause ?? 'Unknown error'}`)
					.addFields(
						{ name: 'Profile', value: `[NameMC](${profileUrl})`, inline: true },
						{
							name: 'Session',
							value: `Last checked: <t:${Math.floor(now.getTime() / 1000)}:R>`,
							inline: false,
						},
						{ name: 'API Health', value: apiStatus, inline: false },
						{
							name: 'Next Step',
							value: 'Use `/hypixel api-key set-active` or add a new key.',
							inline: false,
						},
					)
					.setFooter({ text: `Requested by <@${interaction.user.id}> • Key: ${keyLabel}` })
					.setTimestamp();

				await interaction.editReply({ embeds: [embed] });
				return;
			}

			const online = statusResponse.session?.online ?? false;
			const status = online ? 'online' : 'offline';
			const statusChip = online ? '🟢 Online' : '🔴 Offline';
			const gameType = statusResponse.session?.gameType ?? (online ? 'Unknown' : 'Offline');
			const sessionLines = [
				`Game: ${gameType}`,
				'Duration: Unknown',
				`Last checked: <t:${Math.floor(now.getTime() / 1000)}:R>`,
			];

			const embed = new EmbedBuilder()
				.setTitle(`${name} is ${status}`)
				.setDescription(`${statusChip} - Status is **${status}**`)
				.setColor(online ? 0x57f287 : 0xed4245)
				.setThumbnail(thumbnailUrl)
				.addFields(
					{ name: 'UUID', value: `\`${resolved.uuid}\``, inline: true },
					{ name: 'Profile', value: `[NameMC](${profileUrl})`, inline: true },
					{ name: 'Session', value: sessionLines.join('\n'), inline: false },
					{ name: 'API Health', value: '✅ Data fresh', inline: false },
				)
				.setFooter({ text: `Requested by <@${interaction.user.id}> • Key: ${keyLabel}` })
				.setTimestamp();

			await interaction.editReply({ embeds: [embed] });
			return;
		}
	},
};

export default trakerCommand;
