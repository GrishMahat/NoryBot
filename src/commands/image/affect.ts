import {
  EmbedBuilder,
  SlashCommandBuilder,
  CommandInteraction,
  Client,
  AttachmentBuilder,
} from 'discord.js';
import DIG from 'discord-image-generation';

const affectCommand: LocalCommand = {
  data: new SlashCommandBuilder()
    .setName('affect')
    .setDescription(
      "Use the 'This won't affect my baby' meme template with a user's avatar"
    )
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to put in the affect meme')
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

      // Retrieve the target user, default to the interaction user
      const targetUser =
        interaction.options.get('user')?.user || interaction.user;

      const avatarUrl = targetUser.displayAvatarURL({
        extension: 'png',
        forceStatic: true,
        size: 512,
      });

      // Generate the Affect meme image
      const img = await new DIG.Affect().getImage(avatarUrl);

      // Create an attachment for the generated image
      const attachment = new AttachmentBuilder(img, { name: 'affect.png' });

      // Construct the embed message
      const embed = new EmbedBuilder()
        .setColor('#9B59B6') // Purple color for aesthetic
        .setAuthor({
          name: 'The Baby Effect',
          iconURL: client.user.displayAvatarURL(),
        })
        .setDescription(
          targetUser.id === interaction.user.id
            ? `🍼 **${interaction.user.username}** got affected!`
            : `🍼 **${interaction.user.username}** shows how **${targetUser.username}** was affected!`
        )
        .addFields({
          name: '👶 Subject',
          value: `<@${targetUser.id}>`,
          inline: true,
        })
        .setImage('attachment://affect.png')
        .setTimestamp()
        .setFooter({
          text: `12 years later... | Created by ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL(),
        });

      // Send the embed and attachment as a reply
      await interaction.editReply({
        embeds: [embed],
        files: [attachment],
      });
    } catch (error) {
      console.error('Error while generating Affect image:', error);

      // Handle error gracefully
      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000') // Red color for errors
        .setTitle('❌ Error')
        .setDescription(
          'Failed to generate the affect meme. Please try again later.'
        )
        .setTimestamp();

      // Send the error message
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

export default affectCommand;
