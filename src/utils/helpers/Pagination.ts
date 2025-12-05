import {
	ActionRowBuilder,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	type CommandInteraction,
	type EmbedBuilder,
	type InteractionResponse,
	Message,
	type MessageActionRowComponentBuilder,
	type MessageComponentInteraction,
	MessageFlags,
	ModalBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	TextInputBuilder,
	TextInputStyle,
} from 'discord.js';

export type PaginationType = 'button' | 'select' | 'both';

export interface PaginationButtonEmojis {
	first: string;
	prev: string;
	next: string;
	last: string;
	stop?: string;
	jump?: string;
}

export interface PaginationSettings {
	/** Navigation type: 'button', 'select', or 'both' */
	type: PaginationType;
	/** Duration in milliseconds before the pagination expires */
	time: number;
	/** Custom emojis for buttons */
	buttonEmojis: PaginationButtonEmojis;
	/** Style of the navigation buttons */
	buttonStyle: ButtonStyle;
	/** Placeholder text for the select menu */
	placeholder: string;
	/** Maximum number of options to show in the select menu (max 25) */
	maxSelectOptions: number;
	/** Whether to show "Page X of Y" in the embed footer */
	showPageInfo: boolean;
	/** Whether to show the current page number in the footer */
	showCurrentPage: boolean;
	/** Whether to show the total page count in the footer */
	showTotalPages: boolean;
	/** Custom text to append to the footer */
	customFooter?: string;
	/** Initial page index (0-based) */
	startPage: number;
	/** Whether the response should be ephemeral */
	ephemeral: boolean;
	/** Whether to delete the message when the timeout expires */
	deleteOnTimeout: boolean;
	/** Whether to disable components when the timeout expires */
	disableOnTimeout: boolean;
	/** Whether to include a "Jump to Page" button */
	enableJump: boolean;
	/** Whether to include a "Stop" button to end pagination early */
	enableStop: boolean;
	/** Whether to include First/Last page buttons */
	fastSkip: boolean;
}

const DEFAULT_SETTINGS: PaginationSettings = {
	type: 'button',
	time: 5 * 60 * 1000,
	buttonEmojis: {
		first: '⏮️',
		prev: '◀️',
		next: '▶️',
		last: '⏭️',
		stop: '⏹️',
		jump: '↗️',
	},
	buttonStyle: ButtonStyle.Secondary,
	placeholder: 'Select a page...',
	maxSelectOptions: 25,
	showPageInfo: true,
	showCurrentPage: true,
	showTotalPages: true,
	startPage: 0,
	ephemeral: false,
	deleteOnTimeout: false,
	disableOnTimeout: true,
	enableJump: false,
	enableStop: false,
	fastSkip: true,
};

export class Pagination {
	private interaction: CommandInteraction;
	private pages: EmbedBuilder[];
	private settings: PaginationSettings;
	private currentPage: number;
	private message: Message | InteractionResponse | null = null;
	private collector: any = null;

	constructor(
		interaction: CommandInteraction,
		pages: EmbedBuilder[],
		settings: Partial<PaginationSettings> = {},
	) {
		this.interaction = interaction;
		this.pages = pages;
		this.settings = { ...DEFAULT_SETTINGS, ...settings };
		this.currentPage = Math.min(Math.max(0, this.settings.startPage), pages.length - 1);
	}

	public async send(): Promise<void> {
		if (this.pages.length === 0) {
			await this.handleEmptyPages();
			return;
		}

		if (this.pages.length === 1) {
			// If only one page, just send it without pagination controls
			await this.sendSinglePage();
			return;
		}

		await this.startPagination();
	}

	private async handleEmptyPages(): Promise<void> {
		const content = 'No content to display.';
		if (this.interaction.deferred || this.interaction.replied) {
			await this.interaction.editReply({ content });
		} else {
			await this.interaction.reply({
				content,
				flags: this.settings.ephemeral ? [MessageFlags.Ephemeral] : [],
			});
		}
	}

	private async sendSinglePage(): Promise<void> {
		const page = this.pages[0];
		this.updateFooter(page, 0);

		if (this.interaction.deferred || this.interaction.replied) {
			await this.interaction.editReply({
				embeds: [page],
				components: [],
			});
		} else {
			await this.interaction.reply({
				embeds: [page],
				components: [],
				flags: this.settings.ephemeral ? [MessageFlags.Ephemeral] : [],
			});
		}
	}

