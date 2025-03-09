import {
	ChatInputCommandInteraction,
	Client,
	SlashCommandBuilder,
} from 'discord.js';
// import path from "path";
// import fs from "fs/promises";

// const configFile = path.join(process.cwd(), "src/config/emoji.ts");

const emojiCommand: Command = {
	data: new SlashCommandBuilder()
		.setName('emoji')
		.setDescription('Manage server emojis and emoji configuration')
		.addSubcommand((subcommand) =>
			subcommand
				.setName('upload')
				.setDescription('Upload emojis to the server'),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName('updateconfig')
				.setDescription('Update the emoji configuration file'),
		)
		.toJSON(),
	cooldown: 10,
	nsfwMode: false,
	testMode: true,
	devOnly: true,
	category: 'Developer',
	run: async (
		client: Client,
		interaction: ChatInputCommandInteraction,
	): Promise<void> => {
		const subcommand = interaction.options.getSubcommand();

		switch (subcommand) {
			case 'upload':
				await handleUpload(client, interaction);
				break;
			case 'updateconfig':
				await handleUpdateConfig(client, interaction);
				break;
		}
	},
};

async function handleUpload(
	client: Client,
	interaction: ChatInputCommandInteraction,
): Promise<void> {
	await interaction.deferReply();
	// TODO: Implement emoji upload logic
	await interaction.editReply('Emoji upload functionality coming soon');
}

async function handleUpdateConfig(
	client: Client,
	interaction: ChatInputCommandInteraction,
): Promise<void> {
	await interaction.deferReply();
	// TODO: Implement config update logic
	await interaction.editReply('Config update functionality coming soon');
}

export default emojiCommand;
