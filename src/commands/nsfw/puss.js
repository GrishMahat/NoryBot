const { SlashCommandBuilder , EmbedBuilder} = require("discord.js");
const axios = require("axios");
const config= require("../../config/config.json")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("puss")
    .setDescription("img of puss.")
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

      const response = await axios.get("https://www.reddit.com/r/pussy/random.json");
      const content = response.data;
      const title = content[0].data.children[0].data.title;
      const amazeme = content[0].data.children[0].data.url;


      const wow = new EmbedBuilder()
        .setDescription(`**${title}**`, amazeme )
        .setImage(amazeme)
        .setColor("#ff0000");

      interaction.reply({ embeds: [wow] });
    } catch (err) {
      console.error(err);
      interaction.reply("Whoops! We encountered an error. It has been reported to the support center.");
    }
  }
};
