import type { RedditListing, RedditPostData } from '@/types/index';
import { formatTimeAgo } from '@/utils/helpers/misc';
import axios from 'axios';
import {
	ActionRowBuilder,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	type CacheType,
	type ChatInputCommandInteraction,
	type Client,
	type ColorResolvable,
	EmbedBuilder,
	type InteractionEditReplyOptions,
	type InteractionReplyOptions,
	type Message,
	MessageFlags,
	SlashCommandBuilder,
	StringSelectMenuBuilder,
	type StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder,
} from 'discord.js';

// Constants
const REDDIT_BASE_URL = 'https://www.reddit.com';
const USER_AGENT = 'NoryBot/1.0 (Discord Bot)';
const _DEFAULT_EMBED_COLOR: ColorResolvable = '#FF4500';
const REDDIT_ICON_URL =
	'https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png';
const MAX_POST_LIMIT = 50;
const API_TIMEOUT = 10000;
const COMPONENT_TIMEOUT = 300000; // 5 minutes
const MAX_TITLE_LENGTH = 256;
const MAX_DESCRIPTION_LENGTH = 4096;

// Premium gradient-inspired color scheme
const REDDIT_COLORS = {
	hot: '#FF6B35', // Vibrant orange-red
	new: '#00D4AA', // Teal mint
	top: '#FFB800', // Golden yellow
	rising: '#FF9500', // Bright orange
	controversial: '#E91E63', // Pink-red
	default: '#FF4500', // Reddit orange
};

// Award emojis for engagement levels
const getEngagementEmoji = (ups: number): string => {
	if (ups >= 50000) return '💎'; // Diamond
	if (ups >= 25000) return '🏆'; // Trophy
	if (ups >= 10000) return '🥇'; // Gold
	if (ups >= 5000) return '🥈'; // Silver
	if (ups >= 1000) return '🥉'; // Bronze
	if (ups >= 500) return '⭐'; // Star
	return '👍'; // Thumbs up
};

// Sort option configurations with enhanced styling
const SORT_OPTIONS = {
	hot: {
		name: '🔥 Hot',
		description: 'Trending right now',
		emoji: '🔥',
		color: '#FF6B35',
	},
	new: {
		name: '✨ New',
		description: 'Fresh off the press',
		emoji: '✨',
		color: '#00D4AA',
	},
	top: {
		name: '👑 Top',
		description: 'Best of the best',
		emoji: '👑',
		color: '#FFB800',
	},
	rising: {
		name: '📈 Rising',
		description: 'Gaining momentum',
		emoji: '📈',
		color: '#FF9500',
	},
	controversial: {
		name: '💥 Controversial',
		description: 'Sparking debate',
		emoji: '💥',
		color: '#E91E63',
	},
};

