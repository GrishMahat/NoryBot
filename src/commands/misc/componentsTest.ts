import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	type ChatInputCommandInteraction,
	type Client,
	SlashCommandBuilder,
	StringSelectMenuBuilder,
} from 'discord.js';
import type { LocalCommand } from '../../types/index';

const componentsTestCommand: LocalCommand = {
	data: new SlashCommandBuilder()
		.setName('components-test')
		.setDescription('Send test components to verify buttons, selects and modals work')
		.setContexts([0, 1, 2])
		.setIntegrationTypes([0, 1])
		.toJSON(),
	devOnly: false,
	testMode: true,
	cooldown: 3,

	run: async (client: Client, interaction: ChatInputCommandInteraction) => {
		// Build a button that opens a modal (handled by components/buttons/openModal.ts)
		const openModalButton = new ButtonBuilder()
			.setCustomId('open-modal')
			.setLabel('Open Modal')
			.setStyle(ButtonStyle.Primary);

		// Build a test select menu that targets customId 'test-select'
		const testSelect = new StringSelectMenuBuilder()
			.setCustomId('test-select')
			.setPlaceholder('Pick an option')
			.addOptions([
				{ label: 'Option A', value: 'A' },
				{ label: 'Option B', value: 'B' },
				{ label: 'Option C', value: 'C' },
			]);

		const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(openModalButton);
		const row2 = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(testSelect);

		await interaction.reply({
			content: 'Components test: click the button to open a modal and try the select menu.',
			components: [row1, row2],
		});
	},
};

export default componentsTestCommand;
