import axios from 'axios';
import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';

const data = new SlashCommandBuilder()
  .setName('emoji-app')
  .setDescription('Manage application emojis')
  .addSubcommand((command) =>
    command
      .setName('create')
      .setDescription('Create app emojis')
      .addStringOption((option) =>
        option
          .setName('emojis')
          .setDescription('The emojis to add (space-separated)')
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName('names')
          .setDescription('The names of the emojis (comma-separated)')
          .setRequired(true)
      )
  )
  .addSubcommand((command) =>
    command
      .setName('remove')
      .setDescription('Remove an app emoji')
      .addStringOption((option) =>
        option
          .setName('emoji-id')
          .setDescription('The ID of the emoji to remove')
          .setRequired(true)
      )
  )
  .addSubcommand((command) =>
    command
      .setName('edit')
      .setDescription('Edit an app emoji name')
      .addStringOption((option) =>
        option
          .setName('emoji-id')
          .setDescription('The ID of the emoji to edit')
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName('new-name')
          .setDescription('The new name for the emoji')
          .setRequired(true)
      )
  )
  .addSubcommand((command) =>
    command.setName('list').setDescription('List all app emojis')
  )
  .toJSON();

export default {
  data,
  userPermissions: ['ManageEmojisAndStickers'],
  botPermissions: ['ManageEmojisAndStickers'],
  category: 'Developer',
  cooldown: 10,
  nsfwMode: false,
  testMode: false,
  devOnly: true,
  prefix: false,

  run: async (client, interaction) => {
    await interaction.deferReply();
    const { options } = interaction;
    const subCommand = options.getSubcommand();

    const emojiManager = new EmojiManager(
      process.env.APPLICATION_ID,
      process.env.TOKEN
    );

    try {
      switch (subCommand) {
        case 'create':
          await handleCreateCommand(emojiManager, options, interaction);
          break;
        case 'remove':
          await handleRemoveCommand(emojiManager, options, interaction);
          break;
        case 'edit':
          await handleEditCommand(emojiManager, options, interaction);
          break;
        case 'list':
          await handleListCommand(emojiManager, interaction);
          break;
        default:
          throw new Error('Invalid subcommand');
      }
    } catch (error) {
      console.error('Command execution error:', error);
      await sendErrorMessage(
        interaction,
        'An error occurred while processing the command. Please try again later.'
      );
    }
  },
};

class EmojiManager {
  constructor(applicationId, token) {
    this.applicationId = applicationId;
    this.token = token;
    this.baseUrl = `https://discord.com/api/v10/applications/${this.applicationId}/emojis`;
  }

  async apiCall(method, endpoint = '', data = null) {
    const config = {
      method,
      url: `${this.baseUrl}${endpoint}`,
      headers: { Authorization: `Bot ${this.token}` },
      data,
    };

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(
        `API Call Error - ${method} ${endpoint}:`,
        error.response?.data || error.message
      );
      throw error;
    }
  }

  async createEmoji(name, image) {
    return this.apiCall('POST', '', { name, image });
  }

  async removeEmoji(emojiId) {
    return this.apiCall('DELETE', `/${emojiId}`);
  }

  async editEmoji(emojiId, name) {
    return this.apiCall('PATCH', `/${emojiId}`, { name });
  }

  async listEmojis() {
    return this.apiCall('GET');
  }
}

