import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	EmbedBuilder,
	Client,
	ColorResolvable,
	CacheType,
} from 'discord.js';
import axios from 'axios';
import {
	RedditListing,
	RedditSortOption,
	RedditTimeOption,
} from '../../types/index';
import createPagination from '../../utils/helpers/Pagination';

const redditCommand: Command = {
	data: new SlashCommandBuilder()
		.setName('reddit')
		.setDescription('Browse posts from any subreddit')
		.addStringOption((option) =>
			option
				.setName('subreddit')
				.setDescription('Name of the subreddit (without r/)')
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName('sort')
				.setDescription('How to sort the posts')
				.setRequired(false)
				.addChoices(
					{ name: '🔥 Hot', value: 'hot' },
					{ name: '⭐ New', value: 'new' },
					{ name: '📈 Top', value: 'top' },
					{ name: '📊 Rising', value: 'rising' },
				),
		)
		.addStringOption((option) =>
			option
				.setName('time')
				.setDescription('Time period for top posts')
				.setRequired(false)
				.addChoices(
					{ name: '24 Hours', value: 'day' },
					{ name: '7 Days', value: 'week' },
					{ name: '30 Days', value: 'month' },
					{ name: '365 Days', value: 'year' },
					{ name: 'All Time', value: 'all' },
				),
		)
		.toJSON(),
	userPermissions: [],
	botPermissions: [],
	category: 'Fun',
	cooldown: 10, // Reduced cooldown
	nsfwMode: false,
	deleted: false, // Command should be enabled
	testMode: false,
	devOnly: false,

	run: async (
		client: Client<boolean>,
		interaction: ChatInputCommandInteraction<CacheType>,
	): Promise<void> => {
		// Immediately defer the reply to prevent interaction expiration
		try {
			// Only defer if not already deferred or replied
			if (!interaction.deferred && !interaction.replied) {
				await interaction.deferReply();
			}
		} catch (error) {
			console.error('Failed to defer interaction:', error);
			// If we can't defer, the interaction might be invalid or expired
			// We'll just return and not attempt further operations
			return;
		}

		const subreddit = interaction.options.getString('subreddit', true);
		const sort =
			(interaction.options.getString('sort') as RedditSortOption) || 'hot';
		const time =
			(interaction.options.getString('time') as RedditTimeOption) || 'day';

		try {
			// Construct the Reddit URL with proper encoding
			const baseUrl = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/${encodeURIComponent(sort)}.json`;
			const params = new URLSearchParams({
				limit: '50', // Increased post limit
				raw_json: '1',
				...(sort === 'top' && { t: time }),
			});

			const response = await axios.get<RedditListing>(`${baseUrl}?${params}`, {
				headers: {
					'User-Agent': 'NoryBot/1.0 (Discord Bot)',
				},
				timeout: 10000, // Increased timeout to handle potential slow responses
				maxRedirects: 3,
				validateStatus: (status) => status < 500, // Handle 4xx errors explicitly
			});

			const posts = response.data.data.children;

			if (posts.length === 0) {
				try {
					await interaction.editReply({
						content: `📭 No posts found in r/${subreddit}. The subreddit might be empty or doesn't exist.`,
					});
				} catch (replyError) {
					console.error('Failed to edit reply for empty posts:', replyError);
				}
				return;
			}

			const embeds = posts.map(({ data: post }) => {
				// Format timestamp
				const createdDate = new Date(post.created_utc * 1000);
				const timeAgo = Math.floor((Date.now() - createdDate.getTime()) / 1000);
				
				let timeString;
				if (timeAgo < 60) {
					timeString = `${timeAgo} second${timeAgo === 1 ? '' : 's'} ago`;
				} else if (timeAgo < 3600) {
					const minutes = Math.floor(timeAgo / 60);
					timeString = `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
				} else if (timeAgo < 86400) {
					const hours = Math.floor(timeAgo / 3600);
					timeString = `${hours} hour${hours === 1 ? '' : 's'} ago`;
				} else {
					const days = Math.floor(timeAgo / 86400);
					timeString = `${days} day${days === 1 ? '' : 's'} ago`;
				}

				const embed = new EmbedBuilder()
					.setColor((post.link_flair_background_color || '#FF4500') as ColorResolvable)
					.setTitle(
						post.title.length > 256
							? post.title.substring(0, 253) + '...'
							: post.title,
					)
					.setURL(`https://reddit.com${post.permalink}`)
					.setAuthor({
						name: post.subreddit_name_prefixed,
						url: `https://reddit.com/${post.subreddit_name_prefixed}`,
						iconURL: 'https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png',
					})
					.setFooter({
						text: `${post.over_18 ? '🔞 NSFW | ' : ''}${post.spoiler ? '⚠️ Spoiler | ' : ''}👍 ${post.ups.toLocaleString()} (${Math.round(post.upvote_ratio * 100)}%) | 💬 ${post.num_comments.toLocaleString()} | Posted ${timeString} by u/${post.author}`,
					});

				// Handle media content
				if (post.is_video && post.media?.reddit_video) {
					embed.setDescription(`🎥 [Video Link](${post.media.reddit_video.fallback_url})`);
					if (post.thumbnail && post.thumbnail !== 'default') {
						embed.setImage(post.thumbnail);
					}
				} else if (post.url.match(/\.(jpeg|jpg|gif|png)$/i)) {
					embed.setImage(post.url);
				} else if (post.thumbnail && !['self', 'default', 'nsfw'].includes(post.thumbnail)) {
					embed.setImage(post.thumbnail);
				}

				// Handle text content
				if (post.selftext) {
					const truncatedText = post.selftext.length > 4000
						? post.selftext.substring(0, 3997) + '...'
						: post.selftext;
					embed.setDescription(truncatedText);
				}

				return embed;
			});

			try {
				// Use the pagination utility with the interaction
				await createPagination(interaction, embeds, {
					type: 'button',
					time: 300000, // 5 minutes
					buttonEmojis: {
						prev: '◀️',
						next: '▶️',
					},
					showPageNumbers: true,
				});
			} catch (paginationError) {
				console.error('Pagination error:', paginationError);
				// If pagination fails, try to send a simple response
				try {
					if (!interaction.replied) {
						await interaction.editReply({
							content: `Found ${embeds.length} posts in r/${subreddit}, but couldn't create pagination. Try again later.`,
							embeds: embeds.length > 0 ? [embeds[0]] : [],
						});
					}
				} catch (fallbackError) {
					console.error('Failed to send fallback response:', fallbackError);
				}
			}
		} catch (error) {
			console.error('Reddit API Error:', error);
			let errorMessage = `❌ Failed to fetch posts from r/${subreddit}.`;

			if (axios.isAxiosError(error)) {
				if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
					errorMessage = '⏱️ The request timed out. Reddit might be experiencing high load. Please try again.';
				} else if (error.response) {
					switch (error.response.status) {
						case 404:
							errorMessage = `❌ Subreddit r/${subreddit} doesn't exist.`;
							break;
						case 403:
							errorMessage = `🔒 Subreddit r/${subreddit} is private or quarantined.`;
							break;
						case 429:
							errorMessage = '⚠️ Rate limited by Reddit. Please wait a few minutes and try again.';
							break;
						case 500:
						case 502:
						case 503:
							errorMessage = '🛠️ Reddit is having technical difficulties. Please try again later.';
							break;
					}
				} else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
					errorMessage = '🌐 Unable to connect to Reddit. The service might be down or experiencing issues.';
				}
			}

			// Handle the reply based on the interaction state
			try {
				if (interaction.deferred) {
					await interaction.editReply({ content: errorMessage });
				} else if (!interaction.replied) {
					await interaction.reply({ content: errorMessage, ephemeral: true });
				}
			} catch (replyError) {
				console.error('Failed to send error response:', replyError);
			}
		}
	},
};

export default redditCommand;
