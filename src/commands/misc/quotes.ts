import {
	EmbedBuilder,
	SlashCommandBuilder,
	ChatInputCommandInteraction,
	Client,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	ButtonInteraction,
	AttachmentBuilder,
	MessageFlags,
} from 'discord.js';
import { LocalCommand, QuoteResponse } from '../../types/index';
import { Quote } from 'discord-image-utils';
import emojiConfig from '../../config/emoji';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const quotesCommand: LocalCommand = {
	data: new SlashCommandBuilder()
		.setName('quote')
		.setDescription('Get an inspirational random quote as an image')
		.setContexts([0, 1, 2])
		.setIntegrationTypes([0, 1])
		.toJSON(),
	devOnly: false,
	category: 'Misc',
	cooldown: 15,
	userPermissions: [],
	botPermissions: [],

	run: async (client: Client, interaction: ChatInputCommandInteraction) => {
		let tempImagePath: string | null = null;
		const buttonCooldowns = new Map<string, number>();

		try {
			await interaction.deferReply();
			const quote = await fetchQuote();
			const imageBuffer = await Quote({
				quote: quote.quote,
				author: quote.author,
			});

			tempImagePath = join(process.cwd(), `temp_quote_${Date.now()}.png`);
			writeFileSync(tempImagePath, imageBuffer);

			const attachment = new AttachmentBuilder(tempImagePath, {
				name: 'quote.png',
			});
			const embed = createQuoteEmbed(client, attachment);
			const row = createButtonRow();

			const reply = await interaction.editReply({
				embeds: [embed],
				files: [attachment],
				components: [row],
			});

			// Clean up temp file after sending
			if (tempImagePath) {
				try {
					unlinkSync(tempImagePath);
					tempImagePath = null;
				} catch (err) {
					console.error('Failed to delete temp file:', err);
				}
			}

			const collector = interaction.channel?.createMessageComponentCollector({
				componentType: ComponentType.Button,
				filter: (i: ButtonInteraction) =>
					i.user.id === interaction.user.id && i.message.id === reply.id,
				time: 120000,
			});

			collector?.on('collect', async (i: ButtonInteraction) => {
				if (i.customId === 'new_quote') {
					const now = Date.now();
					const cooldownEnd = buttonCooldowns.get(i.user.id) || 0;

					if (now < cooldownEnd) {
						const remainingTime = Math.ceil((cooldownEnd - now) / 1000);
						await i.reply({
							content: `${emojiConfig.notag} Please wait ${remainingTime} seconds before requesting a new quote.`,
							flags: MessageFlags.Ephemeral,
						});
						return;
					}

					buttonCooldowns.set(i.user.id, now + 30000); // 30 second cooldown

					await i.deferUpdate();
					try {
						const newQuote = await fetchQuote();
						const newImageBuffer = await Quote({
							quote: newQuote.quote,
							author: newQuote.author,
						});

						const newTempPath = join(
							process.cwd(),
							`temp_quote_${Date.now()}.png`,
						);
						writeFileSync(newTempPath, newImageBuffer);

						const newAttachment = new AttachmentBuilder(newTempPath, {
							name: 'quote.png',
						});
						const newEmbed = createQuoteEmbed(client, newAttachment);

						await i.editReply({
							embeds: [newEmbed],
							files: [newAttachment],
							components: [row],
						});

						// Clean up new temp file after sending
						try {
							unlinkSync(newTempPath);
						} catch (err) {
							console.error('Failed to delete temp file:', err);
						}
					} catch {
						await i.editReply({
							content: `${emojiConfig.notag} Failed to fetch new quote. Please try again later.`,
							components: [row],
						});
					}
				}
			});

			collector?.on('end', () => {
				interaction.editReply({ components: [] }).catch(() => {});
			});
		} catch {
			// Clean up temp file if it exists
			if (tempImagePath) {
				try {
					unlinkSync(tempImagePath);
				} catch (err) {
					console.error('Failed to delete temp file:', err);
				}
			}

			await interaction.editReply({
				content: `${emojiConfig.notag} Failed to fetch quote. Please try again later.`,
				components: [],
			});
		}
	},
};

async function fetchQuote(): Promise<QuoteResponse> {
	const fallbackQuote = {
		quote: "Sometimes it's necessary to do unnecessary things.",
		author: 'Kanade Jinguuji',
	};

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), 5000);

	try {
		const response = await fetch('https://quotes-api-self.vercel.app/quote', {
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			return fallbackQuote;
		}
		const data = await response.json();
		return {
			quote: data.quote,
			author: data.author,
		};
	} catch {
		return fallbackQuote;
	}
}

function createQuoteEmbed(
	client: Client,
	attachment: AttachmentBuilder,
): EmbedBuilder {
	return new EmbedBuilder()
		.setColor('#2b2d31')
		.setTitle(`${emojiConfig.statistics} Random Quote`)
		.setImage('attachment://quote.png')
		.setTimestamp();
}

function createButtonRow(): ActionRowBuilder<ButtonBuilder> {
	return new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId('new_quote')
			.setLabel('New Quote')
			.setStyle(ButtonStyle.Primary)
			.setEmoji({ name: '🔄' }),
	);
}

export default quotesCommand;
