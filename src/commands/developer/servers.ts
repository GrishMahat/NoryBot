/** @format */

import {
	ActionRowBuilder,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	ChannelType,
	type ChatInputCommandInteraction,
	type Client,
	type Collection,
	type ColorResolvable,
	ComponentType,
	EmbedBuilder,
	type Guild,
	type GuildMember,
	GuildPremiumTier,
	PermissionFlagsBits,
	SlashCommandBuilder,
	type TextChannel,
	type User,
} from 'discord.js';
import type { Command } from '@/types';
import { formatTimestamp } from '@/utils/helpers/misc';
import { Pagination } from '@/utils/helpers/Pagination';

// Constants
const DEFAULT_EMBED_COLOR: ColorResolvable = 'Green';
const ERROR_EMBED_COLOR: ColorResolvable = 'Red';
const CONFIRMATION_TIMEOUT = 30000; // 30 seconds
const MAX_CHECK_IDS = 10;
const MAX_SERVER_LIST_LENGTH = 1000; // Max length for server list in user subcommand embed field

// Type for enriched Guild information
interface EnrichedGuildInfo {
	name: string;
	memberCount: number;
	id: string;
	inviteLink: string | null; // Can be null if invite fails
	owner?: GuildMember; // Optional: only fetched when needed (detailed list)
	createdAt: Date;
	boostLevel: GuildPremiumTier;
}

// Helper function to safely get user avatar URL
const safeAvatarURL = (user: User | null): string | null =>
	user?.displayAvatarURL({ forceStatic: false, size: 1024 }) ?? null;

// Helper function to generate invite link
async function generateInvite(guild: Guild): Promise<string | null> {
	if (!guild.members.me?.permissions.has(PermissionFlagsBits.CreateInstantInvite)) {
		// console.warn(`Missing CreateInstantInvite permission in guild ${guild.id}`);
		return null; // Bot lacks permission
	}

	try {
		// Find the first suitable text channel
		const channel = guild.channels.cache.find(
			(ch): ch is TextChannel =>
				ch.type === ChannelType.GuildText &&
				(ch
					.permissionsFor(guild.members.me ?? guild.client.user) // Use optional chaining + fallback instead of !
					?.has(PermissionFlagsBits.CreateInstantInvite) ??
					false),
		);

		if (channel) {
			const invite = await channel.createInvite({
				maxAge: 0, // Permanent invite
				maxUses: 0, // Unlimited uses
			});
			return invite.url;
		}
		// console.warn(`No suitable channel found for invite in guild ${guild.id}`);
		return null; // No suitable channel found
	} catch (error) {
		console.error(`Could not create invite for guild ${guild.id}:`, error);
		return null; // Error during invite creation
	}
}

/**
 * @name servers
 * @description Manage and view information about servers the bot is in.
 * @category Developer
 * @devOnly true
 *
 * @param {Client} client The Discord client.
 * @param {ChatInputCommandInteraction} interaction The command interaction.
 *
 * @example
 * /servers list
 * /servers leave <server-id>
 * /servers check <server-ids>
 * /servers user <user>
 * /servers info <server-id>
 * /servers stats
 * /servers search <query>
 */
