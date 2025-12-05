import axios from 'axios';
import {
	type ChatInputCommandInteraction,
	type Client,
	EmbedBuilder,
	SlashCommandBuilder,
} from 'discord.js';
import type { LocalCommand } from '../../types/index';
import { Pagination } from '../../utils/helpers/Pagination';

const NEWS_API_URL = 'https://saurav.tech/NewsAPI/top-headlines/category';

const newsSettings = {
	type: 'both' as const,
	time: 50000,
	buttonEmojis: {
		first: '⏮️',
		prev: '◀️',
		next: '▶️',
		last: '⏭️',
		stop: '⏹️',
		jump: '↗️',
	},
	showTotalPages: true,
	showPageInfo: true,
	showCurrentPage: true,
	ephemeral: true,
	enableJump: true,
	fastSkip: true,
};

const newsCommand: LocalCommand = {
	data: new SlashCommandBuilder()
		.setName('news')
		.setDescription('Fetches the latest news articles.')
		.addStringOption((option) =>
			option
				.setName('category')
				.setDescription('The category of news to fetch.')
				.setRequired(false)
				.addChoices(
					{ name: 'Business', value: 'business' },
					{ name: 'Entertainment', value: 'entertainment' },
					{ name: 'General', value: 'general' },
					{ name: 'Health', value: 'health' },
					{ name: 'Science', value: 'science' },
					{ name: 'Sports', value: 'sports' },
					{ name: 'Technology', value: 'technology' },
				),
		)
		.toJSON(),
	devOnly: false,
	run: async (_client: Client, interaction: ChatInputCommandInteraction): Promise<void> => {
		const category = interaction.options.getString('category') || 'general';
		const url = `${NEWS_API_URL}/${category}/us.json`;

		try {
			await interaction.deferReply();

			const response = await axios.get(url);
			const articles = response.data.articles;

			if (!articles || articles.length === 0) {
				await interaction.editReply('No news articles found.');
				return;
			}

			const pages = articles.map((article: any) => {
				return new EmbedBuilder()
					.setTitle(article.title)
					.setURL(article.url)
					.setAuthor({ name: article.source.name })
					.setImage(article.urlToImage)
					.setDescription(article.description)
					.setTimestamp(new Date(article.publishedAt))
					.setFooter({ text: `Powered by saurav.tech` });
			});

			const pagination = new Pagination(interaction, pages, newsSettings);
			await pagination.send();
		} catch (error) {
			console.error('Error fetching news:', error);
			await interaction.editReply('An error occurred while fetching the news.');
		}
	},
};

export default newsCommand;
