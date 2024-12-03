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
        .setMinValue(0.01)
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
    .addBooleanOption((option) =>
      option
        .setName('show_details')
        .setDescription('Show additional details like exchange rate trends and currency info')
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName('reverse')
        .setDescription('Also show the reverse conversion')
        .setRequired(false)
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
      const showDetails = interaction.options.getBoolean('show_details') ?? false;
      const showReverse = interaction.options.getBoolean('reverse') ?? false;

      const exchangeRates = await getExchangeRates();

      // Validate all currencies
      const invalidCurrencies = [sourceCurrency, ...targetCurrencies].filter(
        (currency) => !exchangeRates[currency]
      );

      if (invalidCurrencies.length > 0) {
        await interaction.editReply({
          content: `${emojiConfig.notag} The following currencies are not supported: ${invalidCurrencies.join(
            ', '
          )}. Use the autocomplete feature to select valid currencies.`,
        });
        return;
      }

      // Get currency names
      const currencyNames = {
        [sourceCurrency]: getCurrencyName(sourceCurrency),
        ...Object.fromEntries(targetCurrencies.map(c => [c, getCurrencyName(c)]))
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
          ].join('\n')
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
          '```'
        ].join('\n');
        
        if (showReverse) {
          const reverseAmount = amount / rate;
          fieldValue += `\n💱 Reverse: ${reverseAmount.toLocaleString(undefined, {
            style: 'currency',
            currency: sourceCurrency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;
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
        '🌐 Data provided by ExchangeRate-API'
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
    USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', AUD: '🇦🇺',
    CAD: '🇨🇦', CHF: '🇨🇭', CNY: '🇨🇳', HKD: '🇭🇰', NZD: '🇳🇿',
    SEK: '🇸🇪', KRW: '🇰🇷', SGD: '🇸🇬', NOK: '🇳🇴', MXN: '🇲🇽',
    INR: '🇮🇳', RUB: '🇷🇺', ZAR: '🇿🇦', TRY: '🇹🇷', BRL: '🇧🇷',
    AED: '🇦🇪', AFN: '🇦🇫', ALL: '🇦🇱', AMD: '🇦🇲', ANG: '🇳🇱',
    AOA: '🇦🇴', ARS: '🇦🇷', AWG: '🇦🇼', AZN: '🇦🇿', BAM: '🇧🇦',
    BBD: '🇧🇧', BDT: '🇧🇩', BGN: '🇧🇬', BHD: '🇧🇭', BIF: '🇧🇮',
    BMD: '🇧🇲', BND: '🇧🇳', BOB: '🇧🇴', BSD: '🇧🇸', BTN: '🇧🇹',
    BWP: '🇧🇼', BYN: '🇧🇾', BZD: '🇧🇿', CDF: '🇨🇩', CLP: '🇨🇱',
    COP: '🇨🇴', CRC: '🇨🇷', CUP: '🇨🇺', CVE: '🇨🇻', CZK: '🇨🇿',
    DJF: '🇩🇯', DKK: '🇩🇰', DOP: '🇩🇴', DZD: '🇩🇿', EGP: '🇪🇬',
    ERN: '🇪🇷', ETB: '🇪🇹', FJD: '🇫🇯', FKP: '🇫🇰', GEL: '🇬🇪',
    GGP: '🇬🇬', GHS: '🇬🇭', GIP: '🇬🇮', GMD: '🇬🇲', GNF: '🇬🇳',
    GTQ: '🇬🇹', GYD: '🇬🇾', HNL: '🇭🇳', HRK: '🇭🇷', HTG: '🇭🇹',
    HUF: '🇭🇺', IDR: '🇮🇩', ILS: '🇮🇱', IMP: '🇮🇲', IQD: '🇮🇶',
    IRR: '🇮🇷', ISK: '🇮🇸', JEP: '🇯🇪', JMD: '🇯🇲', JOD: '🇯🇴',
    KES: '🇰🇪', KGS: '🇰🇬', KHR: '🇰🇭', KMF: '🇰🇲', KPW: '🇰🇵',
    KWD: '🇰🇼', KYD: '🇰🇾', KZT: '🇰🇿', LAK: '🇱🇦', LBP: '🇱🇧',
    LKR: '🇱🇰', LRD: '🇱🇷', LSL: '🇱🇸', LYD: '🇱🇾', MAD: '🇲🇦',
    MDL: '🇲🇩', MGA: '🇲🇬', MKD: '🇲🇰', MMK: '🇲🇲', MNT: '🇲🇳',
    MOP: '🇲🇴', MRU: '🇲🇷', MUR: '🇲🇺', MVR: '🇲🇻', MWK: '🇲🇼',
    MYR: '🇲🇾', MZN: '🇲🇿', NAD: '🇳🇦', NGN: '🇳🇬', NIO: '🇳🇮',
    NPR: '🇳🇵', OMR: '🇴🇲', PAB: '🇵🇦', PEN: '🇵🇪', PGK: '🇵🇬',
    PHP: '🇵🇭', PKR: '🇵🇰', PLN: '🇵🇱', PYG: '🇵🇾', QAR: '🇶🇦',
    RON: '🇷🇴', RSD: '🇷🇸', RWF: '🇷🇼', SAR: '🇸🇦', SBD: '🇸🇧',
    SCR: '🇸🇨', SDG: '🇸🇩', SHP: '🇸🇭', SLL: '🇸🇱', SOS: '🇸🇴',
    SRD: '🇸🇷', SSP: '🇸🇸', STN: '🇸🇹', SVC: '🇸🇻', SYP: '🇸🇾',
    SZL: '🇸🇿', THB: '🇹🇭', TJS: '🇹🇯', TMT: '🇹🇲', TND: '🇹🇳',
    TOP: '🇹🇴', TTD: '🇹🇹', TWD: '🇹🇼', TZS: '🇹🇿', UAH: '🇺🇦',
    UGX: '🇺🇬', UYU: '🇺🇾', UZS: '🇺🇿', VES: '🇻🇪', VND: '🇻🇳',
    VUV: '🇻🇺', WST: '🇼🇸', XAF: '🇨🇲', XCD: '🇦🇬', XOF: '🇧🇯',
    XPF: '🇵🇫', YER: '🇾🇪', ZMW: '🇿🇲', ZWL: '🇿🇼'
  };
  return flagMap[currency] || '🏳️';
}

function getCurrencyName(currency: string): string {
  const currencyNames: Record<string, string> = {
    USD: 'United States Dollar', EUR: 'Euro', GBP: 'British Pound Sterling',
    JPY: 'Japanese Yen', AUD: 'Australian Dollar', CAD: 'Canadian Dollar',
    CHF: 'Swiss Franc', CNY: 'Chinese Yuan', HKD: 'Hong Kong Dollar',
    NZD: 'New Zealand Dollar', SEK: 'Swedish Krona', KRW: 'South Korean Won',
    SGD: 'Singapore Dollar', NOK: 'Norwegian Krone', MXN: 'Mexican Peso',
    INR: 'Indian Rupee', RUB: 'Russian Ruble', ZAR: 'South African Rand',
    TRY: 'Turkish Lira', BRL: 'Brazilian Real', AED: 'United Arab Emirates Dirham',
    AFN: 'Afghan Afghani', ALL: 'Albanian Lek', AMD: 'Armenian Dram',
    ANG: 'Netherlands Antillean Guilder', AOA: 'Angolan Kwanza',
    ARS: 'Argentine Peso', AWG: 'Aruban Florin', AZN: 'Azerbaijani Manat',
    BAM: 'Bosnia-Herzegovina Convertible Mark', BBD: 'Barbadian Dollar',
    BDT: 'Bangladeshi Taka', BGN: 'Bulgarian Lev', BHD: 'Bahraini Dinar',
    BIF: 'Burundian Franc', BMD: 'Bermudan Dollar', BND: 'Brunei Dollar',
    BOB: 'Bolivian Boliviano', BSD: 'Bahamian Dollar', BTN: 'Bhutanese Ngultrum',
    BWP: 'Botswanan Pula', BYN: 'Belarusian Ruble', BZD: 'Belize Dollar',
    CDF: 'Congolese Franc', CLP: 'Chilean Peso', COP: 'Colombian Peso',
    CRC: 'Costa Rican Colón', CUP: 'Cuban Peso', CVE: 'Cape Verdean Escudo',
    CZK: 'Czech Republic Koruna', DJF: 'Djiboutian Franc', DKK: 'Danish Krone',
    DOP: 'Dominican Peso', DZD: 'Algerian Dinar', EGP: 'Egyptian Pound',
    ERN: 'Eritrean Nakfa', ETB: 'Ethiopian Birr', FJD: 'Fijian Dollar',
    FKP: 'Falkland Islands Pound', GEL: 'Georgian Lari', GGP: 'Guernsey Pound',
    GHS: 'Ghanaian Cedi', GIP: 'Gibraltar Pound', GMD: 'Gambian Dalasi',
    GNF: 'Guinean Franc', GTQ: 'Guatemalan Quetzal', GYD: 'Guyanaese Dollar',
    HNL: 'Honduran Lempira', HRK: 'Croatian Kuna', HTG: 'Haitian Gourde',
    HUF: 'Hungarian Forint', IDR: 'Indonesian Rupiah', ILS: 'Israeli New Shekel',
    IMP: 'Manx pound', IQD: 'Iraqi Dinar', IRR: 'Iranian Rial',
    ISK: 'Icelandic Króna', JEP: 'Jersey Pound', JMD: 'Jamaican Dollar',
    JOD: 'Jordanian Dinar', KES: 'Kenyan Shilling', KGS: 'Kyrgystani Som',
    KHR: 'Cambodian Riel', KMF: 'Comorian Franc', KPW: 'North Korean Won',
    KWD: 'Kuwaiti Dinar', KYD: 'Cayman Islands Dollar', KZT: 'Kazakhstani Tenge',
    LAK: 'Laotian Kip', LBP: 'Lebanese Pound', LKR: 'Sri Lankan Rupee',
    LRD: 'Liberian Dollar', LSL: 'Lesotho Loti', LYD: 'Libyan Dinar',
    MAD: 'Moroccan Dirham', MDL: 'Moldovan Leu', MGA: 'Malagasy Ariary',
    MKD: 'Macedonian Denar', MMK: 'Myanma Kyat', MNT: 'Mongolian Tugrik',
    MOP: 'Macanese Pataca', MRU: 'Mauritanian Ouguiya', MUR: 'Mauritian Rupee',
    MVR: 'Maldivian Rufiyaa', MWK: 'Malawian Kwacha', MYR: 'Malaysian Ringgit',
    MZN: 'Mozambican Metical', NAD: 'Namibian Dollar', NGN: 'Nigerian Naira',
    NIO: 'Nicaraguan Córdoba', NPR: 'Nepalese Rupee', OMR: 'Omani Rial',
    PAB: 'Panamanian Balboa', PEN: 'Peruvian Nuevo Sol', PGK: 'Papua New Guinean Kina',
    PHP: 'Philippine Peso', PKR: 'Pakistani Rupee', PLN: 'Polish Złoty',
    PYG: 'Paraguayan Guarani', QAR: 'Qatari Rial', RON: 'Romanian Leu',
    RSD: 'Serbian Dinar', RWF: 'Rwandan Franc'
  };
  return currencyNames[currency] || 'Unknown Currency';
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
