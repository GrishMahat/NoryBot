/** @format */

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const mconfig = require("../../config/messageConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("puss")
    .setDescription("send random cat img")
    .toJSON(),

  userPermissionsBitField: [],
  bot: [],
  run: async (client, interaction) => {
    try {
      const res = await axios.get("https://api.thecatapi.com/v1/images/search");
      const imgurl = res.data[0]?.url;
      if (!imgurl) {
        throw new Error("Failed to get Cat Img .");
      }
      const rembed = new EmbedBuilder()
        .setColor(mconfig.embedColorSuccess)
        .setDescription("Random cat img 😺")
        .setImage(imgurl);

      await interaction.reply({ embeds: [rembed] });
    } catch (error) {
      console.error("err while gitting cat img ", error);
    }
  },
};
