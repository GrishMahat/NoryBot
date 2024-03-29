const fs = require('fs');
const { OpenAI } = require('openai');

const CHATBOT_CHANNEL_ID = '1223237611632595055';
const LOG_FILE_PATH = 'logs/channel_log.txt';

module.exports = async (client, message) => {
  // Ignore messages from other bots
  if (message.author.bot) return;

  // Check if the message is from the specified channel
  if (message.channel.id !== CHATBOT_CHANNEL_ID) return;

  try {
    await message.channel.sendTyping();

    // Clear typing indicator after 5 seconds
    const typingInterval = setInterval(() => {
      message.channel.stopTyping();
      clearInterval(typingInterval);
    }, 5000);

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Write the message content to a log file
    const logMessage = `[${new Date().toISOString()}] ${message.author.tag}[${
      message.author.id
    }]: ${message.content}\n`;
    fs.appendFileSync(LOG_FILE_PATH, logMessage);

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: "nory is bot for Hypixel Skyblock guild discord server",
        },
        {
          role: 'user',
          content: message.content,
        },
      ],
    });

    clearInterval(typingInterval);

    if (!response || !response.choices || response.choices.length === 0) {
      message.reply('Sorry, I could not generate a response at the moment.');
      return;
    }

    message.reply(response.choices[0].message.content);
  } catch (error) {
    console.error('Error processing message:', error);
    message.reply('Sorry, there was an error processing your request.');
  }
};
