import { PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import  config from '../../config/config.json' assert { type: 'json' };
import Image from '../../schemas/image.js';


export default {
  customId: "kickBtn",
  userPermissions: [],
  botPermissions: [],
  run: async (client, interaction) => {

    const { message, channel, guildId, guild, user } = interaction;

    const { customId } = interaction;
    const imageId = customId.split('_')[1];

    await Image.findByIdAndDelete(imageId);


    await Image.findByIdAndUpdate(imageId, { approved: true });
    await interaction.reply({
      content: 'The image has been approved.',
      ephemeral: true,
    });

  }

};