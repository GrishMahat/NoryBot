/** @format */

const { SlashCommandBuilder } = require("discord.js");
const axios = require("axios");



module.exports = {
  data: new SlashCommandBuilder()
    .setName("animeimg")
    .setDescription("Get random anime image")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Image type")
        .setRequired(true)
        .addChoices(

          { name: "hug", value: "hug" },
          { name: "pat", value: "pat" },
          { name: "smug", value: "smug" },
          { name: "bonk", value: "bonk" },
          { name: "yeet", value: "yeet" },
          { name: "blush", value: "blush" },
          { name: "smile", value: "smile" },
          { name: "highfive", value: "highfive" },
          { name: "handhold", value: "handhold" },
          { name: "nom", value: "nom" },
          { name: "bite", value: "bite" },
          { name: "glomp", value: "glomp" },
          { name: "slap", value: "slap" },
          { name: "kill", value: "kill" },
          { name: "kick", value: "kick" },
          { name: "happy", value: "happy" },
          { name: "wink", value: "wink" },


        )
    )
    .toJSON(),
  userPermissions: [],
  botPermissions: [],
  run: async (client, interaction) => {
    try {
      const type = interaction.options.getString("type");
      const link = `https://api.waifu.pics/${type}`;

      const response = await axios.get(link);

      const imageUrl = response.data.url;

      interaction.reply(imageUrl);
    } catch (error) {
      console.error("Error fetching anime image:", error);
      interaction.reply("There was an error while fetching the anime image.");
    }
  },
};
