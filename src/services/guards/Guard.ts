import type { Interaction, InteractionReplyOptions } from 'discord.js';
import type { BaseComponent } from '@/types/discord/components';

/**
 * Represents a guard that validates an interaction before execution.
 */
export interface Guard {
	/**
	 * name of the guard for logging/debugging
	 */
	name: string;

	/**
	 * Validates the interaction.
	 * @param interaction The interaction to validate.
	 * @param component The component definition being accessed (optional context).
	 * @returns A promise that resolves to an InteractionReplyOptions if validation fails (to reply to user), or null if validation passes.
	 */
	validate(
		interaction: Interaction,
		component: BaseComponent,
		args: string[],
	): Promise<InteractionReplyOptions | null>;
}
