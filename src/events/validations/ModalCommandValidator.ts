import 'colors';
import {
	EmbedBuilder,
	Client,
	ModalSubmitInteraction,
	GuildMember,
	ColorResolvable,
	PermissionResolvable,
	InteractionReplyOptions,
	Colors,
	PermissionsBitField,
	Interaction,
} from 'discord.js';
import { config } from '../../config/config';
import mConfig from '../../config/messageConfig';
import getModals from '../../utils/helpers/getModals';
import LRUCache from '../../services/manager/LRUCache';
import cooldownManager from '../../services/manager/CooldownManager';

// Interface for Modal definition
export interface Modal {
	customId: string;
	cooldown?: number; // Cooldown in seconds
	devOnly?: boolean;
	testMode?: boolean;
	userPermissions?: PermissionResolvable[];
	botPermissions?: PermissionResolvable[];
	// Compiled checks are generated during loading
	compiledChecks?: {
		userPermissions: (interaction: ModalSubmitInteraction) => boolean;
		botPermissions: (interaction: ModalSubmitInteraction) => boolean;
	};
	run: (client: Client, interaction: ModalSubmitInteraction) => Promise<void>;
}

// Interface for modal usage metrics (similar to CommandValidator)
interface ModalMetrics {
	uses: number;
	lastUsed: Date;
	averageResponseTime: number;
	failures: number;
}

/**
 * Manages loading, validation, execution, and metrics for modal submit interactions.
 */
class ModalValidator {
	// Map storing modal definitions by customId
	private modalMap: Map<string, Modal>;
	// Cache for frequently accessed modals
	private modalCache: LRUCache<string, Modal>;
	// Map storing usage metrics for each modal
	private metrics: Map<string, ModalMetrics>;
	// Flag indicating if modals have been loaded initially
	private isInitialized: boolean;

	// Cache key prefix (though only one main list is loaded)
	private static readonly MODAL_CACHE_PREFIX = 'modal_';

	constructor() {
		this.modalMap = new Map();
		this.metrics = new Map();
		this.isInitialized = false;
		// Initialize LRU cache for modals
		this.modalCache = new LRUCache<string, Modal>({
			capacity: 100, // Adjust capacity as needed
			defaultTTL: 1 * 60 * 60 * 1000, // 1 hour TTL
			cleanupIntervalMs: 10 * 60 * 1000, // Cleanup every 10 minutes
			evictionPolicy: 'LRU',
			resetTTLOnAccess: true, // Keep frequently used modals cached
			onExpiry: (key): void => this.handleCacheExpiry(key),
		});
	}

	/**
	 * Handles the expiration of a modal from the cache.
	 * @param key The cache key that expired (customId).
	 */
	private handleCacheExpiry(key: string): void {
		console.log(`Modal '${key}' expired from cache.`.dim);
		// No action needed here unless we want to track cache misses specifically
	}

	/**
	 * Creates a standardized embed reply for interactions.
	 * @param interaction The interaction to reply to.
	 * @param color The color of the embed.
	 * @param description The main text of the embed.
	 * @param options Additional options for the reply (e.g., ephemeral).
	 * @returns The interaction reply options object.
	 */
	private createEmbed(
		interaction: Interaction, // Use base Interaction type for broader compatibility
		color: ColorResolvable,
		description: string,
		options: Partial<InteractionReplyOptions> = {},
	): InteractionReplyOptions {
		const user = interaction.user;
		return {
			embeds: [
				new EmbedBuilder()
					.setColor(color)
					.setDescription(description)
					.setAuthor({
						name: user.username,
						iconURL: user.displayAvatarURL({ forceStatic: false }),
					})
					.setTimestamp(),
			],
			// Default to ephemeral messages for modals, can be overridden
			ephemeral: options.ephemeral ?? true,
			...options, // Spread any additional options
		};
	}

	/**
	 * Updates the usage metrics for a given modal.
	 * @param customId The custom ID of the modal.
	 * @param responseTime The time taken to process the modal in milliseconds.
	 * @param failed Whether the modal execution resulted in an error.
	 */
	private updateMetrics(
		customId: string,
		responseTime: number,
		failed: boolean = false,
	): void {
		const metrics = this.metrics.get(customId) || {
			uses: 0,
			lastUsed: new Date(),
			averageResponseTime: 0,
			failures: 0,
		};

		metrics.uses++;
		metrics.lastUsed = new Date();
		// Calculate rolling average response time
		metrics.averageResponseTime =
			(metrics.averageResponseTime * (metrics.uses - 1) + responseTime) /
			metrics.uses;
		if (failed) {
			metrics.failures++;
		}

		this.metrics.set(customId, metrics);
	}

