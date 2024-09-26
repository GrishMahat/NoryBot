import {
   ActionRowBuilder,
   ButtonBuilder,
   ButtonStyle,
   ComponentType,
   EmbedBuilder,
} from 'discord.js';

// Enhanced button creation with hover effects and tooltips
const createButton = (customId, emoji, style, disabled = false) => {
   return new ButtonBuilder()
      .setCustomId(customId)
      .setEmoji(emoji)
      .setStyle(style)
      .setDisabled(disabled)
      .setLabel(customId.charAt(0).toUpperCase() + customId.slice(1));
};



const updateButtons = (buttons, index, totalPages) => {
  buttons.forEach((button) => {
    switch (button.data.custom_id) {
      case 'first':
        button.setDisabled(index === 0);
        break;
      case 'prev':
        button.setDisabled(index === 0);
        break;
      case 'next':
        button.setDisabled(index === totalPages - 1);
        break;
      case 'last':
        button.setDisabled(index === totalPages - 1);
        break;
    }
    button.setStyle(ButtonStyle.Primary); // Ensure all buttons maintain Primary style
  });
};






// Improved transition with progress indicator
const animateTransition = async (msg, newEmbed, currentPage, totalPages) => {
   const loadingEmbed = new EmbedBuilder()
      .setDescription('Loading...')
      .setColor('#FFA500')
      .setFooter({ text: `Changing page... ${currentPage}/${totalPages}` });

   await msg.edit({ embeds: [loadingEmbed] });
   await new Promise((resolve) => setTimeout(resolve, 300));
   
   const fadeEmbed = new EmbedBuilder(newEmbed.data)
      .setColor('#FFFFFF')
      .setFooter({ text: `Page ${currentPage}/${totalPages}` });
   
   await msg.edit({ embeds: [fadeEmbed] });
   await new Promise((resolve) => setTimeout(resolve, 200));
   
   await msg.edit({ embeds: [newEmbed] });
};

// Enhanced LRU Cache with improved analytics
class EnhancedLRUCache {
   constructor(capacity) {
      this.capacity = capacity;
      this.cache = new Map();
      this.hits = 0;
      this.misses = 0;
      this.totalAccesses = 0;
   }

   get(key) {
      this.totalAccesses++;
      if (!this.cache.has(key)) {
         this.misses++;
         return undefined;
      }
      this.hits++;
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
   }

   put(key, value) {
      if (this.cache.size >= this.capacity) {
         const oldestKey = this.cache.keys().next().value;
         this.cache.delete(oldestKey);
      }
      this.cache.set(key, value);
   }

   prefetch(key, getValue) {
      if (!this.cache.has(key)) {
         const value = getValue(key);
         this.put(key, value);
      }
   }

   clear() {
      this.cache.clear();
      this.hits = 0;
      this.misses = 0;
      this.totalAccesses = 0;
   }

   getAnalytics() {
      return {
         hits: this.hits,
         misses: this.misses,
         hitRate: this.hits / this.totalAccesses || 0,
         efficiency: (this.hits / this.capacity) || 0,
      };
   }
}

/**
 * Creates an advanced pagination system with enhanced user experience.
 * @param {Interaction} interaction The interaction that triggered the pagination.
 * @param {Array<EmbedBuilder>} pages An array of embeds to paginate.
 * @param {Object} options Customization options
 */
