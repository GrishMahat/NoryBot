import type { ButtonInteraction, Client } from 'discord.js';
import type { Button } from '../../../types/index';

const testButton: Button = {
	customId: 'test-button',
	run: async (client: Client, interaction: ButtonInteraction) => {
		await interaction.reply('Test button clicked!');
	},
};
export default testButton;
