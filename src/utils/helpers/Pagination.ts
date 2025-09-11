import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	CommandInteraction,
	MessageComponentInteraction,
	MessageActionRowComponentBuilder,
	MessageFlags,
	ComponentType,
	Message,
    // v2 display components
    TextDisplayBuilder,
    SectionBuilder,
    ContainerBuilder,
} from 'discord.js';

export type PaginationType = 'button' | 'select' | 'both';

export interface PaginationSettings {
	type: PaginationType;
	time?: number;
	buttonEmojis?: {
		first?: string;
		prev: string;
		next: string;
		last?: string;
		stop?: string;
	};
	buttonStyle?: ButtonStyle;
	placeholder?: string;
	maxSelectOptions?: number;
	showPageNumbers?: boolean;
	disableOnTimeout?: boolean;
	showTotalPages?: boolean;
	showCurrentPage?: boolean;
	showPageInfo?: boolean;
	customFooter?: string;
	customColor?: number;
	ephemeral?: boolean;
	deleteOnTimeout?: boolean;
	autoDelete?: boolean;
	autoDeleteTime?: number;
	labels?: {
		first?: string;
		prev?: string;
		next?: string;
		last?: string;
		stop?: string;
	};
	selectLabelFormatter?: (index: number) => string;
}

const createButtonRow = (
	currentPage: number,
	totalPages: number,
	settings: PaginationSettings,
): ActionRowBuilder<MessageActionRowComponentBuilder> => {
	const row = new ActionRowBuilder<MessageActionRowComponentBuilder>();
	const buttons: ButtonBuilder[] = [];

	// First page button
	if (settings.buttonEmojis?.first) {
		buttons.push(
			new ButtonBuilder()
				.setCustomId('pagination_first')
				.setEmoji(settings.buttonEmojis.first)
				.setStyle(settings.buttonStyle ?? ButtonStyle.Primary)
				.setDisabled(currentPage === 0),
		);
	}

	// Previous page button
	buttons.push(
		new ButtonBuilder()
			.setCustomId('pagination_prev')
			.setEmoji(settings.buttonEmojis?.prev ?? '⬅️')
			.setStyle(settings.buttonStyle ?? ButtonStyle.Primary)
			.setDisabled(currentPage === 0),
	);

	// Stop button
	if (settings.buttonEmojis?.stop) {
		buttons.push(
			new ButtonBuilder()
				.setCustomId('pagination_stop')
				.setEmoji(settings.buttonEmojis.stop)
				.setStyle(ButtonStyle.Danger),
		);
	}

	// Next page button
	buttons.push(
		new ButtonBuilder()
			.setCustomId('pagination_next')
			.setEmoji(settings.buttonEmojis?.next ?? '➡️')
			.setStyle(settings.buttonStyle ?? ButtonStyle.Primary)
			.setDisabled(currentPage === totalPages - 1),
	);

	// Last page button
	if (settings.buttonEmojis?.last) {
		buttons.push(
			new ButtonBuilder()
				.setCustomId('pagination_last')
				.setEmoji(settings.buttonEmojis.last)
				.setStyle(settings.buttonStyle ?? ButtonStyle.Primary)
				.setDisabled(currentPage === totalPages - 1),
		);
	}

	return row.addComponents(buttons);
};

const createSelectMenu = (
	pages: EmbedBuilder[],
	currentPage: number,
	settings: PaginationSettings,
): ActionRowBuilder<MessageActionRowComponentBuilder> => {
	const maxOptions = Math.min(settings.maxSelectOptions ?? 25, 25);
	const options = pages.slice(0, maxOptions).map((_, index) =>
		new StringSelectMenuOptionBuilder()
			.setLabel(`Page ${index + 1}`)
			.setValue(index.toString())
			.setDefault(index === currentPage),
	);

	const menu = new StringSelectMenuBuilder()
		.setCustomId('pagination_select')
		.setPlaceholder(settings.placeholder ?? 'Select a page...')
		.setOptions(options);

	const row = new ActionRowBuilder<MessageActionRowComponentBuilder>();
	return row.addComponents(menu);
};

const updateEmbedFooter = (
	embed: EmbedBuilder,
	currentPage: number,
	totalPages: number,
	settings: PaginationSettings,
): void => {
	const footerParts: string[] = [];

	if (settings.showPageInfo) {
		if (settings.showCurrentPage) {
			footerParts.push(`Page ${currentPage + 1}`);
		}
		if (settings.showTotalPages) {
			footerParts.push(`of ${totalPages}`);
		}
	}

	if (settings.customFooter) {
		footerParts.push(settings.customFooter);
	}

	if (footerParts.length > 0) {
		embed.setFooter({ text: footerParts.join(' • ') });
	}
};

