import {
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	EmbedBuilder,
	Client,
	ColorResolvable,
	CacheType,
	InteractionReplyOptions,
	InteractionEditReplyOptions,
	MessageFlags,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	ComponentType,
	ButtonInteraction,
	StringSelectMenuInteraction,
} from 'discord.js';
import axios, { AxiosError } from 'axios';
import {
	RedditListing,
	RedditPostData,
	RedditSortOption,
	RedditTimeOption,
} from '../../types/index';
import { formatTimeAgo } from '../../utils/helpers/misc';

// Constants
const REDDIT_BASE_URL = 'https://www.reddit.com';
const USER_AGENT = 'NoryBot/1.0 (Discord Bot)';
const DEFAULT_EMBED_COLOR: ColorResolvable = '#FF4500';
const REDDIT_ICON_URL = 'https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png';
const MAX_POST_LIMIT = 50;
const API_TIMEOUT = 10000;
const COMPONENT_TIMEOUT = 300000; // 5 minutes
const MAX_TITLE_LENGTH = 256;
const MAX_DESCRIPTION_LENGTH = 4096;

// Enhanced color scheme based on Reddit themes
const REDDIT_COLORS = {
	hot: '#FF4500',
	new: '#46D160',
	top: '#FFD700',
	rising: '#FF8C00',
	controversial: '#DC143C',
	default: '#FF4500'
};

// Sort option configurations with enhanced styling
const SORT_OPTIONS = {
	hot: { name: '🔥 Hot', description: 'Currently trending posts', emoji: '🔥' },
	new: { name: '✨ New', description: 'Most recent posts', emoji: '✨' },
	top: { name: '🏆 Top', description: 'Highest voted posts', emoji: '🏆' },
	rising: { name: '📈 Rising', description: 'Fast growing posts', emoji: '📈' },
	controversial: { name: '⚡ Controversial', description: 'Most debated posts', emoji: '⚡' }
};

const TIME_OPTIONS = {
	hour: { name: '⏰ Hour', description: 'Past hour', emoji: '⏰' },
	day: { name: '📅 Today', description: 'Past 24 hours', emoji: '📅' },
	week: { name: '📊 Week', description: 'Past 7 days', emoji: '📊' },
	month: { name: '📆 Month', description: 'Past 30 days', emoji: '📆' },
	year: { name: '🗓️ Year', description: 'Past 365 days', emoji: '🗓️' },
	all: { name: '♾️ All Time', description: 'Since Reddit began', emoji: '♾️' }
};

interface RedditSession {
	subreddit: string;
	posts: RedditPostData[];
	currentIndex: number;
	sort: string;
	time: string;
	userId: string;
}

// Store active sessions
const activeSessions = new Map<string, RedditSession>();

/**
 * Creates an enhanced Discord Embed for a Reddit post with better styling
 */
