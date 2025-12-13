import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	type ChatInputCommandInteraction,
	type Client,
	ComponentType,
	EmbedBuilder,
	type GuildMember,
	SlashCommandBuilder,
} from 'discord.js';
import type { LocalCommand } from '@/types';

const avatarCommand: LocalCommand = {
	data: new SlashCommandBuilder()
		.setName('avatar')
		.setDescription('Show and interact with user avatars')
		.addUserOption((option) =>
			option.setName('user').setDescription('User whose avatar you want to see').setRequired(false),
		)
		.setContexts([0, 1, 2])
		.setIntegrationTypes([0, 1]),

	run: async (_client: Client, interaction: ChatInputCommandInteraction): Promise<void> => {
		try {
			await interaction.deferReply();

			const targetUser = interaction.options.getUser('user') || interaction.user;

			// Try to fetch member if in a guild
			let targetMember: GuildMember | null = null;
			if (interaction.guild) {
				targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
			}

			// State for the interactive session
			let showingServerAvatar = !!targetMember?.avatar; // Default to server avatar if it exists

			const generateResponse = () => {
				const isServer = showingServerAvatar && targetMember?.avatar;

				// Get valid URLs
				const avatarURL = isServer
					? targetMember?.displayAvatarURL({ size: 4096 })
					: targetUser.displayAvatarURL({ size: 4096 });

				const isAnimated = isServer
					? targetMember?.avatar?.startsWith('a_')
					: targetUser.avatar?.startsWith('a_');

				const embed = new EmbedBuilder()
					.setAuthor({
						name: `${targetUser.username}'s ${isServer ? 'Server' : 'Global'} Avatar`,
						iconURL: avatarURL,
					})
					.setTitle('🖼️ Avatar Viewer')
					.setDescription(
						`Viewing **${isServer ? 'Server' : 'Global'}** Avatar for ${targetUser.toString()}`,
					)
					.setImage(avatarURL)
					.setColor(targetMember?.displayColor || '#2F3136')
					.setFooter({
						text: `Requested by ${interaction.user.username}`,
						iconURL: interaction.user.displayAvatarURL(),
					})
					.setTimestamp();

				// --- Components ---
				const rows: ActionRowBuilder<ButtonBuilder>[] = [];

				// Row 1: Texture/Format Buttons (Link Buttons)
				const formatRow = new ActionRowBuilder<ButtonBuilder>();

				// Helper for formats
				const addFormatBtn = (label: string, ext: string) => {
					const extension = ext as 'png' | 'jpg' | 'webp' | 'gif';
					const url = isServer
						? targetMember?.displayAvatarURL({ extension, size: 4096 })
						: targetUser.displayAvatarURL({ extension, size: 4096 });
					formatRow.addComponents(
						new ButtonBuilder().setLabel(label).setStyle(ButtonStyle.Link).setURL(url),
					);
				};

				addFormatBtn('PNG', 'png');
				addFormatBtn('JPG', 'jpg');
				addFormatBtn('WEBP', 'webp');
				if (isAnimated) {
					addFormatBtn('GIF', 'gif');
				}

				rows.push(formatRow);

				// Row 2: Toggle Button (Only if server avatar exists and differs from global - simplistically check if member.avatar is set)
				if (targetMember?.avatar) {
					const toggleRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
						new ButtonBuilder()
							.setCustomId('toggle_avatar_mode')
							.setLabel(showingServerAvatar ? 'Show Global Avatar' : 'Show Server Avatar')
							.setStyle(showingServerAvatar ? ButtonStyle.Secondary : ButtonStyle.Primary)
							.setEmoji(showingServerAvatar ? '🌐' : '🏰'),
					);
					rows.push(toggleRow);
				}

				return { embeds: [embed], components: rows };
			};

			const response = await interaction.editReply(generateResponse());

			// If we have interactive components (the toggle button), set up a collector
			if (targetMember?.avatar) {
				const collector = response.createMessageComponentCollector({
					componentType: ComponentType.Button,
					time: 60_000,
				});

				collector.on('collect', async (i) => {
					if (i.customId === 'toggle_avatar_mode') {
						if (i.user.id !== interaction.user.id) {
							await i.reply({
								content: "You can't interact with this menu.",
								ephemeral: true,
							});
							return;
						}

						// Toggle state
						showingServerAvatar = !showingServerAvatar;
						await i.update(generateResponse());
					}
				});

				collector.on('end', () => {
					// Disable toggle button, keep link buttons?
					// Usually we just disable interactions or remove the toggle row.
					// Let's remove the toggle row to keep it clean, leaving just download links.
					const finalResponse = generateResponse();
					// Filter out the toggle row (which is the last one if it exists)
					if (finalResponse.components.length > 1) {
						finalResponse.components.pop();
					}
					interaction.editReply({ components: finalResponse.components }).catch(() => {});
				});
			}
		} catch (error) {
			console.error('Error in avatar command:', error);
			await interaction.editReply({
				content: '❌ An error occurred while fetching the user avatar.',
			});
		}
	},
};

export default avatarCommand;
