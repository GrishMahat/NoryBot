const { CommandInteraction, EmbedBuilder, SlashCommandBuilder } = require("discord.js");
const figlet = require("figlet");


module.exports = {
  data: new SlashCommandBuilder()
    .setName("ascii")
    .setDescription("Convert text to ASCII art")
    .addStringOption((option) =>
      option
        .setName("text")
        .setDescription("Enter the text to convert")
        .setRequired(true)
    ),
  userPermissionsBitField: [],
  bot: [],

  run: async (client, interaction) => {
    try {
      const text = interaction.options.getString("text");

      figlet.text(text, (err, data) => {
        if (err) {
          console.error("Error converting text to ASCII:", err);
          return interaction.reply(
            "There was an error converting the text to ASCII art."
          );
        }
        if (data.length > 2000) {
          return interaction.reply(
            "The provided text is too long. Please provide a shorter text."
          );
        }

        const embed = new EmbedBuilder()
          .setTitle("ASCII Art")
          .setDescription("```" + data + "```")
          .setColor("#00ff00");

        interaction.reply({ embeds: [embed] });
      });
    } catch (error) {
      console.error("Error executing ASCII command:", error);
      interaction.reply("There was an error executing the command.");
    }
  },
};
