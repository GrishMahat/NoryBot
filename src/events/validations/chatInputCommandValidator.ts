import 'colors';
import {
	EmbedBuilder,
	Client,
	Interaction,
	ColorResolvable,
	PermissionsBitField,
	TextChannel,
	NewsChannel,
	ChatInputCommandInteraction,
	PermissionResolvable,
	InteractionReplyOptions,
	Colors,
	GuildMember,
	AutocompleteInteraction,
} from 'discord.js';
import { config } from '../../config/config';
import mConfig from '../../config/messageConfig';
import getLocalCommands from '../../utils/helpers/getLocalCommands';
import LRUCache from '../../services/manager/LRUCache';
import { LocalCommand } from '../../types/index';
import cooldownManager from '../../services/manager/CooldownManager';

// Interface for command usage metrics
interface CommandMetrics {
	uses: number;
	lastUsed: Date;
	averageResponseTime: number;
	failures: number;
}

/**
 * Manages loading, validation, execution, and metrics for chat input commands.
 */
class CommandValidator {
	// Map storing command definitions by name
	private commandMap: Map<string, LocalCommand>;
	// Cache for the list of local commands to avoid frequent file reads
	private commandListCache: LRUCache<string, LocalCommand[]>;
	// Map storing usage metrics for each command
	private metrics: Map<string, CommandMetrics>;
	// Flag indicating if commands have been loaded initially
	private isInitialized: boolean;

	// Cache key for the list of all local commands
	private static readonly LOCAL_COMMANDS_CACHE_KEY = 'localCommands';

	constructor() {
		this.commandMap = new Map();
		this.metrics = new Map();
		this.isInitialized = false;
		// Initialize LRU cache for command definitions
		this.commandListCache = new LRUCache<string, LocalCommand[]>({
			capacity: 1, // Only cache the single list of commands
			defaultTTL: 2 * 60 * 60 * 1000, // 2 hour TTL
			cleanupIntervalMs: 15 * 60 * 1000, // Cleanup every 15 minutes
			evictionPolicy: 'LRU',
			resetTTLOnAccess: true, // Keep the list cached if accessed
			onExpiry: (key): void => this.handleCacheExpiry(key),
		});
	}

	/**
	 * Handles the expiration of the command list cache.
	 * Currently logs the event. Could be extended to trigger a refresh.
	 * @param key The cache key that expired.
	 */
	private handleCacheExpiry(key: string): void {
		if (key === CommandValidator.LOCAL_COMMANDS_CACHE_KEY) {
			console.log(
				`Command list cache expired. Will reload on next interaction.`.yellow,
			);
			// Reset initialization status so commands are reloaded
			this.isInitialized = false;
			this.commandMap.clear();
		}
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
		interaction: Interaction,
		color: ColorResolvable,
		description: string,
		options: Partial<InteractionReplyOptions> = {},
	): InteractionReplyOptions {
		return {
			embeds: [
				new EmbedBuilder()
					.setColor(color)
					.setDescription(description)
					.setAuthor({
						name: interaction.user.username,
						iconURL: interaction.user.displayAvatarURL({
							forceStatic: false,
						}),
					})
					.setTimestamp(),
			],
			// Default to ephemeral messages, can be overridden
			ephemeral: options.ephemeral ?? true,
			...options, // Spread any additional options
		};
	}

	/**
	 * Updates the usage metrics for a given command.
	 * @param commandName The name of the command.
	 * @param responseTime The time taken to execute the command in milliseconds.
	 * @param failed Whether the command execution resulted in an error.
	 */
	private updateMetrics(
		commandName: string,
		responseTime: number,
		failed: boolean = false,
	): void {
		// Get existing metrics or initialize if not present
		const metrics = this.metrics.get(commandName) || {
			uses: 0,
			lastUsed: new Date(),
			averageResponseTime: 0,
			failures: 0,
		};

		// Update metrics
		metrics.uses++;
		metrics.lastUsed = new Date();
		// Calculate rolling average response time
		metrics.averageResponseTime =
			(metrics.averageResponseTime * (metrics.uses - 1) + responseTime) /
			metrics.uses;
		if (failed) {
			metrics.failures++;
		}

		// Store updated metrics
		this.metrics.set(commandName, metrics);
	}

