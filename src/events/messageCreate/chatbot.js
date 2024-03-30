const axios = require("axios");
const { ActionRowBuilder, ButtonBuilder } = require('discord.js');
const buttonPagination = require('../../utils/buttonPagination');

const CHATBOT_CHANNEL_ID = '1223237611632595055';
const LOG_FILE_PATH = 'logs/channel_log.txt';

module.exports = async (client, message) => {
  const duol = [
    "maid",
    "waifu",
    "marin-kitagawa",
    "mori-calliope",
    "raiden-shogun",
    "oppai",
    "selfies",
    "uniform",
    "ass",
    "hentai",
    "milf",
    "oral",
    "paizuri",
    "ecchi",
    "ero"
  ];

  // Ignore messages from other bots
  if (message.author.bot) return;

  // Check if the message is from the specified channel
  if (message.channel.id !== CHATBOT_CHANNEL_ID) return;

  try {
    // Check if the message content contains any word from the 'duol' array
    const includesDuol = duol.some(tag => message.content.toLowerCase().includes(tag));

    // Proceed with image search if the message includes any word from the 'duol' array
    if (includesDuol) {
    

      const includedTags = duol.filter(tag => message.content.toLowerCase().includes(tag));

      const apiUrl = 'https://api.waifu.im/search';
      const params = {
        included_tags: includedTags,
        many: true, // Return an array of files
        height: '>=2000', // Example height condition
        width: '>=2000', // Example width condition
        is_nsfw: 'false', // Exclude NSFW images
        order_by: 'favorites', // Order by favorites
        // Add more parameters as needed
      };

      const queryParams = new URLSearchParams();
      for (const key in params) {
        if (Array.isArray(params[key])) {
          params[key].forEach(value => {
            queryParams.append(key, value);
          });
        } else {
          queryParams.set(key, params[key]);
        }
      }
      const requestUrl = `${apiUrl}?${queryParams.toString()}`;

      const response = await axios.get(requestUrl);



      if (!response || !response.data || !response.data.images || response.data.images.length === 0) {
        message.reply('Sorry, I could not retrieve images at the moment.');
        return;
      }

      // Process the response data
      const images = response.data.images.map(image => ({ url: image.url }));

      // Send images with pagination
      await buttonPagination(message, images);

    }

  } catch (error) {
    console.error('Error processing message:', error);
    message.reply('Sorry, there was an error processing your request.');
  }
};
