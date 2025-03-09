import {
	SlashCommandBuilder,
	EmbedBuilder,
	ChatInputCommandInteraction,
	Client,
} from 'discord.js';
import pangunation from '../../utils/helpers/Pagination';

const testPangunation: LocalCommand = {
	data: new SlashCommandBuilder()
		.setName('testpangunation')
		.setDescription('Test pangunation')
		.toJSON(),
	run: async (client: Client, interaction: ChatInputCommandInteraction) => {
		// Create a set of embed pages.
		const pages = [
			new EmbedBuilder()
				.setTitle('Page 1')
				.setDescription('This is the first page.'),
			new EmbedBuilder()
				.setTitle('Page 2')
				.setDescription('This is the second page.'),
			new EmbedBuilder()
				.setTitle('Page 3')
				.setDescription('This is the third page.'),
		];

		// Call the pagination function.
		await pangunation(interaction, pages, { type: 'select' });
	},
};

export default testPangunation;
