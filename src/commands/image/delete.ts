import {
  EmbedBuilder,
  SlashCommandBuilder,
  CommandInteraction,
  Client,
  AttachmentBuilder,
} from 'discord.js';
import { LocalCommand } from '../../types/index';
import DIG from 'discord-image-generation';

const deleteCommand: LocalCommand = {
  data: new SlashCommandBuilder()
    .setName('delete')
    .setDescription('Generate a "Delete This" meme with someone\'s avatar')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to delete')
        .setRequired(false)
    )
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1])
    .toJSON(),
  userPermissions: [],
  botPermissions: [],
  category: 'Image',
  cooldown: 15,
  nsfwMode: false,
  testMode: false,
  devOnly: false,

  run: async (client: Client, interaction: CommandInteraction) => {
    try {
      await interaction.deferReply();

      const targetUser = 
        interaction.options.get('user')?.user || interaction.user;

      const avatarUrl = targetUser.displayAvatarURL({
        extension: 'png',
        forceStatic: true,
        size: 512,
      });

      // Generate the Delete image
      const img = await new DIG.Delete().getImage(avatarUrl);

      // Create an attachment
      const attachment = new AttachmentBuilder(img, { name: 'delete.png' });

      const embed = new EmbedBuilder()
        .setColor('#FF4444')
        .setAuthor({
          name: 'Delete This!',
          iconURL: client.user.displayAvatarURL(),
        })
        .setDescription(
          targetUser.id === interaction.user.id
            ? `🗑️ **${interaction.user.username}** wants to delete themselves!`
            : `🗑️ **${interaction.user.username}** wants to delete **${targetUser.username}**!`
        )
        .addFields({
          name: '❌ Target',
          value: `<@${targetUser.id}>`,
          inline: true,
        })
        .setImage('attachment://delete.png')
        .setTimestamp()
        .setFooter({
          text: 'Right click > Delete',
          iconURL: interaction.user.displayAvatarURL(),
        });

      await interaction.editReply({
        embeds: [embed],
        files: [attachment],
      });
    } catch (error) {
      console.error('Error generating delete image:', error);
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('❌ Error')
            .setDescription('Failed to generate the delete image. Please try again later.')
            .setTimestamp(),
        ],
      });
    }
  },
};

export default deleteCommand; 