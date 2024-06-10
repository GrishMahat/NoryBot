import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import buttonPagination from '../../utils/buttonPagination.js';

export default {
  data: new SlashCommandBuilder()
    .setName("pdf")
    .setDescription("Send a PDF file")
    .addAttachmentOption((option) =>
      option
        .setName("pdf") // Set the name for the attachment option
        .setDescription("Attach a PDF file")
    ),
  userPermissions: [PermissionFlagsBits.ADMINISTRATOR], // Ensure correct casing
  botPermissions: [], // You may add bot permissions if needed

  nwfwMode: false,
  testMode: false,
  devOnly: true,
  run: async (client, interaction) => {
    try {
      const embeds = [];
      for (let i = 0; i < 4; i++) {
        embeds.push(new EmbedBuilder().setDescription(`This is page ${i + 1}`));
      }

      await buttonPagination(interaction, embeds);
    } catch (err) {
      console.error(err); // Changed console.log to console.error for better error handling
    }
  },
};
