
import {
  ContextMenuCommandBuilder,
  ApplicationCommandType,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

import mConfig from '../config/messageConfig.json' with { type: "json" };
import moderationSchema from '../schemas/moderation.js';

export default {
  data: new ContextMenuCommandBuilder()
    .setName("Moderate User")
    .setType(ApplicationCommandType.User),
  userPermissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [],

  run: async (client, interaction) => {
    try {
      const { targetMember, guildId, member } = interaction;
      const rEmbed = new EmbedBuilder()
        .setColor("FFFFFF")
        .setFooter({ text: `${client.user.username} - Moderate user` });

      let data = await moderationSchema.findOne({ GuildID: guildId });
      if (!data) {
        rEmbed
          .setColor(mConfig.embedColorError)
          .setDescription(
            `\`❌\` This server isn't configured yet.\n\n\`💡\` Use \`/moderatesystem configure\` to start configuring this server.`
          );
        return interaction.reply({ embeds: [rEmbed], ephemeral: true });
      }

      if (targetMember.id === member.id) {
        rEmbed
          .setColor(mConfig.embedColorError)
          .setDescription(`${mConfig.unableToInteractWithYourself}`);
        return interaction.replay({ embeds: [rEmbed], ephemeral: true });
      }

      if (
        targetMember.roles.highest.position >= member.roles.highest.position
      ) {
        rEmbed
          .setColor(mConfig.embedColorError)
          .setDescription(`${mConfig.hasHigherRolePosition}`);
        return interaction.replay({ embeds: [rEmbed], ephemeral: true });
      }

      const moderationButtons = new ActionRowBuilder().setComponents(
        new ButtonBuilder()
          .setCustomId("banBtn")
          .setLabel("Server ban")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("kickBtn")
          .setLabel("Server kick")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("cancelBtn")
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Secondary)
      );

      rEmbed
        .setAuthor({
          name: `${targetMember.user.username}`,
          iconURL: `${targetMember.user.displayAvatarURL({ dynamic: true })}`,
        })
        .setDescription(
          `\`❔\` What action do you want to use against ${targetMember.user.username} ?`
        );

      interaction.reply({ embeds: [rEmbed], components: [moderationButtons] });
    } catch (error) {
      console.log(error);
    }
  },
};
