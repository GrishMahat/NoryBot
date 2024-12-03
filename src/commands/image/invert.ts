import {
  EmbedBuilder,
  SlashCommandBuilder,
  CommandInteraction,
  Client,
  AttachmentBuilder,
} from 'discord.js';
import DIG from 'discord-image-generation';

const invertCommand: LocalCommand = {
  data: new SlashCommandBuilder()
    .setName('invert')
    .setDescription("Invert the colors of someone's avatar")
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user whose avatar to invert')
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

      // Generate the inverted image
      const img = await new DIG.Invert().getImage(avatarUrl);

      // Create an attachment
      const attachment = new AttachmentBuilder(img, { name: 'invert.png' });

      const embed = new EmbedBuilder()
        .setColor('#FF00FF')
        .setDescription(`${targetUser.toString()}'s avatar with inverted colors`)
        .setImage('attachment://invert.png')
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
        files: [attachment],
      });
    } catch (error) {
      console.error('Error in invert command:', error);
      await interaction.editReply('Failed to generate the image.');
    }
  },
};

export default invertCommand;
