import type { LocalCommand } from '@/types';
import { gay } from 'discord-image-utils';
import {
	AttachmentBuilder,
	type ChatInputCommandInteraction,
	type Client,
	EmbedBuilder,
	SlashCommandBuilder,
} from 'discord.js';
const gayCommand: LocalCommand = {
	data: new SlashCommandBuilder()
		.setName('gay')
		.setDescription("Add a rainbow effect to user's avatar")
		.addUserOption((option) =>
			option
				.setName('user')
				.setDescription("The user's avatar to add the effect to")
				.setRequired(false),
		)
		.setContexts([0, 1, 2])
		.setIntegrationTypes([0, 1]),
	userPermissions: [],
	botPermissions: [],
	category: 'Fun',
	cooldown: 10,
	nsfwMode: false,
	testMode: false,
	devOnly: false,

	run: async (client: Client, interaction: ChatInputCommandInteraction): Promise<void> => {
		try {
			await interaction.deferReply();

			const targetUser = interaction.options.get('user')?.user || interaction.user;

			const avatarUrl = targetUser.displayAvatarURL({
				extension: 'png',
				forceStatic: true,
				size: 512,
			});

			// Generate the Gay effect image
			const img = await gay(avatarUrl);

			// Create an attachment
			const attachment = new AttachmentBuilder(img, { name: 'gay.png' });

			// Create embed
			const embed = new EmbedBuilder()
				.setColor('#FF1493')
				.setAuthor({
					name: `${targetUser.username}'s Rainbow Avatar`,
					iconURL: client.user.displayAvatarURL(),
				})
				.setDescription(
					targetUser.id === interaction.user.id
						? `🌈 **${interaction.user.username}** added a rainbow effect to their avatar!`
						: `🌈 **${interaction.user.username}** added a rainbow effect to **${targetUser.username}**'s avatar!`,
				)
				.setImage('attachment://gay.png')
				.setTimestamp()
				.setFooter({
					text: `Requested by ${interaction.user.tag}`,
					iconURL: interaction.user.displayAvatarURL(),
				});

			await interaction.editReply({
				embeds: [embed],
				files: [attachment],
			});
		} catch (error) {
			console.error('Error generating image:', error);

			const errorEmbed = new EmbedBuilder()
				.setColor('#FF0000')
				.setTitle('❌ Error')
				.setDescription('Failed to generate the image. Please try again later.')
				.setTimestamp();

			await interaction.editReply({
				embeds: [errorEmbed],
			});
		}
	},
};

export default gayCommand;
