/** @format */

import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import Image from '../../schemas/image.js';
import mconfig from "../../config/messageConfig.json" assert { type: 'json' };
import mongoose from 'mongoose';

export default {
  data: new SlashCommandBuilder()
      .setName('face')
      .setDescription('Manage face images.')
      .addSubcommand((subcommand) =>
          subcommand
              .setName('add')
              .setDescription('Add a new face image.')
              .addStringOption((option) =>
                  option
                      .setName('image-url')
                      .setDescription('The URL of the image.')
                      .setRequired(true)
              )
              .addUserOption((option) =>
                  option
                      .setName('user')
                      .setDescription('The user whose image you are adding.')
                      .setRequired(true)
              )
      )
      .addSubcommand((subcommand) =>
          subcommand
              .setName('show')
              .setDescription('Show a user\'s face image.')
              .addUserOption((option) =>
                  option
                      .setName('user')
                      .setDescription('The user whose image you want to see.')
                      .setRequired(true)
              )
      )
      .toJSON(),
  userPermissions: [],
  botPermissions: [],
  nsfwMode: false,
  testMode: false,
  devOnly: false,

  run: async (client, interaction) => {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      await handleAddCommand(client, interaction);
    } else if (subcommand === 'show') {
      await handleShowCommand(client, interaction);
    }
  },
};

const handleAddCommand = async (client, interaction) => {
  const imageUrl = interaction.options.getString('image-url');
  const targetUser = interaction.options.getUser('user');
  const userId = targetUser.id;
  const userTag = targetUser.tag;
  const addedBy = interaction.user.id;

  const newImage = new Image({
    imageUrl,
    userId,
    userTag,
    addedBy,
    approved: false,  // Assuming you have an approved field in your schema
  });

  await newImage.save();

  const adminUserId = '598554287244574731'; // Replace with the actual admin user ID
  const adminUser = await client.users.fetch(adminUserId);

  const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
          .setCustomId(`approve_${newImage._id}`)
          .setLabel('Approve')
          .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
          .setCustomId(`reject_${newImage._id}`)
          .setLabel('Reject')
          .setStyle(ButtonStyle.Danger)
  );

  const embed = new EmbedBuilder()
      .setTitle('New Face Image Submission')
      .setDescription(`A new image has been submitted by ${interaction.user.tag} for ${userTag}. Please review it.`)
      .setImage(imageUrl)
      .setColor(mconfig.embedColorWarning)
      .setTimestamp();

  await adminUser.send({
    content: 'A new image has been submitted for approval.',
    embeds: [embed],
    components: [row],
  });

  await interaction.reply({
    content: 'The image has been submitted for approval.',
    ephemeral: true,
  });
};

const handleShowCommand = async (client, interaction) => {
  const user = interaction.options.getUser('user');

  const image = await Image.findOne({ userId: user.id, approved: true });

  if (!image) {
    return interaction.reply({
      content: 'This user does not have an approved image.',
      ephemeral: true,
    });
  }

  const addedByUser = await client.users.fetch(image.addedBy);

  const embed = new EmbedBuilder()
      .setTitle(`Face Image for ${user.tag}`)
      .setImage(image.imageUrl)
      .setColor(mconfig.embedColorSuccess)
      .setTimestamp()
      .setFooter({
        text: `Added by ${addedByUser.username}`,
        iconURL: addedByUser.displayAvatarURL({ dynamic: true }),
      })
      .addFields(
          {
            name: "Added At",
            value: new Date(image.addedAt).toLocaleString(),
            inline: true
          },
          {
            name: "Added By",
            value: addedByUser.tag,
            inline: true
          }
      );

  await interaction.reply({
    embeds: [embed],
  });
};