	/**
	 * Checks if a member has the required permissions.
	 * @param member The GuildMember to check.
	 * @param permissions The array of permissions required.
	 * @returns True if the member has all required permissions, false otherwise.
	 */
	private checkPermissions(
		member: GuildMember | null | undefined,
		permissions: PermissionResolvable[],
	): boolean {
		if (!member) return false;
		// Ensure permissions is a PermissionsBitField object
		if (!(member.permissions instanceof PermissionsBitField)) return false;
		// Check if the member has all specified permissions
		return permissions.every((permission) => member.permissions.has(permission));
	}

	/**
	 * Initializes the modal validator by loading modals from the source.
	 * This is called lazily on the first relevant interaction.
	 * @param retryCount The current retry attempt number.
	 */
	private async initializeModals(retryCount: number = 0): Promise<void> {
		if (this.isInitialized) return;

		try {
			console.log('Initializing modals...'.cyan);
			const modalFiles: Modal[] = await getModals();
			this.modalMap.clear(); // Clear existing map before reloading

			for (const modal of modalFiles) {
				// Compile permission checks for efficiency
				modal.compiledChecks = {
					userPermissions: modal.userPermissions
						? (interaction: ModalSubmitInteraction): boolean => {
								// Modals are often guild-based, but check just in case
								const member = interaction.member;
								if (!(member instanceof GuildMember)) return false; // Cannot check permissions outside a guild context
								return this.checkPermissions(member, modal.userPermissions || []);
							}
						: (): boolean => true, // No permissions required
					botPermissions: modal.botPermissions
						? (interaction: ModalSubmitInteraction): boolean => {
								const guild = interaction.guild;
								if (!guild?.members.me) return false; // Bot isn't in the guild or member object unavailable
								return this.checkPermissions(
									guild.members.me,
									modal.botPermissions || [],
								);
							}
						: (): boolean => true, // No permissions required
				};
				this.modalMap.set(modal.customId, modal);
			}

			console.log(`Successfully loaded ${this.modalMap.size} modals.`.green);
			this.isInitialized = true;
		} catch (error) {
			await global.errorHandler?.handleError(error, 'ModalLoadError');
			console.error('Failed to load modals:'.red, error);

			if (retryCount < 3) {
				console.log(
					`Retrying modal load in 5 seconds... (Attempt ${retryCount + 1})`.yellow,
				);
				await new Promise((resolve) => setTimeout(resolve, 5000));
				await this.initializeModals(retryCount + 1); // Retry loading
			} else {
				console.error(
					'Failed to load modals after multiple attempts. Modals will not be available.'
						.red,
				);
				// Optionally, notify admin or take other actions
				await global.errorHandler?.handleError(
					new Error('Failed to load modals after 3 attempts'),
					'ModalLoadMaxRetriesError',
				);
				// Consider setting isInitialized to true to prevent further load attempts,
				// or leave it false if retrying later is desired. For now, leave false.
			}
		}
	}

	/**
	 * Validates a modal interaction against various criteria (cooldown, permissions, modes).
	 * @param interaction The modal submit interaction.
	 * @param modal The modal definition.
	 * @returns An InteractionReplyOptions object if validation fails, otherwise null.
	 */
	private validateModal(
		interaction: ModalSubmitInteraction,
		modal: Modal,
	): InteractionReplyOptions | null {
		const { developersId, testServerId, maintenance } = config;
		const userId = interaction.user.id;
		const customId = modal.customId;

		// 1. Maintenance Mode Check (if applicable to modals, similar to commands)
		// if (maintenance && !developersId.includes(userId)) {
		//     return this.createEmbed(
		//         interaction,
		//         Colors.Red,
		//         'Bot is currently in maintenance mode. Please try again later.'
		//     );
		// }
		// Note: Maintenance mode check might not be standard for modals, uncomment if needed.

		// 2. Cooldown Check
		const remainingCooldown = cooldownManager.checkCooldown(userId, customId);
		if (remainingCooldown > 0) {
			return this.createEmbed(
				interaction,
				Colors.Orange, // Use Orange for cooldown
				mConfig.commandCooldown.replace('{time}', remainingCooldown.toString()), // Reuse command cooldown message
			);
		}

		// 3. Developer Only Check
		if (modal.devOnly && !developersId.includes(userId)) {
			return this.createEmbed(interaction, Colors.Red, mConfig.commandDevOnly);
		}

		// 4. Test Server Only Check
		if (modal.testMode && interaction.guild?.id !== testServerId) {
			return this.createEmbed(interaction, Colors.Red, mConfig.commandTestMode);
		}

		// 5. User Permissions Check (using compiled check)
		if (
			modal.compiledChecks &&
			!modal.compiledChecks.userPermissions(interaction)
		) {
			return this.createEmbed(
				interaction,
				Colors.Red,
				mConfig.userNoPermissions,
			);
		}

		// 6. Bot Permissions Check (using compiled check)
		if (
			modal.compiledChecks &&
			!modal.compiledChecks.botPermissions(interaction)
		) {
			return this.createEmbed(
				interaction,
				Colors.Red,
				mConfig.botNoPermissions,
			);
		}

		// All checks passed
		return null;
	}