export default async (interaction, pages, options = {}) => {
   try {
      if (!interaction) throw new Error('Invalid interaction');
      if (!pages || !Array.isArray(pages) || pages.length === 0)
         throw new Error('Invalid pages array');

      const defaultOptions = {
         time: 10 * 60 * 1000,
         buttonEmojis: {
            first: '⏮️',
            prev: '⬅️',
            next: '➡️',
            last: '⏭️',
         },
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
      };

      const mergedOptions = { ...defaultOptions, ...options };

      if (!interaction.deferred) await interaction.deferReply();

      if (pages.length === 0) {
         return await interaction.editReply({
            content: 'No content available at the moment. Please check back later or contact support if this persists.',
            components: [],
         });
      }

      if (pages.length === 1) {
         return await interaction.editReply({
            embeds: pages,
            components: [],
         });
      }

      const buttons = [
         createButton('first', mergedOptions.buttonEmojis.first, mergedOptions.buttonStyles.first),
         createButton('prev', mergedOptions.buttonEmojis.prev, mergedOptions.buttonStyles.prev),
         createButton('next', mergedOptions.buttonEmojis.next, mergedOptions.buttonStyles.next),
         createButton('last', mergedOptions.buttonEmojis.last, mergedOptions.buttonStyles.last),
      ];

      const row = new ActionRowBuilder().addComponents(buttons);
      let index = 0;

      const embedCache = new EnhancedLRUCache(mergedOptions.cacheSize);

      const getEmbed = (index) => {
         let embed = embedCache.get(index);
         if (!embed) {
            embed = new EmbedBuilder(pages[index].data);
            if (mergedOptions.showPageIndicator) {
               embed.setFooter({
                  text: `Page ${index + 1} of ${pages.length} | Use buttons to navigate`,
               });
            }
            embedCache.put(index, embed);
         }
         return embed;
      };

      const prefetchAdjacentPages = (currentIndex) => {
         const prefetchIndexes = [currentIndex - 1, currentIndex + 1, currentIndex - 2, currentIndex + 2];
         prefetchIndexes.forEach((idx) => {
            if (idx >= 0 && idx < pages.length) {
               embedCache.prefetch(idx, getEmbed);
            }
         });
      };

      updateButtons(buttons, index, pages.length);
      const msg = await interaction.editReply({
         embeds: [getEmbed(index)],
         components: [row],
         fetchReply: true,
      });

      const collector = msg.createMessageComponentCollector({
         componentType: ComponentType.Button,
         time: mergedOptions.time,
      });

      let usageCount = 0;

      collector.on('collect', async (i) => {
         if (!mergedOptions.allowUserNavigation && i.user.id !== interaction.user.id) {
            return i.reply({
               content: 'You are not authorized to navigate this content.',
               ephemeral: true,
            });
         }

         await i.deferUpdate();
         usageCount++;


         const oldIndex = index;
         switch (i.customId) {
           case 'first':
             index = 0;
             break;
           case 'prev':
             index = Math.max(0, index - 1);
             break;
           case 'next':
             index = Math.min(pages.length - 1, index + 1);
             break;
           case 'last':
             index = pages.length - 1;
             break;
         }


         updateButtons(buttons, index, pages.length);

         /*
         if (mergedOptions.animateTransitions && oldIndex !== index) {
            await animateTransition(msg, getEmbed(index), index + 1, pages.length);
         } else {
            await msg.edit({
               embeds: [getEmbed(index)],
               components: [row],
            });
         }
         prefetchAdjacentPages(index);
         */
                  await msg.edit({
                    embeds: [pages[index]],
                    components: [row],
                  });


         collector.resetTimer();
      });

      collector.on('end', async () => {
         buttons.forEach((button) => button.setDisabled(true));
         const finalEmbed = new EmbedBuilder(getEmbed(index).data)
            .setFooter({ text: 'This pagination session has ended. Use the command again to start a new session.' });
         
         await msg
            .edit({
               embeds: [finalEmbed],
               components: [row],
            })
            .catch(() => null);

         const analytics = embedCache.getAnalytics();
         console.log('Pagination Analytics:', analytics);
         console.log(`Total interactions: ${usageCount}`);
         embedCache.clear();
      });

      return msg;
   } catch (err) {
      console.error('Pagination error:', err);
      if (!interaction.replied && !interaction.deferred) {
         await interaction.reply({
            content: 'An unexpected error occurred while setting up the content. Please try again or contact support if the issue persists.',
            ephemeral: true,
         });
      } else {
         await interaction.editReply({
            content: 'An unexpected error occurred while displaying the content. Please try again or contact support if the issue persists.',
         });
      }
   }
};
