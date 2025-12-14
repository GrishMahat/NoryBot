import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	type ChatInputCommandInteraction,
	type Client,
	ComponentType,
	version as discordVersion,
	EmbedBuilder,
	SlashCommandBuilder,
} from 'discord.js';
import os from 'os';
import emojiConfig from '@/config/emoji';
import type { Command } from '@/types';

const createProgressBar = (value: number, total: number, segments = 10): string => {
	const percentage = value / total;
	const filled = Math.round(percentage * segments);
	const empty = segments - filled;
	const filledChar = '■';
	const emptyChar = '□';
	return `[${filledChar.repeat(filled)}${emptyChar.repeat(empty)}]`;
};

const pingCommand: Command = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Shows detailed system statistics and bot performance metrics')
		.setContexts([0, 1, 2])
		.setIntegrationTypes([0, 1]),
	devOnly: true,

	run: async (client: Client, interaction: ChatInputCommandInteraction) => {
		try {
			await interaction.deferReply();

			const updatePingEmbed = async () => {
				const _startTime = Date.now();
				// Use a small ping to estimate internal latency if needed,
				// or just measure execution of stats gathering.
				// For 'Bot Latency' we usually compare now vs createdTimestamp
				const botLatency = Math.abs(Date.now() - interaction.createdTimestamp);
				const apiLatency = Math.round(client.ws.ping);

				// Determine Color
				let color: 0x57f287 | 0xfee75c | 0xed4245 = 0x57f287; // Green
				if (botLatency > 200) color = 0xfee75c; // Yellow
				if (botLatency > 500) color = 0xed4245; // Red

				// Uptime
				const uptime = process.uptime();
				const uptimeTimestamp = Math.floor(Date.now() / 1000 - uptime);

				// Memory
				const memoryUsage = process.memoryUsage();
				const totalMemoryBytes = os.totalmem();
				const usedMemoryBytes = memoryUsage.rss; // RSS is more representative of process size
				const totalMemoryGB = (totalMemoryBytes / 1024 / 1024 / 1024).toFixed(2);
				const usedMemoryMB = (usedMemoryBytes / 1024 / 1024).toFixed(0);
				const memoryPercent = Math.round((usedMemoryBytes / totalMemoryBytes) * 100);

				// CPU
				const cpuCount = os.cpus().length;
				const loadAvg = os.loadavg()[0]; // 1 min load average
				// Load avg is often relative to 1 core, or all cores? On Linux it's system load.
				// A rough approximation for %: (loadAvg / cpuCount) * 100
				const cpuUsage = Math.min(100, Math.round((loadAvg / cpuCount) * 100));

				const embed = new EmbedBuilder()
					.setAuthor({
						name: `${client.user?.username} System Metrics`,
						iconURL: client.user?.displayAvatarURL(),
					})
					.setTitle(`${emojiConfig.statistics} System Status`)
					.setColor(color)
					.addFields(
						{
							name: `${emojiConfig.OfficeComputer} Performance`,
							value: [
								`**Latency**: \`${botLatency}ms\``,
								`**API**: \`${apiLatency}ms\``,
								`**Uptime**: <t:${uptimeTimestamp}:R>`,
							].join('\n'),
							inline: true,
						},
						{
							name: `${emojiConfig.statistics} Stats`,
							value: [
								`**Servers**: \`${client.guilds.cache.size}\``,
								`**Users**: \`${client.users.cache.size}\``,
								`**Channels**: \`${client.channels.cache.size}\``,
							].join('\n'),
							inline: true,
						},
						{
							name: '\u200b',
							value: '\u200b',
							inline: true,
						},
						{
							name: `${emojiConfig.cpu} Resource Usage`,
							value: [
								`**RAM**: \`${createProgressBar(memoryPercent, 100)}\` **${memoryPercent}%**`,
								`\`${usedMemoryMB}MB / ${totalMemoryGB}GB\``,
								'',
								`**CPU**: \`${createProgressBar(cpuUsage, 100)}\` **${cpuUsage}%**`,
								`\`${cpuCount} Cores\``,
							].join('\n'),
							inline: false,
						},
						{
							name: `${emojiConfig.gear} Tech Stack`,
							value: [
								// Hardcoding Bun version/TS version if not easily available via process,
								// but we can try process.version for Node/Bun
								`**Runtime**: \`Bun ${process.version}\``,
								`**Library**: \`Discord.js v${discordVersion}\``,
							].join(' • '),
							inline: false,
						},
					)
					.setFooter({
						text: `Last Updated`,
					})
					.setTimestamp();

				return embed;
			};

			const initialEmbed = await updatePingEmbed();

			const refreshButton = new ButtonBuilder()
				.setCustomId('refresh_ping')
				.setLabel('Refresh')
				.setStyle(ButtonStyle.Secondary)
				.setEmoji('🔄');

			const row = new ActionRowBuilder<ButtonBuilder>().addComponents(refreshButton);

			const response = await interaction.editReply({
				embeds: [initialEmbed],
				components: [row],
			});

			const collector = response.createMessageComponentCollector({
				componentType: ComponentType.Button,
				time: 60_000, // 1 minute timeout
			});

			collector.on('collect', async (i) => {
				if (i.customId === 'refresh_ping') {
					if (i.user.id !== interaction.user.id) {
						await i.reply({
							content: "You can't interact with this menu.",
							ephemeral: true,
						});
						return;
					}

					await i.deferUpdate();
					const newEmbed = await updatePingEmbed();
					await i.editReply({ embeds: [newEmbed] });
				}
			});

			collector.on('end', () => {
				const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
					refreshButton.setDisabled(true),
				);
				interaction.editReply({ components: [disabledRow] }).catch(() => {});
			});
		} catch (error) {
			console.error('Error in ping command:', error);
			await interaction.editReply({
				content: `${emojiConfig.notag} An error occurred while fetching system statistics.`,
			});
		}
	},
};

export default pingCommand;
