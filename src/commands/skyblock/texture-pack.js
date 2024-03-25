const { SlashCommandBuilder, EmbedBuilder, time } = require("discord.js");
const mongoose = require("mongoose");
const fs = require("fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("texturepack")
    .setDescription("Get texture pack ")

    .toJSON(),

  run: async (client, interaction) => {

    try {

        const embed = new EmbedBuilder() // Constructs a new embed
          .setAuthor({
            name: "Texture Pack For Skyblock",
            iconURL: `${client.user.displayAvatarURL({ dynamic: true })}`,
          })
          .addFields(
            {
              name: "**Prism 16x**",
              value: "[Video Link](https://www.youtube.com/watch?v=37j4ga-ZlYU)",
              inline: true,
            },
            {
              name: "**Refrost**",
              value: "[Video Link](https://www.youtube.com/watch?v=7Wb0Us9am0M&t)",
              inline: true,
            },
            {
              name: "**Defrost**",
              value: "[Video Link](https://www.youtube.com/watch?v=jVaIEns7k_c)",
              inline: true,
            },
            {
              name: "**Caliburn**",
              value: "[Video Link](https://www.youtube.com/watch?v=pztMgZxTWxA)",
              inline: true,
            },
            {
              name: "**Snowfault**",
              value: "[Video Link](https://www.youtube.com/watch?v=k2DWdC-Roqs)",
              inline: true,
            },
            {
              name: "**Starlight**",
              value: "[Video Link](https://www.youtube.com/watch?v=-b7ih8Twaiw)",
              inline: true,
            }
  
          )
          .setColor("Fuchsia") // Set's the embed color
          .setTimestamp() // Set's the embed timestamp
          .setFooter({
            text: `Requested by ${interaction.user.username}`,
            iconURL: `${interaction.user.displayAvatarURL({ dynamic: true })}`,
          }); // Set's the embed footer

        await interaction.reply({ embeds: [embed] }); // Sends the main embed with websocket and REST latencies as a reply to the interaction
      } catch (error) {
        console.log(`An error occurred in the texturepack command:\n\n${error}`);
      }
    }
  };
  