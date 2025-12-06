import type {
	ButtonInteraction,
	Client,
	ModalSubmitInteraction,
	PermissionResolvable,
	StringSelectMenuInteraction,
} from 'discord.js';

/**
 * Base configuration for all components
 */
export interface BaseComponent {
	customId: string; // strict identifier for now, will support patterns later
	cooldown?: number;
	devOnly?: boolean;
	testMode?: boolean;
	userPermissions?: PermissionResolvable[];
	botPermissions?: PermissionResolvable[];

	// Optional pre-compiled checks (legacy support, will be superseded by Guards)
	compiledChecks?: {
		// biome-ignore lint/suspicious/noExplicitAny: Legacy compiled checks
		userPermissions: (interaction: any) => boolean;
		// biome-ignore lint/suspicious/noExplicitAny: Legacy compiled checks
		botPermissions: (interaction: any) => boolean;
	};
}

/**
 * Unified Component Run Signature
 * Includes support for parsed arguments (for future dynamic ID support)
 */
export type ComponentRun<T> = (client: Client, interaction: T, args?: string[]) => Promise<void>;

export interface Button extends BaseComponent {
	run: ComponentRun<ButtonInteraction>;
}

export interface SelectMenu extends BaseComponent {
	run: ComponentRun<StringSelectMenuInteraction>;
}

export interface Modal extends BaseComponent {
	run: ComponentRun<ModalSubmitInteraction>;
}

export type AnyComponent = Button | SelectMenu | Modal;

/**
 * Unified Metrics for all components
 */
export interface ComponentMetrics {
	uses: number;
	lastUsed: Date;
	averageResponseTime: number;
	failures: number;
}
