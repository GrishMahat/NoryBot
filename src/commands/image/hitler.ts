import {
	AttachmentBuilder,
	type ChatInputCommandInteraction,
	type Client,
	EmbedBuilder,
	SlashCommandBuilder,
} from 'discord.js';
import { hitler } from 'discord-image-utils';
import type { Command } from '@/types';

const hitlerCommand: Command = {
	data: new SlashCommandBuilder()
		.setName('hitler')
		.setDescription('Create a "Worse than Hitler" history channel meme')
		.addUserOption((option) =>
			option.setName('user').setDescription('The user to feature in the meme').setRequired(false),
		)
		.setContexts([0, 1, 2])
		.setIntegrationTypes([0, 1]),
	userPermissions: [],
	botPermissions: [],
	category: 'Image',
	cooldown: 15,
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

			// Generate the Hitler image
			const img = await hitler(avatarUrl);

			// Create an attachment
			const attachment = new AttachmentBuilder(img, { name: 'hitler.png' });

			const embed = new EmbedBuilder()
				.setColor('#8B4513')
				.setAuthor({
					name: 'History Channel at Midnight',
					iconURL: client.user.displayAvatarURL(),
				})
				.setDescription(
					targetUser.id === interaction.user.id
						? `📺 **${interaction.user.username}** made a historical appearance!`
						: `📺 **${interaction.user.username}** put **${targetUser.username}** in a history meme!`,
				)
				.setImage('attachment://hitler.png')
				.setTimestamp()
				.setFooter({
					text: 'As seen on History Channel™',
					iconURL: interaction.user.displayAvatarURL(),
				});

			await interaction.editReply({
				embeds: [embed],
				files: [attachment],
			});
		} catch (error) {
			console.error('Error generating history meme:', error);
			await interaction.editReply({
				embeds: [
					new EmbedBuilder()
						.setColor('#FF0000')
						.setTitle('❌ Error')
						.setDescription('Failed to generate the history meme. Please try again later.')
						.setTimestamp(),
				],
			});
		}
	},
};

export default hitlerCommand;
