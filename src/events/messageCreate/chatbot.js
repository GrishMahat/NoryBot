import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.geminiapi);
const MODEL_NAME = "gemini-pro";
const conversationHistory = [];


export default async (client, message) => {
  // // Check if the message is from a bot or not
  // if (message.author.bot) return;

  // // Check if the message is from the specified channel
  // const channelId = "1223237611632595055";
  // if (message.channel.id !== channelId) return;
  // console.log("ver")

  // const fetchedMessages = await message.channel.messages.fetch({ limit: 10 });


  // const model = genAI.getGenerativeModel({ model: MODEL_NAME });

  // const generationConfig = {
  //   temperature: 0.9,
  //   topK: 1,
  //   topP: 1,
  //   maxOutputTokens: 2048,
  // };

  // const userMessage = message.content; // Assuming userMessage is defined somewhere
  // const parts = [
  //   {
  //     text: `input: ${userMessage}`,
  //   },
  // ];

  // try {
  //   const result = await model.generateContent({
  //     contents: [{

  //        role: "user", parts 
  //       }],
  //     generationConfig,
  //   });

  //   let reply = await result.response.text();

  //   // Due to Discord limitations, split the message if it's too long
  //   if (reply.length > 2000) {
  //     const replyArray = reply.match(/[\s\S]{1,2000}/g);
  //     replyArray.forEach(async (msg) => {
  //       await message.reply(msg);
  //     });
  //     return;
  //   }

  //   message.reply(reply);
  // } catch (error) {
  //   console.error("Error generating content:", error);
  //   // Handle error gracefully
  // }
};
