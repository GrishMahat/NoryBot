import {
  EmbedBuilder,
  SlashCommandBuilder,
  CommandInteraction,
  Client,
  AttachmentBuilder,
} from 'discord.js';
import DIG from 'discord-image-generation';

const batslapCommand: LocalCommand = {
  data: new SlashCommandBuilder()
    .setName('batslap')
    .setDescription('Generate a batslap image with two users')
    .addUserOption((option) =>
      option
        .setName('target')
        .setDescription('The user who gets slapped')
        .setRequired(true)
    )
    .addUserOption((option) =>
      option
        .setName('slapper')
        .setDescription('The user who does the slapping (defaults to you)')
        .setRequired(false)
    )
    .setContexts([0, 1, 2])
    .setIntegrationTypes([0, 1])
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
      await interaction.deferReply();

      const targetUser = interaction.options.get('target').user;
      const slapperUser =
        interaction.options.get('slapper')?.user || interaction.user;

      if (!targetUser) {
        return;
      }

      const targetAvatar = targetUser.displayAvatarURL({
        extension: 'png',
        forceStatic: true,
        size: 512,
      });

      const slapperAvatar = slapperUser.displayAvatarURL({
        extension: 'png',
        forceStatic: true,
        size: 512,
      });

      // Generate the Batslap image
      const img = await new DIG.Batslap().getImage(slapperAvatar, targetAvatar);

      // Create an attachment using AttachmentBuilder
      const attachment = new AttachmentBuilder(img, { name: 'batslap.png' });

      // Create an informative and attractive embed
      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setAuthor({
          name: 'BAT SLAP! 👋',
          iconURL: client.user.displayAvatarURL(),
        })
        .setDescription(
          `💥 **${slapperUser.username}** just bat-slapped **${targetUser.username}**!`
        )
        .addFields(
          {
            name: '🦇 Slapper',
            value: `<@${slapperUser.id}>`,
            inline: true,
          },
          {
            name: '😵 Target',
            value: `<@${targetUser.id}>`,
            inline: true,
          }
        )
        .setImage('attachment://batslap.png')
        .setTimestamp()
        .setFooter({
          text: `POW! BAM! SLAP! 💫`,
          iconURL: interaction.user.displayAvatarURL(),
        });

      await interaction.editReply({
        embeds: [embed],
        files: [attachment],
      });
    } catch (error) {
      console.error('Error while generating Batslap image:', error);

      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription(
          'Failed to generate the batslap image. Please make sure you mentioned a valid user and try again.'
        )
        .setTimestamp();

      await interaction.editReply({
        embeds: [errorEmbed],
      });
    }
  },
};

export default batslapCommand;
