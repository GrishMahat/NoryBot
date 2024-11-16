import {
  EmbedBuilder,
  SlashCommandBuilder,
  CommandInteraction,
  Client,
  AttachmentBuilder,
} from 'discord.js';
import DIG from 'discord-image-generation';

const admixCommand: LocalCommand = {
  data: new SlashCommandBuilder()
    .setName('admix')
    .setDescription("Apply a cool effect to someone's avatar")
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('User whose avatar you want to apply the effect to')
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

      const userOption =
        interaction.options.get('user')?.user || interaction.user;

      const avatarUrl = userOption.displayAvatarURL({
        extension: 'png',
        forceStatic: true,
        size: 512,
      });

      // Generate the Admix image
      const img = await new DIG.Ad().getImage(avatarUrl);

      // Create an attachment using AttachmentBuilder
      const attachment = new AttachmentBuilder(img, { name: 'admix.png' });

      // Create an informative and attractive embed
      const embed = new EmbedBuilder()
        .setColor('#1E90FF')
        .setAuthor({
          name: 'Admix Effect',
          iconURL: client.user.displayAvatarURL(),
        })
        .setDescription(
          userOption.id === interaction.user.id
            ? `🎨 **${interaction.user.username}** got an Admix effect!`
            : `🎨 **${interaction.user.username}** applied the Admix effect to **${userOption.username}**!`
        )
        .addFields(
          {
            name: '🎯 Target',
            value: `<@${userOption.id}>`,
            inline: true,
          },
          {
            name: '🖼️ Effect',
            value: 'Admix Effect',
            inline: true,
          }
        )
        .setImage('attachment://admix.png')
        .setTimestamp()
        .setFooter({
          text: `Requested by ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL(),
        });

      await interaction.editReply({
        embeds: [embed],
        files: [attachment],
      });
    } catch (error) {
      console.error('Error while generating Admix image:', error);

      // Ensure the error message is appropriately handled
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription(
          'Failed to generate the Admix image. Please try again later.'
        )
        .setTimestamp();

      // Ensure to handle the error properly
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          embeds: [errorEmbed],
        });
      } else {
        await interaction.reply({
          embeds: [errorEmbed],
          ephemeral: true,
        });
      }
    }
  },
};

export default admixCommand;