const createPostEmbed = (post: RedditPostData, currentIndex: number, totalPosts: number, sort: string): EmbedBuilder => {
	const timeString = formatTimeAgo(post.created_utc * 1000);
	const sortColor = REDDIT_COLORS[sort as keyof typeof REDDIT_COLORS] || REDDIT_COLORS.default;

	const embed = new EmbedBuilder()
		.setColor(sortColor as ColorResolvable)
		.setTitle(
			post.title.length > MAX_TITLE_LENGTH
				? post.title.substring(0, MAX_TITLE_LENGTH - 3) + '...'
				: post.title
		)
		.setURL(`${REDDIT_BASE_URL}${post.permalink}`)
		.setAuthor({
			name: `${post.subreddit_name_prefixed} • ${SORT_OPTIONS[sort as keyof typeof SORT_OPTIONS]?.name || sort}`,
			url: `${REDDIT_BASE_URL}/${post.subreddit_name_prefixed}`,
			iconURL: REDDIT_ICON_URL,
		});

	// Enhanced description handling
	let description = '';

	if (post.selftext && post.selftext.trim()) {
		description = post.selftext.length > MAX_DESCRIPTION_LENGTH - 100
			? post.selftext.substring(0, MAX_DESCRIPTION_LENGTH - 103) + '...'
			: post.selftext;
	}

	// Media handling with better formatting
	if (post.is_video && post.media?.reddit_video) {
		const videoEmbed = `🎥 **[Watch Video](${post.media.reddit_video.fallback_url})**\n${description ? `\n${description}` : ''}`;
		if (videoEmbed.length <= MAX_DESCRIPTION_LENGTH) {
			description = videoEmbed;
		}
		if (post.thumbnail && post.thumbnail !== 'default') {
			embed.setImage(post.thumbnail);
		}
	} else if (post.url?.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
		embed.setImage(post.url);
	} else if (post.thumbnail && !['self', 'default', 'nsfw', ''].includes(post.thumbnail)) {
		embed.setImage(post.thumbnail);
	}

	if (description) {
		embed.setDescription(description);
	}

	// Enhanced footer with better formatting
	const tags = [];
	if (post.over_18) tags.push('🔞 NSFW');
	if (post.spoiler) tags.push('⚠️ Spoiler');
	if (post.locked) tags.push('🔒 Locked');
	if (post.stickied) tags.push('📌 Pinned');

	const tagString = tags.length > 0 ? `${tags.join(' • ')} • ` : '';
	const stats = `👍 ${post.ups.toLocaleString()} (${Math.round(post.upvote_ratio * 100)}%) • 💬 ${post.num_comments.toLocaleString()}`;
	const postInfo = `Posted ${timeString} by u/${post.author}`;
	const pageInfo = `Page ${currentIndex + 1} of ${totalPosts}`;

	embed.setFooter({
		text: `${tagString}${stats} • ${postInfo} • ${pageInfo}`,
		iconURL: REDDIT_ICON_URL
	});

	// Add fields for better organization
	if (post.link_flair_text) {
		embed.addFields({
			name: '🏷️ Flair',
			value: post.link_flair_text,
			inline: true
		});
	}

	return embed;
};

/**
 * Creates navigation components with enhanced styling
 */
const createNavigationComponents = (session: RedditSession, interaction: ChatInputCommandInteraction): ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] => {
	const { currentIndex, posts, sort, subreddit } = session;
	const isFirst = currentIndex === 0;
	const isLast = currentIndex === posts.length - 1;

	// Navigation buttons row
	const navigationRow = new ActionRowBuilder<ButtonBuilder>()
		.addComponents(
			new ButtonBuilder()
				.setCustomId('reddit_first')
				.setLabel('First')
				.setEmoji('⏮️')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(isFirst),
			new ButtonBuilder()
				.setCustomId('reddit_prev')
				.setLabel('Previous')
				.setEmoji('◀️')
				.setStyle(ButtonStyle.Primary)
				.setDisabled(isFirst),
			new ButtonBuilder()
				.setCustomId('reddit_random')
				.setLabel('Random')
				.setEmoji('🎲')
				.setStyle(ButtonStyle.Success),
			new ButtonBuilder()
				.setCustomId('reddit_next')
				.setLabel('Next')
				.setEmoji('▶️')
				.setStyle(ButtonStyle.Primary)
				.setDisabled(isLast),
			new ButtonBuilder()
				.setCustomId('reddit_last')
				.setLabel('Last')
				.setEmoji('⏭️')
				.setStyle(ButtonStyle.Secondary)
				.setDisabled(isLast)
		);

	// Action buttons row
	const actionRow = new ActionRowBuilder<ButtonBuilder>()
		.addComponents(
			new ButtonBuilder()
				.setCustomId('reddit_refresh')
				.setLabel('Refresh')
				.setEmoji('🔄')
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId('reddit_open')
				.setLabel('Open in Reddit')
				.setEmoji('📱')
				.setStyle(ButtonStyle.Link)
				.setURL(`${REDDIT_BASE_URL}${posts[currentIndex].permalink}`),
			new ButtonBuilder()
				.setCustomId('reddit_share')
				.setLabel('Share Post')
				.setEmoji('📤')
				.setStyle(ButtonStyle.Secondary),
			new ButtonBuilder()
				.setCustomId('reddit_info')
				.setLabel('Post Info')
				.setEmoji('ℹ️')
				.setStyle(ButtonStyle.Secondary)
		);

	// Sort selector
	const sortOptions = Object.entries(SORT_OPTIONS).map(([value, config]) =>
		new StringSelectMenuOptionBuilder()
			.setLabel(config.name)
			.setDescription(config.description)
			.setEmoji(config.emoji)
			.setValue(value)
			.setDefault(value === sort)
	);

	const sortRow = new ActionRowBuilder<StringSelectMenuBuilder>()
		.addComponents(
			new StringSelectMenuBuilder()
				.setCustomId('reddit_sort')
				.setPlaceholder('🔄 Change sorting method')
				.addOptions(sortOptions)
		);

	return [navigationRow, actionRow, sortRow];
};

