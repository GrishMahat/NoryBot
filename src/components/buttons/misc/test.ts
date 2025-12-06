import type { ButtonInteraction, Client } from 'discord.js';
import type { Button } from '../../../types/index';

const testButton: Button = {
	customId: 'test-button',
	run: async (_client: Client, interaction: ButtonInteraction, _args?: string[]) => {
		await interaction.reply('Test button clicked!');
	},
};
export default testButton;
