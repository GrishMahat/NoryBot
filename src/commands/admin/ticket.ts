import {
  SlashCommandBuilder,
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  TextChannel,
  CategoryChannel,
  Role,
  GuildMember,
  ColorResolvable,
  PermissionResolvable,
} from 'discord.js';
import TicketSetupSchema, {
  ITicketSetup,
} from '../../schemas/ticketSetupSchema.js';

// Constants
const EMBED_COLORS = {
  SUCCESS: '#43B581' as ColorResolvable,
  ERROR: '#F04747' as ColorResolvable,
  INFO: '#7289DA' as ColorResolvable,
} as const;

const TICKET_TYPES = {
  MODAL: 'modal',
  SELECT: 'select',
} as const;

// Types
interface TicketSetupDocument extends ITicketSetup {
  updatedAt: Date;
  lastTicketNumber: number;
}

// Command Definition
const command: LocalCommand = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Advanced ticket system management for your server')
    // .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName('setup')
        .setDescription('Configure the ticket system with advanced options')
        .addChannelOption((option) =>
          option
            .setName('ticket-channel')
            .setDescription('Channel where users can create tickets')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addChannelOption((option) =>
          option
            .setName('category')
            .setDescription('Category where ticket channels will be created')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildCategory)
        )
        .addRoleOption((option) =>
          option
            .setName('staff-role')
            .setDescription('Role that can manage tickets')
            .setRequired(true)
        )
        .addChannelOption((option) =>
          option
            .setName('log-channel')
            .setDescription('Channel for ticket audit logs and transcripts')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText)
        )
        .addStringOption((option) =>
          option
            .setName('ticket-type')
            .setDescription('Select ticket creation method')
            .addChoices(
              { name: '📝 Modal Form', value: TICKET_TYPES.MODAL },
              { name: '📊 Select Menu', value: TICKET_TYPES.SELECT }
            )
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('update')
        .setDescription('Update the ticket system interface message')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove')
        .setDescription('Remove ticket system configuration')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('status')
        .setDescription('View current ticket system configuration')
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('add-option')
        .setDescription('Add a new ticket category option')
        .addStringOption((option) =>
          option
            .setName('label')
            .setDescription('Display name for the ticket option')
            .setRequired(true)
            .setMaxLength(100)
        )
        .addStringOption((option) =>
          option
            .setName('value')
            .setDescription('Unique identifier for the ticket option')
            .setRequired(true)
            .setMaxLength(50)
        )
        .addStringOption((option) =>
          option
            .setName('description')
            .setDescription('Detailed description of the ticket category')
            .setRequired(true)
            .setMaxLength(200)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('remove-option')
        .setDescription('Remove an existing ticket category option')
        .addStringOption((option) =>
          option
            .setName('value')
            .setDescription('Unique identifier of the option to remove')
            .setRequired(true)
        )
    )
    .toJSON(),
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [],
  category: 'Admin',
  cooldown: 15,
  devOnly: false,
  testMode: false,
  deleted: false,
  nsfwMode: false,

  async run(client, interaction: ChatInputCommandInteraction) {
    try {
      const subcommand = interaction.options.getSubcommand(true);
      const member = interaction.member as GuildMember;

      // Verify administrator permissions
      if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
        throw new Error(
          'You need Administrator permissions to manage the ticket system.'
        );
      }

      // Map subcommands to their handlers
      const handlers = {
        setup: handleSetup,
        update: handleUpdate,
        remove: handleRemove,
        status: handleStatus,
        'add-option': handleAddOption,
        'remove-option': handleRemoveOption,
      } as const;

      await handlers[subcommand](interaction);
    } catch (err) {
      const error = err as Error;
      console.error(`Error executing ticket command: ${error.message}`, error);

      // Send error response
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(EMBED_COLORS.ERROR)
            .setTitle('❌ Error')
            .setDescription(`Failed to execute command: ${error.message}`)
            .setTimestamp(),
        ],
        ephemeral: true,
      });
    }
  },
};

