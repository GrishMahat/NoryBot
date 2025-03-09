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
} from 'discord.js';

type PaginationType = 'button' | 'select';

interface PaginationSettings {
	type: PaginationType;
	time?: number;
	buttonEmojis?: {
		prev: string;
		next: string;
	};
	buttonStyle?: ButtonStyle;
	placeholder?: string;
	maxSelectOptions?: number;
	showPageNumbers?: boolean;
	disableOnTimeout?: boolean;
}

const createButtonRow = (
	currentPage: number,
	totalPages: number,
	settings: PaginationSettings,
): ActionRowBuilder<MessageActionRowComponentBuilder> => {
	const row = new ActionRowBuilder<MessageActionRowComponentBuilder>();

	const prevButton = new ButtonBuilder()
		.setCustomId('pagination_prev')
		.setEmoji(settings.buttonEmojis?.prev ?? '⬅️')
		.setStyle(settings.buttonStyle ?? ButtonStyle.Primary)
		.setDisabled(currentPage === 0);

	const nextButton = new ButtonBuilder()
		.setCustomId('pagination_next')
		.setEmoji(settings.buttonEmojis?.next ?? '➡️')
		.setStyle(settings.buttonStyle ?? ButtonStyle.Primary)
		.setDisabled(currentPage === totalPages - 1);

	return row.addComponents(prevButton, nextButton);
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

export default async function createPagination(
	interaction: CommandInteraction,
	pages: EmbedBuilder[],
	settings: PaginationSettings,
): Promise<void> {
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
					ephemeral: true,
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
		...settings,
	};

	let currentPage = 0;
	const components =
		defaultSettings.type === 'button'
			? [createButtonRow(currentPage, pages.length, defaultSettings)]
			: [createSelectMenu(pages, currentPage, defaultSettings)];

	// Handle the initial reply based on interaction state
	let initialMessage;
	try {
		// Check if the interaction is still valid
		if (!interaction.deferred && !interaction.replied) {
			// This should rarely happen as we defer in the command
			initialMessage = await interaction.reply({
				embeds: [pages[currentPage]],
				components,
				fetchReply: true,
			});
		} else {
			// Most common path - edit the deferred reply
			initialMessage = await interaction.editReply({
				embeds: [pages[currentPage]],
				components,
			});
		}
	} catch (error) {
		console.error('Failed to send initial pagination message:', error);
		// If we can't send the initial message, we can't continue with pagination
		return;
	}

	// Create a collector for button/select interactions
	try {
		const collector = initialMessage.createMessageComponentCollector({
			time: defaultSettings.time,
		});

		collector.on('collect', async (i: MessageComponentInteraction) => {
			// Verify the user is the one who initiated the command
			if (i.user.id !== interaction.user.id) {
				try {
					await i.reply({
						content: 'This pagination is not for you!',
						flags: MessageFlags.Ephemeral,
					});
				} catch (error) {
					console.error('Failed to reply to non-owner interaction:', error);
				}
				return;
			}

			try {
				let newPage = currentPage;

				if (defaultSettings.type === 'button' && i.isButton()) {
					if (i.customId === 'pagination_prev') {
						newPage = Math.max(0, currentPage - 1);
					} else if (i.customId === 'pagination_next') {
						newPage = Math.min(pages.length - 1, currentPage + 1);
					}

					const updatedRow = createButtonRow(
						newPage,
						pages.length,
						defaultSettings,
					);
					await i.update({
						embeds: [pages[newPage]],
						components: [updatedRow],
					});
				} else if (
					defaultSettings.type === 'select' &&
					i.isStringSelectMenu()
				) {
					newPage = parseInt(i.values[0]);
					const updatedMenu = createSelectMenu(pages, newPage, defaultSettings);
					await i.update({
						embeds: [pages[newPage]],
						components: [updatedMenu],
					});
				}

				currentPage = newPage;
			} catch (err) {
				console.error('Error handling pagination interaction:', err);
				try {
					// Only reply if we haven't already
					if (!i.replied && !i.deferred) {
						await i.reply({
							content:
								'An error occurred while changing pages. Please try again.',
							flags: MessageFlags.Ephemeral,
						});
					}
				} catch (replyError) {
					console.error('Failed to send error response:', replyError);
				}
			}
		});

		collector.on('end', async () => {
			if (defaultSettings.disableOnTimeout) {
				try {
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

					await initialMessage
						.edit({ components: disabledComponents })
						.catch((error) => {
							console.error('Failed to disable components on timeout:', error);
						});
				} catch (error) {
					console.error('Failed to disable components:', error);
				}
			}
		});
	} catch (error) {
		console.error('Failed to create collector:', error);
		// If we can't create a collector, we'll just leave the message as is
	}
}
