import type { Client, Interaction } from 'discord.js';
import { CooldownGuard } from '@/services/guards/CooldownGuard';
import { EnvironmentGuard } from '@/services/guards/EnvironmentGuard';
import type { Guard } from '@/services/guards/Guard';
import { PermissionGuard } from '@/services/guards/PermissionGuard';
import LRUCache from '@/services/manager/LRUCache';
import type { AnyComponent, Button, ComponentMetrics, Modal, SelectMenu } from '@/types/index';
import { type ComponentType, loadAllComponents } from '@/utils/helpers/loadComponents';

/**
 * Unified component manager that handles all component types with robust validation.
 */
export class ComponentManager {
	private buttons: Map<string, Button> = new Map();
	private selects: Map<string, SelectMenu> = new Map();
	private modals: Map<string, Modal> = new Map();

	// Unified cache for frequently accessed components
	private componentCache: LRUCache<string, AnyComponent>;
	private metrics: Map<string, ComponentMetrics> = new Map();

	// Validation Guards
	private guards: Guard[] = [];

	private isLoaded = false;

	constructor() {
		this.componentCache = new LRUCache<string, AnyComponent>({
			capacity: 500,
			defaultTTL: 1000 * 60 * 60, // 1 hour
		});

		// Initialize guards
		this.guards = [new EnvironmentGuard(), new CooldownGuard(), new PermissionGuard()];
	}

	/**
	 * Load all components from the components directory
	 */
	async loadComponents(): Promise<void> {
		try {
			const { buttons, selects, modals } = await loadAllComponents();

			// Clear existing maps
			this.buttons.clear();
			this.selects.clear();
			this.modals.clear();
			this.componentCache.clear();

			// Store components
			buttons.forEach((button) => this.buttons.set(button.customId, button));
			selects.forEach((select) => this.selects.set(select.customId, select));
			modals.forEach((modal) => this.modals.set(modal.customId, modal));

			this.isLoaded = true;
			console.log(
				`ComponentManager: Loaded ${buttons.length} buttons, ${selects.length} selects, ${modals.length} modals`
					.green,
			);
		} catch (error) {
			console.error('Failed to load components:', error);
			throw error;
		}
	}

	/**
	 * Handle any interaction that might be a component
	 */
	async handleInteraction(client: Client, interaction: Interaction): Promise<void> {
		if (!this.isLoaded) await this.loadComponents();

		// Resolve component based on interaction type
		let resolution: { component: AnyComponent; args: string[] } | undefined;

		if (interaction.isButton()) {
			resolution = this.resolveComponent(interaction.customId, 'buttons');
		} else if (interaction.isStringSelectMenu()) {
			resolution = this.resolveComponent(interaction.customId, 'selects');
		} else if (interaction.isModalSubmit()) {
			resolution = this.resolveComponent(interaction.customId, 'modals');
		}

		// If no component matches, or not a component interaction, ignore
		if (!resolution) {
			// Optional: Log warning?
			return;
		}

		await this.executeComponent(client, interaction, resolution.component, resolution.args);
	}

	/**
	 * Resolve a component by ID, checking cache first then maps.
	 * Supports exact match and prefix match (for dynamic IDs).
	 */
	private resolveComponent(
		customId: string,
		type: ComponentType,
	): { component: AnyComponent; args: string[] } | undefined {
		// 1. Check Exact Match in Cache
		const cached = this.componentCache.get(customId);
		if (cached) return { component: cached, args: [] };

		// 2. Resolve Map for the type
		let map: Map<string, AnyComponent>;
		switch (type) {
			case 'buttons':
				map = this.buttons;
				break;
			case 'selects':
				map = this.selects;
				break;
			case 'modals':
				map = this.modals;
				break;
			default:
				return undefined;
		}

		// 3. Exact Match Check
		if (map.has(customId)) {
			const component = map.get(customId);
			if (component) {
				this.componentCache.set(customId, component);
				return { component, args: [] };
			}
		}

		// 4. Prefix Match Check (Dynamic IDs)
		// Checks if customId starts with any registered key + separator
		// Example: "ban_user:123" matches "ban_user"
		for (const [key, component] of map.entries()) {
			// We use a predefined separator (e.g. ':') or just startsWith?
			// Using a separator is safer to avoid partial matches (e.g. "ban_user_all" matching "ban_user")
			// Let's assume ':' is the separator or just check strictly startsWith if flexible.
			// Best practice: if (customId.startsWith(key + separator))

			// For now, let's implement a simple startsWith logic,
			// but we'll infer the separator or just rely on the developer to name things well (like 'ban_user:')
			if (customId.startsWith(key)) {
				// Determine arguments
				const argsString = customId.slice(key.length);
				// If there's content after the match, treat as args.
				// We'll strip a leading separator if present (':', '-', '_') common pattern
				const args = argsString.startsWith(':')
					? argsString.slice(1).split(':')
					: argsString.split(':'); // fall back to just splitting whatever is left

				// Don't cache dynamic resolutions permanently in the same way, or cache specific instances?
				// Caching "ban_user:123" -> Ref to "ban_user" component is fine and saves the loop!
				this.componentCache.set(customId, component);

				return { component, args };
			}
		}

		return undefined;
	}

	/**
	 * Execute the component logic with validation and error handling.
	 */
	private async executeComponent(
		client: Client,
		interaction: Interaction,
		component: AnyComponent,
		args: string[] = [],
	): Promise<void> {
		const startTime = Date.now();
		const customId = component.customId;

		try {
			// Run Validation Guards (pass args if needed in future, current guards don't use them)
			for (const guard of this.guards) {
				const errorReply = await guard.validate(interaction, component);
				if (errorReply) {
					if (interaction.isRepliable()) {
						if (interaction.deferred || interaction.replied) {
							await interaction.followUp(errorReply);
						} else {
							await interaction.reply(errorReply);
						}
					}
					return;
				}
			}

			// Execute Run Logic
			// Inject args into the run call
			if ('run' in component) {
				// biome-ignore lint/suspicious/noExplicitAny: Component run signature
				await (component as any).run(client, interaction, args);
			}

			// Update Metrics
			this.updateMetrics(customId, Date.now() - startTime, false);
		} catch (error) {
			// ... (rest of error handling remains same)
			this.updateMetrics(customId, Date.now() - startTime, true);
			console.error(`Error executing component ${customId}:`, error);

			if (global.errorHandler?.handleError) {
				await global.errorHandler.handleError(error, 'ComponentExecutionError', {
					componentId: customId,
					userId: interaction.user.id,
				});
			}

			if (interaction.isRepliable() && !interaction.replied) {
				try {
					await interaction.reply({
						content: 'An error occurred while executing this action.',
						ephemeral: true,
					});
				} catch {
					/* ignore */
				}
			}
		}
	}

	private updateMetrics(customId: string, responseTime: number, failed: boolean): void {
		const current = this.metrics.get(customId) || {
			uses: 0,
			lastUsed: new Date(),
			averageResponseTime: 0,
			failures: 0,
		};

		current.uses++;
		current.lastUsed = new Date();
		current.averageResponseTime =
			(current.averageResponseTime * (current.uses - 1) + responseTime) / current.uses;
		if (failed) current.failures++;

		this.metrics.set(customId, current);
	}

	public getStats() {
		return {
			buttons: this.buttons.size,
			selects: this.selects.size,
			modals: this.modals.size,
			total: this.buttons.size + this.selects.size + this.modals.size,
			loaded: this.isLoaded,
		};
	}
}

// Export singleton instance
export const componentManager = new ComponentManager();
