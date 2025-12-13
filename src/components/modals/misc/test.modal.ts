import { type Client, MessageFlags, type ModalSubmitInteraction } from 'discord.js';
import type { Modal } from '@/types';

const modal: Modal = {
	customId: 'test-modal',
	cooldown: 5, // 5 seconds cooldown
	devOnly: false,
	testMode: false,

	async run(_client: Client, interaction: ModalSubmitInteraction, _args?: string[]) {
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