async function handleCreateCommand(emojiManager, options, interaction) {
  const emojis = options.getString('emojis').split(' ');
  const names = options
    .getString('names')
    .split(',')
    .map((name) => name.trim());

  if (emojis.length !== names.length) {
    await sendErrorMessage(
      interaction,
      'The number of emojis and names must match.'
    );
    return;
  }

  const createdEmojis = [];
  const errors = [];

  for (let i = 0; i < emojis.length; i++) {
    try {
      const { imageBuffer, isAnimated } = await getEmojiImage(emojis[i]);
      const base64Image = imageBuffer.toString('base64');
      const createData = {
        name: names[i],
        image: `data:image/${isAnimated ? 'gif' : 'png'};base64,${base64Image}`,
      };

      const createdEmoji = await emojiManager.createEmoji(
        createData.name,
        createData.image
      );
      createdEmojis.push(
        `<${isAnimated ? 'a' : ''}:${createdEmoji.name}:${createdEmoji.id}>`
      );
    } catch (error) {
      console.error(`Error creating emoji ${emojis[i]}:`, error);
      errors.push(`${emojis[i]}: ${error.message}`);
    }
  }

  const embed = new EmbedBuilder()
    .setTitle('Emoji Creation Results')
    .setColor(createdEmojis.length > 0 ? '#00FF00' : '#FF0000')
    .setTimestamp();

  if (createdEmojis.length > 0) {
    embed.addFields({ name: 'Created Emojis', value: createdEmojis.join(' ') });
  }

  if (errors.length > 0) {
    embed.addFields({ name: 'Errors', value: errors.join('\n') });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleRemoveCommand(emojiManager, options, interaction) {
  const emojiId = options.getString('emoji-id');
  try {
    await emojiManager.removeEmoji(emojiId);
    const embed = new EmbedBuilder()
      .setTitle('Emoji Removed')
      .setDescription(`Successfully removed emoji with ID: ${emojiId}`)
      .setColor('#00FF00')
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await sendErrorMessage(
      interaction,
      `Failed to remove emoji: ${error.message}`
    );
  }
}

async function handleEditCommand(emojiManager, options, interaction) {
  const emojiId = options.getString('emoji-id');
  const newName = options.getString('new-name');
  try {
    const editedEmoji = await emojiManager.editEmoji(emojiId, newName);
    const embed = new EmbedBuilder()
      .setTitle('Emoji Edited')
      .setDescription(`Emoji name updated successfully to: ${editedEmoji.name}`)
      .setColor('#00FF00')
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await sendErrorMessage(
      interaction,
      `Failed to edit emoji: ${error.message}`
    );
  }
}

async function handleListCommand(emojiManager, interaction) {
  try {
    const emojisList = await emojiManager.listEmojis();

    if (emojisList.length > 0) {
      const chunkedEmojis = chunkArray(emojisList, 25);
      const embeds = chunkedEmojis.map((chunk, index) => {
        const emojiListMessage = chunk
          .map(
            (emoji) =>
              `<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}> \`${emoji.name}\` (ID: ${emoji.id})`
          )
          .join('\n');

        return new EmbedBuilder()
          .setTitle(`Application Emojis (Page ${index + 1})`)
          .setDescription(emojiListMessage)
          .setColor('#0099FF')
          .setTimestamp();
      });

      await interaction.editReply({ embeds });
    } else {
      const embed = new EmbedBuilder()
        .setTitle('Application Emojis')
        .setDescription('No emojis found for this application.')
        .setColor('#FFA500')
        .setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    await sendErrorMessage(
      interaction,
      `Failed to retrieve emoji list: ${error.message}`
    );
  }
}

async function getEmojiImage(emoji) {
  let imageBuffer;
  let isAnimated = false;

  if (emoji.startsWith('<:') || emoji.startsWith('<a:')) {
    isAnimated = emoji.startsWith('<a:');
    const emojiId = emoji.split(':')[2].slice(0, -1);
    const extension = isAnimated ? 'gif' : 'png';
    const url = `https://cdn.discordapp.com/emojis/${emojiId}.${extension}`;
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    imageBuffer = Buffer.from(response.data, 'binary');
  } else {
    const codePoint = emoji.codePointAt(0).toString(16);
    const url = `https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/${codePoint}.png`;
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    imageBuffer = Buffer.from(response.data, 'binary');
  }

  return { imageBuffer, isAnimated };
}

async function sendErrorMessage(interaction, message) {
  const embed = new EmbedBuilder()
    .setTitle('Error')
    .setDescription(message)
    .setColor('#FF0000')
    .setTimestamp();
  await interaction.editReply({ embeds: [embed] });
}

function chunkArray(array, size) {
  const chunked = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
}
