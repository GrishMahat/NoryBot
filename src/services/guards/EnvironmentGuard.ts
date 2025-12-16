import { EmbedBuilder, type Interaction, type InteractionReplyOptions } from 'discord.js';
import { config } from '@/config/config';
import mConfig from '@/config/messageConfig';
import type { BaseComponent } from '@/types/discord/components';
import type { Guard } from './Guard';

export class EnvironmentGuard implements Guard {
	name = 'EnvironmentGuard';

	async validate(
		interaction: Interaction,
		component: BaseComponent,
		_args: string[],
	): Promise<InteractionReplyOptions | null> {
		const { developersId, testServerId } = config;

		// Dev Only Check
		if (component.devOnly && !developersId.includes(interaction.user.id)) {
			return this.createErrorEmbed(interaction, mConfig.commandDevOnly);
		}

		// Test Mode/Server Check
		if (component.testMode && interaction.guildId !== testServerId) {
			return this.createErrorEmbed(interaction, mConfig.commandTestMode);
		}

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
