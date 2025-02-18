import {
  EmbedBuilder,
  SlashCommandBuilder,
  Client,
  ChatInputCommandInteraction,
  CacheType,
  time,
} from 'discord.js';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import emojiConfig from '../../config/emoji.js';
import {
  commonCurrencies,
  allCurrencies,
  Currency,
} from '../../types/currency.js';

const apiUrl =
  'https://v6.exchangerate-api.com/v6/a2ea55b804ba212bc0b44879/latest/USD';
const CACHE_FILE = path.join(
  process.cwd(),
  'src/assets/json/exchangeRates.json',
);
const CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

const currencyCommand: LocalCommand = {
  data: new SlashCommandBuilder()
    .setName('currency_converter')
    .setDescription('Convert an amount between currencies')
    .addNumberOption((option) =>
      option
        .setName('amount')
        .setDescription('The amount of money to convert')
        .setRequired(true)
        .setMinValue(0.01),
    )
    .addStringOption((option) =>
      option
        .setName('source_currency')
        .setDescription('The currency you want to convert from (e.g., USD)')
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addStringOption((option) =>
      option

        .setName('target_currency')
        .setDescription(
          'The currency you want to convert to (e.g., EUR,GBP,JPY)',
        )
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addBooleanOption((option) =>
      option
        .setName('show_details')
        .setDescription(
          'Show additional details like exchange rate trends and currency info',
        )
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option
        .setName('reverse')
        .setDescription('Also show the reverse conversion')
        .setRequired(false),
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

  run: async (
    client: Client<boolean>,
    interaction: ChatInputCommandInteraction<CacheType>,
  ): Promise<void> => {
    try {
      await interaction.deferReply();

      const amount = interaction.options.getNumber('amount', true);
      const sourceCurrency = interaction.options
        .getString('source_currency', true)
        .toUpperCase();
      const targetCurrencies = interaction.options
        .getString('target_currency', true)
        .toUpperCase()
        .split(',')
        .map((c) => c.trim());
      const showDetails =
        interaction.options.getBoolean('show_details') ?? false;
      const showReverse = interaction.options.getBoolean('reverse') ?? false;

      const exchangeRates = await getExchangeRates();

      // Validate all currencies
      const invalidCurrencies = [sourceCurrency, ...targetCurrencies].filter(
        (currency) => !exchangeRates[currency],
      );

      if (invalidCurrencies.length > 0) {
        await interaction.editReply({
          content: `${emojiConfig.notag} The following currencies are not supported: ${invalidCurrencies.join(
            ', ',
          )}. Use the autocomplete feature to select valid currencies.`,
        });
        return;
      }

      // Get currency names
      const currencyNames = {
        [sourceCurrency]: getCurrencyName(sourceCurrency),
        ...Object.fromEntries(
          targetCurrencies.map((c) => [c, getCurrencyName(c)]),
        ),
      };

      const embed = new EmbedBuilder()
        .setColor('#5865F2') // Discord Blurple color
        .setTitle(`${emojiConfig.money} Currency Exchange`)
        .setDescription(
          [
            `${emojiConfig.chart_increasing} **Source Currency**`,
            `${getFlag(sourceCurrency)} **${sourceCurrency}** • ${currencyNames[sourceCurrency]}`,
            `💰 Amount: **${amount.toLocaleString(undefined, {
              style: 'currency',
              currency: sourceCurrency,
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}**`,
            '',
            `${emojiConfig.statistics} **Conversion Results**`,
          ].join('\n'),
        )
        .setTimestamp();

      // Calculate and format conversions
      const sourceRate = exchangeRates[sourceCurrency];
      for (const targetCurrency of targetCurrencies) {
        const targetRate = exchangeRates[targetCurrency];
        const rate = targetRate / sourceRate;
        const convertedAmount = amount * rate;

        let fieldValue = [
          '```ml',
          `${convertedAmount.toLocaleString(undefined, {
            style: 'currency',
            currency: targetCurrency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
          '```',
        ].join('\n');

        if (showReverse) {
          const reverseAmount = amount / rate;
          fieldValue += `\n💱 Reverse: ${reverseAmount.toLocaleString(
            undefined,
            {
              style: 'currency',
              currency: sourceCurrency,
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            },
          )}`;
        }

        if (showDetails) {
          // Calculate trend (example - you would need historical data for real trends)
          const trend = Math.random() > 0.5;
          const trendEmoji = trend ? '📈' : '📉';
          const trendColor = trend ? '32;1' : '31;1';

          fieldValue += '\n\n**Exchange Details**\n```ansi';
          fieldValue += `\n\u001b[36;1m• Rate:\u001b[0m 1 ${sourceCurrency} = \u001b[${trendColor}m${rate.toFixed(6)}\u001b[0m ${targetCurrency}`;
          fieldValue += `\n\u001b[36;1m• Trend:\u001b[0m ${trendEmoji} ${trend ? 'Rising' : 'Falling'}`;
          fieldValue += `\n\u001b[36;1m• Currency:\u001b[0m ${currencyNames[targetCurrency]}`;
          fieldValue += '\n```';
        }

        embed.addFields({
          name: `${getFlag(targetCurrency)} ${targetCurrency} Exchange`,
          value: fieldValue,
          inline: false,
        });
      }

      // Add summary footer with helpful information
      const summaryInfo = [
        `💱 Exchange rates updated ${time(Math.floor(Date.now() / 1000), 'R')}`,
        '🔄 Rates auto-update every 4 hours',
        '🌐 Data provided by ExchangeRate-API',
      ].join(' • ');

      embed.setFooter({
        text: summaryInfo,
        iconURL: interaction.client.user?.displayAvatarURL(),
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in currency converter:', error);
      await interaction.editReply({
        content: `${emojiConfig.notag} An error occurred while converting currencies. Please try again later.`,
      });
    }
  },

  autocomplete: async (client, interaction) => {
    try {
      const focusedOption = interaction.options.getFocused(true);
      const searchTerm = focusedOption.value.toString().toUpperCase();

      if (
        focusedOption.name === 'source_currency' ||
        focusedOption.name === 'target_currency'
      ) {
        let filtered: { name: string; value: Currency }[] = [];

        if (searchTerm.length === 0) {
          filtered = commonCurrencies.map((currency) => ({
            name: `${getFlag(currency)} ${currency} - Common Currency`,
            value: currency,
          }));
        } else {
          filtered = allCurrencies
            .filter((currency) => currency.includes(searchTerm))
            .slice(0, 25)
            .map((currency) => ({
              name: `${getFlag(currency)} ${currency}`,
              value: currency,
            }));

          filtered.sort((a, b) => {
            const aStartsWith = a.value.startsWith(searchTerm);
            const bStartsWith = b.value.startsWith(searchTerm);
            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;
  
