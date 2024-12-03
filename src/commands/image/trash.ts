import {
  EmbedBuilder,
  SlashCommandBuilder,
  CommandInteraction,
  Client,
  AttachmentBuilder,
} from 'discord.js';
import { LocalCommand } from '../../types/index';
import DIG from 'discord-image-generation';

const trashCommand: LocalCommand = {
  data: new SlashCommandBuilder()
    .setName('trash')
    .setDescription("Put someone's avatar in the trash")
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to throw in the trash')
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

      // Generate the Trash image
      const img = await new DIG.Trash().getImage(avatarUrl);

      // Create an attachment
      const attachment = new AttachmentBuilder(img, { name: 'trash.png' });

      const embed = new EmbedBuilder()
        .setColor('#8B4513')
        .setAuthor({
          name: 'Taking Out the Trash!',
          iconURL: client.user.displayAvatarURL(),
        })
        .setDescription(
          targetUser.id === interaction.user.id
            ? `🗑️ **${interaction.user.username}** threw themselves in the trash!`
            : `🗑️ **${interaction.user.username}** threw **${targetUser.username}** in the trash!`
        )
        .setImage('attachment://trash.png')
        .setTimestamp()
        .setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        });

      await interaction.editReply({
        embeds: [embed],
        files: [attachment],
      });
    } catch (error) {
      console.error('Error generating trash image:', error);

      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription(
          'Failed to generate the trash image. Please try again later.'
        )
        .setTimestamp();

      await interaction.editReply({
        embeds: [errorEmbed],
      });
    }
  },
};

export default trashCommand;