	/**
	 * Handles incoming modal submit interactions.
	 * @param client The Discord client instance.
	 * @param interaction The interaction object.
	 */
	public async handleInteraction(
		client: Client,
		interaction: Interaction,
	): Promise<void> {
		// Ensure it's a modal submission
		if (!interaction.isModalSubmit()) return;

		// Lazy load modals on first interaction
		if (!this.isInitialized) {
			await this.initializeModals();
			// If initialization failed after retries, isInitialized might still be false.
			// We should probably stop processing if modals aren't loaded.
			if (!this.isInitialized) {
				console.warn('Modal interaction received, but modals are not loaded.'.yellow);
				try {
					await interaction.reply(
						this.createEmbed(
							interaction,
							Colors.Red,
							'Modal processing is currently unavailable. Please try again later.',
						),
					);
				} catch (replyError) {
					console.error('Failed to send modal unavailable reply:'.red, replyError);
				}
				return;
			}
		}

		const startTime = Date.now();
		const { customId } = interaction;
		let failed = false; // Track failure for metrics

		try {
			// Attempt to get modal from cache first, then from the main map
			let modal = this.modalCache.get(customId);
			if (!modal) {
				modal = this.modalMap.get(customId);
				if (modal) {
					this.modalCache.set(customId, modal); // Add to cache if found in map
				}
			}

			// Modal Not Found
			if (!modal) {
				console.warn(`Modal handler not found for customId: ${customId}`.yellow);
				// Optionally reply to the user, though often modals are internal
				// await interaction.reply(this.createEmbed(interaction, Colors.Red, 'Unknown modal interaction.'));
				return; // Stop processing if modal definition doesn't exist
			}

			// Validate Modal Usage
			const validationError = this.validateModal(interaction, modal);
			if (validationError) {
				failed = true; // Count validation failure
				await interaction.reply(validationError);
				return;
			}

			// Set Cooldown After Successful Validation
			cooldownManager.setCooldown(
				interaction.user.id,
				customId,
				modal.cooldown || 0, // Use modal cooldown or 0 if none
			);

			// Execute Modal Logic
			console.log(
				`Executing modal ${customId} for user ${interaction.user.tag}`.cyan,
			);
			await modal.run(client, interaction);
		} catch (error) {
			failed = true; // Mark as failed on execution error
			console.error(`Error executing modal ${customId}:`.red, error);
			await global.errorHandler?.handleError(error, 'ModalExecutionError');

			// Inform User about the Error (if possible)
			const errorMessage = this.createEmbed(
				interaction,
				Colors.Red,
				'An unexpected error occurred while processing this modal.',
			);

			try {
				// Modals usually expect a reply or followUp
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp(errorMessage);
				} else {
					await interaction.reply(errorMessage);
				}
			} catch (replyError) {
				console.error('Failed to send error reply for modal:'.red, replyError);
			}
		} finally {
			// Update Metrics regardless of success or failure (if modal was found)
			if (this.modalMap.has(customId)) {
				this.updateMetrics(customId, Date.now() - startTime, failed);
			}
		}
	}

	/**
	 * Retrieves the current modal usage metrics.
	 * @returns A map of modal custom IDs to their metrics.
	 */
	public getMetrics(): Map<string, ModalMetrics> {
		return this.metrics;
	}

	/**
	 * Clears all stored modal usage metrics.
	 */
	public clearMetrics(): void {
		this.metrics.clear();
		console.log('Modal metrics cleared.'.yellow);
	}
}

// Create a singleton instance of the ModalValidator
const modalValidator = new ModalValidator();

// Export the handler function that uses the singleton instance
export default async (
	client: Client,
	interaction: Interaction, // Accept base Interaction type
): Promise<void> => {
	// Delegate handling to the singleton instance
	await modalValidator.handleInteraction(client, interaction);
};
