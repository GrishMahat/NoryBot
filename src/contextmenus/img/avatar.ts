import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  EmbedBuilder,
  Client,
  UserContextMenuCommandInteraction,
  ContextMenuCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  GuildMember,
} from 'discord.js';
import { LocalContextMenu } from '../../types/index.js';

const UserAvatarContextMenu: LocalContextMenu = {
  data: new ContextMenuCommandBuilder()
    .setName('User Avatar')
    .setType(2)
    .setDMPermission(false),
  userPermissions: [],
  botPermissions: [],
  run: async (client: Client, interaction: ContextMenuCommandInteraction) => {
    if (!(interaction instanceof UserContextMenuCommandInteraction)) {
      await interaction.reply({
        content: '❌ This command can only be used on users.',
        ephemeral: true,
      });
      return;
    }

    try {
      const user = interaction.targetUser;
      const member = interaction.guild
        ? await interaction.guild.members.fetch(user.id).catch(() => null)
        : null;
      const formats = ['png', 'jpg', 'webp', 'gif'];
      const sizes = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096];

      // Get avatar URLs for both global and server-specific avatars
      const globalAvatars = formats
        .map((format) => ({
          format,
          url: user.displayAvatarURL({
            extension: format as 'png' | 'jpg' | 'webp' | 'gif',
            size: 4096,
            forceStatic: format !== 'gif',
          }),
          type: 'Global',
        }))
        .filter((avatar) => avatar.url);

      const serverAvatars = member?.avatar
        ? formats
            .map((format) => ({
              format,
              url: member.displayAvatarURL({
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
        `👤 **User:** ${user.toString()} (${user.id})`,
        `🔷 **Global Avatar:** ${user.avatar ? '✅' : '❌'}`,
        `🔶 **Server Avatar:** ${member?.avatar ? '✅' : '❌'}`,
        `��� **Avatar Decoration:** ${user.avatarDecoration ? '✅' : '❌'}`,
        `🎬 **Animated:** ${user.avatar?.startsWith('a_') ? '✅' : '❌'}`,
        `📏 **Available Sizes:** ${sizes.join(', ')}px`,
      ];

      if (user.banner) {
        embedDescription.push(
          `🎌 **Banner:** [View Banner](${user.bannerURL({ size: 4096 })})`
        );
      }

      const embed = new EmbedBuilder()
        .setAuthor({
          name: user.tag,
          iconURL: user.displayAvatarURL({ extension: 'png', size: 16 }),
        })
        .setTitle('🖼️ Avatar Information')
        .setDescription(embedDescription.join('\n'))
        .setImage(defaultAvatar)
        .setColor(member?.displayColor || '#2F3136')
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        components: [buttons],
      });
    } catch (error) {
      console.error('Error in User Avatar context menu:', error);
      await interaction.reply({
        content: '❌ An error occurred while fetching avatar information.',
        ephemeral: true,
      });
    }
  },
};

export default UserAvatarContextMenu;
