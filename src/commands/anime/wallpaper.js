const { SlashCommandBuilder, ButtonStyle } = require("discord.js");
const { AnimeWallpaper } = require('anime-wallpaper');
const buttonPagination = require('../../utils/buttonPagination');
const { EmbedBuilder } = require("discord.js");

async function fetchRandomWallpapers() {
    const wallpaper = new AnimeWallpaper();
    return await wallpaper.random();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("wallpaper")
        .setDescription("Get random wallpaper")
        .toJSON(),
    userPermissionsBitFieldBitField: [],
    botPermissionsBitFieldBitField: [],
    run: async (client, interaction) => {
        try {
            const wallpapers = await fetchRandomWallpapers();

            const embeds = [];
            for (let i = 0; i < wallpapers.length; i++) {
                const wallpaper = wallpapers[i];
                const embed = new EmbedBuilder()
                    .setTitle(wallpaper.title)
                    .setImage(wallpaper.image)
                    .setDescription(`This is Wallpaper page ${i + 1}`);
                embeds.push(embed);
            }

            await buttonPagination(interaction, embeds);
        } catch (error) {
            console.error("Error fetching anime image:", error);
            interaction.reply("There was an error while fetching the anime image.");
        }
    },
};