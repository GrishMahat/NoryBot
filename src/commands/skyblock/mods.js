const { SlashCommandBuilder, EmbedBuilder, time } = require("discord.js");
const mongoose = require("mongoose");
const fs = require("fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mods")
    .setDescription("Get mods ")

    .toJSON(),

    run: async (client, interaction) => {
      try {
          const modsEmbed = {
              color: 0xFF00FF,
              timestamp: new Date(),
              footer: {
                  text: `Requested by ${interaction.user.username}`,
                  iconURL: interaction.user.displayAvatarURL({ dynamic: true })
              },
              fields: [
                  {
                      name: "Quality of Life Mods",
                      value: "Mods that enhance the overall Minecraft experience."
                  },
                  {
                      name: "Chat Triggers",
                      value: "A powerful and dynamic scripting platform for Minecraft based on flexibility and personalization.\n[Website](https://www.chattriggers.com/)\n[GitHub](https://github.com/ChatTriggers/ChatTriggers)"
                  },
                  {
                      name: "Dankers Skyblock Mod",
                      value: "Quality of Life changes that enhance your Hypixel Skyblock experience."
                  },
                  {
                      name: "Dungeons Guide",
                      value: "A mod designed to help Hypixel Skyblock Dungeons players find secrets and solve puzzles. Also comes with lots of Quality of Life features."
                  },
                  {
                      name: "Skyblock Extras (Paid)",
                      value: "Enhancements for Hypixel Skyblock. Includes additional features and optimizations.\n[Website](https://skyblockextras.com)\n[Discord Server](https://discord.gg/sbe)"
                  },
                  {
                      name: "Cowlection",
                      value: "A collection of mods for Minecraft.\n[GitHub](https://github.com/cow-mc/Cowlection---)\n[Discord Server](https://discord.gg/cowshed)"
                  },
                  {
                      name: "Visual and Performance Mods",
                      value: "Mods that improve the visual appearance and performance of Minecraft."
                  },
                  {
                      name: "OptiFine 1.8.9 HD U M5",
                      value: "A Minecraft optimization mod.\n[Download](https://optifine.net/adloadx?f=OptiFine_1.8.9_HD_U_M5.jar&x=d4a4)"
                  },
                  {
                      name: "Skyblock Addons",
                      value: "Adds various enhancements to Hypixel Skyblock.\n[GitHub](https://github.com/BiscuitDevelopment/SkyblockAddons)\n[Discord](https://discord.com/invite/biscuit)"
                  },
                  {
                      name: "Skytils",
                      value: "Provides additional features for Hypixel Skyblock.\n[GitHub](https://github.com/Skytils/SkytilsMod)\n[Discord](https://discord.com/invite/skytils)"
                  },
                  {
                      name: "BetterMap",
                      value: "Improves the map functionality in Minecraft.\n[Chattriggers](https://www.chattriggers.com/modules/v/BetterMap)\n[Import Command](/ct import BetterMap)"
                  },
                  {
                      name: "Content Mods",
                      value: "Mods that add new content or gameplay elements to Minecraft."
                  },
                  {
                      name: "SoopyV2Forge",
                      value: "Adds various features to Minecraft.\n[GitHub](https://github.com/Soopyboo32/SoopyV2Forge)\n[Download](https://github.com/Soopyboo32/SoopyV2Forge/releases)"
                  },
                  {
                      name: "Dulkir Mod",
                      value: "Introduces new content and features to Minecraft.\n[GitHub](https://github.com/inglettronald/DulkirMod)\n[Discord](https://discord.gg/JjhKFh4Szt)\n[Download](https://github.com/inglettronald/DulkirMod/releases)"
                  },
                  {
                      name: "Patcher",
                      value: "A mod management tool for Minecraft.\n[GitHub](https://github.com/Sk1erLLC/Patcher)\n[Download](https://sk1er.club/mods/patcher)"
                  },
                  {
                      name: "Scrollable Tooltips",
                      value: "Enables scrollable tooltips in Minecraft.\n[Download](https://sk1er.club/mods/text_overflow_scroll)"
                  },
                  {
                      name: "Sk1er Old Animations",
                      value: "Restores old animations in Minecraft.\n[Discord](https://discord.gg/sk1er)"
                  }
              ]
          };
  
          await interaction.reply({ embeds: [modsEmbed] });
      } catch (error) {
          console.error(`An error occurred in the mods command:\n${error}`);
      }
  }
  

  };
  