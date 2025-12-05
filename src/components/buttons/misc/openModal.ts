import {
	ActionRowBuilder,
	type ButtonInteraction,
	type Client,
	type ModalActionRowComponentBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} from 'discord.js';
import type { Button } from '../../../types/index';

const openModalButton: Button = {
	customId: 'open-modal',
	run: async (_client: Client, interaction: ButtonInteraction) => {
		const modal = new ModalBuilder().setCustomId('test-modal').setTitle('Test Modal');

		const input = new TextInputBuilder()
			.setCustomId('test-input')
			.setLabel('Enter something')
			.setStyle(TextInputStyle.Short)
			.setRequired(true);

		const row = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(input);

		modal.addComponents(row);

		await interaction.showModal(modal);
	},
};

export default openModalButton;
