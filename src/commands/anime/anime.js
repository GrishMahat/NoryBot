/** @format */

import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

import axios from 'axios';

export default {
  data: new SlashCommandBuilder()
    .setName('anime')
    .setDescription('Search for information about a specific anime.')
    .addStringOption((option) =>
      option
        .setName('name')
        .setDescription('The name of the anime to search')
        .setRequired(true)
    ),
  nwfwMode: false,
  testMode: false,
  devOnly: false,

  userPermissionsBitField: [],
  bot: [],
  run: async (client, interaction) => {
    const animeName = interaction.options.getString('name');

    try {
      const response = await axios.post('https://graphql.anilist.co', {
        query: `
          query ($name: String) {
            Media (search: $name, type: ANIME) {
              id
              siteUrl
              title {
                romaji
              }
              description
              coverImage {
                large
              }
              format
              episodes
              status
              startDate {
                year
                month
                day
              }
              endDate {
                year
                month
                day
              }
              season
              averageScore
              meanScore
              studios(isMain: true) {
                edges {
                  node {
                    name
                  }
                }
              }
              genres
            }
          }
        `,
        variables: { name: animeName },
      });

      const animeData = response.data.data.Media;

      if (!animeData) {
        return interaction.reply(`Anime not found: **${animeName}**`);
      }

      const genres = animeData.genres;
      if (genres.includes('Ecchi') || genres.includes('Hentai')) {
        return interaction.reply(
          `**AniChan has blocked search results for anime: ${animeName}**\n__Reason:__ To protect your Discord server from Discord's Terms of Service, AniChan blocks search results containing adult content.`
        );
      }

      let description = animeData.description;
      if (description && description.length > 400) {
        description = description.slice(0, 400) + '...';
      }

      const embed = new EmbedBuilder()
        .setTitle(animeData.title.romaji)
        .setURL(animeData.siteUrl)
        .setDescription(description)
        .setColor('#66FFFF')
        .addFields(
          {
            name: 'Episodes',
            value: `${animeData.episodes || 'N/A'}`,
            inline: true,
          },
          { name: 'Status', value: `${animeData.status}`, inline: true },
          {
            name: 'Average Score',
            value: `${animeData.averageScore}/100`,
            inline: true,
          },
          {
            name: 'Mean Score',
            value: `${animeData.meanScore}/100`,
            inline: true,
          },
          {
            name: 'Season',
            value: `${animeData.season} - ${animeData.startDate.year}`,
            inline: true,
          },
          {
            name: 'Studio',
            value: `${animeData.studios.edges
              .map((edge) => edge.node.name)
              .join(', ')}`,
            inline: true,
          }
        )
        .setImage(animeData.coverImage.large)
        .setTimestamp();

      interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error searching for anime:', error);
      interaction.reply('An error occurred while searching for anime.');
    }
  },
};
