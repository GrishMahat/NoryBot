import type { TextChannel } from 'discord.js';
import Ticket from '@/database/models/ticketSchema';
import type { Button } from '@/types';

const button: Button = {
	customId: 'ticket_unlock',
	run: async (_client, interaction) => {
		try {
			await interaction.deferReply({ ephemeral: true });

			const ticket = await Ticket.findOne({ ticketChannelID: interaction.channelId });
			if (!ticket) {
				await interaction.editReply('This is not a ticket channel.');
				return;
			}

			const channel = interaction.channel as TextChannel;

			// Update Permissions to allow send messages for the ticket owner
			await channel.permissionOverwrites.edit(ticket.ticketMemberID, {
				SendMessages: true,
			});

			ticket.status = 'open';
			await ticket.save();

			await interaction.editReply('Ticket unlocked.');
			await channel.send(`🔓 Ticket unlocked by ${interaction.user}`);
		} catch (error) {
			console.error(error);
			await interaction.editReply('Failed to unlock ticket.');
		}
	},
};

export default button;
