import { Client, Interaction, ButtonInteraction, StringSelectMenuInteraction, ModalSubmitInteraction } from 'discord.js';
import { Button, SelectMenu, Modal } from '../types/index';
import { loadAllComponents, ComponentType } from '../utils/helpers/loadComponents';

/**
 * Unified component manager that handles all component types
 */
export class ComponentManager {
	private buttons: Map<string, Button> = new Map();
	private selects: Map<string, SelectMenu> = new Map();
	private modals: Map<string, Modal> = new Map();
	private isLoaded: boolean = false;

	/**
	 * Load all components from the components directory
	 */
	async loadComponents(): Promise<void> {
		try {
			const { buttons, selects, modals } = await loadAllComponents();

			// Store components in their respective maps
			buttons.forEach(button => this.buttons.set(button.customId, button));
			selects.forEach(select => this.selects.set(select.customId, select));
			modals.forEach(modal => this.modals.set(modal.customId, modal));

			this.isLoaded = true;
			console.log(`ComponentManager: Loaded ${buttons.length} buttons, ${selects.length} selects, ${modals.length} modals`.green);
		} catch (error) {
			console.error('Failed to load components:', error);
			throw error;
		}
	}

	/**
	 * Handle any interaction that might be a component
	 */
	async handleInteraction(client: Client, interaction: Interaction): Promise<void> {
		if (!this.isLoaded) {
			await this.loadComponents();
		}

		if (interaction.isButton()) {
			await this.handleButton(client, interaction);
		} else if (interaction.isStringSelectMenu()) {
			await this.handleSelect(client, interaction);
		} else if (interaction.isModalSubmit()) {
			await this.handleModal(client, interaction);
		}
	}

	/**
	 * Handle button interactions
	 */
	private async handleButton(client: Client, interaction: ButtonInteraction): Promise<void> {
		const button = this.buttons.get(interaction.customId);
		if (!button) {
			console.warn(`Button not found: ${interaction.customId}`.yellow);
			return;
		}

		try {
			await button.run(client, interaction);
		} catch (error) {
			console.error(`Error executing button ${interaction.customId}:`, error);
			await global.errorHandler.handleError(error, 'ButtonExecutionError');
		}
	}

	/**
	 * Handle select menu interactions
	 */
	private async handleSelect(client: Client, interaction: StringSelectMenuInteraction): Promise<void> {
		const select = this.selects.get(interaction.customId);
		if (!select) {
			console.warn(`Select menu not found: ${interaction.customId}`.yellow);
			return;
		}

		try {
			await select.run(client, interaction);
		} catch (error) {
			console.error(`Error executing select ${interaction.customId}:`, error);
			await global.errorHandler.handleError(error, 'SelectExecutionError');
		}
	}

	/**
	 * Handle modal interactions
	 */
	private async handleModal(client: Client, interaction: ModalSubmitInteraction): Promise<void> {
		const modal = this.modals.get(interaction.customId);
		if (!modal) {
			console.warn(`Modal not found: ${interaction.customId}`.yellow);
			return;
		}

		try {
			await modal.run(client, interaction);
		} catch (error) {
			console.error(`Error executing modal ${interaction.customId}:`, error);
			await global.errorHandler.handleError(error, 'ModalExecutionError');
		}
	}

	/**
	 * Get a component by customId and type
	 */
	getComponent(customId: string, type: ComponentType): Button | SelectMenu | Modal | undefined {
		switch (type) {
			case 'buttons':
				return this.buttons.get(customId);
			case 'selects':
				return this.selects.get(customId);
			case 'modals':
				return this.modals.get(customId);
			default:
				return undefined;
		}
	}

	/**
	 * Get all components of a specific type
	 */
	getComponentsByType(type: ComponentType): (Button | SelectMenu | Modal)[] {
		switch (type) {
			case 'buttons':
				return Array.from(this.buttons.values());
			case 'selects':
				return Array.from(this.selects.values());
			case 'modals':
				return Array.from(this.modals.values());
			default:
				return [];
		}
	}

	/**
	 * Get component statistics
	 */
	getStats() {
		return {
			buttons: this.buttons.size,
			selects: this.selects.size,
			modals: this.modals.size,
			total: this.buttons.size + this.selects.size + this.modals.size,
			loaded: this.isLoaded
		};
	}
}

// Export singleton instance
export const componentManager = new ComponentManager();