/**
 * Creates time filter component for top/controversial sorts
 */
const createTimeFilterComponent = (session: RedditSession): ActionRowBuilder<StringSelectMenuBuilder> | null => {
	const { sort, time } = session;

	if (sort !== 'top' && sort !== 'controversial') {
		return null;
	}

	const timeOptions = Object.entries(TIME_OPTIONS).map(([value, config]) =>
		new StringSelectMenuOptionBuilder()
			.setLabel(config.name)
			.setDescription(config.description)
			.setEmoji(config.emoji)
			.setValue(value)
			.setDefault(value === time)
	);

	return new ActionRowBuilder<StringSelectMenuBuilder>()
		.addComponents(
			new StringSelectMenuBuilder()
				.setCustomId('reddit_time')
				.setPlaceholder('📅 Select time period')
				.addOptions(timeOptions)
		);
};

/**
 * Safe reply function with better error handling
 */
const safeReply = async (
	interaction: ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction,
	options: string | InteractionReplyOptions | InteractionEditReplyOptions,
	isEphemeral = false
): Promise<void> => {
	try {
		const replyOptions = typeof options === 'string' ? { content: options } : options;

		if (interaction.deferred || interaction.replied) {
			await interaction.editReply(replyOptions as InteractionEditReplyOptions);
		} else {
			await interaction.reply({
				...(replyOptions as InteractionReplyOptions),
				flags: isEphemeral ? [MessageFlags.Ephemeral] : undefined,
			});
		}
	} catch (error) {
		console.error('Failed to send or edit reply:', error);
	}
};

/**
 * Fetches Reddit posts with enhanced error handling
 */
const fetchRedditPosts = async (subreddit: string, sort: string, time: string): Promise<RedditPostData[]> => {
	const encodedSubreddit = encodeURIComponent(subreddit);
	const encodedSort = encodeURIComponent(sort);
	const baseUrl = `${REDDIT_BASE_URL}/r/${encodedSubreddit}/${encodedSort}.json`;

	const params = new URLSearchParams({
		limit: String(MAX_POST_LIMIT),
		raw_json: '1',
	});

	if (sort === 'top' || sort === 'controversial') {
		params.append('t', time);
	}

	const response = await axios.get<RedditListing>(`${baseUrl}?${params}`, {
		headers: { 'User-Agent': USER_AGENT },
		timeout: API_TIMEOUT,
		maxRedirects: 3,
		validateStatus: (status) => status >= 200 && status < 500,
	});

	if (response.status === 404) {
		throw new Error(`Subreddit r/${subreddit} not found`);
	}
	if (response.status === 403) {
		throw new Error(`Access denied to r/${subreddit}`);
	}
	if (response.status !== 200) {
		throw new Error(`Reddit returned status ${response.status}`);
	}

	const posts = response.data?.data?.children?.filter(
		(p) => p?.data && !p.data.stickied
	);

	if (!posts || posts.length === 0) {
		throw new Error('No posts found');
	}

	return posts.map(({ data }) => data);
};

/**
 * Updates the display with current post and components
 */
