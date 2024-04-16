const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const axios = require("axios");

const config = require("../../config/config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("catt")
    .setDescription("Random cat's pic"),
  run: async (client, interaction) => {
    try {
      const nsfwChannelId = config.nwfw;
      const errMessage = "This command can only be used in NSFW channels.";

      // Check if the command was used in an NSFW channel
      if (interaction.channelId !== nsfwChannelId) {
        const err = new EmbedBuilder()
          .setDescription(`**${errMessage}**`)
          .setColor(0x88e1fd); // Here, you can keep the color as a string if you want

        await interaction.reply({ embeds: [err], ephemeral: true });
        return;
      }

      const response = await axios.get(
        "https://www.reddit.com/r/pussy/random/.json"
      );
      const data = response.data;
      const [list] = data;
      const [post] = list.data.children;
      const img = post.data.url;
      const title = post.data.title;
      const Upvotes = post.data.ups;

      if (!img) {
        throw new Error("Failed to fetch image.");
      }

      const wow = new EmbedBuilder()
        .setTitle(title)
        .setDescription(`:heart: **${Upvotes}**`)

        .setImage(img)
        .setColor(0x88e1fd);

      interaction.reply({ embeds: [wow] });
      setTimeout(() => {
        interaction.deleteReply().catch(console.error);
      }, 2 * 60 * 1000); // 2 minutes in milliseconds
    } catch (err) {
      console.error(err);
      const errorEmbed = new EmbedBuilder()
        .setTitle("Whoops! We encountered an error!")
        .setDescription("```" + err + "```")
        .setColor(0x88e1fd);

      interaction.reply({ embeds: [errorEmbed] });
    }
  },
};
