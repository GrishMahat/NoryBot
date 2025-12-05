import {
	type ChatInputCommandInteraction,
	type Client,
	EmbedBuilder,
	type GuildMember,
	SlashCommandBuilder,
	type User,
} from 'discord.js';
import type { LocalCommand } from '../../types/index';

const avatarCommand: LocalCommand = {
	data: new SlashCommandBuilder()
		.setName('avatar')
		.setDescription('Show and interact with user avatars')
		.addUserOption((option) =>
			option.setName('user').setDescription('User whose avatar you want to see').setRequired(false),
		)
		.setContexts([0, 1, 2])
		.setIntegrationTypes([0, 1])
		.toJSON(),

	run: async (_client: Client, interaction: ChatInputCommandInteraction): Promise<void> => {
		try {
			await interaction.deferReply();

			const targetUser = interaction.options.getUser('user') || interaction.user;

			if (!interaction.guild) {
				await handleDMAvatar(interaction, targetUser);
				return;
			}

			const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
			if (!targetMember) {
				await interaction.editReply({
					content: '❌ Could not fetch member information.',
				});
				return;
			}

			const sizes = [16, 32, 64, 128, 256, 512, 1024, 2048, 4096];

			const avatarData = await getAvatarData(targetUser, targetMember);
			const { allAvatars } = avatarData;

			if (allAvatars.length === 0) {
				await interaction.editReply({
					content: '❌ No avatar found for this user.',
				});
				return;
			}

			const embedDescription = [
				`👤 **User:** ${targetUser.toString()} (${targetUser.id})`,
				`🖼️ **Global Avatar:** ${targetUser.avatar ? '✅' : '❌'}`,
				`🖼️ **Server Avatar:** ${targetMember.avatar ? '✅' : '❌'}`,
				`🎞️ **Animated:** ${targetUser.avatar?.startsWith('a_') || targetMember.avatar?.startsWith('a_') ? '✅' : '❌'}`,
				`📏 **Available Sizes:** ${sizes.join(', ')}px`,
			];

			const bannerURL = targetUser.bannerURL({ size: 4096 });
			if (bannerURL) {
				embedDescription.push(`🎌 **Banner:** [View Banner](${bannerURL})`);
			}

			const embed = new EmbedBuilder()
				.setAuthor({
					name: targetUser.tag || targetUser.username,
					iconURL: targetUser.displayAvatarURL({ size: 16 }),
				})
				.setTitle('💎 Avatar Information')
				.setDescription(embedDescription.join('\n'))
				.setImage(targetUser.displayAvatarURL({ size: 4096 }))
				.setColor(targetMember.displayColor || '#2F3136')
				.setFooter({
					text: `Requested by ${interaction.user.tag || interaction.user.username}`,
					iconURL: interaction.user.displayAvatarURL(),
				})
				.setTimestamp();

			await interaction.editReply({
				embeds: [embed],
			});
		} catch (error) {
			console.error('Error in avatar command:', error);
			await interaction.editReply({
				content: '❌ An error occurred while fetching the user avatar.',
			});
		}
	},
};

// Rest of the code remains the same, just update the DM handler:

async function handleDMAvatar(
	interaction: ChatInputCommandInteraction,
	targetUser: User,
): Promise<void> {
	const embed = new EmbedBuilder()
		.setAuthor({
			name: targetUser.tag || targetUser.username,
			iconURL: targetUser.displayAvatarURL({ size: 16 }),
		})
		.setTitle('💎 Avatar Information')
		.setDescription(`👤 **User:** ${targetUser.toString()} (${targetUser.id})`)
		.setImage(targetUser.displayAvatarURL({ size: 4096 }))
		.setColor('#2F3136')
		.setTimestamp();

	await interaction.editReply({ embeds: [embed] });
}

// The getAvatarData function remains unchanged
function getAvatarData(
	targetUser: User,
	targetMember: GuildMember,
): {
	globalAvatars: Array<{ format: string; url: string; type: string }>;
	serverAvatars: Array<{ format: string; url: string; type: string }>;
	allAvatars: Array<{ format: string; url: string; type: string }>;
} {
	const formats = ['png', 'jpg', 'webp'];
	if (targetUser.avatar?.startsWith('a_') || targetMember.avatar?.startsWith('a_')) {
		formats.push('gif');
	}

	const globalAvatars = formats
		.map((format) => ({
			format,
			url: targetUser.displayAvatarURL({
				extension: format as 'png' | 'jpg' | 'webp' | 'gif',
				size: 4096,
				forceStatic: format !== 'gif',
			}),
			type: 'Global',
		}))
		.filter((avatar) => avatar.url);

	const serverAvatars = targetMember.avatar
		? formats
				.map((format) => ({
					format,
					url: targetMember.displayAvatarURL({
						extension: format as 'png' | 'jpg' | 'webp' | 'gif',
						size: 4096,
						forceStatic: format !== 'gif',
					}),
					type: 'Server',
				}))
				.filter((avatar) => avatar.url)
		: [];

	const allAvatars = [...globalAvatars, ...serverAvatars];

	return { globalAvatars, serverAvatars, allAvatars };
}
export default avatarCommand;