	private async startPagination(): Promise<void> {
		const page = this.pages[this.currentPage];
		this.updateFooter(page, this.currentPage);
		const components = this.getComponents();

		try {
			if (this.interaction.deferred || this.interaction.replied) {
				this.message = await this.interaction.editReply({
					embeds: [page],
					components,
				});
			} else {
				const response = await this.interaction.reply({
					embeds: [page],
					components,
					flags: this.settings.ephemeral ? [MessageFlags.Ephemeral] : [],
					withResponse: true,
				});
				this.message = response.resource?.message ?? null;
			}

			if (this.message) {
				this.createCollector();
			}
		} catch (error) {
			console.error('Failed to start pagination:', error);
		}
	}

	private updateFooter(embed: EmbedBuilder, pageIndex: number): void {
		const parts: string[] = [];
		if (this.settings.showPageInfo) {
			if (this.settings.showCurrentPage && this.settings.showTotalPages) {
				parts.push(`Page ${pageIndex + 1} of ${this.pages.length}`);
			} else if (this.settings.showCurrentPage) {
				parts.push(`Page ${pageIndex + 1}`);
			} else if (this.settings.showTotalPages) {
				parts.push(`${this.pages.length} Pages`);
			}
		}

		if (this.settings.customFooter) {
			parts.push(this.settings.customFooter);
		}

		if (parts.length > 0) {
			embed.setFooter({ text: parts.join(' • ') });
		}
	}

