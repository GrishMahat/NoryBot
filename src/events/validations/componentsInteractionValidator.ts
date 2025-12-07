import type { Client, Interaction } from 'discord.js';
import { componentManager } from '@/services/manager/ComponentManager';
import { chatInputCommandValidator } from '@/utils/validators/chatInputCommandValidator';
import { contextMenuCommandValidator } from '@/utils/validators/contextMenuCommandValidator';

/**
 * Main interaction handler that routes interactions to appropriate validators
 * @param client - Discord client instance
 * @param interaction - The interaction received from Discord
 */
export default async (client: Client, interaction: Interaction): Promise<void> => {
	try {
		// Route interactions to appropriate validators
		if (interaction.isChatInputCommand()) {
			await chatInputCommandValidator(client, interaction);
		} else if (interaction.isContextMenuCommand()) {
			await contextMenuCommandValidator(client, interaction);
		} else if (
			interaction.isButton() ||
			interaction.isStringSelectMenu() ||
			interaction.isModalSubmit()
		) {
			await componentManager.handleInteraction(client, interaction);
		}
	} catch (error) {
		console.error('Error in interactionCreate handler:', error);
		await global.errorHandler.handleError(error, 'InteractionCreateError');
	}
};
