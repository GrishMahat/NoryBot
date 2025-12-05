import {
	ButtonStyle,
	type ChatInputCommandInteraction,
	type Client,
	EmbedBuilder,
	SlashCommandBuilder,
} from 'discord.js';
import type { LocalCommand } from '../../types/index';
import { Pagination } from '../../utils/helpers/Pagination';

const testPagination: LocalCommand = {
	data: new SlashCommandBuilder()
		.setName('testpagination')
		.setDescription('Test the enhanced pagination system')
		.addStringOption((option) =>
			option
				.setName('type')
				.setDescription('Type of pagination')
				.addChoices(
					{ name: 'Button', value: 'button' },
					{ name: 'Select', value: 'select' },
					{ name: 'Both', value: 'both' },
				),
		)
		.addBooleanOption((option) =>
			option.setName('jump').setDescription('Enable Jump to Page button'),
		)
		.addBooleanOption((option) => option.setName('stop').setDescription('Enable Stop button'))
		.toJSON(),
	devOnly: false,
	run: async (client: Client, interaction: ChatInputCommandInteraction) => {
		const type = (interaction.options.getString('type') as 'button' | 'select' | 'both') || 'both';
		const enableJump = interaction.options.getBoolean('jump') ?? true;
		const enableStop = interaction.options.getBoolean('stop') ?? true;

		// Create a set of embed pages with more content
		const pages: EmbedBuilder[] = [];
		const colors = ['#0099ff', '#00ff99', '#ff9900', '#ff0099', '#9900ff', '#ffffff', '#000000'];

		for (let i = 0; i < 20; i++) {
			pages.push(
				new EmbedBuilder()
					.setTitle(`Page ${i + 1}`)
					.setDescription(
						`This is page number ${i + 1} of the pagination test.\n\nUse the controls below to navigate.`,
					)
					.setColor(colors[i % colors.length] as any)
					.addFields({ name: 'Random Data', value: Math.random().toString(36).substring(7) }),
			);
		}

		// Call the pagination function with enhanced settings
		const pagination = new Pagination(interaction, pages, {
			type,
			placeholder: 'Go to page...',
			showPageInfo: true,
			showTotalPages: true,
			showCurrentPage: true,
			customFooter: 'Test Pagination',
			maxSelectOptions: 10,
			time: 60000, // 1 minute
			disableOnTimeout: true,
			enableJump,
			enableStop,
			fastSkip: true,
			buttonStyle: ButtonStyle.Primary,
		});

		await pagination.send();
	},
};

export default testPagination;
