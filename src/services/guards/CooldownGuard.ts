import { EmbedBuilder, type Interaction, type InteractionReplyOptions } from 'discord.js';
import cooldownManager from '@/services/manager/CooldownManager';
import type { BaseComponent } from '@/types/discord/components';
import type { Guard } from './Guard';

export class CooldownGuard implements Guard {
	name = 'CooldownGuard';

	async validate(
		interaction: Interaction,
		component: BaseComponent,
		_args: string[],
	): Promise<InteractionReplyOptions | null> {
		if (!component.cooldown) return null;

		if (cooldownManager.isOnCooldown(interaction.user.id, component.customId)) {
			const remainingTime = cooldownManager.getRemainingTime(
				interaction.user.id,
				component.customId,
			);

			return this.createErrorEmbed(
				interaction,
				`Please wait ${remainingTime} seconds before using this component again.`,
				// Note: mConfig might not have a generic component cooldown message, using fallback
			);
		}

		// We don't SET the cooldown here. The guard only VALIDATES.
		// The manager should set strict cooldowns after successful execution or maybe here if we want strict "attempt" rate limiting.
		// Usually, strict cooldowns are set AFTER success to prevent punishment for errors,
		// BUT standard Discord bots often check AND set to prevent spam.
		// Looking at legacy logic: it validated, then executed, then set cooldown (in some) or set it if valid.
		// Let's keep it strictly validation here. The Manager will set it on success.

		return null;
	}

	private createErrorEmbed(interaction: Interaction, description: string): InteractionReplyOptions {
		const embed = new EmbedBuilder()
			.setColor('Red')
			.setDescription(description)
			.setAuthor({
				name: interaction.user.username,
				iconURL: interaction.user.displayAvatarURL(),
			})
			.setTimestamp();

		return {
			embeds: [embed],
			ephemeral: true,
		};
	}
}
