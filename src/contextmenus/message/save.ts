import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  EmbedBuilder,
  ContextMenuCommandInteraction,
  Client,
  MessageFlags,
} from 'discord.js';

const MessageSaveContextMenu: LocalContextMenu = {
  data: new ContextMenuCommandBuilder()
    .setName('Save Message')
    .setType(ApplicationCommandType.Message),

  async run(client: Client, interaction: ContextMenuCommandInteraction) {
    if (!interaction.isMessageContextMenuCommand()) return;

    const message = interaction.targetMessage;
    const saveEmbed = new EmbedBuilder()
      .setAuthor({
        name: message.author.tag,
        iconURL: message.author.displayAvatarURL(),
      })
      .setDescription(message.content || 'No content')
      .setColor('#2B2D31')
      .setTimestamp(message.createdAt)
      .setFooter({
        text: `From #${(message.channel as any).name} in ${interaction.guild?.name}`,
      });

    // Add attachments if any
    if (message.attachments.size > 0) {
      const attachment = message.attachments.first();
      if (attachment?.contentType?.startsWith('image/')) {
        saveEmbed.setImage(attachment.url);
      }

      const otherAttachments = message.attachments
        .filter((a) => !a.contentType?.startsWith('image/'))
        .map((a) => `[${a.name}](${a.url})`);

      if (otherAttachments.length > 0) {
        saveEmbed.addFields({
          name: '📎 Attachments',
          value: otherAttachments.join('\n'),
        });
      }
    }

    // Add original message reference
    saveEmbed.addFields({
      name: '🔗 Source',
      value: `[Jump to Message](${message.url})`,
    });

    try {
      // Send the saved message to user's DM
      await interaction.user.send({
        content: "📥 Here's your saved message:",
        embeds: [saveEmbed],
      });

      // Confirm to the user
      await interaction.reply({
        content: '✅ Message has been saved to your DMs!',
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      // Handle if user has DMs closed
      await interaction.reply({
        content:
          '❌ Unable to send you the message. Please make sure your DMs are open.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

export default MessageSaveContextMenu;
