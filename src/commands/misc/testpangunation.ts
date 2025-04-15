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
	devOnly: false,
	run: async (client: Client, interaction: ChatInputCommandInteraction) => {
		// Create a set of embed pages with more content
		const pages = [
			new EmbedBuilder()
				.setTitle('Page 1')
				.setDescription('This is the first page.')
				.setColor('#0099ff'),
			new EmbedBuilder()
				.setTitle('Page 2')
				.setDescription('This is the second page.')
				.setColor('#00ff99'),
			new EmbedBuilder()
				.setTitle('Page 3')
				.setDescription('This is the third page.')
				.setColor('#ff9900'),
			new EmbedBuilder()
				.setTitle('Page 4')
				.setDescription('This is the fourth page.')
				.setColor('#ff0099'),
			new EmbedBuilder()
				.setTitle('Page 5')
				.setDescription('This is the fifth page.')
				.setColor('#9900ff'),
		];

		// Call the pagination function with enhanced settings
		await pangunation(interaction, pages, {
			type: 'select',
			placeholder: 'Select a page...',
			showPageInfo: true,
			showTotalPages: true,
			showCurrentPage: true,
			customFooter: 'Use the select menu to navigate',
			maxSelectOptions: 5,
			time: 300000, // 5 minutes
			disableOnTimeout: true,
		});
	},
};

export default testPangunation;