export default async function createPagination(
	interaction: CommandInteraction,
	pages: EmbedBuilder[],
	settings: Partial<PaginationSettings> = { type: 'button' },
): Promise<void> {
	// Prefer V2 display components if available; fall back to V1 embeds
	try {
		const { createPaginationV2 } = await import('./PaginationV2');
		await createPaginationV2(interaction, pages, {
			buttonEmojis: {
				prev: settings.buttonEmojis?.prev ?? '⬅️',
				next: settings.buttonEmojis?.next ?? '➡️',
				first: settings.buttonEmojis?.first,
				last: settings.buttonEmojis?.last,
				stop: settings.buttonEmojis?.stop,
			},
			time: settings.time,
			accentColor: settings.customColor,
			ephemeral: settings.ephemeral,
		});
		return;
	} catch {}
	if (!interaction) {
		console.error('Invalid interaction provided to pagination');
		return;
	}

	if (!Array.isArray(pages) || pages.length === 0) {
		console.error('Pages array is invalid or empty');
		try {
			if (interaction.deferred) {
				await interaction.editReply({ content: 'No content to display.' });
			} else if (!interaction.replied) {
				await interaction.reply({
					content: 'No content to display.',
					flags: [MessageFlags.Ephemeral],
				});
			}
		} catch (error) {
			console.error('Failed to reply with empty pages error:', error);
		}
		return;
	}

	const defaultSettings: PaginationSettings = {
		type: 'button',
		time: 5 * 60 * 1000,
		buttonStyle: ButtonStyle.Primary,
		maxSelectOptions: 25,
		showPageNumbers: true,
		disableOnTimeout: true,
		showTotalPages: true,
		showCurrentPage: true,
		showPageInfo: true,
		deleteOnTimeout: false,
		autoDelete: false,
		autoDeleteTime: 30 * 1000,
		...settings,
	};

	let currentPage = 0;
	const components: ActionRowBuilder<MessageActionRowComponentBuilder>[] = [];

	if (defaultSettings.type === 'button' || defaultSettings.type === 'both') {
		components.push(
			createButtonRow(currentPage, pages.length, defaultSettings),
		);
	}

	if (defaultSettings.type === 'select' || defaultSettings.type === 'both') {
		components.push(createSelectMenu(pages, currentPage, defaultSettings));
	}

	// Update the first page's footer
	updateEmbedFooter(
		pages[currentPage],
		currentPage,
		pages.length,
		defaultSettings,
	);

	// Handle the initial reply based on interaction state
	let initialMessage: Message;
	try {
		if (!interaction.deferred && !interaction.replied) {
			initialMessage = (await interaction.reply({
				embeds: [pages[currentPage]],
				components,
				withResponse: true,
				flags: defaultSettings.ephemeral ? MessageFlags.Ephemeral : undefined,
			})) as unknown as Message;
		} else {
			initialMessage = await interaction.editReply({
				embeds: [pages[currentPage]],
				components,
			});
		}
	} catch (error) {
		console.error('Failed to send initial pagination message:', error);
		return;
	}

	// Create collectors for button and select interactions
	try {
		const buttonCollector = initialMessage.createMessageComponentCollector({
			time: defaultSettings.time,
			filter: (i) => i.user.id === interaction.user.id,
			componentType: ComponentType.Button,
		});

		const selectCollector = initialMessage.createMessageComponentCollector({
			time: defaultSettings.time,
			filter: (i) => i.user.id === interaction.user.id,
			componentType: ComponentType.StringSelect,
		});

		const handlePageChange = async (
			newPage: number,
			i: MessageComponentInteraction,
		): Promise<void> => {
			if (newPage !== currentPage) {
				currentPage = newPage;
				updateEmbedFooter(
					pages[currentPage],
					currentPage,
					pages.length,
					defaultSettings,
				);

				const updatedComponents: ActionRowBuilder<MessageActionRowComponentBuilder>[] =
					[];

				if (
					defaultSettings.type === 'button' ||
					defaultSettings.type === 'both'
				) {
					updatedComponents.push(
						createButtonRow(currentPage, pages.length, defaultSettings),
					);
				}

				if (
					defaultSettings.type === 'select' ||
					defaultSettings.type === 'both'
				) {
					updatedComponents.push(
						createSelectMenu(pages, currentPage, defaultSettings),
					);
				}

				await i.update({
					embeds: [pages[currentPage]],
					components: updatedComponents,
				});
			}
		};

		buttonCollector.on('collect', async (i: MessageComponentInteraction) => {
			try {
				let newPage = currentPage;

				switch (i.customId) {
					case 'pagination_first':
						newPage = 0;
						break;
					case 'pagination_prev':
						newPage = Math.max(0, currentPage - 1);
						break;
					case 'pagination_next':
						newPage = Math.min(pages.length - 1, currentPage + 1);
						break;
					case 'pagination_last':
						newPage = pages.length - 1;
						break;
					case 'pagination_stop':
						buttonCollector.stop('user');
						selectCollector.stop('user');
						return;
				}

				await handlePageChange(newPage, i);
			} catch (error) {
				console.error('Error handling button interaction:', error);
				try {
					if (!i.replied && !i.deferred) {
						await i.reply({
							content:
								'An error occurred while changing pages. Please try again.',
							flags: [MessageFlags.Ephemeral],
						});
					}
				} catch (replyError) {
					console.error('Failed to send error response:', replyError);
				}
			}
		});

		selectCollector.on('collect', async (i: MessageComponentInteraction) => {
			try {
				if (i.isStringSelectMenu() && i.customId === 'pagination_select') {
					const newPage = parseInt(i.values[0]);
					await handlePageChange(newPage, i);
				}
			} catch (error) {
				console.error('Error handling select menu interaction:', error);
				try {
					if (!i.replied && !i.deferred) {
						await i.reply({
							content:
								'An error occurred while changing pages. Please try again.',
							flags: [MessageFlags.Ephemeral],
						});
					}
				} catch (replyError) {
					console.error('Failed to send error response:', replyError);
				}
			}
		});

		buttonCollector.on('end', async (collected, reason) => {
			try {
				// Check if the message is still fetchable before operations
				try {
					// Try to check if we can still access the channel
					await initialMessage.fetch();
				} catch (
					// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
					_
				) {
					// Message is no longer accessible, silently exit
					console.log(
						'Pagination message no longer accessible, skipping cleanup',
					);
					return;
				}

				if (defaultSettings.deleteOnTimeout && reason === 'time') {
					try {
						await initialMessage.delete();
					} catch (deleteError) {
						console.log('Unable to delete pagination message', deleteError);
					}
					return;
				}

				if (defaultSettings.disableOnTimeout && reason === 'time') {
					const disabledComponents = components.map((row) => {
						const newRow =
							new ActionRowBuilder<MessageActionRowComponentBuilder>(
								row.toJSON(),
							);
						newRow.components.forEach((comp) => {
							if ('setDisabled' in comp) {
								comp.setDisabled(true);
							}
						});
						return newRow;
					});

					try {
						await initialMessage.edit({ components: disabledComponents });
					} catch (editError) {
						console.log(
							'Unable to edit pagination message components',
							editError,
						);
					}
				}

				if (defaultSettings.autoDelete && reason === 'user') {
					setTimeout(async () => {
						try {
							await initialMessage.delete();
						} catch (error) {
							console.log('Failed to auto-delete message:', error);
						}
					}, defaultSettings.autoDeleteTime);
				}
			} catch (error) {
				console.error('Error in collector end handler:', error);
			}
		});

		selectCollector.on('end', async (collected, reason) => {
			try {
				// Check if the message is still fetchable before operations
				try {
					// Try to check if we can still access the channel
					await initialMessage.fetch();
				} catch (
					// eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
					_
				) {
					// Message is no longer accessible, silently exit
					console.log(
						'Pagination message no longer accessible, skipping cleanup',
					);
					return;
				}

				if (defaultSettings.deleteOnTimeout && reason === 'time') {
					try {
						await initialMessage.delete();
					} catch (deleteError) {
						console.log('Unable to delete pagination message', deleteError);
					}
					return;
				}

				if (defaultSettings.disableOnTimeout && reason === 'time') {
					const disabledComponents = components.map((row) => {
						const newRow =
							new ActionRowBuilder<MessageActionRowComponentBuilder>(
								row.toJSON(),
							);
						newRow.components.forEach((comp) => {
							if ('setDisabled' in comp) {
								comp.setDisabled(true);
							}
						});
						return newRow;
					});

					try {
						await initialMessage.edit({ components: disabledComponents });
					} catch (editError) {
						console.log(
							'Unable to edit pagination message components',
							editError,
						);
					}
				}

				if (defaultSettings.autoDelete && reason === 'user') {
					setTimeout(async () => {
						try {
							await initialMessage.delete();
						} catch (error) {
							console.log('Failed to auto-delete message:', error);
						}
					}, defaultSettings.autoDeleteTime);
				}
			} catch (error) {
				console.error('Error in collector end handler:', error);
			}
		});
	} catch (error) {
		console.error('Failed to create collectors:', error);
	}
}
