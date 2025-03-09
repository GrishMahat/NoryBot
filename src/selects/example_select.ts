import { Client, StringSelectMenuInteraction, MessageFlags } from 'discord.js';
import { SelectMenu } from '../types/index';

const exampleSelectMenu: SelectMenu = {
	customId: 'test-select',
	cooldown: 5,
	userPermissions: [],
	async run(client: Client, interaction: StringSelectMenuInteraction) {
		const selectedValue = interaction.values[0];
		await interaction.reply({
			content: `You selected: ${selectedValue}`,
			flags: MessageFlags.Ephemeral,
		});
	},
};
export default exampleSelectMenu;
