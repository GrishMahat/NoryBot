import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	EmbedBuilder,
	Client,
	ColorResolvable,
	CacheType,
	InteractionReplyOptions,
	InteractionEditReplyOptions,
} from 'discord.js';
import axios, { AxiosError } from 'axios';
import {
	RedditListing,
	RedditPostData,
	RedditSortOption,
	RedditTimeOption,
} from '../../types/index';
import createPagination from '../../utils/helpers/Pagination';
import { formatTimeAgo } from '../../utils/helpers/misc'; // Assuming a helper function exists or will be created

// Constants
const REDDIT_BASE_URL = 'https://www.reddit.com';
const USER_AGENT = 'NoryBot/1.0 (Discord Bot)';
const DEFAULT_EMBED_COLOR: ColorResolvable = '#FF4500';
const REDDIT_ICON_URL =
	'https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png';
const MAX_POST_LIMIT = 50;
const API_TIMEOUT = 10000; // 10 seconds
const PAGINATION_TIMEOUT = 300000; // 5 minutes
const MAX_TITLE_LENGTH = 256;
const MAX_DESCRIPTION_LENGTH = 4096; // Discord embed description limit

/**
 * Creates a Discord Embed for a given Reddit post.
 * @param post - The Reddit post data.
 * @returns An EmbedBuilder instance.
 */
const createPostEmbed = (post: RedditPostData): EmbedBuilder => {
	const timeString = formatTimeAgo(post.created_utc * 1000);

	const embed = new EmbedBuilder()
		.setColor(
			(post.link_flair_background_color ||
				DEFAULT_EMBED_COLOR) as ColorResolvable,
		)
		.setTitle(
			post.title.length > MAX_TITLE_LENGTH
				? post.title.substring(0, MAX_TITLE_LENGTH - 3) + '...'
				: post.title,
		)
		.setURL(`${REDDIT_BASE_URL}${post.permalink}`)
		.setAuthor({
			name: post.subreddit_name_prefixed,
			url: `${REDDIT_BASE_URL}/${post.subreddit_name_prefixed}`,
			iconURL: REDDIT_ICON_URL,
		})
		.setFooter({
			text: `${post.over_18 ? '🔞 NSFW | ' : ''}${post.spoiler ? '⚠️ Spoiler | ' : ''}👍 ${post.ups.toLocaleString()} (${Math.round(post.upvote_ratio * 100)}%) | 💬 ${post.num_comments.toLocaleString()} | Posted ${timeString} by u/${post.author}`,
		});

	let description = '';

	// Handle text content first
	if (post.selftext) {
		description =
			post.selftext.length > MAX_DESCRIPTION_LENGTH
				? post.selftext.substring(0, MAX_DESCRIPTION_LENGTH - 3) + '...'
				: post.selftext;
	}

	// Handle media content, potentially prepending to description
	if (post.is_video && post.media?.reddit_video) {
		const videoLink = `🎥 [Video Link](${post.media.reddit_video.fallback_url})\n\n`;
		// Prepend video link, ensuring total length doesn't exceed limit
		if ((description + videoLink).length <= MAX_DESCRIPTION_LENGTH) {
			description = videoLink + description;
		} else {
			// Prioritize video link if description is too long
			description = videoLink;
		}
		// Use thumbnail if available
		if (post.thumbnail && post.thumbnail !== 'default') {
			embed.setImage(post.thumbnail);
		}
	} else if (post.url?.match(/\.(jpeg|jpg|gif|png)$/i)) {
		// Direct image link
		embed.setImage(post.url);
	} else if (
		post.thumbnail &&
		!['self', 'default', 'nsfw', ''].includes(post.thumbnail) // Added empty string check
	) {
		// Other valid thumbnails
		embed.setImage(post.thumbnail);
	}

	if (description) {
		embed.setDescription(description);
	}

	return embed;
};

/**
 * Handles replying or editing the interaction reply safely.
 * @param interaction - The command interaction.
 * @param options - The reply options.
 * @param isEphemeral - Whether the reply should be ephemeral (only applies if not deferred).
 */
