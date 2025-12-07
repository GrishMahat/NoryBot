import type { LocalCommand } from '@/types';
import { bobross } from 'discord-image-utils';
import {
	AttachmentBuilder,
	type ChatInputCommandInteraction,
	type Client,
	EmbedBuilder,
	MessageFlags,
	SlashCommandBuilder,
} from 'discord.js';

const bobrossCommand: LocalCommand = {
	data: new SlashCommandBuilder()
		.setName('bobross')
		.setDescription("Turn someone's avatar into a Bob Ross painting")
		.addUserOption((option) =>
			option
				.setName('user')
				.setDescription('The user to turn into a happy little painting')
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
			const targetUser = interaction.options.get('user')?.user || interaction.user;

			// Start processing
			await interaction.deferReply();

			const avatarUrl = targetUser.displayAvatarURL({
				extension: 'png',
				forceStatic: true,
				size: 512,
			});

			// Generate the Bob Ross painting image
			const img = await bobross(avatarUrl);

			// Create an attachment using AttachmentBuilder
			const attachment = new AttachmentBuilder(img, { name: 'bobross.png' });

			// Bob Ross quotes for randomization
			const quotes = [
				'There are no mistakes, just happy accidents!',
				"Let's add a happy little tree!",
				"We don't make mistakes, we have happy accidents.",
				"Let's build a happy little painting!",
				'In painting, you have unlimited power!',
				"Talent is a pursued interest. Anything that you're willing to practice, you can do.",
				'You can do anything you want to do. This is your world.',
				'We don’t laugh because we feel good, we feel good because we laugh.',
				'Mix up a little more of the color. A little bit of practice and you’ll be amazed!',
				"Let's get crazy. What the heck — take a two-inch brush, this is your bravery test.",
				'Water’s like me. It’s lazy… Boy, it always looks for the easiest way to do things.',
				'Don’t forget to make all these little things individuals — all of them special in their own way.',
			];

			// Get a random quote
			const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

			// Create an informative and artistic embed
			const embed = new EmbedBuilder()
				.setColor('#1a472a') // Forest green color
				.setAuthor({
					name: 'Bob Ross Masterpiece',
					iconURL: client.user.displayAvatarURL(),
				})
				.setDescription(
					targetUser.id === interaction.user.id
						? `🎨 **${interaction.user.username}** became a happy little painting!`
						: `🎨 **${interaction.user.username}** turned **${targetUser.username}** into a happy little painting!`,
				)
				.addFields(
					{
						name: '👨‍🎨 Artist',
						value: 'Bob Ross',
						inline: true,
					},
					{
						name: '🖼️ Masterpiece',
						value: `<@${targetUser.id}>`,
						inline: true,
					},
				)
				.setImage('attachment://bobross.png')
				.setTimestamp()
				.setFooter({
					text: `"${randomQuote}" - Bob Ross`,
					iconURL: interaction.user.displayAvatarURL(),
				});

			await interaction.editReply({
				embeds: [embed],
				files: [attachment],
			});
		} catch (error) {
			console.error('Error while generating Bob Ross image:', error);

			// If the interaction wasn't deferred yet, use reply
			if (!interaction.deferred) {
				await interaction.reply({
					embeds: [
						new EmbedBuilder()
							.setColor('#FF0000')
							.setTitle('❌ Happy Little Error')
							.setDescription(
								'Failed to create your masterpiece. Remember, mistakes are just happy accidents! Try again later.',
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
						.setTitle('❌ Happy Little Error')
						.setDescription(
							'Failed to create your masterpiece. Remember, mistakes are just happy accidents! Try again later.',
						)
						.setTimestamp(),
				],
				flags: MessageFlags.Ephemeral,
			});
		}
	},
};

export default bobrossCommand;
