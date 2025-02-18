import {
  SlashCommandBuilder,
  EmbedBuilder,
  Client,
  ChatInputCommandInteraction,
} from 'discord.js';
import { LocalCommand } from '../../types/index';
import emojiConfig from '../../config/emoji.js';

// Mapping of special keywords to their date adjustments
const SPECIAL_KEYWORDS: Record<string, () => Date> = {
  now: () => new Date(),
  tomorrow: () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  },
  'next week': () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  },
  'next month': () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d;
  },
  'next year': () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d;
  },
};

// Parses the time string (if provided) and updates the Date object accordingly
function parseTimeInput(date: Date, timeInput: string): Date {
  const timeRegex = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i;
  const match = timeInput.match(timeRegex);
  if (!match) return date;

  const [, hourStr, minuteStr, meridiemRaw] = match;
  let hours = parseInt(hourStr, 10);
  const minutes = parseInt(minuteStr, 10);
  const meridiem = meridiemRaw?.toUpperCase();

  if (meridiem) {
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
  }

  // Validate hours and minutes before setting the time
  if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
    date.setHours(hours, minutes, 0, 0);
  }
  return date;
}

// Builds the embed containing all Discord timestamp formats
function createTimestampEmbed(
  timestamp: number,
  date: Date,
  showPreview: boolean,
  client: Client,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor('#2b2d31')
    .setTitle(`${emojiConfig.statistics} Discord Timestamp Formats`)
    .setDescription(
      'Here are the different timestamp formats. The display format (12/24hr) depends on your Discord language setting.\n' +
        'US English (🇺🇸) shows 12-hour format\n' +
        'UK English (🇬🇧) shows 24-hour format\n\n' +
        `${showPreview ? `**Preview date:** ${date.toLocaleString()}\n\n` : ''}` +
        '**Note:** Click on the codes to copy them!',
    )
    .addFields([
      {
        name: 'Default',
        value: `\`<t:${timestamp}>\`\n<t:${timestamp}>`,
        inline: true,
      },
      {
        name: 'Short Time (t)',
        value: `\`<t:${timestamp}:t>\`\n<t:${timestamp}:t>`,
        inline: true,
      },
      {
        name: 'Long Time (T)',
        value: `\`<t:${timestamp}:T>\`\n<t:${timestamp}:T>`,
        inline: true,
      },
      {
        name: 'Short Date (d)',
        value: `\`<t:${timestamp}:d>\`\n<t:${timestamp}:d>`,
        inline: true,
      },
      {
        name: 'Long Date (D)',
        value: `\`<t:${timestamp}:D>\`\n<t:${timestamp}:D>`,
        inline: true,
      },
      {
        name: 'Short Date/Time (f)',
        value: `\`<t:${timestamp}:f>\`\n<t:${timestamp}:f>`,
        inline: true,
      },
      {
        name: 'Long Date/Time (F)',
        value: `\`<t:${timestamp}:F>\`\n<t:${timestamp}:F>`,
        inline: true,
      },
      {
        name: 'Relative Time (R)',
        value: `\`<t:${timestamp}:R>\`\n<t:${timestamp}:R>`,
        inline: true,
      },
    ])
    .setFooter({
      text: "Copy the code format you want to use | Timestamps automatically adjust to viewer's timezone",
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTimestamp();
  return embed;
}

const timestampCommand: LocalCommand = {
  data: new SlashCommandBuilder()
    .setName('timestamp')
    .setDescription('Convert a date to Discord timestamps')
    .addStringOption((option) =>
      option
        .setName('date')
        .setDescription(
          'Date to convert (e.g., 2024-03-25, now, tomorrow, next week)',
        )
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
      const dateInput = interaction.options.getString('date', true);
      const timeInput = interaction.options.getString('time') || '';
      const showPreview = interaction.options.getBoolean('preview') || false;

      let date: Date;
      const lowerInput = dateInput.toLowerCase();

      if (SPECIAL_KEYWORDS[lowerInput]) {
        date = SPECIAL_KEYWORDS[lowerInput]();
      } else {
        date = new Date(dateInput);
      }

      if (timeInput) {
        date = parseTimeInput(date, timeInput);
      }

      if (isNaN(date.getTime())) {
        await interaction.editReply({
          content:
            `${emojiConfig.notag} Invalid date/time format. Please use one of these formats:\n` +
            '• YYYY-MM-DD\n' +
            '• now\n' +
            '• tomorrow\n' +
            '• next week\n' +
            '• next month\n' +
            '• next year\n' +
            'You can also add a time using the time option (e.g., 15:30 or 3:30 PM)',
        });
        return;
      }

      const timestamp = Math.floor(date.getTime() / 1000);
      const embed = createTimestampEmbed(timestamp, date, showPreview, client);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      global.errorHandler.handleError(error, 'TimestampCommand');
      await interaction.editReply({
        content: 'An error occurred while processing the timestamp.',
      });
    }
  },
};

export default timestampCommand;
