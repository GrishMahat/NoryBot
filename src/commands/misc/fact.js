/** @format */

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");
const mconfig = require("../../config/messageConfig.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fact")
    .setDescription("send random fact")
    .toJSON(),

  userPermissionsBitField: [],
  bot: [],
  nwfwMode: false,
  testMode: false,
  devOnly: false,
  run: async (client, interaction) => {
    try {
      const res = await axios.get(
        "https://uselessfacts.jsph.pl/random.json?language=en"
      );
      const fact = res.data.text;

      const rembed = new EmbedBuilder()
        .setColor(mconfig.embedColorSuccess)
        .setTitle("fact")
        .setDescription(fact);

      await interaction.reply({ embeds: [rembed] });
    } catch (error) {
      console.error("Error while getting random fact: ", error);
    }
  },
};