async function handleSetup(interaction: ChatInputCommandInteraction) {
  // Get command options
  const ticketChannel = interaction.options.getChannel(
    'ticket-channel'
  ) as TextChannel;
  const category = interaction.options.getChannel(
    'category'
  ) as CategoryChannel;
  const staffRole = interaction.options.getRole('staff-role') as Role;
  const logChannel = interaction.options.getChannel(
    'log-channel'
  ) as TextChannel;
  const ticketType = interaction.options.getString('ticket-type');

  try {
    // Validate channel permissions
    const botMember = interaction.guild.members.me;
    const requiredPermissions = [
      'ViewChannel',
      'SendMessages',
      'ManageChannels',
      'ManageRoles',
    ] as const;

    const missingPermissions = requiredPermissions.filter(
      (perm) =>
        !ticketChannel
          .permissionsFor(botMember)
          .has(perm as PermissionResolvable)
    );

    if (missingPermissions.length > 0) {
      throw new Error(
        `Missing required permissions in ticket channel: ${missingPermissions.join(', ')}`
      );
    }

    // Get existing setup or create new
    const existingSetup = (await TicketSetupSchema.findOne({
      guildID: interaction.guildId,
    })) as TicketSetupDocument;

    const setupData = {
      guildID: interaction.guildId,
      ticketChannelID: ticketChannel.id,
      categoryID: category.id,
      staffRoleID: staffRole.id,
      logChannelID: logChannel.id,
      ticketType,
      customOptions: existingSetup?.customOptions || [],
      messageID: existingSetup?.messageID || '',
      lastTicketNumber: existingSetup?.lastTicketNumber || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Update or create setup document
    const setup = existingSetup
      ? await TicketSetupSchema.findOneAndUpdate(
          { guildID: interaction.guildId },
          setupData,
          { new: true }
        )
      : await TicketSetupSchema.create(setupData);

    // Build response embed
    const embed = new EmbedBuilder()
      .setTitle('🎫 Ticket System Setup')
      .setDescription(
        `Successfully ${existingSetup ? 'updated' : 'configured'} the ticket system!`
      )
      .addFields([
        {
          name: '📬 Ticket Channel',
          value: `<#${ticketChannel.id}>`,
          inline: true,
        },
        {
          name: '📁 Category',
          value: category.name,
          inline: true,
        },
        {
          name: '👥 Staff Role',
          value: `<@&${staffRole.id}>`,
          inline: true,
        },
        {
          name: '📝 Log Channel',
          value: `<#${logChannel.id}>`,
          inline: true,
        },
        {
          name: '⚙️ Ticket Type',
          value:
            ticketType === TICKET_TYPES.MODAL ? 'Modal Form' : 'Select Menu',
          inline: true,
        },
      ])
      .setColor(EMBED_COLORS.SUCCESS)
      .setFooter({
        text: `Setup ID: ${setup._id}`,
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (err) {
    const error = err as Error;
    throw new Error(`Failed to setup ticket system: ${error.message}`);
  }
}

async function handleUpdate(interaction: ChatInputCommandInteraction) {
  try {
    const setup = (await TicketSetupSchema.findOne({
      guildID: interaction.guildId,
    })) as TicketSetupDocument;

    if (!setup) {
      throw new Error('No ticket system configuration found for this server');
    }

    // Update ticket message logic here
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(EMBED_COLORS.SUCCESS)
          .setTitle('🔄 Ticket System Updated')
          .setDescription('The ticket system message has been refreshed.')
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  } catch (err) {
    const error = err as Error;
    throw new Error(`Failed to update ticket message: ${error.message}`);
  }
}

async function handleRemove(interaction: ChatInputCommandInteraction) {
  try {
    const result = await TicketSetupSchema.findOneAndDelete({
      guildID: interaction.guildId,
    });

    if (!result) {
      throw new Error('No ticket system configuration found');
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(EMBED_COLORS.SUCCESS)
          .setTitle('🗑️ Ticket System Removed')
          .setDescription(
            'Successfully removed the ticket system configuration.'
          )
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  } catch (err) {
    const error = err as Error;
    throw new Error(`Failed to remove ticket system: ${error.message}`);
  }
}

async function handleStatus(interaction: ChatInputCommandInteraction) {
  try {
    const setup = await TicketSetupSchema.findOne({
      guildID: interaction.guildId,
    });

    if (!setup) {
      throw new Error('No ticket system configuration found');
    }

    const embed = new EmbedBuilder()
      .setTitle('📊 Ticket System Status')
      .addFields([
        {
          name: '📬 Ticket Channel',
          value: `<#${setup.ticketChannelID}>`,
          inline: true,
        },
        {
          name: '📁 Category',
          value: `<#${setup.categoryID}>`,
          inline: true,
        },
        {
          name: '👥 Staff Role',
          value: `<@&${setup.staffRoleID}>`,
          inline: true,
        },
        {
          name: '📝 Log Channel',
          value: `<#${setup.logChannelID}>`,
          inline: true,
        },
        {
          name: '⚙️ Ticket Type',
          value:
            setup.ticketType === TICKET_TYPES.MODAL
              ? 'Modal Form'
              : 'Select Menu',
          inline: true,
        },
        {
          name: '📋 Custom Options',
          value:
            setup.customOptions.length > 0
              ? setup.customOptions
                  .map((opt) => `• ${opt.label} (\`${opt.value}\`)`)
                  .join('\n')
              : 'No custom options configured',
        },
      ])
      .setColor(EMBED_COLORS.INFO)
      .setFooter({
        text: `Last Updated: ${new Date().toLocaleString()}`,
      })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (err) {
    const error = err as Error;
    throw new Error(`Failed to get ticket system status: ${error.message}`);
  }
}

async function handleAddOption(interaction: ChatInputCommandInteraction) {
  const label = interaction.options.getString('label');
  const value = interaction.options.getString('value');
  const description = interaction.options.getString('description');

  try {
    const setup = (await TicketSetupSchema.findOne({
      guildID: interaction.guildId,
    })) as TicketSetupDocument;

    if (!setup) {
      throw new Error('No ticket system configuration found');
    }

    if (setup.customOptions.length >= 25) {
      throw new Error('Maximum number of custom options (25) reached');
    }

    if (setup.customOptions.some((opt) => opt.value === value)) {
      throw new Error('An option with this value already exists');
    }

    setup.customOptions.push({ label, value, description });
    setup.updatedAt = new Date();
    await setup.save();

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(EMBED_COLORS.SUCCESS)
          .setTitle('✅ Option Added')
          .setDescription(`Successfully added new ticket option: ${label}`)
          .addFields([
            { name: 'Label', value: label, inline: true },
            { name: 'Value', value: value, inline: true },
            { name: 'Description', value: description },
          ])
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  } catch (err) {
    const error = err as Error;
    throw new Error(`Failed to add ticket option: ${error.message}`);
  }
}

async function handleRemoveOption(interaction: ChatInputCommandInteraction) {
  const value = interaction.options.getString('value');

  try {
    const setup = (await TicketSetupSchema.findOne({
      guildID: interaction.guildId,
    })) as TicketSetupDocument;

    if (!setup) {
      throw new Error('No ticket system configuration found');
    }

    const optionIndex = setup.customOptions.findIndex(
      (opt) => opt.value === value
    );
    if (optionIndex === -1) {
      throw new Error('No option found with this value');
    }

    const removedOption = setup.customOptions[optionIndex];
    setup.customOptions.splice(optionIndex, 1);
    setup.updatedAt = new Date();
    await setup.save();

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(EMBED_COLORS.SUCCESS)
          .setTitle('🗑️ Option Removed')
          .setDescription(
            `Successfully removed ticket option: ${removedOption.label}`
          )
          .addFields([
            { name: 'Label', value: removedOption.label, inline: true },
            { name: 'Value', value: removedOption.value, inline: true },
          ])
          .setTimestamp(),
      ],
      ephemeral: true,
    });
  } catch (err) {
    const error = err as Error;
    throw new Error(`Failed to remove ticket option: ${error.message}`);
  }
}

export default command;
