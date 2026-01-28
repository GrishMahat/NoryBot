import axios from 'axios';
import { randomUUID } from 'crypto';
import {
	ApplicationIntegrationType,
	type ChatInputCommandInteraction,
	type Client,
	InteractionContextType,
	MessageFlags,
	SlashCommandBuilder,
} from 'discord.js';
import HypixelSkyBlockConfig from '@/database/schemas/hypixelSkyBlockSchema';
import type { Command } from '@/types';

const HYPIXEL_VALIDATE_ENDPOINT = 'https://api.hypixel.net/v2/status';
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

type KeyValidationResult =
	| { valid: true; owner?: string }
	| { valid: false; error?: string; invalidKey?: boolean };

const maskKey = (key: string): string => {
	if (key.length <= 4) return `****${key}`;
	return `${'*'.repeat(Math.max(0, key.length - 4))}${key.slice(-4)}`;
};

const validateKey = async (key: string, uuid: string): Promise<KeyValidationResult> => {
	const response = await axios.get<{ success: boolean; cause?: string }>(
		HYPIXEL_VALIDATE_ENDPOINT,
		{
			params: { uuid },
			headers: { 'API-Key': key },
			timeout: 8000,
			validateStatus: () => true,
		},
	);

	if (response.status === 403) {
		return { valid: false, error: response.data?.cause ?? 'Invalid API key', invalidKey: true };
	}

	if (response.status === 429) {
		return { valid: false, error: 'Rate limit exceeded', invalidKey: false };
	}

	if (response.data?.success === true || response.status === 400 || response.status === 422) {
		return { valid: true };
	}

	return {
		valid: false,
		error: response.data?.cause ?? `HTTP ${response.status}`,
		invalidKey: false,
	};
};

const hypixelCommand: Command = {
	data: new SlashCommandBuilder()
		.setName('hypixel')
		.setDescription('Manage Hypixel settings')
		.setContexts(InteractionContextType.Guild)
		.setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
		.addSubcommandGroup((group) => {
			return group
				.setName('api-key')
				.setDescription('Manage Hypixel API keys')
				.addSubcommand((subcommand) =>
					subcommand
						.setName('add')
						.setDescription('Add and validate a Hypixel API key')
						.addStringOption((option) =>
							option.setName('key').setDescription('The Hypixel API key').setRequired(true),
						)
						.addStringOption((option) =>
							option
								.setName('player')
								.setDescription('Player UUID or IGN for validation')
								.setRequired(true),
						)
						.addStringOption((option) =>
							option
								.setName('label')
								.setDescription('Optional label for this key')
								.setRequired(false),
						),
				)
				.addSubcommand((subcommand) =>
					subcommand.setName('list').setDescription('List stored API key IDs'),
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('set-active')
						.setDescription('Set the active Hypixel API key')
						.addStringOption((option) =>
							option
								.setName('id')
								.setDescription('The stored API key ID to set active')
								.setRequired(true),
						),
				);
		}),
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

		const group = interaction.options.getSubcommandGroup();
		const subcommand = interaction.options.getSubcommand();

		if (group !== 'api-key') {
			await interaction.reply({
				content: 'Unsupported subcommand group.',
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		if (subcommand === 'add') {
			const key = interaction.options.getString('key', true).trim();
			const playerInput = interaction.options.getString('player', true).trim();
			const label = interaction.options.getString('label')?.trim();

			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			try {
				const resolved = await resolveUuid(playerInput);
				if (!resolved) {
					await interaction.editReply({
						content: 'Could not resolve that player. Check the UUID or IGN and try again.',
					});
					return;
				}

				const validation = await validateKey(key, resolved.uuid);
				const now = new Date();
				const shouldExpire = !validation.valid && validation.invalidKey;
				const status = shouldExpire ? 'expired' : 'active';
				const expiredAt = shouldExpire ? now : undefined;

				let config = await HypixelSkyBlockConfig.findOne({ guildID: interaction.guildId });
				if (!config) {
					config = new HypixelSkyBlockConfig({ guildID: interaction.guildId, apiKeys: [] });
				}

				const existingIndex = config.apiKeys.findIndex((entry) => entry.key === key);
				if (existingIndex >= 0) {
					const entry = config.apiKeys[existingIndex];
					if (!entry.id) entry.id = randomUUID();
					if (label) entry.label = label;
					entry.status = status;
					entry.expiredAt = expiredAt;
					if (validation.valid) entry.disabled = false;
				} else {
					const id = randomUUID();
					config.apiKeys.push({
						id,
						key,
						label,
						addedBy: interaction.user.id,
						addedAt: now,
						status,
						expiredAt,
						disabled: false,
					});
				}

				config.apiKeys.forEach((entry) => {
					if (!entry.id) entry.id = randomUUID();
				});

				await config.save();
				const savedEntry = config.apiKeys.find((entry) => entry.key === key);
				const id = savedEntry?.id ?? 'unknown';

				await interaction.editReply({
					content: validation.valid
						? `Saved API key ${maskKey(key)} as active. ID: ${id}`
						: shouldExpire
							? `Saved API key ${maskKey(key)} as expired.${validation.error ? ` (${validation.error})` : ''} ID: ${id}`
							: `Saved API key ${maskKey(key)} as active (validation failed: ${validation.error ?? 'unknown error'}). ID: ${id}`,
				});
			} catch (error) {
				console.error('Error validating Hypixel API key:', error);
				await interaction.editReply({
					content: 'Could not validate the Hypixel API key. Try again later.',
				});
			}
			return;
		}

		if (subcommand === 'list') {
			const config = await HypixelSkyBlockConfig.findOne({ guildID: interaction.guildId });

			if (!config || config.apiKeys.length === 0) {
				await interaction.reply({
					content: 'No API keys are saved for this server.',
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			config.apiKeys.forEach((entry) => {
				if (!entry.id) entry.id = randomUUID();
			});
			await config.save();

			const lines = config.apiKeys.map((entry) => {
				const label = entry.label ? ` • ${entry.label}` : '';
				return `${entry.id ?? 'unknown'}${label} • ${entry.status ?? 'active'}`;
			});

			const content =
				lines.length > 0 ? lines.join('\n') : 'No API keys are saved for this server.';
			await interaction.reply({ content, flags: MessageFlags.Ephemeral });
			return;
		}

		if (subcommand === 'set-active') {
			const id = interaction.options.getString('id', true).trim();
			const config = await HypixelSkyBlockConfig.findOne({ guildID: interaction.guildId });

			if (!config || config.apiKeys.length === 0) {
				await interaction.reply({
					content: 'No API keys are saved for this server.',
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			const entry = config.apiKeys.find((item) => item.id === id);
			if (!entry) {
				await interaction.reply({
					content: 'That API key ID is not saved for this server.',
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			if (entry.status === 'expired') {
				await interaction.reply({
					content: `That API key is marked as expired and cannot be set active.`,
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			const now = new Date();
			config.lastUsedApiKey = entry.key;
			config.lastUsedAt = now;
			entry.lastUsedAt = now;
			entry.status = 'active';
			entry.disabled = false;

			await config.save();
			await interaction.reply({
				content: `Set ${maskKey(entry.key)} as the active API key.`,
				flags: MessageFlags.Ephemeral,
			});
			return;
		}
	},
};

export default hypixelCommand;
