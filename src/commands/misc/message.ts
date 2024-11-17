import {
  SlashCommandBuilder,
  CommandInteraction,
  Client,
  ChannelType,
  EmbedBuilder,
  TextChannel,
  PermissionFlagsBits,
  ChatInputCommandInteraction,
  CacheType,
  ColorResolvable,
  Channel,
} from 'discord.js';
import { LocalCommand } from '../../types/index';

type MessageType = 'normal' | 'embed' | 'announcement';

interface MessageOptions {
  channelId: string;
  content: string;
  type: MessageType;
  anonymous: boolean;
}

const messageCommand: LocalCommand = {
  data: new SlashCommandBuilder()
    .setName('message')
    .setDescription('Send a message to a specific channel')
    .addStringOption((option) =>
      option
        .setName('channel_id')
        .setDescription('The ID of the channel to send the message to')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('content')
        .setDescription('The message content to send')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('type')
        .setDescription('How to display the message')
        .addChoices(
          { name: 'Normal', value: 'normal' },
          { name: 'Embed', value: 'embed' },
          { name: 'Announcement', value: 'announcement' }
        )
    )
    .addBooleanOption((option) =>
      option
        .setName('anonymous')
        .setDescription('Send the message anonymously (hides sender)')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .toJSON(),

  category: 'Moderation',
  cooldown: 5,
  nsfwMode: false,
  testMode: false,
  devOnly: true,

  run: async (
    client: Client<boolean>,
    interaction: ChatInputCommandInteraction<CacheType>
  ): Promise<void> => {
    try {
      await interaction.deferReply({ ephemeral: true });

      const options: MessageOptions = {
        channelId: interaction.options.get('channel_id')?.value as string,
        content: interaction.options.get('content')?.value as string,
        type: (interaction.options.get('type')?.value ||
          'normal') as MessageType,
        anonymous:
          (interaction.options.get('anonymous')?.value as boolean) || false,
      };

      // Validate that required options are present
      if (!options.channelId || !options.content) {
        await interaction.editReply({
          content: '❌ Required options are missing.',
        });
        return;
      }

      // Validate and get the target channel
      const targetChannel = await validateAndGetChannel(
        interaction,
        options.channelId
      );
      if (!targetChannel) {
        await interaction.editReply({
          content: '❌ Invalid channel ID or channel not found.',
        });
        return;
      }

      // Check bot permissions in the target channel
      if (!(await checkBotPermissions(interaction, targetChannel))) {
        await interaction.editReply({
          content:
            "❌ I don't have permission to send messages in that channel.",
        });
        return;
      }

      // Send the message
      const sentMessage = await sendMessage(
        interaction,
        targetChannel,
        options
      );
      if (!sentMessage) {
        await interaction.editReply({
          content: '❌ Failed to send the message. Please try again.',
        });
        return;
      }

      // Send success response
      await sendSuccessResponse(
        interaction,
        targetChannel,
        options,
        sentMessage.url
      );

      // Log the action
      logMessageAction(interaction, targetChannel, options);
    } catch (error) {
      console.error('Error in message command:', error);
      await interaction.editReply({
        content:
          '❌ An error occurred while sending the message. Please try again later.',
      });
    }
  },
};

async function validateAndGetChannel(
  interaction: ChatInputCommandInteraction,
  channelId: string
): Promise<TextChannel | null> {
  try {
    const channel = await interaction.guild?.channels.fetch(channelId);
    if (channel?.type !== ChannelType.GuildText) return null;
    return channel as TextChannel;
  } catch {
    return null;
  }
}

async function checkBotPermissions(
  interaction: ChatInputCommandInteraction,
  channel: TextChannel
): Promise<boolean> {
  const botMember = await interaction.guild?.members.fetchMe();
  const permissions = channel.permissionsFor(botMember);
  return (
    permissions?.has(['SendMessages', 'ViewChannel', 'EmbedLinks']) ?? false
  );
}

async function sendMessage(
  interaction: ChatInputCommandInteraction,
  channel: TextChannel,
  options: MessageOptions
) {
  const { content, type, anonymous } = options;

  switch (type) {
    case 'embed': {
      const embed = createEmbed(
        content,
        'Blue',
        anonymous ? undefined : interaction.user
      );
      return await channel.send({ embeds: [embed] });
    }

    case 'announcement': {
      const embed = createEmbed(
        content,
        'Red',
        anonymous ? undefined : interaction.user,
        '📢 Announcement'
      );
      return await channel.send({
        content: '@everyone',
        embeds: [embed],
        allowedMentions: { parse: ['everyone'] },
      });
    }

    default: {
      const messageContent = anonymous
        ? content
        : `${content}\n\n- Sent by ${interaction.user}`;
      return await channel.send({
        content: messageContent,
        allowedMentions: { parse: ['users', 'roles'] },
      });
    }
  }
}

function createEmbed(
  content: string,
  color: ColorResolvable,
  user?: { tag: string; displayAvatarURL: () => string },
  title?: string
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setDescription(content)
    .setColor(color)
    .setTimestamp();

  if (title) embed.setTitle(title);

  if (user) {
    embed.setFooter({
      text: `${title ? 'Announced' : 'Sent'} by ${user.tag}`,
      iconURL: user.displayAvatarURL(),
    });
  }

  return embed;
}

async function sendSuccessResponse(
  interaction: ChatInputCommandInteraction,
  channel: TextChannel,
  options: MessageOptions,
  messageUrl: string
): Promise<void> {
  const responseEmbed = new EmbedBuilder()
    .setTitle('✅ Message Sent Successfully')
    .setColor('Green')
    .addFields(
      { name: 'Channel', value: `${channel}`, inline: true },
      {
        name: 'Type',
        value: options.type.charAt(0).toUpperCase() + options.type.slice(1),
        inline: true,
      },
      {
        name: 'Anonymous',
        value: options.anonymous ? 'Yes' : 'No',
        inline: true,
      },
      { name: 'Jump to Message', value: `[Click Here](${messageUrl})` }
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [responseEmbed] });
}

function logMessageAction(
  interaction: ChatInputCommandInteraction,
  channel: TextChannel,
  options: MessageOptions
): void {
  console.log(
    `Message sent by ${interaction.user.tag} to #${channel.name} (${
      options.type
    }${options.anonymous ? ', anonymous' : ''})`
  );
}

export default messageCommand;
