import {
	ApplicationCommandType,
	ApplicationIntegrationType,
	type Client,
	ContextMenuCommandBuilder,
	type ContextMenuCommandInteraction,
	EmbedBuilder,
	InteractionContextType,
	MessageFlags,
	PermissionFlagsBits,
} from 'discord.js';

export default {
	data: new ContextMenuCommandBuilder()
		.setName('Steal Emojis')
		.setType(ApplicationCommandType.Message)
		.setContexts(InteractionContextType.Guild)
		.setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers),

	async run(_client: Client, interaction: ContextMenuCommandInteraction): Promise<void> {
		if (!interaction.isMessageContextMenuCommand()) return;

		// Check if bot has permissions
		if (
			!interaction.guild?.members.me?.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)
		) {
			await interaction.reply({
				content: '❌ I need the `Manage Emojis and Stickers` permission to do this!',
				flags: MessageFlags.Ephemeral,
			});
			return;
		}

		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		const message = interaction.targetMessage;
		const content = message.content;

		// Regex to find custom emojis: <a:name:id> or <:name:id>
		// Group 1: 'a' (if animated) or undefined
		// Group 2: Name
		// Group 3: ID
		const emojiRegex = /<(a)?:(\w+):(\d+)>/g;
		const matches = [...content.matchAll(emojiRegex)];

		if (matches.length === 0) {
			await interaction.editReply({
				content: '❌ No custom emojis found in this message.',
			});
			return;
		}

		const addedEmojis: string[] = [];
		const failedEmojis: string[] = [];
		let processedCount = 0;

		// Limit to 10 emojis to prevent timeouts/abuse
		const maxEmojis = 10;
		const emojisToProcess = matches.slice(0, maxEmojis);

		for (const match of emojisToProcess) {
			const isAnimated = !!match[1];
			const name = match[2];
			const id = match[3];
			const extension = isAnimated ? 'gif' : 'png';
			const url = `https://cdn.discordapp.com/emojis/${id}.${extension}`;

			try {
				const emoji = await interaction.guild.emojis.create({
					attachment: url,
					name: name,
					reason: `Stealed by ${interaction.user.tag} from message context menu`,
				});
				addedEmojis.push(emoji.toString());
			} catch (error) {
				console.error(`Failed to steal emoji ${name}:`, error);
				failedEmojis.push(name);
			}
			processedCount++;
		}

		const embed = new EmbedBuilder()
			.setTitle('🕵️ Emoji Stealer')
			.setColor('#2B2D31')
			.setFooter({ text: `Processed ${processedCount}/${matches.length} found emojis` });

		if (addedEmojis.length > 0) {
			embed.addFields({
				name: '✅ Added Emojis',
				value: addedEmojis.join(' '),
			});
		}

		if (failedEmojis.length > 0) {
			embed.addFields({
				name: '❌ Failed to Add',
				value: failedEmojis.join(', '),
			});
		}

		if (matches.length > maxEmojis) {
			embed.setDescription(
				`⚠️ Only the first ${maxEmojis} emojis were processed to prevent rate limits.`,
			);
		}

		await interaction.editReply({
			embeds: [embed],
		});
	},
};
