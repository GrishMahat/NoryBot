import {
  EmbedBuilder,
  SlashCommandBuilder,
  CommandInteraction,
  Client,
  AttachmentBuilder,
} from 'discord.js';
import { LocalCommand } from '../../types/index';
import DIG from 'discord-image-generation';

const ripCommand: LocalCommand = {
  data: new SlashCommandBuilder()
    .setName('rip')
    .setDescription("Create a memorial tombstone with a user's avatar")
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to memorialize')
        .setRequired(false)
    )
    .toJSON(),
  userPermissions: [],
  botPermissions: [],
  category: 'Image',
  cooldown: 15,
  nsfwMode: false,
  testMode: false,
  devOnly: false,

  run: async (client: Client, interaction: CommandInteraction) => {
    try {
      const targetUser =
        interaction.options.get('user')?.user || interaction.user; 

      // Start processing
      await interaction.deferReply();

      const avatarUrl = targetUser.displayAvatarURL({
        extension: 'png',
        forceStatic: true,
        size: 512,
      });

      // Generate the RIP image
      const img = await new DIG.Rip().getImage(avatarUrl);

      // Create an attachment
      const attachment = new AttachmentBuilder(img, { name: 'rip.png' });

      // Get the current year
      const currentYear = new Date().getFullYear();

      // Memorial messages for variety
      const memorials = [
        'Gone but not forgotten',
        'In loving memory',
        'Rest in peace',
        'Forever in our hearts',
        'Memories eternal',
      ];

      // Select a random memorial message
      const randomMemorial =
        memorials[Math.floor(Math.random() * memorials.length)];

      // Create the embed
      const embed = new EmbedBuilder()
        .setColor('#808080') // Gray color
        .setAuthor({
          name: 'Memorial Service',
          iconURL: client.user.displayAvatarURL(),
        })
        .setDescription(
          targetUser.id === interaction.user.id
            ? `🪦 Here lies **${interaction.user.username}**`
            : `🪦 **${interaction.user.username}** pays respects to **${targetUser.username}**`
        )
        .addFields(
          {
            name: '📅 Active',
            value: `Since ${currentYear}`,
            inline: true,
          },
          {
            name: '💐 Memorial',
            value: randomMemorial,
            inline: true,
          }
        )
        .setImage('attachment://rip.png')
        .setTimestamp()
        .setFooter({
          text: '🕯️ Press F to pay respects',
          iconURL: interaction.user.displayAvatarURL(),
        });

      await interaction.editReply({
        embeds: [embed],
        files: [attachment],
      });
    } catch (error) {
      console.error('Error while generating RIP image:', error);

      // Handle the error if the interaction is deferred
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('❌ Memorial Error')
              .setDescription(
                'Unable to create the memorial at this time. Please try again later.'
              )
              .setTimestamp(),
          ],
        });
      } else {
        // If the interaction is not deferred, send a reply
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF0000')
              .setTitle('❌ Memorial Error')
              .setDescription(
                'Unable to create the memorial at this time. Please try again later.'
              )
              .setTimestamp(),
          ],
          ephemeral: true,
        });
      }
    }
  },
};

export default ripCommand;
