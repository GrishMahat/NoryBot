/** @format */

import {
	SlashCommandBuilder,
	EmbedBuilder,
	PermissionFlagsBits,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	Client,
	Guild,
	GuildMember,
	ButtonInteraction,
	ComponentType,
	ChatInputCommandInteraction,
	TextChannel,
} from 'discord.js';
import paginateEmbeds from '../../utils/helpers/Pagination.js';
import { LocalCommand } from '../../types/index.js';

interface GuildInfo {
	name: string;
	memberCount: number;
	id: string;
	inviteLink: string;
	owner: GuildMember;
	createdAt: Date;
	boostLevel: number;
}

const serversCommand: LocalCommand = {
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
						.setDescription('Show detailed server information')
						.setRequired(false),
				)
				.addStringOption((option) =>
					option
						.setName('sort')
						.setDescription('Sort servers by a specific criteria')
						.setRequired(false)
						.addChoices(
							{ name: 'Name', value: 'name' },
							{ name: 'Member Count', value: 'memberCount' },
							{ name: 'Creation Date', value: 'createdAt' },
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
				.setDescription(
					'Check if the bot is in specified servers by their IDs.',
				)
				.addStringOption((option) =>
					option
						.setName('server-ids')
						.setDescription('Comma-separated IDs of the servers to check.')
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('user')
				.setDescription('Show the number of servers a user owns.')
				.addUserOption((option) =>
					option
						.setName('user')
						.setDescription('The user to check.')
						.setRequired(true),
				),
		)
		.toJSON(),
	userPermissions: [PermissionFlagsBits.Administrator],
	botPermissions: [],
	cooldown: 10,
	nsfwMode: false,
	testMode: false,
	devOnly: true,
	category: 'Developer',

	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction,
	): Promise<void> => {
		await interaction.deferReply();
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
				default:
					throw new Error(`Unknown subcommand: ${subcommand}`);
			}
		} catch (error) {
			console.error(`Error in servers command (${subcommand}):`, error);
			await interaction.editReply({
				content:
					'An error occurred while processing your request. Please try again later.',
			});
		}
	},
};

async function handleListSubcommand(
	client: Client,
	interaction: ChatInputCommandInteraction,
): Promise<void> {
	const isDetailed = interaction.options.getBoolean('detailed') ?? false;
	const sortOption = interaction.options.getString('sort') ?? 'name';

	const guilds = await Promise.all(
		client.guilds.cache.map(async (guild: Guild) => {
			let inviteLink = 'No invite link available';
			try {
				const channels = guild.channels.cache.filter(
					(channel): channel is TextChannel =>
						channel.type === 0 &&
						channel
							.permissionsFor(guild.members.me)
							.has(PermissionFlagsBits.CreateInstantInvite),
				);
				if (channels.size > 0) {
					const firstChannel = channels.first();
					if (firstChannel) {
						const invite = await firstChannel.createInvite({
							maxAge: 0,
							maxUses: 0,
						});
						inviteLink = invite.url;
					}
				}
			} catch (error) {
				console.error(`Could not create invite for guild ${guild.id}:`, error);
			}
			return {
				name: guild.name,
				memberCount: guild.memberCount,
				id: guild.id,
				inviteLink,
				owner: await guild.fetchOwner(),
				createdAt: guild.createdAt,
				boostLevel: guild.premiumTier,
			} as GuildInfo;
		}),
	);

	guilds.sort((a, b) => {
		if (sortOption === 'memberCount') {
			return b.memberCount - a.memberCount;
		} else if (sortOption === 'createdAt') {
			return b.createdAt.getTime() - a.createdAt.getTime();
		} else {
			return a.name.localeCompare(b.name);
		}
	});

	if (guilds.length === 0) {
		await interaction.editReply('The bot is not in any servers.');
		return;
	}

	const embeds = createServerListEmbeds(
		client,
		interaction,
		guilds,
		isDetailed,
		sortOption,
	);
	await paginateEmbeds(interaction, embeds, { type: 'button' });
}

function createServerListEmbeds(
	client: Client,
	interaction: ChatInputCommandInteraction,
	guilds: GuildInfo[],
	isDetailed: boolean,
	sortOption: string,
): EmbedBuilder[] {
	const MAX_FIELDS = isDetailed ? 4 : 8;
	const embeds: EmbedBuilder[] = [];

	for (let i = 0; i < guilds.length; i += MAX_FIELDS) {
		const currentGuilds = guilds.slice(i, i + MAX_FIELDS);
		const embed = new EmbedBuilder()
			.setTitle('Servers List')
			.setDescription(
				`The bot is in **${guilds.length}** servers. Sorted by: ${sortOption}`,
			)
			.setColor('Green')
			.setThumbnail(client.user?.displayAvatarURL())
			.setFooter({
				text: `Page ${Math.floor(i / MAX_FIELDS) + 1}/${Math.ceil(guilds.length / MAX_FIELDS)} • Requested by ${interaction.user.username}`,
				iconURL: interaction.user.displayAvatarURL({
					forceStatic: false,
					size: 1024,
				}),
			});

		currentGuilds.forEach((guild) => {
			const fieldValue = isDetailed
				? `ID: ${guild.id}\nMembers: ${guild.memberCount}\nOwner: ${guild.owner.user.tag}\nCreated: ${guild.createdAt.toDateString()}\nBoost Level: ${guild.boostLevel}\n[Invite Link](${guild.inviteLink})`
				: `ID: ${guild.id}\nMembers: ${guild.memberCount}\n[Invite Link](${guild.inviteLink})`;

			embed.addFields({ name: guild.name, value: fieldValue, inline: true });
		});

		embeds.push(embed);
	}

	return embeds;
}

