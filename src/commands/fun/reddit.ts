import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  Client,
  MessageFlags,
} from 'discord.js';
import axios from 'axios';
import Pagination from '../../utils/helpers/Pagination.js';
import {
  RedditListing,
  RedditPostData,
  RedditSortOption,
  RedditTimeOption,
} from '../../types/index.js';

const redditCommand: LocalCommand = {
  data: new SlashCommandBuilder()
    .setName('reddit')
    .setDescription('Fetch posts from a subreddit')
    .addStringOption((option) =>
      option
        .setName('subreddit')
        .setDescription('Name of the subreddit (without r/)')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('sort')
        .setDescription('Sort posts by')
        .setRequired(false)
        .addChoices(
          { name: 'Hot', value: 'hot' },
          { name: 'New', value: 'new' },
          { name: 'Top', value: 'top' },
          { name: 'Rising', value: 'rising' },
        ),
    )
    .addStringOption((option) =>
      option
        .setName('time')
        .setDescription('Time period for top posts')
        .setRequired(false)
        .addChoices(
          { name: 'Today', value: 'day' },
          { name: 'This Week', value: 'week' },
          { name: 'This Month', value: 'month' },
          { name: 'This Year', value: 'year' },
          { name: 'All Time', value: 'all' },
        ),
    )
    .toJSON(),
  userPermissions: [],
  botPermissions: [],
  category: 'Fun',
  cooldown: 15,
  nsfwMode: false,
  testMode: false,
  devOnly: false,

  run: async (client: Client, interaction: ChatInputCommandInteraction) => {
    const subreddit = interaction.options.getString('subreddit', true);
    const sort =
      (interaction.options.getString('sort') as RedditSortOption) || 'hot';
    const time =
      (interaction.options.getString('time') as RedditTimeOption) || 'day';

    await interaction.deferReply();

    try {
      // Construct the Reddit URL
      let url = `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=30`;
      if (sort === 'top') {
        url += `&t=${time}`;
      }

      const response = await axios.get<RedditListing>(url, {
        headers: {
          'User-Agent': 'discord-bot:nory-bot:v0.1.0 (by /u/norybot)',
        },
      });

      // Check if subreddit exists and has posts
      if (response.data.data.children.length === 0) {
        await interaction.editReply(
          `No posts found in r/${subreddit} or subreddit doesn't exist.`,
        );
        return;
      }

      const posts = response.data.data.children;

      // Select a random post from the filtered list
      const randomIndex = Math.floor(
        Math.random() * Math.min(posts.length, 10),
      );
      const post = posts[randomIndex].data;

      // Format the post timestamp
      const createdDate = new Date(post.created_utc * 1000);
      const timeAgo = Math.floor(
        (Date.now() - createdDate.getTime()) / 3600000,
      );
      const timeString =
        timeAgo < 24
          ? `${timeAgo} hour${timeAgo === 1 ? '' : 's'} ago`
          : `${Math.floor(timeAgo / 24)} day${Math.floor(timeAgo / 24) === 1 ? '' : 's'} ago`;

      // Create embed for the post
      const embed = new EmbedBuilder()
        .setColor('#FF5700') // Reddit's orange color
        .setTitle(
          post.title.length > 256
            ? post.title.substring(0, 253) + '...'
            : post.title,
        )
        .setURL(`https://reddit.com${post.permalink}`)
        .setAuthor({
          name: `r/${post.subreddit}`,
          url: `https://reddit.com/r/${post.subreddit}`,
          iconURL:
            'https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png',
        })
        .setFooter({
          text: `👍 ${post.ups.toLocaleString()} | 💬 ${post.num_comments.toLocaleString()} | Posted ${timeString} by u/${post.author}`,
        });

      // Add image or video if available
      if (post.url.match(/\.(jpeg|jpg|gif|png)$/) !== null) {
        embed.setImage(post.url);
      } else if (
        post.thumbnail &&
        post.thumbnail !== 'self' &&
        post.thumbnail !== 'default'
      ) {
        embed.setThumbnail(post.thumbnail);
      }

      // Add text content if it's a self post
      if (post.selftext) {
        const truncatedText =
          post.selftext.length > 1000
            ? post.selftext.substring(0, 997) + '...'
            : post.selftext;
        embed.setDescription(truncatedText);
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error fetching from Reddit:', error);
      await interaction.editReply(
        `Failed to fetch posts from r/${subreddit}. The subreddit may not exist or could be private.`,
      );
    }
  },
};
// function createRedditLIstEmbeds(
//   client: Client,
//   interaction: ChatInputCommandInteraction,
//   RedditPostData: RedditPostData[],
// ): EmbedBuilder[] {
//   const embeds: EmbedBuilder[] = [];
//    for (RedditPostData in ){
//       const embed = new EmbedBuilder()
//          .setURL(url)
//    }
// }

export default redditCommand;
