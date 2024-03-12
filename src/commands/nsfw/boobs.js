const { SlashCommandBuilder , EmbedBuilder} = require("discord.js");
const axios = require("axios");
const config= require("../../config/config.json")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("boobs")
    .setDescription("img of boobs.")
    .toJSON(),

  userPermissions: [],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      const nsfwChannelId = config.nwfw;
      const errMessage = "This command can only be used in NSFW channels.";
      
      // Check if the command was used in an NSFW channel
      if (interaction.channelId !== nsfwChannelId) {
        const err = new EmbedBuilder()
        .setDescription(`**${errMessage}**`,  )
        .setColor("#ff0000");

        await interaction.reply({ embeds: [err], ephemeral: true });
        return;
      }
      const res = await fetch(`https://nekobot.xyz/api/image?type=boobs`);
      const data = await res.json();

      if (!data || !data.message) {
        throw new Error("Failed to fetch image.");
      }

      const img = data.message;
      



      const wow = new EmbedBuilder()
      .setColor("#ff0000")
      .setTitle("Here's a Boob Pic for you!")
      .setImage(img);


      interaction.reply({ embeds: [wow] });
    } catch (err) {
      console.error(err);
      interaction.reply("Whoops! We encountered an error. It has been reported to the support center.");
    }
  }
};
