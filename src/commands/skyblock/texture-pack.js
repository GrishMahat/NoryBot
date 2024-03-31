
const { SlashCommandBuilder, EmbedBuilder, time } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("texturepack")
    .setDescription("Get texture pack"),

  run: async (client, interaction) => {
    try {
      const embed = new EmbedBuilder()
        .setAuthor({
          name: "Texture Pack For Skyblock",
          iconURL: client.user.displayAvatarURL({ dynamic: true }),
        })
        .addFields(
          {
            name: "**Prism 16x**",
            value: "[Video Link](https://www.youtube.com/watch?v=37j4ga-ZlYU)",
            inline: true,
          },
          {
            name: "**Refrost**",
            value:
              "[Video Link](https://www.youtube.com/watch?v=7Wb0Us9am0M&t)",
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
        .setColor(0xff00ff)
        .setTimestamp()
        .setFooter({
          text: `Requested by ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error(`An error occurred in the texturepack command:\n${error}`);
    }
  },
};
