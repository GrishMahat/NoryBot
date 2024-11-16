{/*
  import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  CommandInteraction,
  MessageComponentInteraction,
  Message,
  APIButtonComponentWithCustomId,
} from 'discord.js';

// Add proper type definitions
type ButtonId = 'first' | 'prev' | 'next' | 'last';
type CustomButton = ButtonBuilder & { accessible?: boolean };

interface PaginationSettings {
  time?: number;
  buttonEmojis?: {
    first: string;
    prev: string;
    next: string;
    last: string;
  };
  buttonStyles?: {
    first: ButtonStyle;
    prev: ButtonStyle;
    next: ButtonStyle;
    last: ButtonStyle;
  };
  animateTransitions?: boolean;
  cacheSize?: number;
  showPageIndicator?: boolean;
  allowUserNavigation?: boolean;
  buttonStyle?: 'default' | 'thin';
  selectMenuOptions?: SelectMenuCustomOptions;
  enableButtons?: boolean;
  enableSelectMenu?: boolean;
  loadingIndicator?: boolean;
  customButtonLabels?: {
    first?: string;
    prev?: string;
    next?: string;
    last?: string;
  };
  dynamicUpdates?: boolean;
  accessibilityLabels?: boolean;
  rateLimitPerUser?: number;
  maxPageJump?: number;
  disableOnTimeout?: boolean;
  pageValidation?: (page: number) => boolean | Promise<boolean>;
}

interface SelectMenuCustomOptions {
  enabled: boolean;
  placeholder: string;
  getDescription?: (embed: EmbedBuilder) => string;
  pageEmojis?: Record<number, string>;
  showPageNumbers?: boolean;
  maxOptions?: number;
}

interface CacheConfig {
  enabled: boolean;
  size: number;
  ttl: number;
}

// Utility type for component rows
type ComponentRow = ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>;

// Add new utility types
type PageUpdateCallback = (embed: EmbedBuilder, pageNum: number) => Promise<EmbedBuilder>;
type ComponentUpdateCallback = (components: ComponentRow[], pageNum: number) => Promise<ComponentRow[]>;

class PaginationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaginationError';
  }
}

// Add proper error handling
class PaginationRateLimitError extends PaginationError {
  constructor(waitTime: number) {
    super(`Please wait ${waitTime} seconds before changing pages again.`);
    this.name = 'PaginationRateLimitError';
  }
}

// Add proper button interface
interface CustomButtonBuilder extends ButtonBuilder {
  setAccessible(value: boolean): this;
  getData(): { custom_id?: string };
}


  const createButton = (
    customId: string,
    emoji: string,
    style: ButtonStyle,
    disabled = false
  ): ButtonBuilder => {
    return new ButtonBuilder()
      .setCustomId(customId)
      .setEmoji(emoji)
      .setStyle(style)
      .setDisabled(disabled)
      .setLabel(customId.charAt(0).toUpperCase() + customId.slice(1));
  };


  const createThinButton = (
    customId: string,
    emoji: string,
    style: ButtonStyle,
    disabled = false
  ): ButtonBuilder => {
    return new ButtonBuilder()
      .setCustomId(customId)
      .setEmoji(emoji)
      .setStyle(style)
      .setDisabled(disabled);
  };


  const updateButtons = (
    buttons: ButtonBuilder[],
    index: number,
    totalPages: number
  ): void => {
    buttons.forEach((button) => {
      const buttonData = button.data as APIButtonComponentWithCustomId;
      const customId = buttonData.custom_id;
      const isFirstPage = index === 0;
      const isLastPage = index === totalPages - 1;

      switch (customId) {
        case 'first':
        case 'prev':
          button.setDisabled(isFirstPage);
          break;
        case 'next':
        case 'last':
          button.setDisabled(isLastPage);
          break;
      }
    });
  };


  const animateTransition = async (
    message: Message,
    newEmbed: EmbedBuilder,
    currentPage: number,
    totalPages: number
  ): Promise<void> => {
    const loadingEmbed = new EmbedBuilder()
      .setDescription('Loading...')
      .setColor('#FFA500')
      .setFooter({ text: `Changing page... ${currentPage}/${totalPages}` });

    await message.edit({ embeds: [loadingEmbed] });
    await new Promise((resolve) => setTimeout(resolve, 300));

    const fadeEmbed = new EmbedBuilder(newEmbed.data)
      .setColor('#FFFFFF')
      .setFooter({ text: `Page ${currentPage}/${totalPages}` });

    await message.edit({ embeds: [fadeEmbed] });
    await new Promise((resolve) => setTimeout(resolve, 200));

    await message.edit({ embeds: [newEmbed] });
  };


  const createEnhancedSelectMenu = (
    customId: string,
    pages: EmbedBuilder[],
    currentPage: number,
    options: SelectMenuCustomOptions
  ): StringSelectMenuBuilder => {
    const maxOptions = Math.min(options.maxOptions ?? 25, 25); // Discord limit
    const totalPages = pages.length;

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(options.placeholder)
      .setMinValues(1)
      .setMaxValues(1);

    const effectivePages = Math.min(totalPages, maxOptions);

    const menuOptions = Array.from({ length: effectivePages }, (_, i) => {
      const emoji = options.pageEmojis?.[i] ?? `${i + 1}️⃣`;
      const description =
        options.getDescription?.(pages[i]) ?? `Navigate to page ${i + 1}`;

      return new StringSelectMenuOptionBuilder()
        .setLabel(`Page ${i + 1}`)
        .setDescription(description.substring(0, 100))
        .setEmoji(emoji)
        .setValue(i.toString())
        .setDefault(i === currentPage);
    });

    selectMenu.setOptions(menuOptions);

    if (totalPages > maxOptions) {
      selectMenu.addOptions({
        label: 'More pages available',
        description: `Additional pages cannot be shown (${totalPages - maxOptions
          } more)`,
        value: 'more',
        emoji: '⚠️',
      });
    }

    return selectMenu;
  };

  // Add new utility function for loading states
  const setLoadingState = async (message: Message, isLoading: boolean): Promise<void> => {
    if (isLoading && message.components) {
      const updatedComponents = message.components.map((row) => {
        const components = row.components.map((comp) => {
          if ('disabled' in comp) {
            return { ...comp, disabled: true };
          }
          return comp;
        });
        return { ...row, components };
      });

      await message.edit({ components: updatedComponents });
    }
  };

  // Add new utilities
  const validateButton = (button: CustomButton): ButtonBuilder => {
    if (!button.data.custom_id) {
      throw new PaginationError('Invalid button configuration');
    }
    return button;
  };

  const createAccessibleButton = (
    customId: ButtonId,
    emoji: string,
    style: ButtonStyle,
    label?: string
  ): ButtonBuilder => {
    const button = new ButtonBuilder()
      .setCustomId(customId)
      .setEmoji(emoji)
      .setStyle(style);

    if (label) {
      button.setLabel(label);
    }

    return button;
  };

  // Add cache manager
  class PageCache {
    private cache = new Map<number, { embed: EmbedBuilder; timestamp: number }>();
    private config: CacheConfig;

    constructor(config: CacheConfig) {
      this.config = config;
    }

    get(pageNum: number): EmbedBuilder | null {
      if (!this.config.enabled) return null;
      const cached = this.cache.get(pageNum);
      if (!cached) return null;
    
      const age = Date.now() - cached.timestamp;
      if (age > this.config.ttl) {
        this.cache.delete(pageNum);
        return null;
      }
    
      return cached.embed;
    }

    set(pageNum: number, embed: EmbedBuilder): void {
      if (!this.config.enabled) return;
    
      if (this.cache.size >= this.config.size) {
        const oldestKey = Array.from(this.cache.keys())[0];
        this.cache.delete(oldestKey);
      }
    
      this.cache.set(pageNum, { embed, timestamp: Date.now() });
    }
  }

  // Add embed update function
  const updateEmbed = async (embed: EmbedBuilder): Promise<EmbedBuilder> => {
    // Implement your dynamic embed update logic here
    return embed;
  };

  const createButtonComponents = (buttons: ButtonBuilder[]): MessageActionRow => ({
    type: ComponentType.ActionRow,
    components: buttons.map(b => b.toJSON()),
  });

  const createSelectMenuComponent = (menu: StringSelectMenuBuilder): MessageActionRow => ({
    type: ComponentType.ActionRow,
    components: [menu.toJSON()],
  });

  export default async function createPagination(
    interaction: CommandInteraction,
    pages: EmbedBuilder[],
    options: Partial<PaginationSettings> = {}
  ): Promise<void> {
    try {
      // Validate inputs
      if (!interaction) throw new PaginationError('Invalid interaction');
      if (!Array.isArray(pages) || pages.length === 0) {
        throw new PaginationError('Invalid pages array');
      }

      const settings: PaginationSettings = {
        time: 10 * 60 * 1000,
        buttonEmojis: { first: '⏮️', prev: '⬅️', next: '➡️', last: '⏭️' },
        buttonStyles: {
          first: ButtonStyle.Primary,
          prev: ButtonStyle.Primary,
          next: ButtonStyle.Primary,
          last: ButtonStyle.Primary,
        },
        animateTransitions: true,
        cacheSize: 15,
        showPageIndicator: true,
        allowUserNavigation: true,
        buttonStyle: 'default',
        selectMenuOptions: {
          enabled: true,
          placeholder: 'Select a page...',
          maxOptions: 25,
          showPageNumbers: true,
        },
        enableButtons: true,
        enableSelectMenu: true,
        loadingIndicator: true,
        customButtonLabels: {},
        dynamicUpdates: false,
        accessibilityLabels: true,
        rateLimitPerUser: 2,
        maxPageJump: 5,
        disableOnTimeout: true,
        pageValidation: undefined,
        ...options,
      };

      const pageCache = new PageCache({
        enabled: true,
        size: settings.cacheSize ?? 15,
        ttl: 5 * 60 * 1000 // 5 minutes
      });

      let currentPage = 0;
      const components: MessageComponentArray = [];
      let lastInteractionTime = 0;

      // Create buttons if enabled
      if (settings.enableButtons) {
        const buttons = settings.buttonStyle === 'thin'
          ? [
            createAccessibleButton(
              'first',
              settings.buttonEmojis.first,
              settings.buttonStyles.first
            ).setLabel(settings.customButtonLabels?.first || 'First Page'),
            createAccessibleButton(
              'prev',
              settings.buttonEmojis.prev,
              settings.buttonStyles.prev
            ).setLabel(settings.customButtonLabels?.prev || 'Previous Page'),
            createAccessibleButton(
              'next',
              settings.buttonEmojis.next,
              settings.buttonStyles.next
            ).setLabel(settings.customButtonLabels?.next || 'Next Page'),
            createAccessibleButton(
              'last',
              settings.buttonEmojis.last,
              settings.buttonStyles.last
            ).setLabel(settings.customButtonLabels?.last || 'Last Page'),
          ]
          : [
            createAccessibleButton(
              'first',
              settings.buttonEmojis.first,
              settings.buttonStyles.first
            ).setLabel(settings.customButtonLabels?.first || 'First Page'),
            createAccessibleButton(
              'prev',
              settings.buttonEmojis.prev,
              settings.buttonStyles.prev
            ).setLabel(settings.customButtonLabels?.prev || 'Previous Page'),
            createAccessibleButton(
              'next',
              settings.buttonEmojis.next,
              settings.buttonStyles.next
            ).setLabel(settings.customButtonLabels?.next || 'Next Page'),
            createAccessibleButton(
              'last',
              settings.buttonEmojis.last,
              settings.buttonStyles.last
            ).setLabel(settings.customButtonLabels?.last || 'Last Page'),
          ];

        components.push(createButtonComponents(buttons));
      }

      // Create select menu if enabled
      if (settings.enableSelectMenu && settings.selectMenuOptions?.enabled) {
        const selectMenu = createEnhancedSelectMenu(
          'page_select',
          pages,
          currentPage,
          settings.selectMenuOptions
        );
      
        components.push(createSelectMenuComponent(selectMenu));
      }

      // Send initial message
      const initialMessage = await interaction.reply({
        embeds: [pages[0]],
        components,
        fetchReply: true,
      });

      // Create collector
      const collector = initialMessage.createMessageComponentCollector({
        time: settings.time,
      });

      // Handle component interactions
      collector.on('collect', async (i: MessageComponentInteraction) => {
        if (i.user.id !== interaction.user.id) {
          await i.reply({
            content: 'This pagination is not for you!',
            ephemeral: true,
          });
          return;
        }

        try {
          if (i.message.interaction?.id !== interaction.id) {
            await i.reply({ content: 'This pagination session has expired.', ephemeral: true });
            return;
          }

          // Rate limit check
          const now = Date.now();
          const timeSinceLastInteraction = (now - lastInteractionTime) / 1000;
          if (timeSinceLastInteraction < settings.rateLimitPerUser!) {
            throw new PaginationRateLimitError(
              Math.ceil(settings.rateLimitPerUser! - timeSinceLastInteraction)
            );
          }
          lastInteractionTime = now;

          if (settings.loadingIndicator) {
            await setLoadingState(i.message as Message, true);
          }

          let newPage = currentPage;
          if (i.isStringSelectMenu()) {
            newPage = parseInt(i.values[0]);
            if (Math.abs(newPage - currentPage) > settings.maxPageJump!) {
              throw new PaginationError(`Cannot jump more than ${settings.maxPageJump} pages at once`);
            }
          } else if (i.isButton() && settings.enableButtons) {
            switch (i.customId) {
              case 'first':
                newPage = 0;
                break;
              case 'prev':
                newPage = Math.max(0, currentPage - 1);
                break;
              case 'next':
                newPage = Math.min(pages.length - 1, currentPage + 1);
                break;
              case 'last':
                newPage = pages.length - 1;
                break;
              default:
                throw new PaginationError('Invalid button interaction');
            }
          }

          // Page validation
          if (settings.pageValidation) {
            const isValid = await settings.pageValidation(newPage);
            if (!isValid) {
              throw new PaginationError('Invalid page selection');
            }
          }

          // Get page from cache or original
          let pageEmbed = pageCache.get(newPage) ?? pages[newPage];
        
          // Update components with proper type safety
          const updatedComponents = components.map(component => {
            const row = ActionRowBuilder.from(component);
            if (row.components[0] instanceof ButtonBuilder) {
              updateButtons(row.components as ButtonBuilder[], newPage, pages.length);
            }
            return row.toJSON();
          });

          // Handle page transition
          if (settings.animateTransitions) {
            await animateTransition(
              i.message,
              pageEmbed,
              newPage + 1,
              pages.length
            );
          } else {
            await i.update({
              embeds: [pageEmbed],
              components: updatedComponents
            }).catch(error => {
              throw new PaginationError('Failed to update message: ' + error.message);
            });
          }

          // Cache the page
          pageCache.set(newPage, pageEmbed);
          currentPage = newPage;

          // Support dynamic updates if enabled
          if (settings.dynamicUpdates) {
            pages[currentPage] = await updateEmbed(pages[currentPage]);
          }

          if (settings.loadingIndicator) {
            await setLoadingState(i.message, false);
          }

        } catch (err) {
          const errorMessage = err instanceof PaginationError
            ? err.message
            : 'An unexpected error occurred';
          
          await i.reply({ content: errorMessage, ephemeral: true })
            .catch(() => { });
        }
      });

      // Clean up on collector end
      collector.on('end', async () => {
        if (settings.disableOnTimeout) {
          try {
            const disabledComponents = components.map(component => {
              const row = ActionRowBuilder.from(component);
              row.components.forEach(comp => {
                if ('setDisabled' in comp) {
                  (comp as ButtonBuilder).setDisabled(true);
                }
              });
              return row.toJSON();
            });

            await initialMessage.edit({ components: disabledComponents });
          } catch (error) {
            console.error('Failed to disable components:', error);
          }
        }
      });

      // Add performance optimization
      const cache = new Map<number, EmbedBuilder>();
      const getPage = (index: number) => {
        if (!cache.has(index)) {
          cache.set(index, pages[index]);
          if (cache.size > settings.cacheSize!) {
            cache.delete(Array.from(cache.keys())[0]);
          }
        }
        return cache.get(index)!;
      };

    } catch (err) {
      console.error('Pagination error:', err);
      const errorMessage =
        err instanceof PaginationError
          ? err.message
          : 'An unexpected error occurred';

      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: errorMessage,
          ephemeral: true,
        });
      } else {
        await interaction.editReply({
          content: errorMessage,
        });
      }
    }
  }
*/}