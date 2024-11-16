import {
  EmbedBuilder,
  SlashCommandBuilder,
  CommandInteraction,
  Client,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} from 'discord.js';
import { LocalCommand } from '../../types/index';
import DIG from 'discord-image-generation';

const blurCommand: LocalCommand = {
  data: new SlashCommandBuilder()
    .setName('blur')
    .setDescription("Blurs a user's avatar")
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('User whose avatar you want to blur')
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName('level')
        .setDescription('Blur level (1-100)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1])
    .toJSON(),
  userPermissions: [],
  botPermissions: [],
  category: 'Misc',
  cooldown: 15,
  nsfwMode: false,
  testMode: false,
  devOnly: false,

  run: async (client: Client, interaction: CommandInteraction) => {
    try {
      await interaction.deferReply();

      const user =
        (await interaction.options.get('user')?.user) || interaction.user;
      const blurLevel = interaction.options.get('level')?.value || 5;

      const avatarUrl = user.displayAvatarURL({
        extension: 'png',
        forceStatic: true,
        size: 512,
      });

      // Generate the blurred image
      const img = await new DIG.Blur().getImage(avatarUrl, Number(blurLevel));

      // Create an attachment using AttachmentBuilder
      const attachment = new AttachmentBuilder(img).setName('blur.png');

            const embed = new EmbedBuilder()
              .setTitle('🌫️ Blur Effect')
              .setColor('Blue')
              .setDescription(`${user.toString()}'s avatar has been blurred!`)
              .addFields(
                {
                  name: 'Requested by',
                  value: interaction.user.toString(),
                  inline: true,
                },
                { name: 'Blur Level', value: `\`${blurLevel}\``, inline: true },

              )
              .setImage('attachment://blur.png')
              .setTimestamp()
              .setFooter({
                text: 'Nory',
                iconURL: client.user.displayAvatarURL(),
              });

      // Send the image as a reply
      await interaction.editReply({
        embeds: [embed],
        files: [attachment],
      });
    } catch (error) {
      console.error('Error while generating blur image:', error);
      await interaction.editReply({
        content: 'Sorry, something went wrong while generating the image.',
      });
    }
  },
};

export default blurCommand;
