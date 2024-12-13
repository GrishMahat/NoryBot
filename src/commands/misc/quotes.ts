import {
  EmbedBuilder,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Client,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ButtonInteraction
} from 'discord.js';
import { LocalCommand } from '../../types/index.js';
import emojiConfig from '../../config/emoji.js';

interface QuoteResponse {
  content: string;
  author: string;
  tags: string[];
}

const quotesCommand: LocalCommand = {
  data: new SlashCommandBuilder()
    .setName('quote')
    .setDescription('Get an inspirational random quote')
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1])
    .toJSON(),
  devOnly: false,
  category: 'Misc',
  cooldown: 15,
  userPermissions: [],
  botPermissions: [],

  run: async (client: Client, interaction: ChatInputCommandInteraction) => {
    try {
      await interaction.deferReply();

      const quote = await fetchQuote();
      const embed = createQuoteEmbed(client, quote);
      const row = createButtonRow();

      const reply = await interaction.editReply({ 
        embeds: [embed],
        components: [row]
      });

      // Create collector for button interactions
      const collector = interaction.channel?.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: (i: ButtonInteraction) => {
          return i.user.id === interaction.user.id && 
                 i.message.id === reply.id;
        },
        time: 120000
      });

      collector?.on('collect', async (i: ButtonInteraction) => {
        if (i.customId === 'new_quote') {
          await i.deferUpdate();
          const newQuote = await fetchQuote();
          const newEmbed = createQuoteEmbed(client, newQuote);
          await i.editReply({
            embeds: [newEmbed],
            components: [row]
          });
        }
      });

    } catch (error) {
      console.error('Quote command error:', error);
      await interaction.editReply({
        content: `${emojiConfig.notag} Failed to fetch quote. Please try again later.`,
        components: []
      });
    }
  },
};

async function fetchQuote(): Promise<QuoteResponse> {
  const response = await fetch('https://api.quotable.io/random');
  if (!response.ok) {
    throw new Error(`API responded with status: ${response.status}`);
  }
  return response.json() as Promise<QuoteResponse>;
}

function createQuoteEmbed(client: Client, data: QuoteResponse): EmbedBuilder {
  return new EmbedBuilder()
    .setAuthor({
      name: client.user?.username || 'Random Quote',
      iconURL: client.user?.displayAvatarURL(),
    })
    .setColor('#2b2d31')
    .setTitle(`${emojiConfig.statistics} Random Quote`)
    .setDescription(`> ${data.content}`)
    .addFields([
      {
        name: 'Author',
        value: `${emojiConfig.user} ${data.author}`,
        inline: true,
      },
    ])
    .setFooter({
      text: data.tags.length ? `Tags: ${data.tags.join(', ')}` : 'No tags',
    })
    .setTimestamp();
}

function createButtonRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('new_quote')
        .setLabel('New Quote')
        .setStyle(ButtonStyle.Primary)
        .setEmoji(emojiConfig.refresh)
    );
}

export default quotesCommand;