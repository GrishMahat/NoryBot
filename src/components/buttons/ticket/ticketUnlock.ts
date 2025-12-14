import { PermissionFlagsBits, type TextChannel } from 'discord.js';
import Ticket from '@/database/models/ticketSchema';
import TicketSetup from '@/database/schemas/ticketSetupSchema';
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

			if (ticket.status !== 'locked') {
				await interaction.editReply('This ticket is not locked.');
				return;
			}

			if (!interaction.channel?.isTextBased() || interaction.channel.isDMBased()) {
				await interaction.editReply('This command can only be used in a guild text channel.');
				return;
			}

			const setup = await TicketSetup.findOne({ guildID: interaction.guildId });
			const member = interaction.member;

			// Permission Check: Owner OR Staff Role OR Manage Channels
			const isOwner = ticket.ticketMemberID === interaction.user.id;
			// biome-ignore lint/suspicious/noExplicitAny: Member types
			const hasStaffRole = setup && member && (member.roles as any).cache.has(setup.staffRoleID);
			const hasPermission =
				member &&
				// biome-ignore lint/suspicious/noExplicitAny: Member types
				(member.permissions as any).has(PermissionFlagsBits.ManageChannels);

			if (!isOwner && !hasStaffRole && !hasPermission) {
				await interaction.editReply('You are not authorized to unlock this ticket.');
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
