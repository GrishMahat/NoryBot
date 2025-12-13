import type { ButtonInteraction, Client } from 'discord.js';
import type { Button } from '@/types';

const banUserButton: Button = {
	customId: 'ban-user',
	userPermissions: ['BanMembers'],
	botPermissions: ['BanMembers'],
	cooldown: 5,

	run: async (_client: Client, interaction: ButtonInteraction, args?: string[]) => {
		// args will be populated if the ID was "ban-user:12345" => args=["12345"]
		// or "ban-user:12345:spam" => args=["12345", "spam"]

		if (args && args.length > 0) {
			const [targetId, reason] = args;

			await interaction.reply({
				content: `🚨 **Dynamic Ban Action** 🚨\nTarget ID: \`${targetId}\`\nReason: ${reason || 'No reason provided'}`,
				ephemeral: true,
			});
			return;
		}

		// Fallback for just "ban-user" with no args
		await interaction.reply({
			content: 'Please specify a user ID to ban (e.g., button customId set to `ban-user:12345`)',
			ephemeral: true,
		});
	},
};

export default banUserButton;
