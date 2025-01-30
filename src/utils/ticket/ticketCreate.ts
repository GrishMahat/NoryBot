/** @format */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  CategoryChannel,
  TextChannel,
  Guild,
  Role,
  GuildMember,
  OverwriteResolvable,
} from 'discord.js';
import ticketSchema from '../../schemas/ticketSchema.js';
import ticketSetupSchema from '../../schemas/ticketSetupSchema.js';

// Ticket status constants to avoid magic strings
const TICKET_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
  LOCKED: 'locked',
} as const;

// Rate limiting constants
const RATE_LIMIT = {
  MAX_TICKETS_PER_HOUR: 3,
  COOLDOWN_MS: 60 * 60 * 1000, // 1 hour
} as const;

function createTicketEmbed(
  username: string,
  userAvatarURL: string,
  subject: string,
  description: string,
  previousTicketsField: string,
  guild: Guild
) {
  return new EmbedBuilder()
    .setColor('#9861FF')
    .setAuthor({
      name: username,
      iconURL: userAvatarURL,
    })
    .setDescription(`**Subject:** ${subject}\n**Description:** ${description}`)
    .addFields({ name: 'Previous Tickets', value: previousTicketsField })
    .setFooter({
      text: `${guild.name} - Ticket`,
      iconURL: guild.iconURL(),
    })
    .setTimestamp();
}

function createTicketButtons() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('claimTicketBtn')
      .setLabel('Claim Ticket')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('closeTicketBtn')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('lockTicketBtn')
      .setLabel('Lock Ticket')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('requestUserInfoBtn')
      .setLabel('Request User Info')
      .setStyle(ButtonStyle.Secondary)
  );
}

function getChannelPermissions(
  guild: Guild,
  member: GuildMember,
  staffRole: Role
): OverwriteResolvable[] {
  return [
    {
      id: guild.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: member.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
    },
    {
      id: staffRole.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.SendMessages,
      ],
    },
  ];
}

// Utility function to check rate limits
async function checkRateLimit(guildId: string, memberId: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - RATE_LIMIT.COOLDOWN_MS);
  
  const recentTickets = await ticketSchema.countDocuments({
    guildID: guildId,
    ticketMemberID: memberId,
    createdAt: { $gte: oneHourAgo }
  });

  return recentTickets >= RATE_LIMIT.MAX_TICKETS_PER_HOUR;
}

// Utility function to validate parent ticket
async function validateParentTicket(parentChannelId: string | undefined, guildId: string): Promise<boolean> {
  if (!parentChannelId) return true;
  
  const parentTicket = await ticketSchema.findOne({
    guildID: guildId,
    ticketChannelID: parentChannelId
  });

  return !!parentTicket;
}

// Utility function to generate next ticket number using transactions
async function getNextTicketNumber(guildId: string): Promise<number> {
  const session = await ticketSchema.startSession();
  let ticketNumber = 1;
  
  await session.withTransaction(async () => {
    const lastTicket = await ticketSchema
      .findOne({ guildID: guildId })
      .sort({ createdAt: -1 })
      .session(session);
    
    if (lastTicket) {
      ticketNumber = parseInt(lastTicket.ticketChannelID.split('-')[1]) + 1;
    }
  });
  
  await session.endSession();
  return ticketNumber;
}

