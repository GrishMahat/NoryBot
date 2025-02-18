import {
  EmbedBuilder,
  SlashCommandBuilder,
  Client,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  ComponentType,
  MessageFlags,
  ChatInputCommandInteraction,
} from 'discord.js';
import axios from 'axios';
import emojiConfig from '../../config/emoji.js';
import { LocalCommand } from '../../types/index.js';

const factCommand: LocalCommand = {
  data: new SlashCommandBuilder()
    .setName('fact')
    .setDescription('Send a random fact')
    .addStringOption((option) =>
      option
        .setName('category')
        .setDescription('Choose a fact category')
        .addChoices(
          { name: 'Random', value: 'random' },
          { name: 'Today', value: 'today' },
          { name: 'Year', value: 'year' },
          { name: 'Science', value: 'science' },
          { name: 'History', value: 'history' },
          { name: 'Math', value: 'math' },
          { name: 'Animal', value: 'animal' },
        ),
    )
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1])
    .toJSON(),
  userPermissions: [],
  botPermissions: [],
  category: 'Misc',
  cooldown: 15,
  nsfwMode: false,
  testMode: false,
  devOnly: false,

  run: async (client: Client, interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply();

    try {
      // Get category from options or default to "random"
      const category =
        (interaction.options.get('category')?.value as string) || 'random';

      // Store the current fact to use when sharing
      let currentFact: string = await getFact(category);
      const embed = createFactEmbed(currentFact, category, client);
      const row = createButtonRow();

      const reply = await interaction.editReply({
        embeds: [embed],
        components: [row],
      });

      // Only allow the original user to interact with the buttons
      const collector = interaction.channel?.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: (i: ButtonInteraction) =>
          i.user.id === interaction.user.id &&
          i.message.id === reply.id &&
          (i.customId === 'regenerate_fact' || i.customId === 'share_fact'),
        time: 120000,
      });

      if (!collector) {
        console.error('Failed to create collector');
        return;
      }

      collector.on('collect', async (i: ButtonInteraction) => {
        try {
          if (i.customId === 'regenerate_fact') {
            // Get a new fact and update the embed
            const newFact = await getFact(category);
            currentFact = newFact;
            const newEmbed = createFactEmbed(newFact, category, client);
            await i.update({ embeds: [newEmbed], components: [row] });
          } else if (i.customId === 'share_fact') {
            // Share the current fact
            await i.reply({
              content: `${emojiConfig.GIF_Animation} **${interaction.user.tag}** shared a fact:\n\n${currentFact}`,
              allowedMentions: { parse: [] },
            });
          }
        } catch (error) {
          console.error('Error handling button interaction:', error);
          await i.reply({
            content: `${emojiConfig.notag} An error occurred. Please try again.`,
            flags: MessageFlags.Ephemeral,
          });
        }
      });

      collector.on('end', async () => {
        // Disable buttons after collector expires
        const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('regenerate_fact')
            .setLabel('Get New Fact')
            .setEmoji('🔄')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId('share_fact')
            .setLabel('Share Fact')
            .setEmoji('📤')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        );

        try {
          await interaction.editReply({ components: [disabledRow] });
        } catch (error) {
          console.error('Error disabling buttons:', error);
        }
      });
    } catch (error) {
      console.error('Error in fact command:', error);
      await interaction.editReply({
        content: `${emojiConfig.notag} An error occurred while fetching the fact. Please try again later.`,
      });
    }
  },
};

async function getFact(category: string): Promise<string> {
  const urls: Record<string, string> = {
    today: 'https://uselessfacts.jsph.pl/today.json?language=en',
    year: `https://numbersapi.com/${new Date().getFullYear()}/year`,
    science:
      'https://uselessfacts.jsph.pl/random.json?language=en&category=science',
    history:
      'https://uselessfacts.jsph.pl/random.json?language=en&category=history',
    math: 'https://numbersapi.com/random/math',
    animal: 'https://api.some-random-api.com/facts/animal',
    random: 'https://uselessfacts.jsph.pl/random.json?language=en',
  };

  const url = urls[category] || urls.random;

  try {
    const response = await axios.get(url, { timeout: 5000 });
    // Process response based on category
    if (category === 'animal') {
      return response.data.fact;
    } else if (category === 'year' || category === 'math') {
      return response.data;
    } else {
      return response.data.text;
    }
  } catch (error) {
    console.error(`Error fetching fact from ${url}:`, error);
    throw new Error(
      'Unable to fetch a fact at this time. Please try again later.',
    );
  }
}

function createFactEmbed(
  fact: string,
  category: string,
  client: Client,
): EmbedBuilder {
  const categoryIcons: Record<string, string> = {
    random: emojiConfig.statistics,
    today: emojiConfig.chart_increasing,
    year: emojiConfig.live,
    science: emojiConfig.cpu,
    history: emojiConfig.OfficeComputer,
    math: emojiConfig.avatar_gold,
    animal: emojiConfig.avatar_platinum,
  };

  return new EmbedBuilder()
    .setColor('#2ECC71')
    .setAuthor({
      name: client.user?.username || 'Fact Bot',
      iconURL: client.user?.displayAvatarURL(),
    })
    .setTitle(
      `${categoryIcons[category] || emojiConfig.notag} ${
        category.charAt(0).toUpperCase() + category.slice(1)
      } Fact`,
    )
    .setDescription(fact)
    .setTimestamp()
    .setFooter({
      text: 'Click the buttons below to get a new fact or share this one',
      iconURL: client.user?.displayAvatarURL(),
    });
}

function createButtonRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('regenerate_fact')
      .setLabel('Get New Fact')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('share_fact')
      .setLabel('Share Fact')
      .setEmoji('📤')
      .setStyle(ButtonStyle.Secondary),
  );
}

export default factCommand;
