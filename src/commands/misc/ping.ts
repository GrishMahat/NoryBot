import {
  EmbedBuilder,
  SlashCommandBuilder,
  CommandInteraction,
  Client,
  version as discordVersion
} from 'discord.js';
import { LocalCommand } from '../../types/index.js';
import os from 'os';

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
      const message = await interaction.deferReply({ fetchReply: true });
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
        .setTitle('📊 System Statistics')
        .setColor('#2F3136')
        .setThumbnail(client.user?.displayAvatarURL() || '')
        .addFields(
          {
            name: '🤖 Bot Performance',
            value: [
              `**Bot Latency:** \`${botLatency}ms\``,
              `**API Latency:** \`${apiLatency}ms\``,
              `**Execution Time:** \`${execTime}ms\``,
              `**Discord.js:** \`v${discordVersion}\``,
            ].join('\n'),
            inline: false,
          },
          {
            name: '📈 Bot Statistics',
            value: [
              `**Servers:** \`${client.guilds.cache.size}\``,
              `**Users:** \`${client.users.cache.size}\``,
              `**Channels:** \`${client.channels.cache.size}\``,
            ].join('\n'),
            inline: true,
          },
          {
            name: '⏰ Uptime',
            value: `\`${days}d ${hours}h ${minutes}m ${seconds}s\``,
            inline: true,
          },
          {
            name: '💾 Memory',
            value: [
              `**Used:** \`${usedMemory} MB\``,
              `**Total:** \`${totalMemory} GB\``,
              `**Free:** \`${freeMemory} GB\``,
            ].join('\n'),
            inline: true,
          },
          {
            name: '🔧 CPU',
            value: [
              `**Model:** \`${cpuModel.split(' ')[0]}\``,
              `**Cores:** \`${cpuCount}\``,
              `**Usage:** \`${cpuUsage}%\``,
            ].join('\n'),
            inline: true,
          },
          {
            name: '💻 System',
            value: [
              `**OS:** \`${os.platform()} ${os.release()}\``,
              `**Node:** \`${process.version}\``,
              `**Arch:** \`${os.arch()}\``,
            ].join('\n'),
            inline: true,
          }
        )
        .setFooter({ text: `Last Updated • Host: ${os.hostname()}` })
        .setTimestamp();

      await interaction.editReply({ embeds: [pongEmbed] });
    } catch (error) {
      console.error('Error in ping command:', error);
      await interaction.editReply({
        content: '❌ An error occurred while fetching system statistics.',
      });
    }
  },
};

export default pingCommand;
