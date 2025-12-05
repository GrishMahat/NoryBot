import {
	type ChatInputCommandInteraction,
	type Client,
	EmbedBuilder,
	MessageFlags,
	SlashCommandBuilder,
} from 'discord.js';
import type { LocalCommand } from '../../types/index';

const responses = [
	'It is certain.',
	'It is decidedly so.',
	'Without a doubt.',
	'Yes, definitely.',
	'You may rely on it.',
	'As I see it, yes.',
	'Most likely.',
	'Outlook good.',
	'Yes.',
	'Signs point to yes.',
	'Reply hazy, try again.',
	'Ask again later.',
	'Better not tell you now.',
	'Cannot predict now.',
	'Concentrate and ask again.',
	"Don't count on it.",
	'My reply is no.',
	'My sources say no.',
	'Outlook not so good.',
	'Very doubtful.',
];

const eightBallCommand: LocalCommand = {
	data: new SlashCommandBuilder()
		.setName('8ball')
		.setDescription('Ask the Magic 8 Ball a question')
		.addStringOption((option) =>
			option.setName('question').setDescription('The question you want to ask').setRequired(true),
		)
		.setContexts([0, 1, 2])
		.setIntegrationTypes([0, 1])
		.toJSON(),
	cooldown: 5,

	run: async (_client: Client, interaction: ChatInputCommandInteraction) => {
		try {
			const question = interaction.options.get('question')?.value as string;
			const response = responses[Math.floor(Math.random() * responses.length)];

			const embed = new EmbedBuilder()
				.setColor('#0099ff')
				.setTitle('🎱 Magic 8 Ball')
				.addFields({ name: 'Question', value: question }, { name: 'Answer', value: response })
				.setTimestamp();

			await interaction.reply({ embeds: [embed] });
		} catch (error) {
			console.error('Error in 8ball command:', error);
			await interaction.reply({
				content: 'There was an error while executing this command!',
				flags: MessageFlags.Ephemeral,
			});
		}
	},
};

export default eightBallCommand;
