import {
  EmbedBuilder,
  SlashCommandBuilder,
  CommandInteraction,
  Client,
  AttachmentBuilder,
} from 'discord.js';
import { LocalCommand } from '../../types/index';
import DIG from 'discord-image-generation';

const wantedCommand: LocalCommand = {
  data: new SlashCommandBuilder()
    .setName('wanted')
    .setDescription("Create a wanted poster with someone's avatar")
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to put on the wanted poster')
        .setRequired(false)
    )
    .addNumberOption((option) =>
      option
        .setName('currency')
        .setDescription('The reward amount (default: 1000)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(1000000)
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

      const targetUser = 
        interaction.options.get('user')?.user || interaction.user;
      const currency = interaction.options.get('currency')?.value || 1000;

      const avatarUrl = targetUser.displayAvatarURL({
        extension: 'png',
        forceStatic: true,
        size: 512,
      });

      // Generate the Wanted image
      const img = await new DIG.Wanted().getImage(avatarUrl, currency.toString());

      // Create an attachment
      const attachment = new AttachmentBuilder(img, { name: 'wanted.png' });

      const embed = new EmbedBuilder()
        .setColor('#8B0000')
        .setAuthor({
          name: 'WANTED: DEAD OR ALIVE',
          iconURL: client.user.displayAvatarURL(),
        })
        .setDescription(
          `🤠 **WANTED:** ${targetUser.toString()}\n💰 **Reward:** $${currency.toLocaleString()}`
        )
        .setImage('attachment://wanted.png')
        .setTimestamp()
        .setFooter({
          text: `Posted by Sheriff ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL(),
        });

      await interaction.editReply({
        embeds: [embed],
        files: [attachment],
      });
    } catch (error) {
      console.error('Error generating wanted poster:', error);

      const errorEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('❌ Error')
        .setDescription('Failed to generate the wanted poster. Please try again later.')
        .setTimestamp();

      await interaction.editReply({
        embeds: [errorEmbed],
      });
    }
  },
};

export default wantedCommand; 