const serversCommand: Command = {
	data: new SlashCommandBuilder()
		.setName('servers')
		.setDescription('Manage and view information about servers the bot is in.')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('list')
				.setDescription('List servers the bot is in and provide invite links')
				.addBooleanOption((option) =>
					option
						.setName('detailed')
						.setDescription('Show detailed server information (fetches owners)')
						.setRequired(false),
				)
				.addStringOption((option) =>
					option
						.setName('sort')
						.setDescription('Sort servers by a specific criteria')
						.setRequired(false)
						.addChoices(
							{ name: 'Name (A-Z)', value: 'name' },
							{ name: 'Member Count (High-Low)', value: 'memberCount' },
							{ name: 'Creation Date (New-Old)', value: 'createdAt' },
						),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('leave')
				.setDescription('Make the bot leave a specified server by its ID.')
				.addStringOption((option) =>
					option
						.setName('server-id')
						.setDescription('The ID of the server the bot should leave.')
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('check')
				.setDescription('Check if the bot is in specified servers by their IDs.')
				.addStringOption((option) =>
					option
						.setName('server-ids')
						.setDescription(`Comma-separated IDs (max ${MAX_CHECK_IDS}) of the servers to check.`)
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('user')
				.setDescription('Show servers owned by a user that the bot is also in.')
				.addUserOption((option) =>
					option.setName('user').setDescription('The user to check.').setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('info')
				.setDescription('Get detailed information about a specific server.')
				.addStringOption((option) =>
					option
						.setName('server-id')
						.setDescription('The ID of the server to get information about.')
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('stats')
				.setDescription('Get statistics about all servers the bot is in.')
				.addBooleanOption((option) =>
					option
						.setName('detailed')
						.setDescription('Show detailed statistics including member counts and boost levels.')
						.setRequired(false),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('search')
				.setDescription('Search for servers by name or ID.')
				.addStringOption((option) =>
					option
						.setName('query')
						.setDescription('The search query (server name or ID).')
						.setRequired(true),
				),
		),
	userPermissions: [PermissionFlagsBits.Administrator],
	botPermissions: [PermissionFlagsBits.CreateInstantInvite], // Added required permission
	cooldown: 10,
	nsfwMode: false,
	testMode: false,
	devOnly: true,
	category: 'Developer',

	run: async (client: Client, interaction: ChatInputCommandInteraction): Promise<void> => {
		// Ensure interaction is deferred or replied to
		if (interaction.deferred || interaction.replied) {
			console.warn('Interaction already deferred or replied to.');
			// Potentially log this unexpected state
			// return; // Or decide how to handle this state
		} else {
			await interaction.deferReply();
		}

		const subcommand = interaction.options.getSubcommand();

		try {
			switch (subcommand) {
				case 'list':
					await handleListSubcommand(client, interaction);
					break;
				case 'leave':
					await handleLeaveSubcommand(client, interaction);
					break;
				case 'check':
					await handleCheckSubcommand(client, interaction);
					break;
				case 'user':
					await handleUserSubcommand(client, interaction);
					break;
				case 'info':
					await handleInfoSubcommand(client, interaction);
					break;
				case 'stats':
					await handleStatsSubcommand(client, interaction);
					break;
				case 'search':
					await handleSearchSubcommand(client, interaction);
					break;
				default:
					// This should technically be unreachable due to SlashCommandBuilder structure
					console.error(`Reached default case with unknown subcommand: ${subcommand}`);
					await interaction.editReply({
						content: '❌ An unexpected error occurred: Unknown subcommand.',
					});
					break;
			}
		} catch (_error) {
			// this was remove  now use loggig.error
			// errorHandler.handleError(
			// 	error,
			// 	'Servers Command',
			// 	interaction.guild?.id,
			// 	interaction.channel?.id,
			// 	interaction.user.id,
			// );

			// console.error(`Error executing servers command (${subcommand}):`, error);
			// Ensure reply is edited safely
			const replyOptions = {
				content: '❌ An error occurred while processing your request. Please try again later.',
				embeds: [],
				components: [],
			};
			if (interaction.replied || interaction.deferred) {
				await interaction.editReply(replyOptions).catch(console.error); // Catch potential error on editReply
			} else {
				// Fallback if deferReply failed or wasn't called
				await interaction.reply(replyOptions).catch(console.error);
			}
		}
	},
};

/**
 * @name handleListSubcommand
 * @description Handles the 'list' subcommand.
 * Lists all servers the bot is in, with optional detailed view and sorting.
 *
 * @param {Client} client The Discord client.
 * @param {ChatInputCommandInteraction} interaction The command interaction.
 */
async function handleListSubcommand(
	client: Client,
	interaction: ChatInputCommandInteraction,
): Promise<void> {
	const isDetailed = interaction.options.getBoolean('detailed') ?? false;
	const sortOption = interaction.options.getString('sort') ?? 'name';

	// Fetch guild data concurrently
	const guildInfos = await Promise.all(
		client.guilds.cache.map(async (guild: Guild): Promise<EnrichedGuildInfo> => {
			// Fetch owner only if detailed view is requested
			let owner: GuildMember | undefined;
			if (isDetailed) {
				try {
					owner = await guild.fetchOwner();
				} catch (fetchError) {
					console.error(`Failed to fetch owner for guild ${guild.id}:`, fetchError);
					// Proceed without owner info if fetching fails
				}
			}

			// Generate invite link (handles permissions and errors internally)
			const inviteLink = await generateInvite(guild);

			const enrichedGuild = {
				name: guild.name,
				memberCount: guild.memberCount,
				id: guild.id,
				inviteLink,
				owner, // Will be undefined if not detailed or fetch failed
				createdAt: guild.createdAt,
				boostLevel: guild.premiumTier,
			};

			return enrichedGuild;
		}),
	);

	// Sort guilds based on the chosen option
	guildInfos.sort((a, b) => {
		switch (sortOption) {
			case 'memberCount':
				return b.memberCount - a.memberCount;
			case 'createdAt':
				return b.createdAt.getTime() - a.createdAt.getTime();
			default:
				return a.name.localeCompare(b.name);
		}
	});

	if (guildInfos.length === 0) {
		await interaction.editReply('ℹ️ The bot is not currently in any servers.');
		return;
	}

	const embeds = createServerListEmbeds(client, interaction, guildInfos, isDetailed, sortOption);

	if (embeds.length === 0) {
		// Should not happen if guildInfos is not empty, but as a safeguard
		await interaction.editReply('❌ Failed to generate server list embeds.');
		return;
	}

	const pagination = new Pagination(interaction, embeds, {
		type: 'button',
		enableJump: true,
		fastSkip: true,
		time: 5 * 60 * 1000,
	});
	await pagination.send();
}

/**
 * @name createServerListEmbeds
 * @description Creates an array of embeds for the server list.
 *
 * @param {Client} client The Discord client.
 * @param {ChatInputCommandInteraction} interaction The command interaction.
 * @param {EnrichedGuildInfo[]} guilds An array of enriched guild information.
 * @param {boolean} isDetailed Whether to show detailed information.
 * @param {string} sortOption The sorting option.
 * @returns {EmbedBuilder[]} An array of embed builders.
 */
function createServerListEmbeds(
	client: Client,
	interaction: ChatInputCommandInteraction,
	guilds: EnrichedGuildInfo[],
	isDetailed: boolean,
	sortOption: string,
): EmbedBuilder[] {
	// Adjust fields per embed based on detail level
	const MAX_FIELDS_PER_EMBED = isDetailed ? 5 : 10; // Reduced detailed fields for readability
	const embeds: EmbedBuilder[] = [];
	const totalGuilds = guilds.length;
	const totalPages = Math.ceil(totalGuilds / MAX_FIELDS_PER_EMBED);
	const sortOptionDisplay =
		sortOption === 'memberCount'
			? 'Member Count'
			: sortOption === 'createdAt'
				? 'Creation Date'
				: 'Name';

	for (let i = 0; i < totalGuilds; i += MAX_FIELDS_PER_EMBED) {
		const currentPage = Math.floor(i / MAX_FIELDS_PER_EMBED) + 1;
		const currentGuilds = guilds.slice(i, i + MAX_FIELDS_PER_EMBED);

		const embed = new EmbedBuilder()
			.setTitle('📊 Server List')
			.setDescription(
				`The bot is in **${totalGuilds}** server(s). Sorted by: **${sortOptionDisplay}**.`,
			)
			.setColor(DEFAULT_EMBED_COLOR)
			.setThumbnail(safeAvatarURL(client.user))
			.setFooter({
				text: `Page ${currentPage}/${totalPages} • Requested by ${interaction.user.username}`,
				iconURL: safeAvatarURL(interaction.user) ?? undefined, // Use undefined if null
			});

		currentGuilds.forEach((guild) => {
			const inviteText = guild.inviteLink ? `[Invite Link](${guild.inviteLink})` : 'Invite N/A';
			let fieldValue = `🆔 ID: ${guild.id}\n👥 Members: ${guild.memberCount.toLocaleString()}`;

			if (isDetailed) {
				const ownerTag = guild.owner ? guild.owner.user.tag : 'Unknown/Fetch Failed';
				const createdTimestamp = formatTimestamp(guild.createdAt.getTime(), 'short'); // e.g., "MM/DD/YY"
				fieldValue += `\n👑 Owner: ${ownerTag}\n📅 Created: ${createdTimestamp}\n✨ Boost: Tier ${guild.boostLevel} (${GuildPremiumTier[guild.boostLevel]})\n🔗 ${inviteText}`;
			} else {
				fieldValue += `\n🔗 ${inviteText}`;
			}

			embed.addFields({
				name: `🔹 ${guild.name}`, // Add an icon for visual separation
				value: fieldValue,
				inline: true, // Keep inline for compactness, adjust if needed
			});
		});

		embeds.push(embed);
	}

	return embeds;
}

/**
 * @name handleLeaveSubcommand
 * @description Handles the 'leave' subcommand.
 * Makes the bot leave a specified server.
 *
 * @param {Client} client The Discord client.
 * @param {ChatInputCommandInteraction} interaction The command interaction.
 */
async function handleLeaveSubcommand(
	client: Client,
	interaction: ChatInputCommandInteraction,
): Promise<void> {
	const serverId = interaction.options.getString('server-id', true);
	const guild = client.guilds.cache.get(serverId);

	if (!guild) {
		await interaction.editReply({
			content: `❌ I am not in a server with the ID \`${serverId}\`.`,
			embeds: [],
			components: [],
		});
		return;
	}

	const confirmButtonId = `confirm_leave_${serverId}`;
	const cancelButtonId = `cancel_leave_${serverId}`;

	const confirmButton = new ButtonBuilder()
		.setCustomId(confirmButtonId)
		.setLabel('Confirm Leave')
		.setStyle(ButtonStyle.Danger);

	const cancelButton = new ButtonBuilder()
		.setCustomId(cancelButtonId)
		.setLabel('Cancel')
		.setStyle(ButtonStyle.Secondary);

	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton, cancelButton);

	const response = await interaction.editReply({
		content: `❓ Are you sure you want me to leave the server **${guild.name}** (ID: \`${serverId}\`)?`,
		components: [row],
	});

	try {
		const confirmation = await response.awaitMessageComponent({
			filter: (i: ButtonInteraction) =>
				i.user.id === interaction.user.id &&
				(i.customId === confirmButtonId || i.customId === cancelButtonId),
			time: CONFIRMATION_TIMEOUT,
			componentType: ComponentType.Button,
		});

		if (confirmation.customId === confirmButtonId) {
			await guild.leave();
			// Log the action
			console.log(
				`Bot left guild ${guild.name} (${serverId}) initiated by ${interaction.user.tag} (${interaction.user.id})`,
			);
			await confirmation.update({
				content: `✅ Successfully left the server **${guild.name}** (ID: \`${serverId}\`).`,
				components: [],
			});
		} else {
			// confirmation.customId === cancelButtonId
			await confirmation.update({
				content: '❌ Server leave cancelled.',
				components: [],
			});
		}
	} catch (error) {
		// Handle timeout or other errors during awaitMessageComponent

		console.error(`Error or timeout waiting for leave confirmation for guild ${serverId}:`, error);
		await interaction.editReply({
			content: `⏱️ No response received within ${CONFIRMATION_TIMEOUT / 1000} seconds, cancelling server leave.`,
			components: [], // Remove buttons after timeout
		});
		// Do not re-throw unless necessary for higher-level handling
	}
}

/**
 * @name handleCheckSubcommand
 * @description Handles the 'check' subcommand.
 * Checks if the bot is in a list of specified servers.
 *
 * @param {Client} client The Discord client.
 * @param {ChatInputCommandInteraction} interaction The command interaction.
 */
async function handleCheckSubcommand(
	client: Client,
	interaction: ChatInputCommandInteraction,
): Promise<void> {
	const serverIdsInput = interaction.options.getString('server-ids', true);
	const serverIds = serverIdsInput
		.split(',')
		.map((id) => id.trim())
		.filter((id) => id); // Remove empty strings resulting from trailing commas, etc.

	if (serverIds.length === 0) {
		await interaction.editReply('⚠️ Please provide at least one server ID.');
		return;
	}

	if (serverIds.length > MAX_CHECK_IDS) {
		await interaction.editReply(
			`⚠️ Please provide ${MAX_CHECK_IDS} or fewer server IDs to check. You provided ${serverIds.length}.`,
		);
		return;
	}

	// Use pagination if results exceed embed limits (though unlikely with MAX_CHECK_IDS=10)
	const embeds: EmbedBuilder[] = [];

	await Promise.all(
		serverIds.map(async (serverId) => {
			const guild = client.guilds.cache.get(serverId);
			if (guild) {
				let ownerTag = 'Unknown';
				try {
					const owner = await guild.fetchOwner();
					ownerTag = owner.user.tag;
				} catch (fetchError) {
					console.error(`Failed to fetch owner for guild ${guild.id} during check:`, fetchError);
					ownerTag = 'Fetch Failed';
				}
				const createdTimestamp = formatTimestamp(guild.createdAt.getTime(), 'relative'); // Relative time

				embeds.push(
					new EmbedBuilder()
						.setTitle(`✅ Server Found: ${guild.name}`)
						.setDescription('The bot **is** in this server.')
						.setColor(DEFAULT_EMBED_COLOR)
						.addFields(
							{ name: '🆔 Server ID', value: `\`${serverId}\``, inline: true },
							{ name: '👑 Owner', value: ownerTag, inline: true },
							{
								name: '👥 Members',
								value: guild.memberCount.toLocaleString(),
								inline: true,
							},
							{
								name: '📅 Created',
								value: createdTimestamp, // Use relative timestamp
								inline: true,
							},
							{
								name: '✨ Boost Level',
								value: `Tier ${guild.premiumTier} (${GuildPremiumTier[guild.premiumTier]})`,
								inline: true,
							},
						)
						.setThumbnail(guild.iconURL({ size: 128 })) // Add server icon
						.setTimestamp(),
				);
			} else {
				embeds.push(
					new EmbedBuilder()
						.setTitle('❌ Server Not Found')
						.setDescription(`The bot is **not** in a server with the ID \`${serverId}\`.`)
						.setColor(ERROR_EMBED_COLOR)
						.setTimestamp(),
				);
			}
		}),
	);

	// Simple reply if few embeds, consider pagination for larger MAX_CHECK_IDS
	await interaction.editReply({ embeds: embeds.slice(0, 10) }); // Discord allows max 10 embeds per message
}

/**
 * @name handleUserSubcommand
 * @description Handles the 'user' subcommand.
 * Shows a list of servers a user owns that the bot is also in.
 *
 * @param {Client} client The Discord client.
 * @param {ChatInputCommandInteraction} interaction The command interaction.
 */
async function handleUserSubcommand(
	client: Client,
	interaction: ChatInputCommandInteraction,
): Promise<void> {
	const user = interaction.options.getUser('user', true);
	const userServers: Collection<string, Guild> = client.guilds.cache.filter(
		(guild) => guild.ownerId === user.id,
	);
	const serverCount = userServers.size;

	let serverList = userServers
		.map(
			(guild) =>
				`• ${guild.name} (ID: \`${guild.id}\`, Members: ${guild.memberCount.toLocaleString()})`,
		)
		.join('\n');

	if (serverList.length > MAX_SERVER_LIST_LENGTH) {
		serverList = `${serverList.substring(0, MAX_SERVER_LIST_LENGTH - 3)}...`;
	}

	const embed = new EmbedBuilder()
		.setTitle(`👤 Servers Owned by ${user.username}`)
		.setDescription(
			`${user.toString()} (ID: \`${user.id}\`) owns **${serverCount}** server(s) that the bot is currently in.`,
		)
		.setColor(DEFAULT_EMBED_COLOR)
		.addFields({
			name: 'Server List',
			value: serverCount > 0 ? serverList : 'No servers found where this user is the owner.',
		})
		.setThumbnail(safeAvatarURL(user))
		.setFooter({
			text: `Requested by ${interaction.user.username}`,
			iconURL: safeAvatarURL(interaction.user) ?? undefined,
		})
		.setTimestamp();

	await interaction.editReply({ embeds: [embed] });
}

/**
 * @name handleInfoSubcommand
 * @description Handles the 'info' subcommand.
 * Shows detailed information about a specific server.
 *
 * @param {Client} client The Discord client.
 * @param {ChatInputCommandInteraction} interaction The command interaction.
 */
async function handleInfoSubcommand(
	client: Client,
	interaction: ChatInputCommandInteraction,
): Promise<void> {
	const serverId = interaction.options.getString('server-id', true);
	const guild = client.guilds.cache.get(serverId);

	if (!guild) {
		await interaction.editReply({
			content: `❌ I am not in a server with the ID \`${serverId}\`.`,
			embeds: [],
		});
		return;
	}

	try {
		// Fetch owner and other data
		const owner = await guild.fetchOwner();
		const createdTimestamp = formatTimestamp(guild.createdAt.getTime(), 'full', {
			includeTime: true,
		});
		// Remove premiumTierTimestamp since it's not available
		const boostInfo =
			guild.premiumTier > 0
				? `Tier ${guild.premiumTier} (${GuildPremiumTier[guild.premiumTier]})`
				: 'Not boosted';

		const embed = new EmbedBuilder()
			.setTitle(`📊 Server Information: ${guild.name}`)
			.setColor(DEFAULT_EMBED_COLOR)
			.setThumbnail(guild.iconURL({ size: 256 }))
			.addFields(
				{ name: '🆔 Server ID', value: `\`${guild.id}\``, inline: true },
				{ name: '👑 Owner', value: owner.user.tag, inline: true },
				{
					name: '👥 Members',
					value: guild.memberCount.toLocaleString(),
					inline: true,
				},
				{ name: '📅 Created', value: createdTimestamp, inline: true },
				{ name: '✨ Boost Level', value: boostInfo, inline: true },
				{ name: '🌍 Region', value: guild.preferredLocale, inline: true },
				{
					name: '🔒 Verification Level',
					value: guild.verificationLevel.toString(),
					inline: true,
				},
				{
					name: '📝 Description',
					value: guild.description || 'No description set',
				},
			)
			.setFooter({
				text: `Requested by ${interaction.user.username}`,
				iconURL: safeAvatarURL(interaction.user) ?? undefined,
			})
			.setTimestamp();

		await interaction.editReply({ embeds: [embed] });
	} catch (error) {
		// errorHandler.handleError(error, "Servers Command - Info Subcommand", interaction.guild?.id, interaction.channel?.id, interaction.user.id);
		console.error(`Error fetching server info for ${serverId}:`, error);
		await interaction.editReply({
			content: '❌ An error occurred while fetching server information.',
			embeds: [],
		});
	}
}

/**
 * @name handleStatsSubcommand
 * @description Handles the 'stats' subcommand.
 * Shows statistics about all servers the bot is in.
 *
 * @param {Client} client The Discord client.
 * @param {ChatInputCommandInteraction} interaction The command interaction.
 */
async function handleStatsSubcommand(
	client: Client,
	interaction: ChatInputCommandInteraction,
): Promise<void> {
	const isDetailed = interaction.options.getBoolean('detailed') ?? false;
	const guilds = client.guilds.cache;

	// Calculate basic stats
	const totalGuilds = guilds.size;
	const totalMembers = Array.from(guilds.values()).reduce(
		(acc: number, guild) => acc + guild.memberCount,
		0,
	);
	const averageMembers = Math.round(totalMembers / totalGuilds);
	const totalBoostLevel = Array.from(guilds.values()).reduce(
		(acc: number, guild) => acc + guild.premiumTier,
		0,
	);
	const averageBoostLevel = (totalBoostLevel / totalGuilds).toFixed(1);

	const embed = new EmbedBuilder()
		.setTitle('📊 Server Statistics')
		.setColor(DEFAULT_EMBED_COLOR)
		.setThumbnail(safeAvatarURL(client.user))
		.addFields(
			{
				name: '📈 Total Servers',
				value: totalGuilds.toLocaleString(),
				inline: true,
			},
			{
				name: '👥 Total Members',
				value: totalMembers.toLocaleString(),
				inline: true,
			},
			{
				name: '📊 Average Members',
				value: averageMembers.toLocaleString(),
				inline: true,
			},
			{
				name: '✨ Average Boost Level',
				value: averageBoostLevel,
				inline: true,
			},
		);

	if (isDetailed) {
		// Calculate detailed stats
		const boostLevels = {
			none: 0,
			tier1: 0,
			tier2: 0,
			tier3: 0,
		};

		const memberRanges = {
			'0-100': 0,
			'101-500': 0,
			'501-1000': 0,
			'1001-5000': 0,
			'5000+': 0,
		};

		guilds.forEach((guild) => {
			// Count boost levels
			boostLevels[`tier${guild.premiumTier}` as keyof typeof boostLevels]++;

			// Count member ranges
			if (guild.memberCount <= 100) memberRanges['0-100']++;
			else if (guild.memberCount <= 500) memberRanges['101-500']++;
			else if (guild.memberCount <= 1000) memberRanges['501-1000']++;
			else if (guild.memberCount <= 5000) memberRanges['1001-5000']++;
			else memberRanges['5000+']++;
		});

		embed.addFields(
			{
				name: '🚀 Boost Level Distribution',
				value: Object.entries(boostLevels)
					.map(
						([level, count]) =>
							`${level === 'none' ? 'None' : `Tier ${level.slice(-1)}`}: ${count}`,
					)
					.join('\n'),
			},
			{
				name: '👥 Member Range Distribution',
				value: Object.entries(memberRanges)
					.map(([range, count]) => `${range}: ${count}`)
					.join('\n'),
			},
		);
	}

	embed
		.setFooter({
			text: `Requested by ${interaction.user.username}`,
			iconURL: safeAvatarURL(interaction.user) ?? undefined,
		})
		.setTimestamp();

	await interaction.editReply({ embeds: [embed] });
}

/**
 * @name handleSearchSubcommand
 * @description Handles the 'search' subcommand.
 * Searches for servers by name or ID.
 *
 * @param {Client} client The Discord client.
 * @param {ChatInputCommandInteraction} interaction The command interaction.
 */
async function handleSearchSubcommand(
	client: Client,
	interaction: ChatInputCommandInteraction,
): Promise<void> {
	const query = interaction.options.getString('query', true).toLowerCase();
	const guilds = client.guilds.cache;

	// Search by name or ID
	const results = guilds.filter(
		(guild) => guild.name.toLowerCase().includes(query) || guild.id.includes(query),
	);

	if (results.size === 0) {
		await interaction.editReply({
			content: `❌ No servers found matching your search query: \`${query}\``,
			embeds: [],
		});
		return;
	}

	const embeds: EmbedBuilder[] = [];
	const MAX_RESULTS_PER_PAGE = 5;
	const totalPages = Math.ceil(results.size / MAX_RESULTS_PER_PAGE);

	let currentIndex = 0;
	results.forEach((guild) => {
		const pageIndex = Math.floor(currentIndex / MAX_RESULTS_PER_PAGE);
		if (currentIndex % MAX_RESULTS_PER_PAGE === 0) {
			embeds.push(
				new EmbedBuilder()
					.setTitle('🔍 Server Search Results')
					.setDescription(`Found **${results.size}** server(s) matching \`${query}\``)
					.setColor(DEFAULT_EMBED_COLOR)
					.setFooter({
						text: `Page ${pageIndex + 1}/${totalPages} • Requested by ${interaction.user.username}`,
						iconURL: safeAvatarURL(interaction.user) ?? undefined,
					}),
			);
		}

		const currentEmbed = embeds[pageIndex];
		currentEmbed.addFields({
			name: `🔹 ${guild.name}`,
			value: `🆔 ID: \`${guild.id}\`\n👥 Members: ${guild.memberCount.toLocaleString()}\n✨ Boost: Tier ${guild.premiumTier}`,
			inline: true,
		});
		currentIndex++;
	});

	const pagination = new Pagination(interaction, embeds, {
		type: 'button',
		enableJump: true,
		fastSkip: true,
		time: 5 * 60 * 1000,
	});
	await pagination.send();
}

export default serversCommand;
