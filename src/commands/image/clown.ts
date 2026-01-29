import {
	AttachmentBuilder,
	type ChatInputCommandInteraction,
	type Client,
	EmbedBuilder,
	SlashCommandBuilder,
} from 'discord.js';
import { clown } from 'discord-image-utils';
import { logs } from '@/services/logs';
import type { Command } from '@/types';

const clownCommand: Command = {
	data: new SlashCommandBuilder()
		.setName('clown')
		.setDescription("Generates an image of a user's avatar as a clown")
		.addUserOption((option) =>
			option
				.setName('user')
				.setDescription('User whose avatar you want to turn into a clown')
				.setRequired(false),
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

			// Generate the Clown image
			const img = await clown(avatarUrl);

			// Create an attachment using AttachmentBuilder
			const attachment = new AttachmentBuilder(img, { name: 'clown.png' });

			// Create a clean, attractive embed
			const embed = new EmbedBuilder()
				.setColor('#FF69B4')
				.setAuthor({
					name:
						targetUser.id === interaction.user.id ? 'Self-Clownification' : 'Clown Transformation',
					iconURL: client.user?.displayAvatarURL(),
				})
				.setDescription(
					targetUser.id === interaction.user.id
						? `🤡 **${interaction.user.username}** joined the circus!`
						: `🤡 **${interaction.user.username}** turned **${targetUser.username}** into a clown!`,
				)
				.setImage('attachment://clown.png')
				.setTimestamp()
				.setFooter({
					text: 'Honk honk! 🎪',
					iconURL: interaction.user.displayAvatarURL(),
				});

			await interaction.editReply({
				embeds: [embed],
				files: [attachment],
			});
		} catch (error) {
			logs.error('Error while generating clown image', { tag: 'ImageClown', context: error });

			const errorEmbed = new EmbedBuilder()
				.setColor('#FF0000')
				.setTitle('❌ Error')
				.setDescription('Failed to generate the clown image. Please try again later.')
				.setTimestamp();

			await interaction.editReply({
				embeds: [errorEmbed],
			});
		}
	},
};

export default clownCommand;
