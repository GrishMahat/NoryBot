import {
  EmbedBuilder,
  SlashCommandBuilder,
  CommandInteraction,
  Client,
  AttachmentBuilder,
} from 'discord.js';
import DIG from 'discord-image-generation';

const sepiaCommand: LocalCommand = {
  data: new SlashCommandBuilder()
    .setName('sepia')
    .setDescription("Add a vintage sepia effect to someone's avatar")
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user whose avatar to apply the effect to')
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

      // Generate the sepia image
      const img = await new DIG.Sepia().getImage(avatarUrl);

      // Create an attachment
      const attachment = new AttachmentBuilder(img, { name: 'sepia.png' });

      const embed = new EmbedBuilder()
        .setColor('#8B4513')
        .setDescription(`${targetUser.toString()}'s avatar with a vintage effect`)
        .setImage('attachment://sepia.png')
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed],
        files: [attachment],
      });
    } catch (error) {
      console.error('Error in sepia command:', error);
      await interaction.editReply('Failed to generate the image.');
    }
  },
};

export default sepiaCommand;
