/** @format */

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const mconfig = require("../../config/messageConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dog")
    .setDescription("send random dog image")
    .toJSON(),
  nwfwMode: false,
  testMode: false,
  devOnly: false,

  userPermissionsBitField: [],
  bot: [],
  run: async (client, interaction) => {
    try {
      const res = await axios.get("https://dog.ceo/api/breeds/image/random");
      const imgurl = res.data.message;

      if (!imgurl) {
        throw new Error("Failed to get Dog Image .");
      }
      const rembed = new EmbedBuilder()
        .setColor(mconfig.embedColorSuccess)
        .setDescription("Random Dog Image 🐕🐶")
        .setImage(imgurl);

      await interaction.reply({ embeds: [rembed] });
    } catch (error) {
      console.error("err while gitting dog Image  ", error);
    }
  },
};