	/**
	 * Initializes the command validator by loading commands from the cache or source.
	 * This is called lazily on the first interaction.
	 */
	private async initializeCommands(): Promise<void> {
		if (this.isInitialized) return; // Already initialized

		try {
			console.log('Initializing commands...'.cyan);
			const localCommands = await this.getCachedLocalCommands();
			this.commandMap.clear(); // Clear existing map before reloading
			localCommands.forEach((cmd) => {
				if (cmd?.data?.name) {
					this.commandMap.set(cmd.data.name, cmd);
				} else {
					console.warn('Found command with missing data or name.'.yellow);
				}
			});
			this.isInitialized = true;
			console.log(`Successfully loaded ${this.commandMap.size} commands.`.green);
		} catch (error) {
			console.error('Failed to initialize commands:'.red, error);
			// Use global error handler if available
			if (global.errorHandler?.handleError) {
				await global.errorHandler.handleError(
					error,
					'CommandInitializationError',
				);
			}
			// Re-throw the error to indicate initialization failure
			throw new Error(`Command Initialization Failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Retrieves the list of local commands, utilizing the cache.
	 * @returns A promise resolving to the array of local commands.
	 */
	private async getCachedLocalCommands(): Promise<LocalCommand[]> {
		// Try fetching from cache first
		const cachedCommands = this.commandListCache.get(
			CommandValidator.LOCAL_COMMANDS_CACHE_KEY,
		);
		if (cachedCommands) {
			console.log('Retrieved command list from cache.'.blue);
			return cachedCommands;
		}

		// If not cached, fetch from source and cache it
		console.log('Fetching command list from source...'.blue);
		const commands = await getLocalCommands();
		this.commandListCache.set(
			CommandValidator.LOCAL_COMMANDS_CACHE_KEY,
			commands,
		);
		return commands;
	}

	/**
	 * Checks if a member has the required permissions in the interaction's context.
	 * @param interaction The interaction context.
	 * @param permissions The array of permissions to check.
	 * @param type Whether to check the 'user' or the 'bot'.
	 * @returns True if the member has all required permissions, false otherwise.
	 */
	private checkPermissions(
		interaction: ChatInputCommandInteraction, // Permissions usually relevant for commands
		permissions: PermissionResolvable[],
		type: 'user' | 'bot',
	): boolean {
		if (!interaction.guild) return false; // Permissions are guild-specific

		const member =
			type === 'user'
				? (interaction.member as GuildMember) // User invoking the command
				: interaction.guild.members.me; // The bot itself

		if (!member) return false; // Member not found
		// Ensure permissions is a PermissionsBitField object
		if (!(member.permissions instanceof PermissionsBitField)) return false;

		// Check if the member has all specified permissions
		return permissions.every((permission) => member.permissions.has(permission));
	}

	/**
	 * Validates a command interaction against various criteria (cooldown, permissions, modes).
	 * @param interaction The chat input command interaction.
	 * @param command The command definition.
	 * @returns An InteractionReplyOptions object if validation fails, otherwise null.
	 */
	private validateCommand(
		interaction: ChatInputCommandInteraction,
		command: LocalCommand,
	): InteractionReplyOptions | null {
		const { developersId, testServerId, maintenance } = config;
		const userId = interaction.user.id;
		const commandName = command.data.name;

		// 1. Maintenance Mode Check (only developers can use commands)
		if (maintenance && !developersId.includes(userId)) {
			return this.createEmbed(
				interaction,
				Colors.Red,
				'Bot is currently in maintenance mode. Please try again later.',
			);
		}

		// 2. Cooldown Check
		const remainingCooldown = cooldownManager.checkCooldown(userId, commandName);
		if (remainingCooldown > 0) {
			return this.createEmbed(
				interaction,
				Colors.Orange, // Use Orange for cooldown
				mConfig.commandCooldown.replace('{time}', remainingCooldown.toString()),
			);
		}

		// 3. Developer Only Check
		if (command.devOnly && !developersId.includes(userId)) {
			return this.createEmbed(interaction, Colors.Red, mConfig.commandDevOnly);
		}

		// 4. Test Server Only Check
		if (command.testMode && interaction.guild?.id !== testServerId) {
			return this.createEmbed(interaction, Colors.Red, mConfig.commandTestMode);
		}

		// 5. NSFW Channel Check (only applies in guild channels)
		if (command.nsfwMode) {
			const channel = interaction.channel;
			// Check if channel is a TextChannel or NewsChannel and if it's marked as NSFW
			if (
				!(
					(channel instanceof TextChannel || channel instanceof NewsChannel) &&
					channel.nsfw
				)
			) {
				return this.createEmbed(interaction, Colors.Red, mConfig.nsfw);
			}
		}

		// 6. User Permissions Check
		if (
			command.userPermissions?.length &&
			!this.checkPermissions(interaction, command.userPermissions, 'user')
		) {
			return this.createEmbed(
				interaction,
				Colors.Red,
				mConfig.userNoPermissions,
			);
		}

		// 7. Bot Permissions Check
		if (
			command.botPermissions?.length &&
			!this.checkPermissions(interaction, command.botPermissions, 'bot')
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
	 * Handles incoming interactions, routing them to the appropriate command logic
	 * after validation and initialization.
	 * @param client The Discord client instance.
	 * @param interaction The interaction received from Discord.
	 */
	public async handleInteraction(
		client: Client,
		interaction: Interaction,
	): Promise<void> {
		// Ensure commands are loaded before handling any interaction
		// This might introduce a small delay on the very first command after startup/cache expiry
		try {
			await this.initializeCommands();
		} catch (initError) {
			console.error('Initialization failed, cannot handle interaction:'.red, initError);
			// Attempt to inform the user if possible (and makes sense)
			if (interaction.isRepliable()) {
				try {
					await interaction.reply(this.createEmbed(interaction, Colors.Red, 'Bot initialization failed. Please contact support.'));
				} catch (replyError) {
					console.error('Failed to send initialization error reply:'.red, replyError);
				}
			}
			return; // Stop processing if initialization failed
		}

		// Handle Autocomplete Interactions
		if (interaction.isAutocomplete()) {
			await this.handleAutocomplete(client, interaction);
			return; // Autocomplete handled, exit
		}

		// Handle Chat Input Command Interactions
		if (interaction.isChatInputCommand()) {
			await this.handleChatInputCommand(client, interaction);
			return; // Chat input command handled, exit
		}

		// Ignore other interaction types (buttons, modals, etc.) in this validator
	}

	/**
	 * Handles autocomplete requests for commands.
	 * @param client The Discord client instance.
	 * @param interaction The autocomplete interaction.
	 */
	private async handleAutocomplete(
		client: Client,
		interaction: AutocompleteInteraction,
	): Promise<void> {
		const commandName = interaction.commandName;
		const command = this.commandMap.get(commandName);

		if (!command) {
			console.warn(`Autocomplete received for unknown command: ${commandName}`.yellow);
			// Cannot reply with embeds here, respond with empty choices or handle error
			try {
				await interaction.respond([]);
			} catch (e) {
				console.error(`Error responding to autocomplete for unknown command: ${commandName}`, e);
			}
			return;
		}

		// Delegate to the command's autocomplete handler if it exists
		if (command.autocomplete) {
			try {
				await command.autocomplete(client, interaction);
			} catch (error) {
				console.error(
					`Error during autocomplete for command ${commandName}:`.red,
					error,
				);
				// Avoid crashing, maybe log to global handler
				if (global.errorHandler?.handleError) {
					await global.errorHandler.handleError(error, 'AutocompleteError');
				}
				// Attempt to respond with empty choices to prevent timeout
				if (!interaction.responded) {
					try {
						await interaction.respond([]);
					} catch (respondError) {
						console.error(`Failed to send empty response after autocomplete error for ${commandName}:`, respondError);
					}
				}
			}
		} else {
			// No specific autocomplete handler, respond with empty choices
			try {
				await interaction.respond([]);
			} catch (e) {
				console.error(`Error sending default empty response for autocomplete: ${commandName}`, e);
			}
		}
	}

	/**
	 * Handles chat input command execution and validation.
	 * @param client The Discord client instance.
	 * @param interaction The chat input command interaction.
	 */
	private async handleChatInputCommand(
		client: Client,
		interaction: ChatInputCommandInteraction,
	): Promise<void> {
		const startTime = Date.now();
		const commandName = interaction.commandName;

		try {
			const command = this.commandMap.get(commandName);

			// Command Not Found
			if (!command) {
				console.warn(`Command not found: ${commandName}`.yellow);
				await interaction.reply(
					this.createEmbed(interaction, Colors.Red, 'Command not found.'),
				);
				return;
			}

			// Validate Command Usage
			const validationError = this.validateCommand(interaction, command);
			if (validationError) {
				await interaction.reply(validationError);
				// Optionally update metrics for failed validation attempts?
				// this.updateMetrics(commandName, Date.now() - startTime, true);
				return;
			}

			// Set Cooldown After Successful Validation
			cooldownManager.setCooldown(
				interaction.user.id,
				commandName,
				command.cooldown || 3, // Default cooldown if not specified
			);

			// Execute Command Logic
			await command.run(client, interaction);

			// Update Metrics on Success
			this.updateMetrics(commandName, Date.now() - startTime);

			console.log(
				`Command executed: ${commandName} by ${interaction.user.tag} (${interaction.user.id}) in ${Date.now() - startTime}ms`.green,
			);

		} catch (error) {
			// Update Metrics on Failure
			this.updateMetrics(commandName, Date.now() - startTime, true);
			console.error(`Error executing command ${commandName}:`.red, error);

			// Use global error handler
			if (global.errorHandler?.handleError) {
				await global.errorHandler.handleError(error, 'CommandExecutionError');
			}

			// Inform User about the Error (if possible)
			const errorMessage = this.createEmbed(
				interaction,
				Colors.Red,
				'An unexpected error occurred while executing this command.',
			);

			try {
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp(errorMessage);
				} else {
					await interaction.reply(errorMessage);
				}
			} catch (replyError) {
				console.error('Failed to send error reply to interaction:'.red, replyError);
			}
		}
	}


	/**
	 * Retrieves the current command usage metrics.
	 * @returns A map of command names to their metrics.
	 */
	public getMetrics(): Map<string, CommandMetrics> {
		return this.metrics;
	}

	/**
	 * Clears all stored command usage metrics.
	 */
	public clearMetrics(): void {
		this.metrics.clear();
		console.log('Command metrics cleared.'.yellow);
	}
}

// Create a singleton instance of the CommandValidator
const commandValidator = new CommandValidator();

// Export the handler function that uses the singleton instance
export default async (
	client: Client,
	interaction: Interaction,
): Promise<void> => {
	// Delegate handling to the singleton instance
	await commandValidator.handleInteraction(client, interaction);
};
