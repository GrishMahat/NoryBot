import {
	EmbedBuilder,
	type GuildMember,
	type Interaction,
	type InteractionReplyOptions,
} from 'discord.js';
import mConfig from '../../config/messageConfig';
import type { BaseComponent } from '../../types/discord/components';
import type { Guard } from './Guard';

export class PermissionGuard implements Guard {
	name = 'PermissionGuard';

	async validate(
		interaction: Interaction,
		component: BaseComponent,
	): Promise<InteractionReplyOptions | null> {
		// User Permissions Check
		if (component.userPermissions && component.userPermissions.length > 0) {
			const member = interaction.member as GuildMember;
			if (!member || !this.checkPermissions(member, component.userPermissions)) {
				return this.createErrorEmbed(interaction, mConfig.userNoPermissions);
			}
		}

		// Bot Permissions Check
		if (component.botPermissions && component.botPermissions.length > 0) {
			const botMember = interaction.guild?.members.me;
			if (!botMember || !this.checkPermissions(botMember, component.botPermissions)) {
				return this.createErrorEmbed(interaction, mConfig.botNoPermissions);
			}
		}

		return null;
	}

	// biome-ignore lint/suspicious/noExplicitAny: Permissions array
	private checkPermissions(member: GuildMember, permissions: any[]): boolean {
		// biome-ignore lint/suspicious/noExplicitAny: Permissions array
		return permissions.every((permission: any) => member.permissions.has(permission));
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
