import {
	type ChatInputCommandInteraction,
	type Client,
	EmbedBuilder,
	SlashCommandBuilder,
} from 'discord.js';
import emojiConfig from '../../config/emoji';

const timestampCommand: Command = {
	data: new SlashCommandBuilder()
		.setName('timestamp')
		.setDescription('Convert a date to Discord timestamps')
		.addStringOption((option) =>
			option
				.setName('date')
				.setDescription('Date to convert (e.g., 2024-03-25, now, tomorrow, next week)')
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName('time')
				.setDescription('Time for the timestamp (e.g., 15:30, 3:30 PM)')
				.setRequired(false),
		)
		.addBooleanOption((option) =>
			option
				.setName('preview')
				.setDescription('Show a preview of how the timestamp will look')
				.setRequired(false),
		)
		.setContexts([0, 1, 2])
		.setIntegrationTypes([0, 1])
		.toJSON(),
	userPermissions: [],
	botPermissions: [],
	category: 'Misc',
	cooldown: 5,
	nsfwMode: false,
	testMode: false,
	devOnly: false,

	run: async (client: Client, interaction: ChatInputCommandInteraction) => {
		await interaction.deferReply();

		try {
			const input = interaction.options.getString('date', true);
			const timeInput = interaction.options.getString('time') || '';
			const showPreview = interaction.options.getBoolean('preview') || false;

			let date: Date;

			// Parse relative dates
			const relativeKeywords: Record<string, (d: Date) => void> = {
				now: () => (date = new Date()),
				tomorrow: (d) => d.setDate(d.getDate() + 1),
				'next week': (d) => d.setDate(d.getDate() + 7),
				'next month': (d) => d.setMonth(d.getMonth() + 1),
				'next year': (d) => d.setFullYear(d.getFullYear() + 1),
			};

			const keyword = input.toLowerCase();
			if (keyword in relativeKeywords) {
				date = new Date();
				relativeKeywords[keyword](date);
			} else {
				// Try parsing absolute date
				date = new Date(input);
			}

			// Parse time if provided
			if (timeInput) {
				const timeParts = timeInput.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
				if (timeParts) {
					const [, hours, minutes, meridiem] = timeParts;
					let hrs = Number.parseInt(hours);
					const mins = Number.parseInt(minutes);

					// Convert 12-hour to 24-hour format if needed
					if (meridiem) {
						if (meridiem.toUpperCase() === 'PM' && hrs < 12) hrs += 12;
						if (meridiem.toUpperCase() === 'AM' && hrs === 12) hrs = 0;
					}

					// Validate time components
					if (hrs >= 0 && hrs < 24 && mins >= 0 && mins < 60) {
						date.setHours(hrs, mins, 0, 0);
					}
				}
			}

			if (isNaN(date.getTime())) {
				const validFormats = [
					'• YYYY-MM-DD',
					'• now',
					'• tomorrow',
					'• next week',
					'• next month',
					'• next year',
				].join('\n');

				await interaction.editReply({
					content:
						`${emojiConfig.notag} Invalid date/time format. Please use one of these formats:\n${validFormats}\nYou can also add a time using the time option (e.g., 15:30 or 3:30 PM)`,
				});
				return;
			}

			const timestamp = Math.floor(date.getTime() / 1000);

			// Define timestamp formats
			const formats = [
				{ name: 'Default', code: '', example: `<t:${timestamp}>` },
				{ name: 'Short Time (t)', code: 't', example: `<t:${timestamp}:t>` },
				{ name: 'Long Time (T)', code: 'T', example: `<t:${timestamp}:T>` },
				{ name: 'Short Date (d)', code: 'd', example: `<t:${timestamp}:d>` },
				{ name: 'Long Date (D)', code: 'D', example: `<t:${timestamp}:D>` },
				{
					name: 'Short Date/Time (f)',
					code: 'f',
					example: `<t:${timestamp}:f>`,
				},
				{
					name: 'Long Date/Time (F)',
					code: 'F',
					example: `<t:${timestamp}:F>`,
				},
				{ name: 'Relative Time (R)', code: 'R', example: `<t:${timestamp}:R>` },
			];

			const embed = new EmbedBuilder()
				.setColor('#2b2d31')
				.setTitle(`${emojiConfig.statistics} Discord Timestamp Formats`)
				.setDescription(
					`Here are the different timestamp formats. The display format (12/24hr) depends on your Discord language setting.\nUS English (🇺🇸) shows 12-hour format\nUK English (🇬🇧) shows 24-hour format\n\n${showPreview ? `**Preview date:** ${date.toLocaleString()}\n\n` : ''}**Note:** Click on the codes to copy them!`,
				)
				.addFields(
					formats.map((format) => ({
						name: format.name,
						value: `\`${format.example}\`\n${format.example}`,
						inline: true,
					})),
				)
				.setFooter({
					text: "Copy the code format you want to use | Timestamps automatically adjust to viewer's timezone",
					iconURL: client.user?.displayAvatarURL(),
				})
				.setTimestamp();

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			errorHandler.handleError(error, 'TimestampCommand');
			await interaction.editReply({
				content: `${emojiConfig.notag} An error occurred while processing the timestamp.`,
			});
		}
	},
};

export default timestampCommand;
