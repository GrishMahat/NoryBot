import {
	EmbedBuilder,
	SlashCommandBuilder,
	AttachmentBuilder,
	Client,
	ChatInputCommandInteraction,
} from 'discord.js';
import DIG from 'discord-image-generation';

const beautifulCommand: LocalCommand = {
	data: new SlashCommandBuilder()
		.setName('beautiful')
		.setDescription("Create a 'This is Beautiful' meme with someone's avatar")
		.addUserOption((option) =>
			option
				.setName('user')
				.setDescription("The user who's beautiful")
				.setRequired(false),
		)
		.setContexts([0, 1, 2])
		.setIntegrationTypes([0, 1])
		.toJSON(),
	userPermissions: [],
	botPermissions: [],
	category: 'Image',
	cooldown: 15,
	nsfwMode: false,
	testMode: false,
	devOnly: false,

	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction,
	): Promise<void> => {
		try {
			await interaction.deferReply();

			const targetUser =
				interaction.options.get('user')?.user || interaction.user;

			const avatarUrl = targetUser.displayAvatarURL({
				extension: 'png',
				forceStatic: true,
				size: 512,
			});

			// Generate the Beautiful image
			const img = await new DIG.Beautiful().getImage(avatarUrl);

			// Create an attachment using AttachmentBuilder
			const attachment = new AttachmentBuilder(img, {
				name: 'beautiful.png',
			});

			// Create an informative and attractive embed
			const embed = new EmbedBuilder()
				.setColor('#FF69B4') // Pink color for beauty
				.setAuthor({
					name: 'This is Beautiful',
					iconURL: client.user.displayAvatarURL(),
				})
				.setDescription(
					targetUser.id === interaction.user.id
						? `✨ **${interaction.user.username}** has found their inner beauty!`
						: `✨ **${interaction.user.username}** thinks **${targetUser.username}** is beautiful!`,
				)
				.addFields(
					{
						name: '🎨 Masterpiece',
						value: `<@${targetUser.id}>`,
						inline: true,
					},
					{
						name: '🖼️ Frame',
						value: 'Gravity Falls Style',
						inline: true,
					},
				)
				.setImage('attachment://beautiful.png')
				.setTimestamp()
				.setFooter({
					text: '✨ I could stare at this all day! ✨',
					iconURL: interaction.user.displayAvatarURL(),
				});

			await interaction.editReply({
				embeds: [embed],
				files: [attachment],
			});
		} catch (error) {
			console.error('Error while generating Beautiful image:', error);

			const errorEmbed = new EmbedBuilder()
				.setColor('#FF0000')
				.setTitle('❌ Error')
				.setDescription(
					'Failed to generate the beautiful meme. Please try again later.',
				)
				.setTimestamp();

			await interaction.editReply({
				embeds: [errorEmbed],
			});
		}
	},
};

export default beautifulCommand;