export async function createTicket(
  guild: Guild,
  member: GuildMember,
  staffRole: Role,
  category: CategoryChannel,
  subject: string = 'No subject provided',
  description: string = 'No description provided',
  parentChannelId?: string
): Promise<{
  success: boolean;
  message: string;
  ticketChannel?: TextChannel;
}> {
  try {
    // Check rate limits
    const isRateLimited = await checkRateLimit(guild.id, member.id);
    if (isRateLimited) {
      return {
        success: false,
        message: `You're creating tickets too quickly. Please wait before creating another ticket.`,
      };
    }

    // Validate parent channel if provided
    if (parentChannelId && !(await validateParentTicket(parentChannelId, guild.id))) {
      return {
        success: false,
        message: 'Invalid parent ticket reference.',
      };
    }

    const username = member.user.username;

    // Check for existing open tickets
    const existingTicket = await ticketSchema.findOne({
      guildID: guild.id,
      ticketMemberID: member.id,
      status: TICKET_STATUS.OPEN,
    });

    if (existingTicket) {
      return {
        success: false,
        message: `You already have an open ticket! <#${existingTicket.ticketChannelID}>`,
      };
    }

    // Get previous tickets with more detailed history
    const closedTickets = await ticketSchema
      .find({
        guildID: guild.id,
        ticketMemberID: member.id,
        status: { $in: [TICKET_STATUS.CLOSED, TICKET_STATUS.LOCKED] }
      })
      .sort({ updatedAt: -1 })
      .limit(3)
      .select('claimedBy closeReason status actionLog updatedAt');

    let previousTicketsField = 'No previous tickets';
    if (closedTickets.length > 0) {
      previousTicketsField = closedTickets
        .map((ticket, index) => {
          const claimedBy = ticket.claimedBy
            ? `<@${ticket.claimedBy}>`
            : 'Unclaimed';
          const closeReason = ticket.closeReason || 'No reason provided';
          const lastAction = ticket.actionLog[ticket.actionLog.length - 1] || 'No actions recorded';
          return `Ticket ${index + 1}:\n- Status: ${ticket.status}\n- Claimed by: ${claimedBy}\n- Close reason: ${closeReason}\n- Last action: ${lastAction}`;
        })
        .join('\n\n');
    }

    // Get next ticket number using atomic operation
    const ticketNumber = await getNextTicketNumber(guild.id);

    // Check category channel limit
    if (category.children.cache.size >= 50) {
      return {
        success: false,
        message: 'Cannot create ticket: Category channel limit reached. Please contact an administrator.',
      };
    }

    // Create ticket channel with error handling
    let ticketChannel: TextChannel;
    try {
      ticketChannel = await guild.channels.create({
        name: `ticket-${ticketNumber}`,
        type: ChannelType.GuildText,
        parent: category.id,
        permissionOverwrites: getChannelPermissions(guild, member, staffRole),
      });
    } catch (channelError) {
      console.error('Error creating ticket channel:', channelError);
      return {
        success: false,
        message: (channelError as { code?: number })?.code === 30013
          ? 'Channel limit reached for this server.'
          : 'Failed to create ticket channel. Please check channel permissions.',
      };
    }

    const ticketEmbed = createTicketEmbed(
      username,
      member.user.displayAvatarURL(),
      subject,
      description,
      previousTicketsField,
      guild
    );

    const ticketButtons = createTicketButtons();

    await ticketChannel.send({
      content: `${staffRole} - Ticket created by ${username}`,
      embeds: [ticketEmbed],
      components: [ticketButtons],
    });

    // Create and save ticket in database
    const newTicket = new ticketSchema({
      guildID: guild.id,
      ticketMemberID: member.id,
      ticketChannelID: ticketChannel.id,
      parentTicketChannelID: parentChannelId || null,
      subject,
      description,
      membersAdded: [],
      claimedBy: null,
      status: TICKET_STATUS.OPEN,
      actionLog: [`Ticket created by ${member.user.tag}`],
      closeReason: '',
    });

    await newTicket.save();

    return {
      success: true,
      message: `Your ticket has been created in ${ticketChannel}`,
      ticketChannel,
    };
  } catch (error) {
    console.error('Error creating ticket:', error);
    const errorMessage = (error as { code?: string })?.code === 'ETIMEDOUT'
      ? 'Database connection timeout. Please try again.'
      : 'There was an error creating your ticket. Please try again later.';
    
    return {
      success: false,
      message: errorMessage,
    };
  }
}
