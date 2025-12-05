import { wanted } from 'discord-image-utils';
import {
	AttachmentBuilder,
	type ChatInputCommandInteraction,
	type Client,
	EmbedBuilder,
	SlashCommandBuilder,
} from 'discord.js';
import type { LocalCommand } from '../../types/index';

const wantedCommand: LocalCommand = {
	data: new SlashCommandBuilder()
		.setName('wanted')
		.setDescription("Create a wanted poster with someone's avatar")
		.addUserOption((option) =>
			option
				.setName('user')
				.setDescription('The user to put on the wanted poster')
				.setRequired(false),
		)
		.addStringOption((option) =>
			option
				.setName('currency')
				.setDescription('The currency symbol (default: $)')
				.setRequired(false)
				.setMaxLength(1),
		)
		.addNumberOption((option) =>
			option
				.setName('amount')
				.setDescription('The reward amount (default: random)')
				.setRequired(false)
				.setMinValue(1)
				.setMaxValue(10000000000000),
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

	run: async (client: Client, interaction: ChatInputCommandInteraction) => {
		try {
			await interaction.deferReply();

			const targetUser = interaction.options.get('user')?.user || interaction.user;
			const currency = interaction.options.get('currency')?.value?.toString() || '$';
			const amount =
				(interaction.options.get('amount')?.value as number) || Math.floor(Math.random() * 1000000);

			if (currency.length > 1) {
				interaction.editReply({
					content: 'Currency symbol must be a single character',
				});
				return;
			}

			const avatarUrl = targetUser.displayAvatarURL({
				extension: 'png',
				forceStatic: true,
				size: 512,
			});

			// Generate the Wanted image
			const img = await wanted(avatarUrl, currency, amount);

			// Create an attachment
			const attachment = new AttachmentBuilder(img, { name: 'wanted.png' });

			const embed = new EmbedBuilder()
				.setColor('#8B0000')
				.setAuthor({
					name: 'WANTED: DEAD OR ALIVE',
					iconURL: client.user.displayAvatarURL(),
				})
				.setDescription(
					`🤠 **WANTED:** ${targetUser.toString()}\n💰 **Reward:** ${currency}${amount.toLocaleString()}`,
				)
				.setImage('attachment://wanted.png')
				.setTimestamp()
				.setFooter({
					text: `Posted by Sheriff ${interaction.user.tag}`,
					iconURL: interaction.user.displayAvatarURL(),
				});

			await interaction.editReply({
				embeds: [embed],
				files: [attachment],
			});
		} catch (error) {
			console.error('Error generating wanted poster:', error);

			const errorEmbed = new EmbedBuilder()
				.setColor('#FF0000')
				.setTitle('❌ Error')
				.setDescription(
					error instanceof Error
						? error.message
						: 'Failed to generate the wanted poster. Please try again later.',
				)
				.setTimestamp();

			await interaction.editReply({
				embeds: [errorEmbed],
			});
		}
	},
};

export default wantedCommand;
