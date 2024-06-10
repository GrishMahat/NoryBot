/**
 * Provides a slash command for the Discord bot to display information about the bot, including the versions of Discord.js, Node.js, and MongoDB being used, as well as the number of active commands in the guild.
 *
 * @format
 */

<<<<<<< HEAD
const { SlashCommandBuilder, EmbedBuilder, time } = require("discord.js");
const mongoose = require("mongoose");
const fs = require("fs");
=======
import { SlashCommandBuilder, EmbedBuilder, time } from 'discord.js';

import mongoose from 'mongoose';
import fs from 'fs';
>>>>>>> 8cca8a2f208c8cfde72a01dbc48df9abd2e90f85

// Export the module to be used elsewhere
export default {
  // Slash command dataF
  data: new SlashCommandBuilder()
    .setName("bot") // Sets the command name
    .setDescription("Get bot info or bot stats") // Sets the command description
    .addSubcommand((subcommand) =>
      subcommand
        .setName("info") // Subcommand to get bot information
        .setDescription("Get information about the bot.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("stats") // Subcommand to get bot status
        .setDescription("Get the bot status")
    )
    .toJSON(), // Converts the data to JSON format
  nwfwMode: false,
  testMode: false,
  devOnly: false,
  // Function to be executed when the command is used
  run: async (client, interaction) => {
    // Get the subcommand used
    const subcommand = interaction.options.getSubcommand();

    // Check which subcommand was used
    if (subcommand === "info") {
      const { guild } = interaction;
      await interaction.deferReply(); // Defer the interaction to ensure the bot is allowed to send messages

      try {
        // Get versions of Discord.js, Node.js, and MongoDB
        const discordJsVersion = require("discord.js").version;
        const nodeJsVersion = process.version;
        const mongoDbVersion = mongoose.version;

        // Get active commands in the guild
        const activeCommands = await guild.commands.fetch();
        const activeCommandCount = activeCommands.size;

        // Construct embed to display bot information
        const embed = new EmbedBuilder()
          .setAuthor({
            name: "Bot Info",
            iconURL: `${client.user.displayAvatarURL({ dynamic: true })}`,
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          })
          .addFields(
            {
              name: `\`🤖\`** | DJS Version:**`,
              value: `> [*${discordJsVersion}*](https://discord.js.org/docs/packages/discord.js/14.14.1)`,
              inline: true,
            },
            {
              name: `\`🚀\`** | NodeJs Version:**`,
              value: `> [*${nodeJsVersion}*](https://nodejs.org/dist/latest-v20.x/docs/api/)`,
              inline: true,
            },
            {
              name: `\`🗄️\`** | Database Version:**`,
              value: `> [*${mongoDbVersion}*](https://docs.mongodb.com/drivers/node/)`,
              inline: true,
            },
            {
              name: `\`🧑‍💻\`** | Developer:**`,
              value: `> \`Norysight\``, // The developer. Change it to whatever you wish
              inline: true,
            },
            {
              name: `\`🗓️\`** | Created:**`,
              value: `> \`14/02/2024\``, // Date of creation
              inline: true,
            },
            {
              name: `\`⚙️\`** | Active Commands:**`,
              value: `> \`${activeCommandCount}\``, // Number of active commands
              inline: true,
            }
          )
          .setColor("Fuchsia")
          .setTimestamp()
          .setFooter({
            text: `Requested by ${interaction.user.username}`,
            iconURL: `${interaction.user.displayAvatarURL({
              dynamic: true,
            })}`,
          })
          .setThumbnail(
            "https://media.discordapp.net/attachments/1211983642394628136/1221397023715233872/infoIcon.gif"
          );

        // Send the bot information embed as a reply
        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.log(`An error occured in the bot-info command:\n\n${error}`);
        // Send an error message if an error occurs
        interaction.editReply({
          content:
            "An error occured while processing your command. Try again later.",
        });
      }
    }

    if (subcommand === "stats") {
      try {
        const startTime = Date.now(); // Get the start time of the command execution

        const placeEmbed = new EmbedBuilder() // Construct a placeholder embed
          .setTitle("Fetching...")
          .setColor("Fuchsia");

        // Send the placeholder embed as a reply
        await interaction.reply({ embeds: [placeEmbed] });

        // Get websocket latency
        const latency = await client.ws.ping;
        // Calculate REST latency
        const restLatency = Date.now() - startTime;
        // Calculate bot uptime
        const uptime = new Date(Date.now() - client.uptime);

        // Function to format bytes into a human-readable format with decimal points
        function formatBytes(bytes) {
          const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
          if (bytes === 0) return "0 Byte";
          const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
          const result = (bytes / Math.pow(1024, i)).toFixed(2);

          if (isNaN(result)) {
            console.log("Error: Result is NaN. Bytes:", bytes);
            return "Error";
          }

          return result + " " + sizes[i];
        }

        // Function to get the size of a directory recursively
        async function getDirectorySize(path) {
          // Recursive function to calculate the total size of a directory
          const calculateSize = async (currentPath) => {
            let totalSize = 0; // Initialize totalSize for each directory
            const files = fs.readdirSync(currentPath);

            for (const file of files) {
              const filePath = `${currentPath}/${file}`;
              const stats = fs.statSync(filePath);

              if (stats.isDirectory()) {
                totalSize += await calculateSize(filePath);
              } else {
                totalSize += stats.size;
              }
            }

            return totalSize;
          };

          return await calculateSize(path);
        }

        const projectDirectoryPath =
          "C:\\Users\\grish\\DuOl\\Code\\node.js\\nory"; // Specify the path to your project directory
        const projectSize = await getDirectorySize(projectDirectoryPath); // Get the size of the project directory

        // Construct embed to display bot status
        const embed = new EmbedBuilder()
          .setAuthor({
            name: "Bot Status",
            iconURL: `${client.user.displayAvatarURL({ dynamic: true })}`,
            url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          })
          .addFields(
            {
              name: `\`🔌\`** | WebSocket:**`,
              value: `> *\`${latency} m/s\`*`,
              inline: true,
            },
            {
              name: `\`🌍\`** | REST:**`,
              value: `> *\`${restLatency} m/s\`*`,
              inline: true,
            },
            {
              name: `\`📈\`** | UpTime:**`,
              value: `> ${time(uptime, "R")}`,
              inline: true,
            },
            {
              name: `\`💻\`** | CPU:**`,
              value: `> *\`${(process.cpuUsage().system / 1024 / 1024).toFixed(
                2
              )}%\`*`,
              inline: true,
            },
            {
              name: `\`💽\`** | RAM:**`,
              value: `> *\`${(
                process.memoryUsage().heapUsed /
                1024 /
                1024
              ).toFixed(2)}MB\`*`,
              inline: true,
            },
            {
              name: `\`🗃️\`** | Storage:**`,
              value: `> *\`${formatBytes(projectSize)}\`*`,
              inline: true,
            }
          )
          .setColor("Fuchsia")
          .setTimestamp()
          .setFooter({
            text: `Requested by ${interaction.user.username}`,
            iconURL: `${interaction.user.displayAvatarURL({ dynamic: true })}`,
          }) // Set's the embed footer
          .setThumbnail(
            "https://media.discordapp.net/attachments/1211983642394628136/1221395272211497001/serverIcon.gif"
          );

        // Send the bot status embed as a reply
        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.log(`An error occured in the bot-status command:\n\n${error}`);
        // Send an error message if an error occurs
        interaction.editReply({
          content:
            "An error occured while processing your command. Try again later.",
        });
      }
    }
  },
};
