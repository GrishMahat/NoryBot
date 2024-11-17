import {
  EmbedBuilder,
  SlashCommandBuilder,
  CommandInteraction,
  Client,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { LocalCommand } from '../../types/index';
import axios from 'axios';
import mConfig from '../../config/messageConfig';

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
          { name: 'Animal', value: 'animal' }
        )
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

  run: async (client: Client, interaction: CommandInteraction) => {
    await interaction.deferReply();

    try {
      const category =
        (interaction.options.get('category')?.value as string) || 'random';
      const fact = await getFact(category);
      const embed = createFactEmbed(fact, category);
      const row = createButtonRow();

      await interaction.editReply({ embeds: [embed], components: [row] });
      await handleButtonInteractions(interaction, category, row, fact);
    } catch (error) {
      console.error('Error in fact command:', error);
      await interaction.editReply({
        content:
          '❌ An error occurred while fetching the fact. Please try again later.',
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
    animal: 'https://some-random-api.ml/animal/fact',
    random: 'https://uselessfacts.jsph.pl/random.json?language=en',
  };

  const url = urls[category] || urls.random;

  try {
    const response = await axios.get(url, { timeout: 5000 });
    return category === 'animal'
      ? response.data.fact
      : category === 'year' || category === 'math'
        ? response.data
        : response.data.text;
  } catch (error) {
    console.error(`Error fetching fact from ${url}:`, error);
    return 'Unable to fetch a fact at this time. Please try again later.';
  }
}

function createFactEmbed(fact: string, category: string): EmbedBuilder {
  const categoryIcons: Record<string, string> = {
    random: '🎲',
    today: '📅',
    year: '🗓️',
    science: '🔬',
    history: '📜',
    math: '🔢',
    animal: '🐾',
  };

  return new EmbedBuilder()
    .setColor('Green')
    .setTitle(
      `${categoryIcons[category] || '❓'} ${
        category.charAt(0).toUpperCase() + category.slice(1)
      } Fact`
    )
    .setDescription(fact)
    .setFooter({
      text: 'Click the button to get a new fact or share this fact',
    });
}

function createButtonRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('regenerate_fact')
      .setLabel('Get New Fact')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('share_fact')
      .setLabel('Share Fact')
      .setStyle(ButtonStyle.Secondary)
  );
}

async function handleButtonInteractions(
  interaction: CommandInteraction,
  category: string,
  row: ActionRowBuilder<ButtonBuilder>,
  fact: string
): Promise<void> {
  const filter = (i) =>
    (i.customId === 'regenerate_fact' || i.customId === 'share_fact') &&
    i.user.id === interaction.user.id;

  const collector = interaction.channel.createMessageComponentCollector({
    filter,
    time: 120000,
  });

  collector.on('collect', async (i) => {
    if (i.customId === 'regenerate_fact') {
      const newFact = await getFact(category);
      const newEmbed = createFactEmbed(newFact, category);
      await i.update({ embeds: [newEmbed], components: [row] });
    } else if (i.customId === 'share_fact') {
      await i.reply({
        content: `${interaction.user} shared a fact: ${fact}`,
        allowedMentions: { parse: [] },
      });
    }
  });

  collector.on('end', async () => {
    const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('regenerate_fact')
        .setLabel('Get New Fact')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId('share_fact')
        .setLabel('Share Fact')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );
    await interaction.editReply({ components: [disabledRow] });
  });
}

export default factCommand;
