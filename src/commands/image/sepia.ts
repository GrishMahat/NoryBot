import {
	AttachmentBuilder,
	type ChatInputCommandInteraction,
	type Client,
	EmbedBuilder,
	SlashCommandBuilder,
} from 'discord.js';
import { sepia } from 'discord-image-utils';

const sepiaCommand: Command = {
	data: new SlashCommandBuilder()
		.setName('sepia')
		.setDescription("Add a vintage sepia effect to someone's avatar")
		.addUserOption((option) =>
			option
				.setName('user')
				.setDescription('The user whose avatar to apply the effect to')
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

	run: async (_client: Client, interaction: ChatInputCommandInteraction): Promise<void> => {
		try {
			await interaction.deferReply();

			const targetUser = interaction.options.get('user')?.user || interaction.user;

			const avatarUrl = targetUser.displayAvatarURL({
				extension: 'png',
				forceStatic: true,
				size: 512,
			});

			// Generate the sepia image
			const img = await sepia(avatarUrl);

			// Create an attachment
			const attachment = new AttachmentBuilder(img, { name: 'sepia.png' });

			const embed = new EmbedBuilder()
				.setColor('#8B4513')
				.setDescription(`${targetUser.toString()}'s avatar with a vintage effect`)
				.setImage('attachment://sepia.png')
				.setTimestamp();

			await interaction.editReply({
				embeds: [embed],
				files: [attachment],
			});
		} catch (error) {
			console.error('Error in sepia command:', error);
			await interaction.editReply('Failed to generate the image.');
		}
	},
};

export default sepiaCommand;
