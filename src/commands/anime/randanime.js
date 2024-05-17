/** @format */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

import anime from 'random-anime';


export default {
  data: new SlashCommandBuilder()
    .setName("randanime")
    .setDescription("Get random anime image")
    .toJSON(),
  userPermissions: [],
  botPermissions: [],
  nwfwMode: false,
  testMode: false,
  devOnly: false,

  run: (client, interaction) => {
    let embed = new EmbedBuilder()
    .setImage(anime.anime())
    .setColor("Blue")
    .setTimestamp()
    .setFooter({ text: "Random Anime" });

  interaction.reply({ embeds: [embed] });

  },
};
