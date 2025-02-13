import { Client, ModalSubmitInteraction, MessageFlags } from 'discord.js';
import { Modal } from '../types/index.js';

const modal: Modal = {
  customId: 'test-modal',
  cooldown: 5, // 5 seconds cooldown
  devOnly: false,
  testMode: false,

  async run(client: Client, interaction: ModalSubmitInteraction) {
    // Get the value from the test input
    const testInput = interaction.fields.getTextInputValue('test-input');

    // Respond to the interaction
    await interaction.reply({
      content: `You entered: ${testInput}`,
      flags: MessageFlags.Ephemeral,
    });
  },
};

export default modal;
