const { SlashCommandBuilder , EmbedBuilder} = require("@discordjs/builders");
const axios = require("axios");
const config = require("../../config/config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pus")
    .setDescription("img of puss.")
    .toJSON(),

  userPermissionsBitField: [],
  botPermissionsBitField: [],

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

      const res = await axios.get("https://nekobot.xyz/api/image?type=pussy");
      const data = res.data;

      if (!data || !data.message) {
        throw new Error("Failed to fetch image.");
      }

      const img = data.message;

      const wow = new EmbedBuilder() 
        .setTitle("Here's a pussy Pic for you!")
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
      .setDescription("```"+ err +"```")
      .setColor(0x88e1fd);

      interaction.reply({ embeds: [errorEmbed] });
    }
  }
};
