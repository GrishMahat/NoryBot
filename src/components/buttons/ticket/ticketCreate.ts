import {
	ActionRowBuilder,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	ChannelType,
	EmbedBuilder,
	PermissionFlagsBits,
} from 'discord.js';
import Ticket from '@/database/models/ticketSchema';
import TicketSetup from '@/database/schemas/ticketSetupSchema';
import type { Button } from '@/types';

const button: Button = {
	customId: 'ticket_create',
	run: async (client, interaction: ButtonInteraction) => {
		try {
			await interaction.deferReply({ ephemeral: true });

			const setup = await TicketSetup.findOne({ guildID: interaction.guildId });
			if (!setup) {
				await interaction.editReply({
					content: 'Ticket system is not set up properly.',
				});
				return;
			}

			// Check if user already has an open ticket
			const existingTicket = await Ticket.findOne({
				guildID: interaction.guildId,
				ticketMemberID: interaction.user.id,
				closed: false,
			});

			if (existingTicket) {
				await interaction.editReply({
					content: `You already have an open ticket: <#${existingTicket.ticketChannelID}>`,
				});
				return;
			}

			const guild = interaction.guild;
			if (!guild) return;

			// Create Ticket Channel
			const channel = await guild.channels.create({
				name: `ticket-${interaction.user.username}`,
				type: ChannelType.GuildText,
				parent: setup.categoryID,
				permissionOverwrites: [
					{
						id: guild.id,
						deny: [PermissionFlagsBits.ViewChannel],
					},
					{
						id: interaction.user.id,
						allow: [
							PermissionFlagsBits.ViewChannel,
							PermissionFlagsBits.SendMessages,
							PermissionFlagsBits.ReadMessageHistory,
						],
					},
					{
						id: setup.staffRoleID,
						allow: [
							PermissionFlagsBits.ViewChannel,
							PermissionFlagsBits.SendMessages,
							PermissionFlagsBits.ReadMessageHistory,
						],
					},
					{
						id: client.user?.id || '',
						allow: [
							PermissionFlagsBits.ViewChannel,
							PermissionFlagsBits.SendMessages,
							PermissionFlagsBits.ReadMessageHistory,
							PermissionFlagsBits.ManageChannels,
						],
					},
				],
			});

			// Save to DB
			await Ticket.create({
				guildID: guild.id,
				ticketMemberID: interaction.user.id,
				ticketChannelID: channel.id,
				parentTicketChannelID: setup.ticketChannelID,
				closed: false,
				status: 'open',
			});

			// Send Control Panel to Ticket Channel
			const embed = new EmbedBuilder()
				.setColor('Blue')
				.setTitle(`Ticket for ${interaction.user.username}`)
				.setDescription(
					'Support will be with you shortly.\nUse the buttons below to manage this ticket.',
				)
				.setTimestamp();

			const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
				new ButtonBuilder()
					.setCustomId('ticket_close')
					.setLabel('Close')
					.setStyle(ButtonStyle.Danger)
					.setEmoji('🔒'),
				new ButtonBuilder()
					.setCustomId('ticket_lock')
					.setLabel('Lock')
					.setStyle(ButtonStyle.Secondary)
					.setEmoji('🛡️'),
			);

			await channel.send({
				content: `<@${interaction.user.id}> <@&${setup.staffRoleID}>`,
				embeds: [embed],
				components: [buttons],
			});

			await interaction.editReply({
				content: `Ticket created! <#${channel.id}>`,
			});
		} catch (error) {
			console.error(error);
			await interaction.editReply({
				content: 'Failed to create ticket channel. Check bot permissions.',
			});
		}
	},
};

export default button;
