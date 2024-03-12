const { SlashCommandBuilder, EmbedBuilder } = require("@discordjs/builders");
const axios = require("axios");
const config = require("../../config/config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("boobs")
    .setDescription("img of boobs.")
    .toJSON(),

  userPermissionsBitField: [],
  botPermissionsBitField: [],

  run: async (client, interaction) => {
    try {
      const nsfwChannelId = config.nwfw;
      const errMessage = "This command can only be used in NSFW channels.";

      if (interaction.channelId !== nsfwChannelId) {
        const err = new EmbedBuilder() // Update here
          .setDescription(`**${errMessage}**`)
          .setColor("#ff0000");

        await interaction.reply({ embeds: [err], ephemeral: true });
        return;
      }

      const res = await axios.get("https://nekobot.xyz/api/image?type=boobs");
      const data = res.data;

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
      interaction.reply(
        "Whoops! We encountered an error. It has been reported to the support center."
      );
    }
  },
};
