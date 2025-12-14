import {
	AttachmentBuilder,
	type ChatInputCommandInteraction,
	type Client,
	EmbedBuilder,
	MessageFlags,
	SlashCommandBuilder,
} from 'discord.js';
import { bed } from 'discord-image-utils';

const bedCommand: Command = {
	data: new SlashCommandBuilder()
		.setName('bed')
		.setDescription('Create a "Dad, there\'s a monster under my bed" meme')
		.addUserOption((option) =>
			option.setName('target').setDescription('The user under the bed').setRequired(true),
		)
		.addUserOption((option) =>
			option
				.setName('scared')
				.setDescription('The scared user (defaults to you)')
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
			const targetUser = interaction.options.get('target')?.user;
			const scaredUser = interaction.options.get('scared')?.user || interaction.user;

			if (!targetUser) {
				// For required parameter errors, respond immediately without deferring
				await interaction.reply({
					content: '❌ You need to specify a user to put under the bed!',
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			// Only defer if we pass initial validation
			await interaction.deferReply();

			const targetAvatar = targetUser.displayAvatarURL({
				extension: 'png',
				forceStatic: true,
				size: 512,
			});

			const scaredAvatar = scaredUser.displayAvatarURL({
				extension: 'png',
				forceStatic: true,
				size: 512,
			});

			// Generate the Bed image
			const img = await bed(scaredAvatar, targetAvatar);

			// Create an attachment using AttachmentBuilder
			const attachment = new AttachmentBuilder(img, { name: 'bed.png' });

			// Create an informative and attractive embed
			const embed = new EmbedBuilder()
				.setColor('#6B4423') // Brown color for bed theme
				.setAuthor({
					name: 'Monster Under The Bed!',
					iconURL: client.user.displayAvatarURL(),
				})
				.setDescription(
					`👻 **${scaredUser.username}** found **${targetUser.username}** under their bed!`,
				)
				.addFields(
					{
						name: '😱 Scared One',
						value: `<@${scaredUser.id}>`,
						inline: true,
					},
					{
						name: '👹 Monster',
						value: `<@${targetUser.id}>`,
						inline: true,
					},
				)
				.setImage('attachment://bed.png')
				.setTimestamp()
				.setFooter({
					text: '🛏️ Check under your bed before sleeping!',
					iconURL: interaction.user.displayAvatarURL(),
				});

			await interaction.editReply({
				embeds: [embed],
				files: [attachment],
			});
		} catch (error) {
			console.error('Error while generating Bed image:', error);

			// If the interaction wasn't deferred yet, use reply
			if (!interaction.deferred) {
				await interaction.reply({
					embeds: [
						new EmbedBuilder()
							.setColor('#FF0000')
							.setTitle('❌ Error')
							.setDescription(
								'Failed to generate the bed meme. Please make sure all users are valid and try again.',
							)
							.setTimestamp(),
					],
					flags: MessageFlags.Ephemeral,
				});
				return;
			}

			// If the interaction was deferred, delete the reply and send a new ephemeral message
			await interaction.deleteReply();
			await interaction.followUp({
				embeds: [
					new EmbedBuilder()
						.setColor('#FF0000')
						.setTitle('❌ Error')
						.setDescription(
							'Failed to generate the bed meme. Please make sure all users are valid and try again.',
						)
						.setTimestamp(),
				],
				flags: MessageFlags.Ephemeral,
			});
		}
	},
};

export default bedCommand;
