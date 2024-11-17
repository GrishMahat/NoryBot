import {
  EmbedBuilder,
  SlashCommandBuilder,
  CommandInteraction,
  Client,
  ChatInputCommandInteraction,
  CacheType,
  InteractionEditReplyOptions,
  MessagePayload,
  time,
} from 'discord.js';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import mConfig from '../../config/messageConfig';
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
  'src/assets/json/exchangeRates.json'
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
    )
    .addStringOption((option) =>
      option
        .setName('source_currency')
        .setDescription('The currency you want to convert from (e.g., USD)')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName('target_currency')
        .setDescription(
          'The currency you want to convert to (e.g., EUR,GBP,JPY)'
        )
        .setRequired(true)
        .setAutocomplete(true)
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
    interaction: ChatInputCommandInteraction<CacheType>
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

      const exchangeRates = await getExchangeRates();

      // Validate all currencies
      const invalidCurrencies = [sourceCurrency, ...targetCurrencies].filter(
        (currency) => !exchangeRates[currency]
      );

      if (invalidCurrencies.length > 0) {
        await interaction.editReply({
          content: `❌ The following currencies are not supported: ${invalidCurrencies.join(
            ', '
          )}`,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor('#2b2d31') // Modern Discord theme color
        .setTitle(`${emojiConfig.money} International Currency Exchange`)
        .setDescription(
          [
            '```ml',
            `From: ${getFlag(sourceCurrency)} ${sourceCurrency}`,
            `Amount: ${amount.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} ${sourceCurrency}`,
            '```',
            `\n${emojiConfig.chart_increasing} **Exchange Results:**`,
          ].join('\n')
        );

      // Add conversions for each target currency
      targetCurrencies.forEach((targetCurrency) => {
        const convertedAmount =
          (amount / exchangeRates[sourceCurrency]) *
          exchangeRates[targetCurrency];
        const exchangeRate =
          exchangeRates[targetCurrency] / exchangeRates[sourceCurrency];

        embed.addFields({
          name: `${getFlag(targetCurrency)} ${targetCurrency}`,
          value: [
            '```swift',
            `Converted: ${convertedAmount.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })} ${targetCurrency}`,
            `Rate: 1 ${sourceCurrency} = ${exchangeRate.toFixed(
              4
            )} ${targetCurrency}`,
            `Inverse: 1 ${targetCurrency} = ${(1 / exchangeRate).toFixed(
              4
            )} ${sourceCurrency}`,
            '```',
          ].join('\n'),
          inline: true,
        });
      });

      const lastUpdated = new Date(exchangeRates['timestamp'] || Date.now());

      embed
        .addFields({
          name: `${emojiConfig.statistics} Exchange Rate Information`,
          value: [
            `• Next Update: <t:${Math.floor((lastUpdated.getTime() + CACHE_DURATION) / 1000)}:R>`,
            `• Last Updated: <t:${Math.floor(lastUpdated.getTime() / 1000)}:F>`,
            `• Available Currencies: ${Object.keys(exchangeRates).length - 1}`,
          ].join('\n'),
          inline: false,
        })
        .setFooter({
          text: `Requested by ${interaction.user.tag} • Data updates every 4 hours`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in currency conversion:', error);
      await interaction.editReply({
        content:
          '❌ An error occurred while converting currencies. Please try again later.',
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
            return a.value.localeCompare(b.value);
          });
        }

        await interaction.respond(filtered);
      }
    } catch (error) {
      console.error('Error in currency autocomplete:', error);
      await interaction.respond([]);
    }
  },
};

function getFlag(currency: string): string {
  const flagMap: Record<string, string> = {
    USD: '🇺🇸',
    EUR: '🇪🇺',
    GBP: '🇬🇧',
    JPY: '🇯🇵',
    AUD: '🇦🇺',
    CAD: '🇨🇦',
    CHF: '🇨🇭',
    CNY: '🇨🇳',
    NZD: '🇳🇿',
    INR: '🇮🇳',
    SGD: '🇸🇬',
    HKD: '🇭🇰',
    KRW: '🇰🇷',
    MXN: '🇲🇽',
    BRL: '🇧🇷',
    RUB: '🇷🇺',
    ZAR: '🇿🇦',
    TRY: '🇹🇷',
    SEK: '🇸🇪',
    NOK: '🇳🇴',
    DKK: '🇩🇰',
    PLN: '🇵🇱',
    THB: '🇹🇭',
    IDR: '🇮🇩',
    AED: '🇦🇪',
    SAR: '🇸🇦',
    ILS: '🇮🇱',
    PHP: '🇵🇭',
    CZK: '🇨🇿',
    VND: '🇻🇳',
    MYR: '🇲🇾',
    PKR: '🇵🇰',
    EGP: '🇪🇬',
    ARS: '🇦🇷',
    CLP: '🇨🇱',
    COP: '🇨🇴',
    HUF: '🇭🇺',
    RON: '🇷🇴',
    BGN: '🇧🇬',
    HRK: '🇭🇷',
    UAH: '🇺🇦',
    KZT: '🇰🇿',
    NGN: '🇳🇬',
    KES: '🇰🇪',
    GHS: '🇬🇭',
    TZS: '🇹🇿',
    UGX: '🇺🇬',
    XOF: '🇸🇳',
    XAF: '🇨🇲',
    MAD: '🇲🇦',
    DZD: '🇩🇿',
    TND: '🇹🇳',
    QAR: '🇶🇦',
    OMR: '🇴🇲',
    BHD: '🇧🇭',
    KWD: '🇰🇼',
    LBP: '🇱🇧',
    JOD: '🇯🇴',
    IQD: '🇮🇶',
    IRR: '🇮🇷',
    LKR: '🇱🇰',
    BDT: '🇧🇩',
    NPR: '🇳🇵',
    MMK: '🇲🇲',
    KHR: '🇰🇭',
    LAK: '🇱🇦',
    MNT: '🇲🇳',
    BND: '🇧🇳',
    BWP: '🇧🇼',
    ZMW: '🇿🇲',
    MZN: '🇲🇿',
    ETB: '🇪🇹',
    GEL: '🇬🇪',
    AMD: '🇦🇲',
    AZN: '🇦🇿',
    KGS: '🇰🇬',
    UZS: '🇺🇿',
    TJS: '🇹🇯',
    AFN: '🇦🇫',
    XPF: '🇵🇫',
    FJD: '🇫🇯',
    PGK: '🇵🇬',
    WST: '🇼🇸',
    TOP: '🇹🇴',
    VUV: '🇻🇺',
    SBD: '🇸🇧',
    KPW: '🇰🇵',
    BAM: '🇧🇦',
    MKD: '🇲🇰',
    ISK: '🇮🇸',
    MGA: '🇲🇬',
    SCR: '🇸🇨',
    BBD: '🇧🇧',
    TTD: '🇹🇹',
    JMD: '🇯🇲',
    BZD: '🇧🇿',
    HTG: '🇭🇹',
    BSD: '🇧🇸',
    CUP: '🇨🇺',
    KYD: '🇰🇾',
    XCD: '🇦🇬',
    ANG: '🇨🇼',
    AWG: '🇦🇼',
    GYD: '🇬🇾',
    SRD: '🇸🇷',
    LRD: '🇱🇷',
    SLL: '🇸🇱',
    MWK: '🇲🇼',
    ZWL: '🇿🇼',
    XAU: '🏅',
    XAG: '🥈',
    XPD: '🚀',
    XPT: '⛏️',
  };
  return flagMap[currency] || '🏳️';
}

async function getExchangeRates(): Promise<Record<string, number>> {
  try {
    await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });

    let cacheExists = false;
    try {
      await fs.access(CACHE_FILE);
      cacheExists = true;
    } catch {
      cacheExists = false;
    }

    if (cacheExists) {
      try {
        const cacheContent = await fs.readFile(CACHE_FILE, 'utf-8');
        if (cacheContent) {
          const cacheData = JSON.parse(cacheContent);

          if (Date.now() - cacheData.timestamp < CACHE_DURATION) {
            return { ...cacheData.rates, timestamp: cacheData.timestamp };
          }
        }
      } catch (err) {
        console.error('Error reading cache file:', err);
      }
    }

    const response = await axios.get(apiUrl);
    const timestamp = Date.now();
    const newData = {
      timestamp,
      rates: response.data.conversion_rates,
    };

    await fs.writeFile(CACHE_FILE, JSON.stringify(newData, null, 2));

    return { ...newData.rates, timestamp };
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    throw new Error('Failed to fetch exchange rates');
  }
}

export default currencyCommand;
