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

class PaginationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaginationError';
  }
}

const createButtonRow = (
  currentPage: number,
  totalPages: number,
  settings: PaginationSettings
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
  settings: PaginationSettings
): ActionRowBuilder<MessageActionRowComponentBuilder> => {
  const maxOptions = Math.min(settings.maxSelectOptions ?? 25, 25);
  const options = pages.slice(0, maxOptions).map((_, index) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`Page ${index + 1}`)
      .setValue(index.toString())
      .setDefault(index === currentPage)
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
  settings: PaginationSettings
): Promise<void> {
  try {
    if (!interaction) {
      throw new PaginationError('Invalid interaction provided');
    }

    if (!Array.isArray(pages) || pages.length === 0) {
      throw new PaginationError('Pages array is invalid or empty');
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

    const initialMessage = await interaction.reply({
      embeds: [pages[currentPage]],
      components,
    }).then(response => response);

    const collector = initialMessage.createMessageComponentCollector({
      time: defaultSettings.time,
    });

    collector.on('collect', async (i: MessageComponentInteraction) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({
          content: 'This pagination is not for you!',
          flags: MessageFlags.Ephemeral,
        });
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
            defaultSettings
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
        await i.reply({
          content: err instanceof Error ? err.message : 'An error occurred',
          flags: MessageFlags.Ephemeral,
        });
      }
    });

    collector.on('end', async () => {
      if (defaultSettings.disableOnTimeout) {
        try {
          const disabledComponents = components.map((row) => {
            const newRow =
              new ActionRowBuilder<MessageActionRowComponentBuilder>(
                row.toJSON()
              );
            newRow.components.forEach((comp) => {
              if ('setDisabled' in comp) {
                comp.setDisabled(true);
              }
            });
            return newRow;
          });

          await initialMessage.edit({ components: disabledComponents });
        } catch (error) {
          console.error('Failed to disable components:', error);
        }
      }
    });
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : 'An unexpected error occurred';
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: errorMessage,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.editReply({ content: errorMessage });
    }
  }
}
