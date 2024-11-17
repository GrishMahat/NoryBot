import {
  EmbedBuilder,
  SlashCommandBuilder,
  CommandInteraction,
  Client,
  version as discordVersion
} from 'discord.js';
import { LocalCommand } from '../../types/index.js';
import os from 'os';
import emojiConfig from '../../config/emoji.js';

const pingCommand: LocalCommand = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription(
      'Shows detailed system statistics and bot performance metrics'
    )
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1])
    .toJSON(),
  devOnly: true,

  run: async (client: Client, interaction: CommandInteraction) => {
    try {
      const execStart = process.hrtime();
      const startTime = Date.now();
      await interaction.deferReply();
      const message = await interaction.fetchReply();
      const endTime = Date.now();

      const botLatency = endTime - startTime;
      const apiLatency = Math.round(client.ws.ping);

      // Calculate uptime
      const uptime = process.uptime();
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = Math.floor(uptime % 60);

      // Memory calculations
      const memoryUsage = process.memoryUsage();
      const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
      const freeMemory = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
      const usedMemory = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);

      // CPU information
      const cpuCount = os.cpus().length;
      const cpuModel = os.cpus()[0].model;
      const loadAvg = os.loadavg()[0];
      const cpuUsage = ((loadAvg * 100) / cpuCount).toFixed(2);

      // Calculate command execution time
      const execEnd = process.hrtime(execStart);
      const execTime = Math.round((execEnd[0] * 1e9 + execEnd[1]) / 1e6);

      const pongEmbed = new EmbedBuilder()
        .setAuthor({
          name: client.user?.username || 'Bot Status',
          iconURL: client.user?.displayAvatarURL(),
        })
        .setTitle(`${emojiConfig.statistics} System Statistics`)
        .setColor('#2b2d31')
        .addFields(
          {
            name: `${emojiConfig.OfficeComputer} Bot Performance`,
            value: [
              `${emojiConfig.goodconnection} Bot Latency: \`${botLatency}ms\``,
              `${emojiConfig.lowconnection} API Latency: \`${apiLatency}ms\``,
              `${emojiConfig.chart_increasing} Execution Time: \`${execTime}ms\``,
              `${emojiConfig.live} Discord.js: \`v${discordVersion}\``
            ].join('\n'),
            inline: false
          },
          {
            name: `${emojiConfig.statistics} Bot Statistics`,
            value: [
              `${emojiConfig.admintag} Servers: \`${client.guilds.cache.size}\``,
              `${emojiConfig.user} Users: \`${client.users.cache.size}\``,
              `${emojiConfig.mic} Channels: \`${client.channels.cache.size}\``
            ].join('\n'),
            inline: true
          },
          {
            name: `${emojiConfig.chart_increasing} Uptime`,
            value: `\`${days}d ${hours}h ${minutes}m ${seconds}s\``,
            inline: true
          },
          {
            name: '\u200b',
            value: '\u200b',
            inline: true
          },
          {
            name: `${emojiConfig.statistics} Memory`,
            value: [
              `${emojiConfig.yestag} Used: \`${usedMemory} MB\``,
              `${emojiConfig.yestag} Total: \`${totalMemory} GB\``,
              `${emojiConfig.yestag} Free: \`${freeMemory} GB\``
            ].join('\n'),
            inline: true
          },
          {
            name: `${emojiConfig.cpu} CPU`,
            value: [
              `${emojiConfig.yestag} Model: \`${cpuModel.split(' ')[0]}\``,
              `${emojiConfig.yestag} Cores: \`${cpuCount}\``,
              `${emojiConfig.yestag} Usage: \`${cpuUsage}%\``
            ].join('\n'),
            inline: true
          },
          {
            name: `${emojiConfig.OfficeComputer} System`,
            value: [
              `${emojiConfig.yestag} OS: \`${os.platform()} ${os.release()}\``,
              `${emojiConfig.yestag} Node: \`${process.version}\``,
              `${emojiConfig.yestag} Arch: \`${os.arch()}\``
            ].join('\n'),
            inline: false
          }
        )
        .setFooter({ text: `Last Updated • Host: ${os.hostname()}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [pongEmbed] });
    } catch (error) {
      console.error('Error in ping command:', error);
      await interaction.editReply({
        content: `${emojiConfig.notag} An error occurred while fetching system statistics.`,
      });
    }
  },
};

export default pingCommand;
