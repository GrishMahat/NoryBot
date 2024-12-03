import {
  EmbedBuilder,
  SlashCommandBuilder,
  CommandInteraction,
  Client,
  AttachmentBuilder,
} from 'discord.js';
import DIG from 'discord-image-generation';

const greyscaleCommand: LocalCommand = {
  data: new SlashCommandBuilder()
    .setName('greyscale')
    .setDescription("Convert someone's avatar to black and white")
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user whose avatar to convert')
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

      // Generate the greyscale image
      const img = await new DIG.Greyscale().getImage(avatarUrl);

      // Create an attachment
      const attachment = new AttachmentBuilder(img, { name: 'greyscale.png' });

      const embed = new EmbedBuilder()
        .setColor('#808080')
        .setDescription(`${targetUser.toString()}'s avatar in black and white`)
        .setImage('attachment://greyscale.png')
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
        files: [attachment],
      });
    } catch (error) {
      console.error('Error in greyscale command:', error);
      await interaction.editReply('Failed to generate the image.');
    }
  },
};

export default greyscaleCommand;
