/** @format */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import  ButtonPagination  from '../../utils/buttonPagination.js';

export default {
  data: new SlashCommandBuilder()
    .setName('mods')
      .setDescription('Get a list of recommended Skyblock mods')
      .setContexts()
      .toJSON(),
  nwfwMode: false,
  testMode: false,
  devOnly: false,

  async run(client, interaction) {
    try {
      const modsEmbed = new EmbedBuilder()
        .setColor(0x00ffff)
        .setTitle('Recommended Skyblock Mods')
        .setDescription(
          'A curated list of mods to enhance your Skyblock experience.'
        )
        .setTimestamp()
        .setFooter({
          text: `Requested by ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        });

      const modCategories = [
        {
          name: '🛠️ Quality of Life Mods',
          mods: [
            {
              name: 'Chat Triggers',
              value:
                '[Website](https://www.chattriggers.com/) | [GitHub](https://github.com/ChatTriggers/ChatTriggers)\nA powerful and dynamic scripting platform for Minecraft.',
            },
            {
              name: 'Dankers Skyblock Mod',
              value:
                'Enhances your Hypixel Skyblock experience with various QoL features.',
            },
            {
              name: 'Dungeons Guide',
              value:
                'Assists with finding secrets and solving puzzles in Skyblock Dungeons.',
            },
            {
              name: 'Skyblock Extras (Paid)',
              value:
                '[Website](https://skyblockextras.com) | [Discord](https://discord.gg/sbe)\nComprehensive enhancements for Hypixel Skyblock.',
            },
            {
              name: 'Cowlection',
              value:
                '[GitHub](https://github.com/cow-mc/Cowlection---) | [Discord](https://discord.gg/cowshed)\nA collection of useful Minecraft mods.',
            },
            {
              name: 'Not Enough Updates',
              value:
                '[GitHub](https://github.com/NotEnoughUpdates/NotEnoughUpdates) | [Discord](https://discord.gg/moulberry)\nExtensive Skyblock features and item database.',
            },
            {
              name: 'Skyblock Personalized',
              value:
                '[GitHub](https://github.com/MrFast-js/SkyblockPersonalized) | [Discord](https://discord.gg/Qj5cMGGZhK)\nCustomizable Skyblock mod with many features.',
            },
          ],
        },
        {
          name: '🎨 Visual and Performance Mods',
          mods: [
            {
              name: 'OptiFine 1.8.9 HD U M5',
              value:
                '[Download](https://optifine.net/adloadx?f=OptiFine_1.8.9_HD_U_M5.jar&x=d4a4)\nA Minecraft optimization mod for improved performance and graphics.',
            },
            {
              name: 'Skyblock Addons',
              value:
                '[GitHub](https://github.com/BiscuitDevelopment/SkyblockAddons) | [Discord](https://discord.com/invite/biscuit)\nAdds various enhancements to Hypixel Skyblock.',
            },
            {
              name: 'Skytils',
              value:
                '[GitHub](https://github.com/Skytils/SkytilsMod) | [Discord](https://discord.com/invite/skytils)\nProvides additional features for Hypixel Skyblock.',
            },
            {
              name: 'BetterMap',
              value:
                '[ChatTriggers](https://www.chattriggers.com/modules/v/BetterMap) | `/ct import BetterMap`\nImproves the map functionality in Minecraft.',
            },
            {
              name: 'Apec',
              value:
                '[GitHub](https://github.com/BananaFructa/Apec) | [Discord](https://discord.gg/YXrJzpY)\nCustomizable HUD mod for Skyblock.',
            },
            {
              name: 'Skyblock Hud',
              value:
                '[Website](https://hypixel.net/threads/forge-1-8-9-skyblock-hud-v1-5-5.2880478/)\nCustomizable HUD specifically for Skyblock.',
            },
          ],
        },
        {
          name: '🎮 Content Mods',
          mods: [
            {
              name: 'SoopyV2Forge',
              value:
                '[GitHub](https://github.com/Soopyboo32/SoopyV2Forge) | [Download](https://github.com/Soopyboo32/SoopyV2Forge/releases)\nAdds various features to Minecraft.',
            },
            {
              name: 'Dulkir Mod',
              value:
                '[GitHub](https://github.com/inglettronald/DulkirMod) | [Discord](https://discord.gg/JjhKFh4Szt) | [Download](https://github.com/inglettronald/DulkirMod/releases)\nIntroduces new content and features to Minecraft.',
            },
            {
              name: 'Patcher',
              value:
                '[GitHub](https://github.com/Sk1erLLC/Patcher) | [Download](https://sk1er.club/mods/patcher)\nA comprehensive mod management tool for Minecraft.',
            },
            {
              name: 'Scrollable Tooltips',
              value:
                '[Download](https://sk1er.club/mods/text_overflow_scroll)\nEnables scrollable tooltips in Minecraft.',
            },
            {
              name: 'Sk1er Old Animations',
              value:
                '[Discord](https://discord.gg/sk1er)\nRestores old animations in Minecraft.',
            },
            {
              name: 'Dungeon Rooms Mod',
              value:
                '[GitHub](https://github.com/Quantizr/DungeonRoomsMod) | [Discord](https://discord.gg/kr2M7WutgJ)\nHelps with Skyblock Dungeon room identification.',
            },
            {
              name: 'Skyblock Extras',
              value:
                '[Website](https://sbe.shad.pw/) | [Discord](https://discord.gg/sbe)\nComprehensive Skyblock features and customization.',
            },
          ],
        },
        {
          name: '🌈 Polyfrost Mods',
          mods: [
            {
              name: 'OneConfig',
              value:
                '[Website](https://polyfrost.cc/mods/oneconfig) | [GitHub](https://github.com/Polyfrost/OneConfig)\nA unified configuration library for Minecraft mods.',
            },
            {
              name: 'Hytils Reborn',
              value:
                '[Website](https://polyfrost.cc/mods/hytils-reborn) | [GitHub](https://github.com/Polyfrost/Hytils-Reborn)\nQuality of life improvements for Hypixel Network.',
            },
            {
              name: 'Chatting',
              value:
                '[Website](https://polyfrost.cc/mods/chatting) | [GitHub](https://github.com/Polyfrost/Chatting)\nEnhanced chat features for Minecraft.',
            },
            {
              name: 'EvergreenHUD',
              value:
                '[Website](https://polyfrost.cc/mods/evergreenhud) | [GitHub](https://github.com/Polyfrost/EvergreenHUD)\nCustomizable HUD mod for Minecraft.',
            },
            {
              name: 'Vanilla Enhancements',
              value:
                '[Website](https://polyfrost.cc/mods/vanillaenhancements) | [GitHub](https://github.com/Polyfrost/VanillaEnhancements)\nVarious quality of life improvements for vanilla Minecraft.',
            },
          ],
        },
      ];

      const pages = modCategories.map((category) => {
        const embed = new EmbedBuilder()
          .setColor(0x00ffff)
          .setTitle(`Recommended Skyblock Mods: ${category.name}`)
          .setDescription(
            'A curated list of mods to enhance your Skyblock experience.'
          )
          .setTimestamp();

        category.mods.forEach((mod) => {
          embed.addFields({ name: mod.name, value: mod.value });
        });

        return embed;
      });
       




      // Send the embed to the interaction channel
      await ButtonPagination(interaction, pages);
    } catch (error) {
      console.error('An error occurred in the mods command:', error);
      await interaction.reply({
        content: 'There was an error while executing the mods command.',
        ephemeral: true,
      });
    }
  },
};

