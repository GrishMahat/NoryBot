/** @format */

import { SlashCommandBuilder, ButtonStyle } from 'discord.js';

import { AnimeWallpaper } from 'anime-wallpaper';
import buttonPagination from '../../utils/buttonPagination.js';
import { EmbedBuilder } from 'discord.js';

async function fetchRandomWallpapers() {
  const wallpaper = new AnimeWallpaper();
  return await wallpaper.random();
}

export default {
  data: new SlashCommandBuilder()
    .setName("wallpaper")
    .setDescription("Get random wallpaper")
    .toJSON(),
  userPermissionsBitFieldBitField: [],
  botPermissionsBitFieldBitField: [],
  nwfwMode: false,
  testMode: false,
  devOnly: false,
  run: async (client, interaction) => {
    try {
      const wallpapers = await fetchRandomWallpapers();

      const embeds = [];
      for (let i = 0; i < wallpapers.length; i++) {
        const wallpaper = wallpapers[i];
        const embed = new EmbedBuilder()
          .setTitle(wallpaper.title)
          .setImage(wallpaper.image)
          .setDescription(`This is Wallpaper page ${i + 1}`);
        embeds.push(embed);
      }

      await buttonPagination(interaction, embeds);
    } catch (error) {
      console.error("Error fetching anime image:", error);
      interaction.reply("There was an error while fetching the anime image.");
    }
  },
};
