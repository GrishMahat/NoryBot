import axios from 'axios';
import {
	ApplicationIntegrationType,
	ChannelType,
	type ChatInputCommandInteraction,
	type Client,
	InteractionContextType,
	MessageFlags,
	SlashCommandBuilder,
} from 'discord.js';
import HypixelTracker from '@/database/schemas/hypixelTrackerSchema';
import type { Command } from '@/types';

const normalizePlayerInput = (value: string): string => value.trim();
const uuidRegex = /^[0-9a-f]{32}$/i;

const normalizeUuid = (value: string): string => value.replace(/-/g, '').toLowerCase();

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
		}
	},
};

export default trakerCommand;
