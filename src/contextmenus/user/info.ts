import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  EmbedBuilder,
  ContextMenuCommandInteraction,
  Client,
  GuildMember,
  User,
} from 'discord.js';

/**
 * Get the user's status with emojis
 */
function getStatusEmoji(member: GuildMember | null): string {
  if (!member) return '⚫ Offline';
  const status = member.presence?.status;
  switch (status) {
    case 'online':
      return '🟢 Online';
    case 'idle':
      return '🟡 Idle';
    case 'dnd':
      return '🔴 Do Not Disturb';
    default:
      return '⚫ Offline';
  }
}

/**
 * Format a timestamp into a readable date
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

export default {
  data: new ContextMenuCommandBuilder()
    .setName('User Info')
    .setType(ApplicationCommandType.User),

  async run(client: Client, interaction: ContextMenuCommandInteraction) {
    if (!interaction.isUserContextMenuCommand()) return;

    const user = interaction.targetUser;
    const member = interaction.guild?.members.cache.get(user.id);

    const roles =
      member?.roles.cache
        .filter((role) => role.id !== interaction.guild?.id)
        .sort((a, b) => b.position - a.position)
        .map((role) => role.toString())
        .slice(0, 15) || [];

    const embed = new EmbedBuilder()
      .setTitle('👤 User Information')
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .setColor(member?.displayHexColor || '#2B2D31')
      .addFields([
        {
          name: '📋 General Info',
          value: [
            `**Username:** ${user.tag}`,
            `**Display Name:** ${member?.displayName || user.username}`,
            `**ID:** ${user.id}`,
            `**Status:** ${getStatusEmoji(member)}`,
            `**Account Created:** ${formatDate(user.createdAt)}`,
            member ? `**Joined Server:** ${formatDate(member.joinedAt!)}` : '',
          ].join('\n'),
        },
        {
          name: '🎭 Profile',
          value: [
            `**Bot:** ${user.bot ? 'Yes' : 'No'}`,
            `**System:** ${user.system ? 'Yes' : 'No'}`,
            `**Nickname:** ${member?.nickname || 'None'}`,
            `**Banner:** ${user.banner ? 'Yes' : 'No'}`,
            `**Boosting Since:** ${member?.premiumSince ? formatDate(member.premiumSince) : 'Not Boosting'}`,
          ].join('\n'),
        },
      ]);

    if (roles.length > 0) {
      embed.addFields({
        name: `📝 Roles [${roles.length}]`,
        value: roles.join(', ') || 'None',
      });
    }

    if (member?.presence?.activities.length) {
      const activities = member.presence.activities.map(
        (activity) => `**${activity.type}:** ${activity.name}`
      );
      embed.addFields({
        name: '🎮 Activities',
        value: activities.join('\n'),
      });
    }

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