const safeReply = async (
	interaction: ChatInputCommandInteraction<CacheType>,
	options: string | InteractionReplyOptions | InteractionEditReplyOptions,
	isEphemeral = false,
): Promise<void> => {
	try {
		const replyOptions =
			typeof options === 'string' ? { content: options } : options;

		if (interaction.deferred || interaction.replied) {
			await interaction.editReply(replyOptions as InteractionEditReplyOptions);
		} else {
			await interaction.reply({
				...(replyOptions as InteractionReplyOptions),
				ephemeral: isEphemeral,
			});
		}
	} catch (error) {
		console.error('Failed to send or edit reply:', error);
	}
};

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
					{ name: '📊 Controversial', value: 'controversial' },
				),
		)
		.addStringOption((option) =>
			option
				.setName('time')
				.setDescription('Time period for top posts (only works with sort=Top)')
				.setRequired(false)
				.addChoices(
					{ name: '⏳ Hour', value: 'hour' }, // Added Hour
					{ name: '📅 Day', value: 'day' },
					{ name: '📅 Week', value: 'week' },
					{ name: '📅 Month', value: 'month' },
					{ name: '📅 Year', value: 'year' },
					{ name: '♾️ All Time', value: 'all' },
				),
		)
		.toJSON(),
	userPermissions: [],
	botPermissions: ['EmbedLinks'], // Ensure bot can send embeds
	category: 'Fun',
	cooldown: 5, // Slightly reduced cooldown
	nsfwMode: false, // Note: This doesn't prevent NSFW subreddits, only the command context
	deleted: false,
	testMode: false,
	devOnly: false,

	run: async (
		client: Client<boolean>,
		interaction: ChatInputCommandInteraction<CacheType>,
	): Promise<void> => {
		// Defer immediately
		try {
			// Check if already deferred or replied to prevent errors
			if (!interaction.deferred && !interaction.replied) {
				await interaction.deferReply();
			}
		} catch (error) {
			console.error('Failed to defer interaction:', error);
			// If deferral fails, we likely can't respond further
			return;
		}

		const subreddit = interaction.options.getString('subreddit', true);
		const sort =
			(interaction.options.getString('sort') as
				| RedditSortOption
				| 'controversial') || 'hot';
		const time =
			(interaction.options.getString('time') as RedditTimeOption) || 'day';

		try {
			// Construct Reddit API URL
			const encodedSubreddit = encodeURIComponent(subreddit);
			const encodedSort = encodeURIComponent(sort);
			const baseUrl = `${REDDIT_BASE_URL}/r/${encodedSubreddit}/${encodedSort}.json`;
			const params = new URLSearchParams({
				limit: String(MAX_POST_LIMIT),
				raw_json: '1',
			});
			// Add time parameter only if sorting by 'top' or 'controversial'
			if (sort === 'top' || sort === 'controversial') {
				params.append('t', time);
			}

			const response = await axios.get<RedditListing>(`${baseUrl}?${params}`, {
				headers: { 'User-Agent': USER_AGENT },
				timeout: API_TIMEOUT,
				maxRedirects: 3,
				// Treat 4xx as non-errors for custom handling below
				validateStatus: (status) => status >= 200 && status < 500,
			});

			// Handle specific HTTP errors returned by Reddit
			if (response.status === 404) {
				await safeReply(
					interaction,
					`❌ Subreddit \`r/${subreddit}\` not found. Please check the name.`,
				);
				return;
			}
			if (response.status === 403) {
				await safeReply(
					interaction,
					`🔒 Access denied to \`r/${subreddit}\`. It might be private, quarantined, or banned.`,
				);
				return;
			}
			// Handle other potential non-200 statuses if necessary
			if (response.status !== 200) {
				await safeReply(
					interaction,
					`⚠️ Received an unexpected status code ${response.status} from Reddit for \`r/${subreddit}\`.`,
				);
				return;
			}

			// Filter out potential null/undefined posts and stickied posts
			const posts = response.data?.data?.children?.filter(
				(p) => p?.data && !p.data.stickied,
			);

			if (!posts || posts.length === 0) {
				await safeReply(
					interaction,
					`📭 No posts found in \`r/${subreddit}\` (excluding stickied posts). The subreddit might be empty or inactive.`,
				);
				return;
			}

			// Create embeds for valid posts
			const embeds = posts.map(({ data }) => createPostEmbed(data));

			// Use pagination
			await createPagination(interaction, embeds, {
				type: 'button',
				time: PAGINATION_TIMEOUT,
				buttonEmojis: { prev: '◀️', next: '▶️' },
				showPageNumbers: true,
			});
		} catch (error) {
			console.error('Reddit Command Error:', error);
			let errorMessage = `❌ An unexpected error occurred while fetching posts from \`r/${subreddit}\`.`;

			if (axios.isAxiosError(error)) {
				const axiosError = error as AxiosError;
				if (
					axiosError.code === 'ECONNABORTED' ||
					axiosError.message.includes('timeout')
				) {
					errorMessage =
						'⏱️ The request to Reddit timed out. Please try again later.';
				} else if (axiosError.response) {
					// Handle 5xx server errors from Reddit
					switch (axiosError.response.status) {
						case 429: // Should ideally not happen with validateStatus, but as fallback
							errorMessage =
								'⚠️ Rate limited by Reddit. Please wait a moment and try again.';
							break;
						case 500:
						case 502:
						case 503:
						case 504:
							errorMessage = `🛠️ Reddit seems to be having server issues (Status ${axiosError.response.status}). Please try again later.`;
							break;
						default:
							errorMessage = `❓ Reddit returned an unexpected error (Status ${axiosError.response.status}).`;
							break;
					}
				} else if (
					axiosError.code === 'ETIMEDOUT' ||
					axiosError.code === 'ENOTFOUND' || // Added ENOTFOUND for DNS issues
					axiosError.code === 'ECONNREFUSED'
				) {
					errorMessage =
						'🌐 Unable to connect to Reddit. Please check your connection or try again later.';
				}
			}
			// Fallback for non-Axios errors or unhandled cases
			else if (error instanceof Error) {
				// Keep the default message but log the specific error name/message
				console.error(`Non-Axios Error: ${error.name} - ${error.message}`);
			}

			await safeReply(interaction, errorMessage);
		}
	},
};

export default redditCommand;
