import {
	CommandInteraction,
	InteractionReplyOptions,
	InteractionEditReplyOptions,
	MessageFlags,
} from 'discord.js';

/**
 * Safely handles interaction replies by checking the interaction state
 * @param interaction The command interaction
 * @param options The reply options
 * @param isEphemeral Whether the reply should be ephemeral
 */
export async function safeReply(
	interaction: CommandInteraction,
	options: string | InteractionReplyOptions | InteractionEditReplyOptions,
	isEphemeral = false,
): Promise<void> {
	try {
		const replyOptions =
			typeof options === 'string' ? { content: options } : options;

		if (interaction.deferred || interaction.replied) {
			await interaction.editReply(replyOptions as InteractionEditReplyOptions);
		} else {
			await interaction.reply({
				...(replyOptions as InteractionReplyOptions),
				flags: isEphemeral ? MessageFlags.Ephemeral : undefined,
			});
		}
	} catch (error) {
		console.error('Failed to send or edit reply:', error);
	}
}

/**
 * Safely defers an interaction reply
 * @param interaction The command interaction
 * @param isEphemeral Whether the reply should be ephemeral
 */
export async function safeDefer(
	interaction: CommandInteraction,
	isEphemeral = false,
): Promise<void> {
	try {
		if (!interaction.deferred && !interaction.replied) {
			await interaction.deferReply({ flags: isEphemeral ? MessageFlags.Ephemeral : undefined });
		}
	} catch (error) {
		console.error('Failed to defer reply:', error);
	}
}

/**
 * Safely follows up an interaction
 * @param interaction The command interaction
 * @param options The follow-up options
 */
export async function safeFollowUp(
	interaction: CommandInteraction,
	options: string | InteractionReplyOptions,
): Promise<void> {
	try {
		const followUpOptions =
			typeof options === 'string' ? { content: options } : options;
		await interaction.followUp(followUpOptions);
	} catch (error) {
		console.error('Failed to send follow-up:', error);
	}
}
