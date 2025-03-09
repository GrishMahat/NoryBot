import 'colors';
import {
	EmbedBuilder,
	Client,
	ModalSubmitInteraction,
	GuildMember,
	ColorResolvable,
	PermissionResolvable,
	MessageFlags,
} from 'discord.js';
import { config } from '../../config/config';
import mConfig from '../../config/messageConfig';
import getModals from '../../utils/helpers/getModals';

export interface Modal {
	customId: string;
	cooldown?: number;
	devOnly?: boolean;
	testMode?: boolean;
	userPermissions?: PermissionResolvable[];
	botPermissions?: PermissionResolvable[];
	compiledChecks?: {
		userPermissions: (interaction: ModalSubmitInteraction) => boolean;
		botPermissions: (interaction: ModalSubmitInteraction) => boolean;
	};
	run: (client: Client, interaction: ModalSubmitInteraction) => Promise<void>;
}

class LRUCache<K, V> {
	private capacity: number;
	private cache: Map<K, V>;

	constructor(capacity: number) {
		this.capacity = capacity;
		this.cache = new Map<K, V>();
	}

	get(key: K): V | undefined {
		if (!this.cache.has(key)) return undefined;
		const item = this.cache.get(key);
		if (!item) return undefined;
		this.cache.delete(key);
		this.cache.set(key, item);
		return item;
	}

	set(key: K, value: V): void {
		if (this.cache.size >= this.capacity) {
			const oldestKey = this.cache.keys().next().value;
			this.cache.delete(oldestKey);
		}
		this.cache.set(key, value);
	}
}

const modals = new Map<string, Modal>();
const cooldowns = new Map<string, number>();
const modalCache = new LRUCache<string, Modal>(100); // Adjust capacity as needed
let modalsLoaded = false;

const sendEmbedReply = async (
	interaction: ModalSubmitInteraction,
	color: ColorResolvable,
	description: string,
	ephemeral: boolean = true,
): Promise<void> => {
	try {
		const embed = new EmbedBuilder()
			.setColor(color)
			.setDescription(description)
			.setAuthor({
				name: interaction.user.username,
				iconURL: interaction.user.displayAvatarURL({ forceStatic: false }),
			})
			.setTimestamp();

		await interaction.reply({
			embeds: [embed],
			flags: ephemeral ? MessageFlags.Ephemeral : undefined,
		});
	} catch (err) {
		await global.errorHandler.handleError(err, 'ModalEmbedReplyError');
	}
};

const checkPermissions = (
	member: GuildMember,
	permissions: PermissionResolvable[],
): boolean =>
	permissions.every((permission) => member.permissions.has(permission));

const loadModals = async (retryCount: number = 0): Promise<void> => {
	try {
		const modalFiles: Modal[] = await getModals();
		for (const modal of modalFiles) {
			modal.compiledChecks = {
				userPermissions: modal.userPermissions
					? (interaction: ModalSubmitInteraction): boolean => {
							const member = interaction.member;
							if (!(member instanceof GuildMember) || !modal.userPermissions)
								return false;
							return checkPermissions(member, modal.userPermissions);
						}
					: (interaction: ModalSubmitInteraction): boolean => true,
				botPermissions: modal.botPermissions
					? (interaction: ModalSubmitInteraction): boolean => {
							const guild = interaction.guild;
							if (!guild || !modal.botPermissions) return false;
							const botMember = guild.members.me;
							if (!botMember) return false;
							return checkPermissions(botMember, modal.botPermissions);
						}
					: (interaction: ModalSubmitInteraction): boolean => true,
			};
			modals.set(modal.customId, modal);
		}
		console.log(`Loaded ${modals.size} modals`.green);
		modalsLoaded = true;
	} catch (error) {
		await global.errorHandler.handleError(error, 'ModalLoadError');

		if (retryCount < 3) {
			console.log(`Retrying modal load... (Attempt ${retryCount + 1})`.yellow);
			await new Promise((resolve) => setTimeout(resolve, 5000));
			await loadModals(retryCount + 1);
		} else {
			await global.errorHandler.handleError(
				new Error('Failed to load modals after 3 attempts'),
				'ModalLoadMaxRetriesError',
			);
		}
	}
};

const handleModal = async (
	client: Client,
	interaction: ModalSubmitInteraction,
): Promise<void> => {
	const { customId } = interaction;
	let modal = modalCache.get(customId);
	if (!modal) {
		modal = modals.get(customId);
		if (modal) modalCache.set(customId, modal);
	}

	if (!modal) return;
	const { developersId, testServerId } = config;

	if (modal.devOnly && !developersId.includes(interaction.user.id)) {
		return sendEmbedReply(interaction, 'Red', mConfig.commandDevOnly, true);
	}

	const guild = interaction.guild;
	if (modal.testMode && (!guild || guild.id !== testServerId)) {
		return sendEmbedReply(interaction, 'Red', mConfig.commandTestMode, true);
	}

	if (
		modal.compiledChecks &&
		!modal.compiledChecks.userPermissions(interaction)
	) {
		return sendEmbedReply(interaction, 'Red', mConfig.userNoPermissions, true);
	}

	if (
		modal.compiledChecks &&
		!modal.compiledChecks.botPermissions(interaction)
	) {
		return sendEmbedReply(interaction, 'Red', mConfig.botNoPermissions, true);
	}

	if (modal.cooldown) {
		const cooldownKey = `${interaction.user.id}-${customId}`;
		const cooldownTime = cooldowns.get(cooldownKey);
		if (cooldownTime && Date.now() < cooldownTime) {
			const remainingTime = Math.ceil((cooldownTime - Date.now()) / 1000);
			return sendEmbedReply(
				interaction,
				'Red',
				`Please wait ${remainingTime} seconds before using this modal again.`,
				true,
			);
		}
		cooldowns.set(cooldownKey, Date.now() + modal.cooldown * 1000);
	}

	try {
		console.log(
			`Executing modal ${customId} for user ${interaction.user.tag}`.cyan,
		);
		await modal.run(client, interaction);
	} catch (error) {
		await global.errorHandler.handleError(error, 'ModalExecutionError');

		sendEmbedReply(
			interaction,
			'Red',
			'There was an error while processing this modal!',
			true,
		);
	}
};

export default async (
	client: Client,
	interaction: ModalSubmitInteraction,
): Promise<void> => {
	if (!interaction.isModalSubmit()) return;

	if (!modalsLoaded) {
		await loadModals();
	}

	await handleModal(client, interaction);
};
