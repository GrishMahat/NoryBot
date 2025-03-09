import {
	ContextMenuCommandBuilder,
	ApplicationCommandType,
	ContextMenuCommandInteraction,
	Client,
	AttachmentBuilder,
	// MessageFlags,
} from "discord.js";
import { generateMusicImage } from "../../services/image/musicImge";

const MusicPlayerContextMenu: LocalContextMenu = {
	data: new ContextMenuCommandBuilder()
		.setName('Music Player View')
		.setType(ApplicationCommandType.Message),

	async run(client: Client, interaction: ContextMenuCommandInteraction) {
		if (!interaction.isMessageContextMenuCommand()) return;

		await interaction.deferReply();

		try {
			const message = interaction.targetMessage;

			// Get the first image attachment or avatar as fallback
			const imageUrl =
				message.attachments.find((a) => a.contentType?.startsWith('image/'))
					?.url ||
				message.author.displayAvatarURL({ size: 512, extension: 'png' });

			// Split message content into title and artist
			let [title, artist] = message.content.split('\n', 2);

			// If no line break, use first 50 chars as title and author as artist
			if (!artist) {
				title = message.content.slice(0, 50);
				artist = message.author.username;
			}

			// Generate random time values for demo
			const totalTime = Math.floor(Math.random() * 300) + 60; // 1-6 minutes
			const currentTime = Math.floor(Math.random() * totalTime);

			const imageBuffer = await generateMusicImage({
				title: title || 'Untitled',
				artist: artist || 'Unknown Artist',
				image: imageUrl,
				time: {
					currentTime,
					totalTime,
				},
				progressBar: {
					color: '#ffffff',
					backgroundColor: 'rgba(255, 255, 255, 0.2)',
					borderColor: 'rgba(255, 255, 255, 0.4)',
					height: 20,
				},
			});

			const attachment = new AttachmentBuilder(imageBuffer, {
				name: 'music-player.png',
				description: 'Music Player Visualization',
			});

			await interaction.editReply({
				files: [attachment],
			});
		} catch (error) {
			console.error('Error generating music image:', error);
			await interaction.editReply({
				content:
					'❌ Failed to generate music player visualization. Please try again with a different message.',
			});
		}
	},
};

export default MusicPlayerContextMenu;
