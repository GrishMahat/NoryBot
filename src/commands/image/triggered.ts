import {
  EmbedBuilder,
  SlashCommandBuilder,
  CommandInteraction,
  Client,
  AttachmentBuilder,
} from 'discord.js';
import { LocalCommand } from '../../types/index';
import DIG from 'discord-image-generation';

const triggeredCommand: LocalCommand = {
  data: new SlashCommandBuilder()
    .setName('triggered')
    .setDescription("Generate a triggered version of user's avatar")
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to trigger')
        .setRequired(false)
    )
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1])
    .toJSON(),
  userPermissions: [],
  botPermissions: [],
  category: 'Fun',
  cooldown: 10,
  nsfwMode: false,
  testMode: false,
  devOnly: false,

  run: async (client: Client, interaction: CommandInteraction) => {
    try {
      await interaction.deferReply();

      const userOption = interaction.options.get('user')?.user || interaction.user;

      const avatarUrl = userOption.displayAvatarURL({
        extension: 'png',
        forceStatic: true,
        size: 512,
      });

      // Generate the Triggered image
      const img = await new DIG.Triggered().getImage(avatarUrl);

      // Create an attachment
      const attachment = new AttachmentBuilder(img, { name: 'triggered.gif' });

      // Create embed
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setAuthor({
          name: 'TRIGGERED!',
          iconURL: client.user.displayAvatarURL(),
        })
        .setDescription(
          userOption.id === interaction.user.id
            ? `😠 **${interaction.user.username}** got triggered!`
            : `😠 **${interaction.user.username}** triggered **${userOption.username}**!`
        )
        .setImage('attachment://triggered.gif')
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
      console.error('Error generating triggered image:', error);

      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription(
          'Failed to generate the triggered image. Please try again later.'
        )
        .setTimestamp();

      await interaction.editReply({
        embeds: [errorEmbed],
      });
    }
  },
};

export default triggeredCommand;
