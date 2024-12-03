import {
  EmbedBuilder,
  SlashCommandBuilder,
  CommandInteraction,
  Client,
  AttachmentBuilder,
} from 'discord.js';
import { LocalCommand } from '../../types/index';
import DIG from 'discord-image-generation';

const facepalmCommand: LocalCommand = {
  data: new SlashCommandBuilder()
    .setName('facepalm')
    .setDescription("Generate a facepalm image with someone's avatar")
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user doing the facepalm')
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

      // Generate the Facepalm image
      const img = await new DIG.Facepalm().getImage(avatarUrl);

      // Create an attachment
      const attachment = new AttachmentBuilder(img, { name: 'facepalm.png' });

      const embed = new EmbedBuilder()
        .setColor('#FFA500')
        .setAuthor({
          name: '*facepalm*',
          iconURL: client.user.displayAvatarURL(),
        })
        .setDescription(
          targetUser.id === interaction.user.id
            ? `🤦 **${interaction.user.username}** facepalmed!`
            : `🤦 **${interaction.user.username}** made **${targetUser.username}** facepalm!`
        )
        .setImage('attachment://facepalm.png')
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
      console.error('Error generating facepalm image:', error);

      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('Failed to generate the facepalm image. Please try again later.')
        .setTimestamp();

      await interaction.editReply({
        embeds: [errorEmbed],
      });
    }
  },
};

export default facepalmCommand; 