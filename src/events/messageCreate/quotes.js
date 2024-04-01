const axios = require("axios");
const { EmbedBuilder} = require("discord.js")

module.exports = async (client, message) => {
  // Ignore messages from other bots
  if (message.author.bot) return;

  // Define categories
  const categories = [
    "age", "alone", "amazing", "anger", "architecture", "art", "attitude", "beauty", "best",
    "birthday", "business", "car", "change", "communication", "computers", "cool", "courage",
    "dad", "dating", "death", "design", "dreams", "education", "environmental", "equality",
    "experience", "failure", "faith", "family", "famous", "fear", "fitness", "food",
    "forgiveness", "freedom", "friendship", "funny", "future", "god", "good", "government",
    "graduation", "great", "happiness", "health", "history", "home", "hope", "humor",
    "imagination", "inspirational", "intelligence", "jealousy", "knowledge", "leadership",
    "learning", "legal", "life", "love", "marriage", "medical", "men", "mom", "money",
    "morning", "movies", "success"
  ];

  // Check if the message contains any of the categories
  const content = message.content.toLowerCase();
  const chosenCategory = categories.find(category => content.includes(category));
  if (!chosenCategory) return;

  // Make API call to fetch a quote
  try {
    const response = await axios.get(`https://api.api-ninjas.com/v1/quotes?category=${chosenCategory}`, {
      headers: {
        'X-Api-Key': 'wonrxlidnzmpk8zCd2lsWg==jsaC3IxpnzR0JRBT' // Replace 'YOUR_API_KEY' with your actual API key
      }
    });
    const quote = response.data[0].quote;
    const author = response.data[0].author;


    const embed = new EmbedBuilder()
    .setTitle(`${chosenCategory} Quote`)
    .setDescription(`"${quote}"\n- by ${author}`)
    .setColor("#FF5733");
    message.reply({ embeds: [embed] });

    // Log the fetched quote data
    // Handle the quote data as needed (e.g., send it as a message in Discord)
  } catch (error) {
    console.error('Request failed:', error);
    // Handle errors (e.g., send an error message in Discord)
  }
};
