import { Client, Interaction } from 'discord.js';
import { componentManager } from '../services/ComponentManager';
import chatInputCommandValidator from './validations/chatInputCommandValidator';
import contextMenuCommandValidator from './validations/contextMenuCommandValidator';
import buttonValidator from './validations/buttonValidator';
import selectMenuValidator from './validations/seclectMenuValidator';
import modalValidator from './validations/ModalCommandValidator';

/**
 * Main interaction handler that routes interactions to appropriate validators
 * @param client - Discord client instance
 * @param interaction - The interaction received from Discord
 */
export default async (
	client: Client,
	interaction: Interaction,
): Promise<void> => {
	try {
		// Route interactions to appropriate validators
		if (interaction.isChatInputCommand()) {
			await chatInputCommandValidator(client, interaction);
		} else if (interaction.isContextMenuCommand()) {
			await contextMenuCommandValidator(client, interaction);
		} else if (interaction.isButton()) {
			await buttonValidator(client, interaction);
		} else if (interaction.isStringSelectMenu()) {
			await selectMenuValidator(client, interaction);
		} else if (interaction.isModalSubmit()) {
			await modalValidator(client, interaction);
		} else {
			// Handle other component types with the unified component manager
			await componentManager.handleInteraction(client, interaction);
		}
	} catch (error) {
		console.error('Error in interactionCreate handler:', error);
		await global.errorHandler.handleError(error, 'InteractionCreateError');
	}
};