const TIME_OPTIONS = {
	hour: { name: '⏱️ Past Hour', description: 'Last 60 minutes', emoji: '⏱️' },
	day: { name: '📅 Today', description: 'Last 24 hours', emoji: '📅' },
	week: { name: '📊 This Week', description: 'Last 7 days', emoji: '📊' },
	month: { name: '📆 This Month', description: 'Last 30 days', emoji: '📆' },
	year: { name: '🗓️ This Year', description: 'Last 365 days', emoji: '🗓️' },
	all: { name: '♾️ All Time', description: 'The greatest hits', emoji: '♾️' },
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
 * Creates a premium Discord Embed for a Reddit post
 */
const createPostEmbed = (
	post: RedditPostData,
	currentIndex: number,
	totalPosts: number,
	sort: string,
): EmbedBuilder => {
	const timeString = formatTimeAgo(post.created_utc * 1000);
	const sortConfig = SORT_OPTIONS[sort as keyof typeof SORT_OPTIONS];
	const sortColor = REDDIT_COLORS[sort as keyof typeof REDDIT_COLORS] || REDDIT_COLORS.default;
	const engagementEmoji = getEngagementEmoji(post.ups);

	const embed = new EmbedBuilder()
		.setColor(sortColor as ColorResolvable)
		.setTitle(
			post.title.length > MAX_TITLE_LENGTH
				? `${post.title.substring(0, MAX_TITLE_LENGTH - 3)}...`
				: post.title,
		)
		.setURL(`${REDDIT_BASE_URL}${post.permalink}`)
		.setAuthor({
			name: `${post.subreddit_name_prefixed}`,
			url: `${REDDIT_BASE_URL}/${post.subreddit_name_prefixed}`,
			iconURL: REDDIT_ICON_URL,
		});

	// Build enhanced description
	let description = '';

	// Add content type indicator
	const contentTypes: string[] = [];
	if (post.is_video) contentTypes.push('🎬 Video');
	else if (post.url?.match(/\.(jpeg|jpg|gif|png|webp)$/i)) contentTypes.push('🖼️ Image');
	else if (post.is_gallery) contentTypes.push('📸 Gallery');
	else if (post.selftext) contentTypes.push('📝 Text');
	else if (post.url && !post.url.includes('reddit.com')) contentTypes.push('🔗 Link');

	if (contentTypes.length > 0) {
		description += `${contentTypes.join(' • ')}\n\n`;
	}

	// Add selftext if available
	if (post.selftext?.trim()) {
		const maxLen = MAX_DESCRIPTION_LENGTH - description.length - 150;
		const selfText =
			post.selftext.length > maxLen
				? `${post.selftext.substring(0, maxLen - 3)}...`
				: post.selftext;
		description += selfText;
	}

	// Special handling for videos
	if (post.is_video && post.media?.reddit_video) {
		if (description) description += '\n\n';
		description += `▶️ **[Watch Video](${post.media.reddit_video.fallback_url})**`;
	}

	// Media handling
	if (post.url?.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
		embed.setImage(post.url);
	} else if (
		post.thumbnail &&
		!['self', 'default', 'nsfw', 'spoiler', ''].includes(post.thumbnail)
	) {
		// Only set thumbnail if it's a valid URL
		if (post.thumbnail.startsWith('http')) {
			embed.setThumbnail(post.thumbnail);
		}
	}

	// For gallery posts, try to get first image
	if (post.is_gallery && post.gallery_data?.items?.[0]) {
		const firstMediaId = post.gallery_data.items[0].media_id;
		if (post.media_metadata?.[firstMediaId]?.s?.u) {
			embed.setImage(post.media_metadata[firstMediaId].s.u.replace(/&amp;/g, '&'));
		}
	}

	if (description) {
		embed.setDescription(description);
	}

	// Build tag indicators
	const tags: string[] = [];
	if (post.over_18) tags.push('`🔞 NSFW`');
	if (post.spoiler) tags.push('`⚠️ SPOILER`');
	if (post.locked) tags.push('`🔒 LOCKED`');
	if (post.stickied) tags.push('`📌 PINNED`');
	if (post.is_original_content) tags.push('`✨ OC`');

	// Add stats fields with visual appeal
	const upvotePercent = Math.round(post.upvote_ratio * 100);
	const upvoteBar =
		'█'.repeat(Math.floor(upvotePercent / 10)) + '░'.repeat(10 - Math.floor(upvotePercent / 10));

	embed.addFields(
		{
			name: `${engagementEmoji} Score`,
			value: `**${post.ups.toLocaleString()}**\n\`${upvoteBar}\` ${upvotePercent}%`,
			inline: true,
		},
		{
			name: '💬 Comments',
			value: `**${post.num_comments.toLocaleString()}**`,
			inline: true,
		},
		{
			name: `${sortConfig?.emoji || '📊'} Sorting`,
			value: `**${sortConfig?.name || sort}**`,
			inline: true,
		},
	);

	// Add flair if present
	if (post.link_flair_text) {
		embed.addFields({
			name: '🏷️ Flair',
			value: `\`${post.link_flair_text}\``,
			inline: true,
		});
	}

	// Add tags if any
	if (tags.length > 0) {
		embed.addFields({
			name: '🚩 Tags',
			value: tags.join(' '),
			inline: true,
		});
	}

	// Premium footer
	embed.setFooter({
		text: `👤 u/${post.author} • 🕐 ${timeString} • 📄 ${currentIndex + 1}/${totalPosts}`,
		iconURL: REDDIT_ICON_URL,
	});

	// Add timestamp
	embed.setTimestamp(post.created_utc * 1000);

	return embed;
};

/**
 * Creates premium navigation components
 */
const createNavigationComponents = (
	session: RedditSession,
	_interaction: ChatInputCommandInteraction,
): ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] => {
	const { currentIndex, posts, sort } = session;
	const isFirst = currentIndex === 0;
	const isLast = currentIndex === posts.length - 1;
	const sortConfig = SORT_OPTIONS[sort as keyof typeof SORT_OPTIONS];

	// Navigation buttons row - Clean emoji-only design
	const navigationRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId('reddit_first')
			.setEmoji('⏪')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(isFirst),
		new ButtonBuilder()
			.setCustomId('reddit_prev')
			.setEmoji('◀️')
			.setStyle(isFirst ? ButtonStyle.Secondary : ButtonStyle.Primary)
			.setDisabled(isFirst),
		new ButtonBuilder()
			.setCustomId('reddit_random')
			.setEmoji('🎲')
			.setLabel('Shuffle')
			.setStyle(ButtonStyle.Success),
		new ButtonBuilder()
			.setCustomId('reddit_next')
			.setEmoji('▶️')
			.setStyle(isLast ? ButtonStyle.Secondary : ButtonStyle.Primary)
			.setDisabled(isLast),
		new ButtonBuilder()
			.setCustomId('reddit_last')
			.setEmoji('⏩')
			.setStyle(ButtonStyle.Secondary)
			.setDisabled(isLast),
	);

	// Action buttons row - Premium design
	const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId('reddit_refresh')
			.setEmoji('🔃')
			.setLabel('New Posts')
			.setStyle(ButtonStyle.Secondary),
		new ButtonBuilder()
			.setLabel('View on Reddit')
			.setEmoji('🔗')
			.setStyle(ButtonStyle.Link)
			.setURL(`${REDDIT_BASE_URL}${posts[currentIndex].permalink}`),
		new ButtonBuilder()
			.setCustomId('reddit_share')
			.setEmoji('📋')
			.setLabel('Copy Link')
			.setStyle(ButtonStyle.Secondary),
		new ButtonBuilder()
			.setCustomId('reddit_info')
			.setEmoji('📊')
			.setLabel('Stats')
			.setStyle(ButtonStyle.Secondary),
	);

	// Sort selector with dynamic placeholder
	const sortOptions = Object.entries(SORT_OPTIONS).map(([value, config]) =>
		new StringSelectMenuOptionBuilder()
			.setLabel(config.name)
			.setDescription(config.description)
			.setEmoji(config.emoji)
			.setValue(value)
			.setDefault(value === sort),
	);

	const sortRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
		new StringSelectMenuBuilder()
			.setCustomId('reddit_sort')
			.setPlaceholder(`${sortConfig?.emoji || '📊'} ${sortConfig?.name || 'Sort by...'} ▾`)
			.addOptions(sortOptions),
	);

	return [navigationRow, actionRow, sortRow];
};

