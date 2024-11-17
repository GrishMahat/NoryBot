import {
  EmbedBuilder,
  SlashCommandBuilder,
  CommandInteraction,
  Client,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  GuildMember,
  version as discordVersion,
} from 'discord.js';
import { LocalCommand } from '../../types/index.js';
import emojiConfig from '../../config/emoji.js';

const avatarCommand: LocalCommand = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Show and interact with user avatars')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('User whose avatar you want to see')
        .setRequired(false)
    )
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1])
    .toJSON(),

  run: async (client: Client, interaction: CommandInteraction) => {
    try {
      await interaction.deferReply();

      const targetUser =
        interaction.options.get('user')?.user || interaction.user;

      const targetMember = await interaction.guild.members.fetch(targetUser.id);

      const formats = ['png', 'jpg', 'webp', 'gif'];
      const sizes = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096];

      const avatarData = await getAvatarData(targetUser, targetMember);
      const { globalAvatars, serverAvatars, allAvatars, defaultAvatar } =
        avatarData;

      // Create download buttons for different formats
      const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...allAvatars
          .slice(0, 5)
          .map((avatar) =>
            new ButtonBuilder()
              .setLabel(`${avatar.type} ${avatar.format.toUpperCase()}`)
              .setStyle(ButtonStyle.Link)
              .setURL(avatar.url)
          )
      );

      const embedDescription = [
        `${emojiConfig.user} **User:** ${targetUser.toString()} (${targetUser.id})`,
        `${emojiConfig.avatar_gold} **Global Avatar:** ${targetUser.avatar ? emojiConfig.yestag : emojiConfig.notag}`,
        `${emojiConfig.avatar_gold} **Server Avatar:** ${targetMember.avatar ? emojiConfig.yestag : emojiConfig.notag}`,
        `${emojiConfig.GIF_Animation} **Animated:** ${targetUser.avatar?.startsWith('a_') || targetMember.avatar?.startsWith('a_') ? emojiConfig.yestag : emojiConfig.notag}`,
        `${emojiConfig.avatar_platinum} **Available Sizes:** ${sizes.join(', ')}px`,
      ];

      // Check for banner and handle GIF banners
      if (targetUser.banner) {
        const bannerURL = targetUser.bannerURL({
          size: 4096,
          extension: targetUser.banner.startsWith('a_') ? 'gif' : 'png'
        });
        if (bannerURL) {
          embedDescription.push(
            `🎌 **Banner:** [View Banner](${bannerURL})`
          );
        }
      }

      const embed = new EmbedBuilder()
        .setAuthor({
          name: targetUser.tag,
          iconURL: targetUser.displayAvatarURL({ extension: 'png', size: 16 }),
        })
        .setTitle(`${emojiConfig.avatar_diamond} Avatar Information`)
        .setDescription(embedDescription.join('\n'))
        .setImage(targetUser.displayAvatarURL({ 
          size: 4096,
          extension: targetUser.avatar?.startsWith('a_') ? 'gif' : 'png'
        }))
        .setColor(targetMember.displayColor || '#2F3136')
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
        components: [buttons],
      });
    } catch (error) {
      console.error('Error in avatar command:', error);
      await interaction.editReply({
        content: `${emojiConfig.notag} An error occurred while fetching the user avatar.`,
      });
    }
  },
};

async function getAvatarData(
  targetUser: CommandInteraction['user'],
  targetMember: GuildMember
) {
  const formats = ['png', 'jpg', 'webp', 'gif'];

  const globalAvatars = formats
    .map((format) => ({
      format,
      url: targetUser.displayAvatarURL({
        extension: format as 'png' | 'jpg' | 'webp' | 'gif',
        size: 4096,
        forceStatic: format !== 'gif',
      }),
      type: 'Global',
    }))
    .filter((avatar) => avatar.url);

  const serverAvatars = targetMember.avatar
    ? formats
        .map((format) => ({
          format,
          url: targetMember.displayAvatarURL({
            extension: format as 'png' | 'jpg' | 'webp' | 'gif',
            size: 4096,
            forceStatic: format !== 'gif',
          }),
          type: 'Server',
        }))
        .filter((avatar) => avatar.url)
    : [];

  const allAvatars = [...globalAvatars, ...serverAvatars];
  const defaultAvatar = allAvatars[0].url;

  return { globalAvatars, serverAvatars, allAvatars, defaultAvatar };
}

export default avatarCommand;