async function handleLeaveSubcommand(
	client: Client,
	interaction: ChatInputCommandInteraction,
): Promise<void> {
	const serverId = interaction.options.getString('server-id', true);
	const guild = client.guilds.cache.get(serverId);

	if (!guild) {
		await interaction.editReply(
			`I am not in a server with the ID ${serverId}.`,
		);
		return;
	}

	const confirmButton = new ButtonBuilder()
		.setCustomId('confirm_leave')
		.setLabel('Confirm Leave')
		.setStyle(ButtonStyle.Danger);

	const cancelButton = new ButtonBuilder()
		.setCustomId('cancel_leave')
		.setLabel('Cancel')
		.setStyle(ButtonStyle.Secondary);

	const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
		confirmButton,
		cancelButton,
	);

	const response = await interaction.editReply({
		content: `Are you sure you want me to leave the server **${guild.name}** (ID: ${serverId})?`,
		components: [row],
	});

	try {
		const confirmation = await response.awaitMessageComponent({
			filter: (i: ButtonInteraction) => i.user.id === interaction.user.id,
			time: 30000,
			componentType: ComponentType.Button,
		});

		if (confirmation.customId === 'confirm_leave') {
			await guild.leave();
			await confirmation.update({
				content: `I have left the server **${guild.name}** (ID: ${serverId}).`,
				components: [],
			});
		} else {
			await confirmation.update({
				content: 'Server leave cancelled.',
				components: [],
			});
		}
	} catch (error) {
		await interaction.editReply({
			content:
				'No response received within 30 seconds, cancelling server leave.',
			components: [],
		});
		throw error;
	}
}

async function handleCheckSubcommand(
	client: Client,
	interaction: ChatInputCommandInteraction,
): Promise<void> {
	const serverIds = interaction.options
		.getString('server-ids', true)
		.split(',')
		.map((id) => id.trim());

	if (serverIds.length > 10) {
		await interaction.editReply(
			'Please provide 10 or fewer server IDs to check.',
		);
		return;
	}

	const results = await Promise.all(
		serverIds.map(async (serverId) => {
			const guild = client.guilds.cache.get(serverId);
			if (guild) {
				const owner = await guild.fetchOwner();
				return new EmbedBuilder()
					.setTitle(`Server Information: ${guild.name}`)
					.setDescription(`The bot is in this server.`)
					.addFields(
						{ name: 'Server ID', value: serverId, inline: true },
						{ name: 'Owner', value: owner.user.tag, inline: true },
						{
							name: 'Members',
							value: guild.memberCount.toString(),
							inline: true,
						},
						{
							name: 'Created At',
							value: guild.createdAt.toDateString(),
							inline: true,
						},
						{
							name: 'Boost Level',
							value: guild.premiumTier.toString(),
							inline: true,
						},
					)
					.setColor('Green');
			} else {
				return new EmbedBuilder()
					.setTitle(`Server Not Found`)
					.setDescription(`The bot is not in a server with the ID ${serverId}.`)
					.setColor('Red');
			}
		}),
	);

	await interaction.editReply({ embeds: results });
}

async function handleUserSubcommand(
	client: Client,
	interaction: ChatInputCommandInteraction,
): Promise<void> {
	const user = interaction.options.getUser('user', true);
	const userServers = client.guilds.cache.filter(
		(guild) => guild.ownerId === user.id,
	);
	const serverCount = userServers.size;

	const serverList = userServers
		.map(
			(guild) =>
				`- ${guild.name} (ID: ${guild.id}, Members: ${guild.memberCount})`,
		)
		.join('\n');

	const embed = new EmbedBuilder()
		.setTitle(`Servers Owned by ${user.username}`)
		.setDescription(
			`User ${user.username} (ID: ${user.id}) owns **${serverCount}** server(s) that the bot is in.`,
		)
		.setColor('Green')
		.addFields({
			name: 'Server List',
			value: serverList || 'No servers found.',
		})
		.setFooter({
			text: `Requested by ${interaction.user.username}`,
			iconURL: interaction.user.displayAvatarURL({
				forceStatic: false,
				size: 1024,
			}),
		});

	await interaction.editReply({ embeds: [embed] });
}

export default serversCommand;