/**
 * Creates time filter component for top/controversial sorts
 */
const createTimeFilterComponent = (
	session: RedditSession,
): ActionRowBuilder<StringSelectMenuBuilder> | null => {
	const { sort, time } = session;

	if (sort !== 'top' && sort !== 'controversial') {
		return null;
	}

	const timeConfig = TIME_OPTIONS[time as keyof typeof TIME_OPTIONS];
	const timeOptions = Object.entries(TIME_OPTIONS).map(([value, config]) =>
		new StringSelectMenuOptionBuilder()
			.setLabel(config.name)
			.setDescription(config.description)
			.setEmoji(config.emoji)
			.setValue(value)
			.setDefault(value === time),
	);

	return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
		new StringSelectMenuBuilder()
			.setCustomId('reddit_time')
			.setPlaceholder(`${timeConfig?.emoji || '📅'} ${timeConfig?.name || 'Time Period'} ▾`)
			.addOptions(timeOptions),
	);
};

/**
 * Safe reply function with better error handling
 */
const safeReply = async (
	interaction: ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction,
	options: string | InteractionReplyOptions | InteractionEditReplyOptions,
	isEphemeral = false,
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
const fetchRedditPosts = async (
	subreddit: string,
	sort: string,
	time: string,
): Promise<RedditPostData[]> => {
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

	const posts = response.data?.data?.children?.filter((p) => p?.data && !p.data.stickied);

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
	session: RedditSession,
): Promise<void> => {
	const { posts, currentIndex, sort } = session;
	const currentPost = posts[currentIndex];

	const embed = createPostEmbed(currentPost, currentIndex, posts.length, sort);
	const components = createNavigationComponents(
		session,
		interaction as ChatInputCommandInteraction,
	);

	// Add time filter if applicable
	const timeFilter = createTimeFilterComponent(session);
	if (timeFilter) {
		components.push(timeFilter);
	}

	await safeReply(interaction, {
		embeds: [embed],
		components,
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
			option.setName('subreddit').setDescription('Subreddit name (without r/)').setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName('sort')
				.setDescription('Sort method')
				.setRequired(false)
				.addChoices(
					...Object.entries(SORT_OPTIONS).map(([value, config]) => ({
						name: config.name,
						value,
					})),
				),
		)
		.addStringOption((option) =>
			option
				.setName('time')
				.setDescription('Time period (for Top/Controversial)')
				.setRequired(false)
				.addChoices(
					...Object.entries(TIME_OPTIONS).map(([value, config]) => ({
						name: config.name,
						value,
					})),
				),
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
		_client: Client<boolean>,
		interaction: ChatInputCommandInteraction<CacheType>,
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
				userId: interaction.user.id,
			};

			activeSessions.set(sessionId, session);

			await updateDisplay(interaction, session);

			// Fetch the reply message to create collector on it (works in DMs)
			let message: Message;
			try {
				message = await interaction.fetchReply();
			} catch {
				console.error('Failed to fetch reply for Reddit collector');
				return;
			}

			// Component interaction collector on the message itself
			const collector = message.createMessageComponentCollector({
				time: COMPONENT_TIMEOUT,
			});

			collector.on('collect', async (i) => {
				if (i.user.id !== interaction.user.id) {
					await i.reply({
						content: '❌ Only the command user can interact with these components.',
						flags: [MessageFlags.Ephemeral],
					});
					return;
				}

				try {
					await i.deferUpdate();
				} catch {
					// Defer failed, interaction may have expired
					return;
				}

				const currentSession = activeSessions.get(sessionId);
				if (!currentSession) return;

				if (i.isButton()) {
					switch (i.customId) {
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
								const newPosts = await fetchRedditPosts(
									currentSession.subreddit,
									currentSession.sort,
									currentSession.time,
								);
								currentSession.posts = newPosts;
								currentSession.currentIndex = 0;
							} catch (_error) {
								await i.followUp({
									content: '❌ Failed to refresh posts.',
									flags: [MessageFlags.Ephemeral],
								});
								return;
							}
							break;
						case 'reddit_share':
							const sharePost = currentSession.posts[currentSession.currentIndex];
							await i.followUp({
								content: `📤 **Share this post:**\n${REDDIT_BASE_URL}${sharePost.permalink}`,
								flags: [MessageFlags.Ephemeral],
							});
							return;
						case 'reddit_info':
							const infoPost = currentSession.posts[currentSession.currentIndex];
							const infoEmbed = new EmbedBuilder()
								.setTitle('📊 Post Statistics')
								// .setColor(REDDIT_COLORS[currentSession.sort as keyof typeof REDDIT_COLORS])
								.addFields(
									{
										name: '👍 Score',
										value: infoPost.ups.toLocaleString(),
										inline: true,
									},
									{
										name: '👎 Downvotes',
										value: Math.round(
											infoPost.ups / infoPost.upvote_ratio - infoPost.ups,
										).toLocaleString(),
										inline: true,
									},
									{
										name: '📊 Upvote Ratio',
										value: `${Math.round(infoPost.upvote_ratio * 100)}%`,
										inline: true,
									},
									{
										name: '💬 Comments',
										value: infoPost.num_comments.toLocaleString(),
										inline: true,
									},
									{
										name: '👤 Author',
										value: `u/${infoPost.author}`,
										inline: true,
									},
									{
										name: '🏷️ Flair',
										value: infoPost.link_flair_text || 'None',
										inline: true,
									},
								)
								.setFooter({
									text: `Posted in ${infoPost.subreddit_name_prefixed}`,
								});

							await i.followUp({
								embeds: [infoEmbed],
								flags: [MessageFlags.Ephemeral],
							});
							return;
					}

					// Update display using interaction.editReply for DM compatibility
					try {
						const { posts, currentIndex, sort } = currentSession;
						const currentPost = posts[currentIndex];
						const embed = createPostEmbed(currentPost, currentIndex, posts.length, sort);
						const components = createNavigationComponents(
							currentSession,
							interaction as ChatInputCommandInteraction,
						);
						const timeFilter = createTimeFilterComponent(currentSession);
						if (timeFilter) {
							components.push(timeFilter);
						}
						await interaction.editReply({
							embeds: [embed],
							components,
						});
					} catch (error) {
						console.error('Failed to update Reddit display:', error);
					}
				}

				if (i.isStringSelectMenu()) {
					const selectedValue = i.values[0];

					if (i.customId === 'reddit_sort') {
						currentSession.sort = selectedValue;
						try {
							const newPosts = await fetchRedditPosts(
								currentSession.subreddit,
								currentSession.sort,
								currentSession.time,
							);
							currentSession.posts = newPosts;
							currentSession.currentIndex = 0;
						} catch (_error) {
							await i.followUp({
								content: '❌ Failed to load posts with new sort.',
								flags: [MessageFlags.Ephemeral],
							});
							return;
						}
					} else if (i.customId === 'reddit_time') {
						currentSession.time = selectedValue;
						try {
							const newPosts = await fetchRedditPosts(
								currentSession.subreddit,
								currentSession.sort,
								currentSession.time,
							);
							currentSession.posts = newPosts;
							currentSession.currentIndex = 0;
						} catch (_error) {
							await i.followUp({
								content: '❌ Failed to load posts with new time filter.',
								flags: [MessageFlags.Ephemeral],
							});
							return;
						}
					}

					// Update display using interaction.editReply for DM compatibility
					try {
						const { posts, currentIndex, sort } = currentSession;
						const currentPost = posts[currentIndex];
						const embed = createPostEmbed(currentPost, currentIndex, posts.length, sort);
						const components = createNavigationComponents(
							currentSession,
							interaction as ChatInputCommandInteraction,
						);
						const timeFilter = createTimeFilterComponent(currentSession);
						if (timeFilter) {
							components.push(timeFilter);
						}
						await interaction.editReply({
							embeds: [embed],
							components,
						});
					} catch (error) {
						console.error('Failed to update Reddit display:', error);
					}
				}
			});
			// Cleanup session after timeout
			collector.on('end', async (_collected, reason) => {
				activeSessions.delete(sessionId);

				if (reason === 'time') {
					try {
						// Regenerate components to ensure we have the correct state, then disable them
						const rows = createNavigationComponents(
							session,
							interaction as ChatInputCommandInteraction,
						);
						const timeFilter = createTimeFilterComponent(session);
						if (timeFilter) {
							rows.push(timeFilter);
						}

						const disabledRows = rows.map((row) => {
							row.components.forEach((c) => c.setDisabled(true));
							return row;
						});

						await interaction.editReply({
							components: disabledRows,
						});
					} catch (error) {
						// Only log if it's not a "Unknown Message" error (message might be deleted)
						if (!(error instanceof Error && error.message.includes('Unknown Message'))) {
							console.error('Failed to disable Reddit components:', error);
						}
					}
				}
			});
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
	},
};

export default redditCommand;
