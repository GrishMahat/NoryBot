import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	type ChatInputCommandInteraction,
	type Client,
	EmbedBuilder,
	PermissionFlagsBits,
	SlashCommandBuilder,
	type TextChannel,
} from 'discord.js';
import TicketSetup from '@/database/schemas/ticketSetupSchema';
import type { Command } from '@/types';

const command: Command = {
	data: new SlashCommandBuilder()
		.setName('ticket')
		.setDescription('Manage the ticket system')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('setup')
				.setDescription('Setup the ticket system')
				.addChannelOption((option) =>
					option
						.setName('channel')
						.setDescription('The channel to send the ticket panel to')
						.addChannelTypes(ChannelType.GuildText)
						.setRequired(true),
				)
				.addChannelOption((option) =>
					option
						.setName('category')
						.setDescription('The category to create tickets in')
						.addChannelTypes(ChannelType.GuildCategory)
						.setRequired(true),
				)
				.addRoleOption((option) =>
					option
						.setName('staff')
						.setDescription('The staff role to ping when a ticket is created')
						.setRequired(true),
				)
				.addChannelOption((option) =>
					option
						.setName('logs')
						.setDescription('The channel to send ticket logs to')
						.addChannelTypes(ChannelType.GuildText)
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand.setName('panel').setDescription('Send the ticket panel to the configured channel'),
		),
	userPermissions: [PermissionFlagsBits.Administrator],

	run: async (_client: Client, interaction: ChatInputCommandInteraction) => {
		const subcommand = interaction.options.getSubcommand();

		if (subcommand === 'setup') {
			const channel = interaction.options.getChannel('channel') as TextChannel;
			const category = interaction.options.getChannel('category');
			const staffRole = interaction.options.getRole('staff');
			const logChannel = interaction.options.getChannel('logs') as TextChannel;

			try {
				await TicketSetup.findOneAndUpdate(
					{ guildID: interaction.guildId },
					{
						guildID: interaction.guildId,
						ticketChannelID: channel.id,
						categoryID: category?.id,
						staffRoleID: staffRole?.id,
						logChannelID: logChannel.id,
						ticketType: 'default',
						messageID: '', // Will be updated when panel is sent
					},
					{ upsert: true, new: true },
				);

				const embed = new EmbedBuilder()
					.setColor('Green')
					.setTitle('Ticket System Setup')
					.setDescription('The ticket system has been successfully configured!')
					.addFields(
						{ name: 'Panel Channel', value: `${channel}`, inline: true },
						{ name: 'Category', value: `${category}`, inline: true },
						{ name: 'Staff Role', value: `${staffRole}`, inline: true },
						{ name: 'Log Channel', value: `${logChannel}`, inline: true },
					);

				await interaction.reply({ embeds: [embed], ephemeral: true });
			} catch (error) {
				console.error(error);
				await interaction.reply({
					content: 'An error occurred while setting up the ticket system.',
					ephemeral: true,
				});
			}
		}

		if (subcommand === 'panel') {
			const setup = await TicketSetup.findOne({ guildID: interaction.guildId });

			if (!setup) {
				await interaction.reply({
					content: 'Ticket system is not set up! Run `/ticket setup` first.',
					ephemeral: true,
				});
				return;
			}

			const embed = new EmbedBuilder()
				.setColor('Blue')
				.setTitle('Support Tickets')
				.setDescription('Click the button below to open a support ticket.')
				.setFooter({ text: 'Powered by NoryBot' });

			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId('ticket_create')
					.setLabel('Create Ticket')
					.setStyle(ButtonStyle.Primary)
					.setEmoji('📩'),
			);

			const channel = interaction.guild?.channels.cache.get(setup.ticketChannelID) as TextChannel;

			if (!channel) {
				await interaction.reply({
					content: 'Configured ticket channel not found!',
					ephemeral: true,
				});
				return;
			}

			const message = await channel.send({
				embeds: [embed],
				components: [row],
			});

			// Update setup with message ID
			setup.messageID = message.id;
			await setup.save();

			await interaction.reply({
				content: 'Ticket panel sent!',
				ephemeral: true,
			});
		}
	},
};

export default command;