	private getComponents(): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
		const components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];

		if (this.settings.type === 'select' || this.settings.type === 'both') {
			components.push(this.createSelectMenu());
		}

		if (this.settings.type === 'button' || this.settings.type === 'both') {
			// createButtonRows returns an array of action rows (may be split if > 5 buttons)
			components.push(...this.createButtonRows());
		}

		return components;
	}

	private createSelectMenu(): ActionRowBuilder<MessageActionRowComponentBuilder> {
		const maxOptions = Math.min(this.settings.maxSelectOptions, 25);
		// Center the window around the current page
		let start = Math.max(0, this.currentPage - Math.floor(maxOptions / 2));
		const end = Math.min(this.pages.length, start + maxOptions);

		if (end - start < maxOptions) {
			start = Math.max(0, end - maxOptions);
		}

		const options = this.pages.slice(start, end).map((_, index) => {
			const actualIndex = start + index;
			return new StringSelectMenuOptionBuilder()
				.setLabel(`Page ${actualIndex + 1}`)
				.setValue(actualIndex.toString())
				.setDefault(actualIndex === this.currentPage);
		});

		const menu = new StringSelectMenuBuilder()
			.setCustomId('pagination_select')
			.setPlaceholder(this.settings.placeholder)
			.setOptions(options);

		return new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(menu);
	}

	private createButtonRows(): ActionRowBuilder<MessageActionRowComponentBuilder>[] {
		const buttons: ButtonBuilder[] = [];

		// First Page
		if (this.settings.fastSkip) {
			buttons.push(
				new ButtonBuilder()
					.setCustomId('pagination_first')
					.setEmoji(this.settings.buttonEmojis.first)
					.setStyle(this.settings.buttonStyle)
					.setDisabled(this.currentPage === 0),
			);
		}

		// Previous Page
		buttons.push(
			new ButtonBuilder()
				.setCustomId('pagination_prev')
				.setEmoji(this.settings.buttonEmojis.prev)
				.setStyle(this.settings.buttonStyle)
				.setDisabled(this.currentPage === 0),
		);

		// Next Page
		buttons.push(
			new ButtonBuilder()
				.setCustomId('pagination_next')
				.setEmoji(this.settings.buttonEmojis.next)
				.setStyle(this.settings.buttonStyle)
				.setDisabled(this.currentPage === this.pages.length - 1),
		);

		// Last Page
		if (this.settings.fastSkip) {
			buttons.push(
				new ButtonBuilder()
					.setCustomId('pagination_last')
					.setEmoji(this.settings.buttonEmojis.last)
					.setStyle(this.settings.buttonStyle)
					.setDisabled(this.currentPage === this.pages.length - 1),
			);
		}

		// Jump Button
		if (this.settings.enableJump) {
			buttons.push(
				new ButtonBuilder()
					.setCustomId('pagination_jump')
					.setEmoji(this.settings.buttonEmojis.jump || '↗️')
					.setStyle(ButtonStyle.Secondary)
					.setDisabled(false),
			);
		}

		// Stop Button
		if (this.settings.enableStop) {
			buttons.push(
				new ButtonBuilder()
					.setCustomId('pagination_stop')
					.setEmoji(this.settings.buttonEmojis.stop || '⏹️')
					.setStyle(ButtonStyle.Danger),
			);
		}

		// Discord limits action rows to 5 components each, so split buttons across rows
		const rows: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];
		const MAX_BUTTONS_PER_ROW = 5;

		for (let i = 0; i < buttons.length; i += MAX_BUTTONS_PER_ROW) {
			const rowButtons = buttons.slice(i, i + MAX_BUTTONS_PER_ROW);
			const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
				rowButtons,
			);
			rows.push(row);
		}

		return rows;
	}

	private createCollector(): void {
		if (!this.message) return;

		const setupCollector = async () => {
			try {
				// If message is a Message instance, we can create collector directly on it
				if (this.message instanceof Message) {
					this.collector = this.message.createMessageComponentCollector({
						filter: (i) => i.user.id === this.interaction.user.id,
						time: this.settings.time,
					});

					this.collector.on('collect', (i: MessageComponentInteraction) => this.handleCollect(i));
					this.collector.on('end', (_collected: any, reason: string) => this.handleEnd(reason));
					return;
				}

				// For InteractionResponse, try to fetch the actual message
				// This is more reliable for DMs and ephemeral messages
				let message: Message | null = null;

				try {
					// Try to fetch the reply as a Message object
					message = await this.interaction.fetchReply();
				} catch {
					// fetchReply failed, try alternative methods
				}

				if (message instanceof Message) {
					// We have a proper Message object, create collector on it
					this.message = message;
					this.collector = message.createMessageComponentCollector({
						filter: (i) => i.user.id === this.interaction.user.id,
						time: this.settings.time,
					});

					this.collector.on('collect', (i: MessageComponentInteraction) => this.handleCollect(i));
					this.collector.on('end', (_collected: any, reason: string) => this.handleEnd(reason));
					return;
				}

				// Fallback: try to get the channel
				let channel = this.interaction.channel;

				// If channel is not cached, try to fetch it
				if (!channel && this.interaction.channelId) {
					try {
						channel = (await this.interaction.client.channels.fetch(
							this.interaction.channelId,
						)) as any;
					} catch {
						// Channel fetch failed
					}
				}

				// For DMs, try to create or fetch the DM channel
				if (!channel && this.interaction.user) {
					try {
						channel = (await this.interaction.user.createDM()) as any;
					} catch {
						// DM channel creation failed
					}
				}

				if (!channel) {
					console.error('Failed to setup pagination collector: No channel available');
					return;
				}

				// Get the message ID for filtering
				let messageId: string | undefined;
				if (this.message && 'id' in this.message) {
					messageId = (this.message as InteractionResponse).id;
				}

				// Create the collector on the channel with a filter for this specific message
				this.collector = channel.createMessageComponentCollector({
					filter: (i) => {
						// Check if it's from the right user and the right message
						const isRightUser = i.user.id === this.interaction.user.id;
						const isRightMessage = messageId ? i.message.id === messageId : true;
						return isRightUser && isRightMessage;
					},
					time: this.settings.time,
				});

				this.collector.on('collect', (i: MessageComponentInteraction) => this.handleCollect(i));
				this.collector.on('end', (_collected: any, reason: string) => this.handleEnd(reason));
			} catch (error) {
				console.error('Failed to setup pagination collector:', error);
			}
		};

		setupCollector();
	}

	private async handleCollect(i: MessageComponentInteraction): Promise<void> {
		try {
			// Handle Jump to Page Modal Trigger
			if (i.isButton() && i.customId === 'pagination_jump') {
				await this.showJumpModal(i as ButtonInteraction);
				return;
			}

			await i.deferUpdate().catch(() => {});

			if (i.isButton()) {
				switch (i.customId) {
					case 'pagination_first':
						this.currentPage = 0;
						break;
					case 'pagination_prev':
						this.currentPage = Math.max(0, this.currentPage - 1);
						break;
					case 'pagination_next':
						this.currentPage = Math.min(this.pages.length - 1, this.currentPage + 1);
						break;
					case 'pagination_last':
						this.currentPage = this.pages.length - 1;
						break;
					case 'pagination_stop':
						this.collector.stop('user');
						return;
				}
			} else if (i.isStringSelectMenu() && i.customId === 'pagination_select') {
				this.currentPage = Number.parseInt(i.values[0]);
			}

			await this.updateMessage();
		} catch (error) {
			console.warn('Error handling pagination interaction:', error);
		}
	}

	private async showJumpModal(i: ButtonInteraction): Promise<void> {
		const modal = new ModalBuilder().setCustomId('pagination_jump_modal').setTitle('Jump to Page');

		const pageInput = new TextInputBuilder()
			.setCustomId('page_number')
			.setLabel(`Page Number (1 - ${this.pages.length})`)
			.setStyle(TextInputStyle.Short)
			.setPlaceholder('Enter page number')
			.setRequired(true)
			.setMinLength(1)
			.setMaxLength(this.pages.length.toString().length);

		const row = new ActionRowBuilder<TextInputBuilder>().addComponents(pageInput);
		modal.addComponents(row);

		await i.showModal(modal);

		try {
			const submitted = await i.awaitModalSubmit({
				time: 30000,
				filter: (modalInteraction) =>
					modalInteraction.customId === 'pagination_jump_modal' &&
					modalInteraction.user.id === i.user.id,
			});

			const pageNum = Number.parseInt(submitted.fields.getTextInputValue('page_number'));

			if (isNaN(pageNum) || pageNum < 1 || pageNum > this.pages.length) {
				await submitted.reply({
					content: 'Invalid page number.',
					ephemeral: true,
				});
				return;
			}

			await submitted.deferUpdate().catch(() => {});
			this.currentPage = pageNum - 1;
			await this.updateMessage();
		} catch (_error) {
			// Modal timed out or other error
		}
	}

	private async updateMessage(): Promise<void> {
		const page = this.pages[this.currentPage];
		this.updateFooter(page, this.currentPage);
		const components = this.getComponents();

		// Always use interaction.editReply() as it works via the interaction token
		// and doesn't require the channel to be cached (fixes DM issues)
		try {
			await this.interaction.editReply({
				embeds: [page],
				components,
			});
		} catch (_error) {
			// Fallback to message.edit if editReply fails
			if (this.message && 'edit' in this.message) {
				await (this.message as Message).edit({
					embeds: [page],
					components,
				});
			}
		}
	}

	private async handleEnd(reason: string): Promise<void> {
		if (this.settings.deleteOnTimeout && reason === 'time') {
			try {
				await this.interaction.deleteReply();
			} catch {
				// Fallback to message.delete
				try {
					if (this.message && 'delete' in this.message) {
						await (this.message as Message).delete();
					}
				} catch {}
			}
			return;
		}

		if (this.settings.disableOnTimeout && reason === 'time') {
			try {
				const disabledComponents = this.getComponents().map((row) => {
					row.components.forEach((c) => c.setDisabled(true));
					return row;
				});

				await this.interaction.editReply({ components: disabledComponents });
			} catch {
				// Fallback to message.edit
				try {
					if (this.message && 'edit' in this.message) {
						const disabledComponents = this.getComponents().map((row) => {
							row.components.forEach((c) => c.setDisabled(true));
							return row;
						});
						await (this.message as Message).edit({ components: disabledComponents });
					}
				} catch {}
			}
		}

		if (reason === 'user') {
			try {
				await this.interaction.deleteReply();
			} catch {
				// Fallback to message.delete
				try {
					if (this.message && 'delete' in this.message) {
						await (this.message as Message).delete();
					}
				} catch {}
			}
		}
	}
}

/**
 * Backwards-compatible helper for functional usage, but prefers the class.
 * @deprecated Use `new Pagination(interaction, pages, settings).send()` instead.
 */
export default async function createPagination(
	interaction: CommandInteraction,
	pages: EmbedBuilder[],
	settings: Partial<PaginationSettings> = {},
): Promise<void> {
	const pagination = new Pagination(interaction, pages, settings);
	await pagination.send();
}
