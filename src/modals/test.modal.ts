import {
  Client,
  ModalSubmitInteraction,
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
  ModalBuilder,
} from 'discord.js';
import { Modal } from '../types/index.js';

const modal: Modal = {
  customId: 'test',
  cooldown: 5, // 5 seconds cooldown
  devOnly: false,
  testMode: false,

  // Example permissions (adjust as needed)
  userPermissions: ['SendMessages'],
  botPermissions: ['SendMessages'],

  async run(client: Client, interaction: ModalSubmitInteraction) {
    // Get the values of the modal inputs
    const favoriteColor =
      interaction.fields.getTextInputValue('favoriteColorInput');
    const hobbies = interaction.fields.getTextInputValue('hobbiesInput');

    // Respond to the interaction
    await interaction.reply({
      content: `Your favorite color is ${favoriteColor} and your hobbies are: ${hobbies}`,
      ephemeral: true,
    });
  },
};

export default modal;
