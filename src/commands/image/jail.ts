import {
	AttachmentBuilder,
	type ChatInputCommandInteraction,
	type Client,
	EmbedBuilder,
	SlashCommandBuilder,
} from 'discord.js';
import { jail } from 'discord-image-utils';

const jailCommand: Command = {
	data: new SlashCommandBuilder()
		.setName('jail')
		.setDescription("Put someone's avatar behind bars")
		.addUserOption((option) =>
			option.setName('user').setDescription('The user to put in jail').setRequired(false),
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

			const img = await jail(avatarUrl);
			const attachment = new AttachmentBuilder(img, { name: 'jail.png' });

			const embed = new EmbedBuilder()
				.setColor('#808080')
				.setDescription(`${targetUser.toString()} is now behind bars!`)
				.setImage('attachment://jail.png')
				.setTimestamp();

			await interaction.editReply({
				embeds: [embed],
				files: [attachment],
			});
		} catch (error) {
			console.error('Error in jail command:', error);
			await interaction.editReply('Failed to generate the image.');
		}
	},
};

export default jailCommand;
