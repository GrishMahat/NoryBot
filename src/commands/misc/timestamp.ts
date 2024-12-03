import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { LocalCommand } from '../../types/index';
import mConfig from '../../config/messageConfig';
import emojiConfig from '../../config/emoji.js';

const timestampCommand: LocalCommand = {
  data: new SlashCommandBuilder()
    .setName('timestamp')
    .setDescription('Convert a date to Discord timestamps')
    .addStringOption((option) =>
      option
        .setName('date')
        .setDescription('Date to convert (e.g., 2024-03-25, now, tomorrow, next week)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('time')
        .setDescription('Time for the timestamp (e.g., 15:30, 3:30 PM)')
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName('preview')
        .setDescription('Show a preview of how the timestamp will look')
        .setRequired(false)
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

  run: async (client, interaction) => {
    try {
      const input = interaction.options.getString('date', true);
      const timeInput = interaction.options.getString('time') || '';
      const showPreview = interaction.options.getBoolean('preview') || false;

      let date: Date;
      
      // Handle special keywords
      switch (input.toLowerCase()) {
        case 'now':
          date = new Date();
          break;
        case 'tomorrow':
          date = new Date();
          date.setDate(date.getDate() + 1);
          break;
        case 'next week':
          date = new Date();
          date.setDate(date.getDate() + 7);
          break;
        case 'next month':
          date = new Date();
          date.setMonth(date.getMonth() + 1);
          break;
        default:
          // Try parsing the date
          date = new Date(input);
          
          // If time is provided, try to set it
          if (timeInput) {
            const timeParts = timeInput.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
            if (timeParts) {
              let hours = parseInt(timeParts[1]);
              const minutes = parseInt(timeParts[2]);
              const meridiem = timeParts[3]?.toUpperCase();

              if (meridiem) {
                if (meridiem === 'PM' && hours < 12) hours += 12;
                if (meridiem === 'AM' && hours === 12) hours = 0;
              }

              date.setHours(hours, minutes);
            }
          }
      }

      if (isNaN(date.getTime())) {
        await interaction.reply({
          content: `${emojiConfig.notag} Invalid date/time format. Please use one of these formats:\n` +
            '• YYYY-MM-DD\n' +
            '• now\n' +
            '• tomorrow\n' +
            '• next week\n' +
            '• next month\n' +
            'You can also add a time using the time option (e.g., 15:30 or 3:30 PM)',
          ephemeral: true,
        });
        return;
      }

      const timestamp = Math.floor(date.getTime() / 1000);
      const embed = new EmbedBuilder()
        .setColor('Green')
        .setTitle(`${emojiConfig.statistics} Discord Timestamp Formats`)
        .setDescription(
          'Here are the different timestamp formats. The display format (12/24hr) depends on your Discord language setting.\n' +
          'US English (🇺🇸) shows 12-hour format\n' +
          'UK English (🇬🇧) shows 24-hour format\n\n' +
          `${showPreview ? '**Preview date:** ' + date.toLocaleString() + '\n' : ''}` +
          '**Note:** Click on the codes to copy them!'
        )
        .addFields(
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
          }
        )
        .setFooter({
          text: 'Copy the code format you want to use | Timestamps automatically adjust to viewer\'s timezone',
        });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      global.errorHandler.handleError(error, 'TimestampCommand');
      await interaction.reply({
        content: `${emojiConfig.notag} An error occurred while processing the timestamp.`,
        ephemeral: true,
      });
    }
  },
};

export default timestampCommand;