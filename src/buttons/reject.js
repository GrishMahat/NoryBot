import { PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import Image from '../../schemas/image.js';

export default {
  customId: "reject",
  userPermissions: [],
  botPermissions: [],
  run: async (client, interaction) => {
    try {
      const { customId } = interaction;
      const imageId = customId.split('_')[1];

      await Image.findByIdAndDelete(imageId);

      await interaction.reply({
        content: 'The image has been rejected and deleted from the database.',
        ephemeral: true,
      });
    } catch (error) {
      console.error('Error rejecting the image:', error);

      await interaction.reply({
        content: 'There was an error rejecting the image. Please try again later.',
        ephemeral: true,
      });
    }
  }
};
