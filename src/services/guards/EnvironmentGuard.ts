
import { 
    type Interaction, 
    type InteractionReplyOptions, 
    EmbedBuilder 
} from 'discord.js';
import type { Guard } from './Guard';
import type { BaseComponent } from '../../types/components';
import { config } from '../../config/config';
import mConfig from '../../config/messageConfig';

export class EnvironmentGuard implements Guard {
    name = 'EnvironmentGuard';

    async validate(interaction: Interaction, component: BaseComponent): Promise<InteractionReplyOptions | null> {
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
            ephemeral: true
        };
    }
}
