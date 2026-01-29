import {
	EmbedBuilder,
	type GuildMember,
	type Interaction,
	type InteractionReplyOptions,
} from 'discord.js';
import { config } from '@/config/config';
import mConfig from '@/config/messageConfig';
import { logs } from '@/services/logs';
import type { BaseComponent } from '@/types/discord/components';
import type { Guard } from './Guard';

export class PermissionGuard implements Guard {
	name = 'PermissionGuard';

	async validate(
		interaction: Interaction,
		component: BaseComponent,
		_args: string[],
	): Promise<InteractionReplyOptions | null> {
		const { developersId } = config;
		const isDeveloper = developersId.includes(interaction.user.id);

		// User Permissions Check
		if (!isDeveloper && component.userPermissions && component.userPermissions.length > 0) {
			const member = interaction.member as GuildMember;
			if (!member || !this.checkPermissions(member, component.userPermissions)) {
				logs.warn(
					`User ${interaction.user.tag} (${interaction.user.id}) needs permissions: ${component.userPermissions.join(', ')}`,
					{ tag: 'PermissionGuard', context: { component: component.customId } },
				);
				return this.createErrorEmbed(interaction, mConfig.userNoPermissions);
			}
		}

		// Bot Permissions Check
		if (!isDeveloper && component.botPermissions && component.botPermissions.length > 0) {
			const botMember = interaction.guild?.members.me;
			if (!botMember || !this.checkPermissions(botMember, component.botPermissions)) {
				logs.warn(`Bot needs permissions: ${component.botPermissions.join(', ')}`, {
					tag: 'PermissionGuard',
					context: { component: component.customId, guild: interaction.guild?.id },
				});
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