const updateDisplay = async (
	interaction: ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction,
	session: RedditSession
): Promise<void> => {
	const { posts, currentIndex, sort } = session;
	const currentPost = posts[currentIndex];

	const embed = createPostEmbed(currentPost, currentIndex, posts.length, sort);
	const components = createNavigationComponents(session, interaction as ChatInputCommandInteraction);

	// Add time filter if applicable
	const timeFilter = createTimeFilterComponent(session);
	if (timeFilter) {
		components.push(timeFilter);
	}

	await safeReply(interaction, {
		embeds: [embed],
		components
	});
};

/**
 * Main command handler with enhanced component interactions
 */
const redditCommand: Command = {
	data: new SlashCommandBuilder()
		.setName('reddit')
		.setDescription('Browse Reddit posts with enhanced interactive controls')
		.addStringOption((option) =>
			option
				.setName('subreddit')
				.setDescription('Subreddit name (without r/)')
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName('sort')
				.setDescription('Sort method')
				.setRequired(false)
				.addChoices(
					...Object.entries(SORT_OPTIONS).map(([value, config]) => ({
						name: config.name,
						value
					}))
				)
		)
		.addStringOption((option) =>
			option
				.setName('time')
				.setDescription('Time period (for Top/Controversial)')
				.setRequired(false)
				.addChoices(
					...Object.entries(TIME_OPTIONS).map(([value, config]) => ({
						name: config.name,
						value
					}))
				)
		)
		.setContexts([0, 1, 2])
		.setIntegrationTypes([0, 1])
		.toJSON(),

	userPermissions: [],
	botPermissions: [],
	category: 'Fun',
	cooldown: 3,
	nsfwMode: false,
	deleted: false,
	testMode: false,
	devOnly: false,

	run: async (
		client: Client<boolean>,
		interaction: ChatInputCommandInteraction<CacheType>
	): Promise<void> => {
		if (!interaction.deferred && !interaction.replied) {
			await interaction.deferReply();
		}

		const subreddit = interaction.options.getString('subreddit', true);
		const sort = interaction.options.getString('sort') || 'hot';
		const time = interaction.options.getString('time') || 'day';
		const sessionId = `${interaction.user.id}_${Date.now()}`;

		try {
			const posts = await fetchRedditPosts(subreddit, sort, time);

			const session: RedditSession = {
				subreddit,
				posts,
				currentIndex: 0,
				sort,
				time,
				userId: interaction.user.id
			};

			activeSessions.set(sessionId, session);

			await updateDisplay(interaction, session);

			// Component interaction collector
			const collector = interaction.channel?.createMessageComponentCollector({
				componentType: ComponentType.Button,
				time: COMPONENT_TIMEOUT
			});

			const selectCollector = interaction.channel?.createMessageComponentCollector({
				componentType: ComponentType.StringSelect,
				time: COMPONENT_TIMEOUT
			});

			collector?.on('collect', async (buttonInteraction) => {
				if (buttonInteraction.user.id !== interaction.user.id) {
					await buttonInteraction.reply({
						content: '❌ Only the command user can interact with these buttons.',
						flags: [MessageFlags.Ephemeral]
					});
					return;
				}

				await buttonInteraction.deferUpdate();
				const currentSession = activeSessions.get(sessionId);
				if (!currentSession) return;

				switch (buttonInteraction.customId) {
					case 'reddit_first':
						currentSession.currentIndex = 0;
						break;
					case 'reddit_prev':
						if (currentSession.currentIndex > 0) {
							currentSession.currentIndex--;
						}
						break;
					case 'reddit_next':
						if (currentSession.currentIndex < currentSession.posts.length - 1) {
							currentSession.currentIndex++;
						}
						break;
					case 'reddit_last':
						currentSession.currentIndex = currentSession.posts.length - 1;
						break;
					case 'reddit_random':
						currentSession.currentIndex = Math.floor(Math.random() * currentSession.posts.length);
						break;
					case 'reddit_refresh':
						try {
							const newPosts = await fetchRedditPosts(currentSession.subreddit, currentSession.sort, currentSession.time);
							currentSession.posts = newPosts;
							currentSession.currentIndex = 0;
						} catch (error) {
							await buttonInteraction.followUp({
								content: '❌ Failed to refresh posts.',
								flags: [MessageFlags.Ephemeral]
							});
							return;
						}
						break;
					case 'reddit_share':
						const sharePost = currentSession.posts[currentSession.currentIndex];
						await buttonInteraction.followUp({
							content: `📤 **Share this post:**\n${REDDIT_BASE_URL}${sharePost.permalink}`,
							flags: [MessageFlags.Ephemeral]
						});
						return;
					case 'reddit_info':
						const infoPost = currentSession.posts[currentSession.currentIndex];
						const infoEmbed = new EmbedBuilder()
							.setTitle('📊 Post Statistics')
							// .setColor(REDDIT_COLORS[currentSession.sort as keyof typeof REDDIT_COLORS])
							.addFields(
								{ name: '👍 Score', value: infoPost.ups.toLocaleString(), inline: true },
								{ name: '👎 Downvotes', value: Math.round(infoPost.ups / infoPost.upvote_ratio - infoPost.ups).toLocaleString(), inline: true },
								{ name: '📊 Upvote Ratio', value: `${Math.round(infoPost.upvote_ratio * 100)}%`, inline: true },
								{ name: '💬 Comments', value: infoPost.num_comments.toLocaleString(), inline: true },
								{ name: '👤 Author', value: `u/${infoPost.author}`, inline: true },
								{ name: '🏷️ Flair', value: infoPost.link_flair_text || 'None', inline: true }
							)
							.setFooter({ text: `Posted in ${infoPost.subreddit_name_prefixed}` });

						await buttonInteraction.followUp({
							embeds: [infoEmbed],
							flags: [MessageFlags.Ephemeral]
						});
						return;
				}

				await updateDisplay(buttonInteraction, currentSession);
			});

			selectCollector?.on('collect', async (selectInteraction) => {
				if (selectInteraction.user.id !== interaction.user.id) {
					await selectInteraction.reply({
						content: '❌ Only the command user can interact with these menus.',
						flags: [MessageFlags.Ephemeral]
					});
					return;
				}

				await selectInteraction.deferUpdate();
				const currentSession = activeSessions.get(sessionId);
				if (!currentSession) return;

				const selectedValue = selectInteraction.values[0];

				if (selectInteraction.customId === 'reddit_sort') {
					currentSession.sort = selectedValue;
					try {
						const newPosts = await fetchRedditPosts(currentSession.subreddit, currentSession.sort, currentSession.time);
						currentSession.posts = newPosts;
						currentSession.currentIndex = 0;
					} catch (error) {
						await selectInteraction.followUp({
							content: '❌ Failed to load posts with new sort.',
							flags: [MessageFlags.Ephemeral]
						});
						return;
					}
				} else if (selectInteraction.customId === 'reddit_time') {
					currentSession.time = selectedValue;
					try {
						const newPosts = await fetchRedditPosts(currentSession.subreddit, currentSession.sort, currentSession.time);
						currentSession.posts = newPosts;
						currentSession.currentIndex = 0;
					} catch (error) {
						await selectInteraction.followUp({
							content: '❌ Failed to load posts with new time filter.',
							flags: [MessageFlags.Ephemeral]
						});
						return;
					}
				}

				await updateDisplay(selectInteraction, currentSession);
			});

			// Cleanup session after timeout
			setTimeout(() => {
				activeSessions.delete(sessionId);
				collector?.stop();
				selectCollector?.stop();
			}, COMPONENT_TIMEOUT);

		} catch (error) {
			console.error('Reddit Command Error:', error);
			let errorMessage = `❌ Failed to fetch posts from r/${subreddit}`;

			if (error instanceof Error) {
				if (error.message.includes('not found')) {
					errorMessage = `❌ Subreddit \`r/${subreddit}\` not found. Please check the spelling.`;
				} else if (error.message.includes('Access denied')) {
					errorMessage = `🔒 Access denied to \`r/${subreddit}\`. It might be private or banned.`;
				} else if (error.message.includes('No posts found')) {
					errorMessage = `📭 No posts found in \`r/${subreddit}\`. The subreddit might be empty.`;
				}
			}

			await safeReply(interaction, errorMessage);
		}
	}
};

export default redditCommand;
