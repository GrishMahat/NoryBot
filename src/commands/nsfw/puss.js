const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const axios = require("axios");
const buttonPagination = require("../../utils/buttonPagination");
const config = require("../../config/config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("puss")
    .setDescription("Random cat's pic"),
  run: async (client, interaction) => {
    try {
      const nsfwChannelId = config.nwfw;
      const errMessage = "This command can only be used in NSFW channels.";

      // Check if the command was used in an NSFW channel
      if (interaction.channelId !== nsfwChannelId) {
        const err = new EmbedBuilder()
          .setDescription(`**${errMessage}**`)
          .setColor(0x88e1fd);

        await interaction.reply({ embeds: [err], ephemeral: true });
        return;
      }

      const response = await axios.get(
        "https://www.reddit.com/r/cat/random/.json"
      );
      const embeds = [];
      for (let i = 0; i < response.data.length; i++) {
        const post = response.data[i].data.children[0].data;
        const img = post.url;
        const title = post.title;
        const upvotes = post.ups;

        if (!img) {
          throw new Error("Failed to fetch image.");
        }

        const catEmbed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(`:heart: **${upvotes}**`)
          .setImage(img)
          .setColor(0x88e1fd);

        embeds.push(catEmbed);
      }

      await buttonPagination(interaction, embeds);
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
