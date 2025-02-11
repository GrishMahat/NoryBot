import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  EmbedBuilder,
  ContextMenuCommandInteraction,
  Client,
  MessageFlags,
} from 'discord.js';

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

const MessageInfoContextMenu: LocalContextMenu = {
  data: new ContextMenuCommandBuilder()
    .setName('Message Info')
    .setType(ApplicationCommandType.Message),

  async run(client: Client, interaction: ContextMenuCommandInteraction) {
    if (!interaction.isMessageContextMenuCommand()) return;

    const message = interaction.targetMessage;
    const embed = new EmbedBuilder()
      .setTitle('📨 Message Information')
      .setColor('#2B2D31')
      .addFields([
        {
          name: '📋 General Info',
          value: [
            `**Author:** ${message.author}`,
            `**Channel:** ${message.channel}`,
            `**Created:** ${formatDate(message.createdAt)}`,
            `**Edited:** ${message.editedAt ? formatDate(message.editedAt) : 'Never'}`,
            `**ID:** ${message.id}`,
            `**Type:** ${message.type}`,
            `**URL:** [Click here](${message.url})`,
          ].join('\n'),
        },
        {
          name: '📊 Statistics',
          value: [
            `**Attachments:** ${message.attachments.size}`,
            `**Embeds:** ${message.embeds.length}`,
            `**Mentions:** ${message.mentions.users.size} users, ${message.mentions.roles.size} roles`,
            `**Reactions:** ${message.reactions.cache.size}`,
            `**Components:** ${message.components.length}`,
            `**Pinned:** ${message.pinned ? 'Yes' : 'No'}`,
            `**Webhook:** ${message.webhookId ? 'Yes' : 'No'}`,
          ].join('\n'),
        },
      ]);

    if (message.content) {
      embed.addFields({
        name: '📝 Content',
        value:
          message.content.length > 1024
            ? message.content.slice(0, 1021) + '...'
            : message.content,
      });
    }

    if (message.attachments.size > 0) {
      const attachments = message.attachments.map(
        (a) => `[${a.name}](${a.url}) (${(a.size / 1024).toFixed(2)} KB)`
      );
      embed.addFields({
        name: '📎 Attachments',
        value: attachments.join('\n'),
      });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
export default MessageInfoContextMenu;
