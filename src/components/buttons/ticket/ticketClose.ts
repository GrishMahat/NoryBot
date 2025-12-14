import { AttachmentBuilder, EmbedBuilder, type TextChannel } from 'discord.js';
import Ticket from '@/database/models/ticketSchema';
import TicketSetup from '@/database/schemas/ticketSetupSchema';
import type { Button } from '@/types';

const button: Button = {
	customId: 'ticket_close',
	run: async (_client, interaction) => {
		try {
			await interaction.deferReply();

			const ticket = await Ticket.findOne({ ticketChannelID: interaction.channelId });
			if (!ticket) {
				await interaction.editReply({ content: 'This is not a valid ticket channel.' });
				return;
			}

			if (ticket.closed) {
				await interaction.editReply({ content: 'Ticket is already closed.' });
				return;
			}

			const setup = await TicketSetup.findOne({ guildID: interaction.guildId });
			const logChannelId = setup?.logChannelID;

			// Close Ticket in DB
			ticket.closed = true;
			ticket.status = 'closed';
			ticket.closeReason = 'Closed by user/staff';
			await ticket.save();

			// Generate Transcript (Mock - just text for now, can be improved later)
			// In a real scenario, we'd fetch messages and format them.
			const transcriptText = `Transcript for Ticket ${ticket.ticketChannelID}\nClosed by: ${interaction.user.tag}\nTime: ${new Date().toISOString()}`;
			const transcriptBuffer = Buffer.from(transcriptText, 'utf-8');
			const attachment = new AttachmentBuilder(transcriptBuffer, {
				name: `transcript-${ticket.ticketChannelID}.txt`,
			});

			const channel = interaction.channel as TextChannel;

			await interaction.editReply({ content: 'Ticket closed. Deleting in 5 seconds...' });

			// Send Log
			if (logChannelId) {
				const logChannel = interaction.guild?.channels.cache.get(logChannelId) as TextChannel;
				if (logChannel) {
					const logEmbed = new EmbedBuilder()
						.setColor('Red')
						.setTitle('Ticket Closed')
						.addFields(
							{ name: 'Ticket ID', value: ticket.ticketChannelID, inline: true },
							{ name: 'Closed By', value: interaction.user.tag, inline: true },
							{ name: 'Owner', value: `<@${ticket.ticketMemberID}>`, inline: true },
						)
						.setTimestamp();

					await logChannel.send({ embeds: [logEmbed], files: [attachment] });
				}
			}

			// Delete Channel
			setTimeout(async () => {
				if (channel && !channel.guild.members.me?.permissions.has('ManageChannels')) {
					console.log('Missing permissions to delete channel');
					return;
				}
				await channel.delete().catch(() => {});
			}, 5000);
		} catch (error) {
			console.error(error);
		}
	},
};

export default button;
