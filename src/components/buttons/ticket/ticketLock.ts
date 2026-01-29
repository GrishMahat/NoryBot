import { PermissionFlagsBits, type TextChannel } from 'discord.js';
import Ticket from '@/database/models/ticketSchema';
import { logs } from '@/services/logs';
import type { Button } from '@/types';

const button: Button = {
	customId: 'ticket_lock',
	userPermissions: [PermissionFlagsBits.ManageChannels],
	botPermissions: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.SendMessages],
	run: async (_client, interaction) => {
		try {
			await interaction.deferReply({ ephemeral: true });

			const ticket = await Ticket.findOne({ ticketChannelID: interaction.channelId });
			if (!ticket) {
				await interaction.editReply('This is not a ticket channel.');
				return;
			}

			if (!interaction.channel?.isTextBased() || interaction.channel.isDMBased()) {
				await interaction.editReply('This command can only be used in a guild text channel.');
				return;
			}

			const channel = interaction.channel as TextChannel;

			// Update Permissions to deny view for the ticket owner
			await channel.permissionOverwrites.edit(ticket.ticketMemberID, {
				SendMessages: false,
			});

			ticket.status = 'locked';
			await ticket.save();

			await interaction.editReply('Ticket locked. User cannot send messages.');
			await channel.send(`🔒 Ticket locked by ${interaction.user}`);
		} catch (error) {
			logs.error('Ticket lock error', { tag: 'TicketLock', context: error });
			await interaction.editReply('Failed to lock ticket.');
		}
	},
};

export default button;
