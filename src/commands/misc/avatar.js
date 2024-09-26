import {
   EmbedBuilder,
   SlashCommandBuilder,
   ActionRowBuilder,
   ButtonBuilder,
   ButtonStyle,
   AttachmentBuilder,
} from 'discord.js';
import {
   Avatar,
   AvatarChallenge,
   AvatarCustomization,
} from '../../schemas/AvatarSchema.js';
import { createCanvas, loadImage } from 'canvas';
import axios from 'axios';
import { fileTypeFromBuffer } from 'file-type';

export default {
   data: new SlashCommandBuilder()
      .setName('avatar')
      .setDescription('Show and interact with user avatars')
      .addUserOption((option) =>
         option
            .setName('user')
            .setDescription('User whose avatar you want to see')
            .setRequired(false)
      )
      .addStringOption((option) =>
         option
            .setName('style')
            .setDescription('Apply a style to the avatar')
            .setRequired(false)
            .addChoices(
               { name: 'Pixelate', value: 'pixelate' },
               { name: 'Sepia', value: 'sepia' },
               { name: 'Invert', value: 'invert' }
            )
      ),

   userPermissions: [],
   botPermissions: [],
   category: 'Misc',
   cooldown: 5,
   deleted: false,
   nwfwMode: false,
   testMode: false,
   devOnly: false,
   prefix: true,

   run: async (client, interaction) => {
      try {
         await interaction.deferReply();

         const user = interaction.options.getUser('user') || interaction.user;
         const member = interaction.guild.members.cache.get(user.id);
         const style = interaction.options.getString('style');

         const getAvatarUrl = (userOrMember, size = 1024) => {
            return userOrMember.displayAvatarURL({
               format: 'png',
               dynamic: true,
               size: size,
            });
         };

         const userAvatar = getAvatarUrl(user);
         const memberAvatar = member ? getAvatarUrl(member) : null;

         // Save the current avatar to the database only if it's different from the last one
         let newAvatar = await Avatar.findOne({
            userId: user.id,
            guildId: interaction.guild.id,
         }).sort({ timestamp: -1 });

         if (!newAvatar || newAvatar.avatarUrl !== userAvatar) {
            newAvatar = new Avatar({
               userId: user.id,
               guildId: interaction.guild.id,
               avatarUrl: userAvatar,
               isGlobal: true,
            });
            await newAvatar.save();
         }

         // Fetch avatar history
         const avatarHistory = await Avatar.find({
            userId: user.id,
            guildId: interaction.guild.id,
         })
            .sort({ timestamp: -1 })
            .limit(5);

         // Fetch active avatar challenge
         const activeChallenge = await AvatarChallenge.findOne({
            guildId: interaction.guild.id,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() },
         });

         // Fetch avatar customization
         const avatarCustomization = await AvatarCustomization.findOne({
            userId: user.id,
            guildId: interaction.guild.id,
         });

         // Apply style if specified
         let styledAvatarAttachment;
         if (style) {
            try {
               const avatarBuffer = await axios.get(userAvatar, { responseType: 'arraybuffer' }).then(response => Buffer.from(response.data, 'binary'));
               
               // Add this check to ensure the image is in a supported format
               const supportedFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
               const fileType = await import('file-type');
               const type = await fileType.fileTypeFromBuffer(avatarBuffer);
               
               if (!type || !supportedFormats.includes(type.mime)) {
                  throw new Error('Unsupported image format');
               }

               const image = await loadImage(avatarBuffer);
               const canvas = createCanvas(image.width, image.height);
               const ctx = canvas.getContext('2d');
               ctx.drawImage(image, 0, 0);

               switch (style) {
                  case 'pixelate':
                     const pixelSize = 10;
                     ctx.imageSmoothingEnabled = false;
                     ctx.drawImage(canvas, 0, 0, canvas.width / pixelSize, canvas.height / pixelSize);
                     ctx.drawImage(canvas, 0, 0, canvas.width / pixelSize, canvas.height / pixelSize, 0, 0, canvas.width, canvas.height);
                     break;
                  case 'sepia':
                     const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                     const data = imageData.data;
                     for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        data[i] = (r * 0.393) + (g * 0.769) + (b * 0.189);
                        data[i + 1] = (r * 0.349) + (g * 0.686) + (b * 0.168);
                        data[i + 2] = (r * 0.272) + (g * 0.534) + (b * 0.131);
                     }
                     ctx.putImageData(imageData, 0, 0);
                     break;
                  case 'invert':
                     const invertedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                     const invertedData = invertedImageData.data;
                     for (let i = 0; i < invertedData.length; i += 4) {
                        invertedData[i] = 255 - invertedData[i];
                        invertedData[i + 1] = 255 - invertedData[i + 1];
                        invertedData[i + 2] = 255 - invertedData[i + 2];
                     }
                     ctx.putImageData(invertedImageData, 0, 0);
                     break;
               }

               const styledAvatarBuffer = canvas.toBuffer();
               styledAvatarAttachment = new AttachmentBuilder(styledAvatarBuffer, { name: 'styled_avatar.png' });
            } catch (error) {
               console.error('Error applying style to avatar:', error);
               await interaction.editReply({
                  content: 'Unable to apply the style to this avatar. It might be in an unsupported format or temporarily unavailable.',
                  ephemeral: true,
               });
               return;
            }
         }

         const embed = new EmbedBuilder()
            .setTitle(`${user.username}'s Avatar`)
            .setDescription(`[Avatar URL](${userAvatar})`)
            .setImage(style ? 'attachment://styled_avatar.png' : userAvatar)
            .setColor(member?.displayHexColor || '#eb3434')
            .addFields(
               { name: '🆔 User ID', value: user.id, inline: true },
               {
                  name: '📅 Account Created',
                  value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
                  inline: true,
               },
               {
                  name: '🎭 Activity Status',
                  value: member?.presence?.status || 'Offline',
                  inline: true,
               },
               {
                  name: '📆 Server Join Date',
                  value: member
                     ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
                     : 'N/A',
                  inline: true,
               },
               {
                  name: '👑 Roles',
                  value: member
                     ? member.roles.cache
                          .filter((r) => r.id !== interaction.guild.id)
                          .map((r) => `<@&${r.id}>`)
                          .join(', ') || 'None'
                     : 'N/A',
                  inline: false,
               },
               {
                  name: '📜 Avatar History',
                  value:
                     avatarHistory
                        .map(
                           (a, index) =>
                              `[${index === 0 ? 'Current' : `${index + 1}`}](${a.avatarUrl})`
                        )
                        .join(' | ') || 'No history available',
                  inline: false,
               }
            )
            .setFooter({
               text: `Requested by ${interaction.user.username}`,
               iconURL: getAvatarUrl(interaction.user, 32),
            })
            .setTimestamp();

         if (memberAvatar && memberAvatar !== userAvatar) {
            embed.addFields({
               name: '🔗 Server Avatar',
               value: `[View](${memberAvatar})`,
               inline: true,
            });
         }

         if (activeChallenge) {
            embed.addFields({
               name: '🏆 Active Avatar Challenge',
               value: `"${activeChallenge.title}" - Ends <t:${Math.floor(activeChallenge.endDate.getTime() / 1000)}:R>`,
               inline: false,
            });
         }

         if (avatarCustomization) {
            embed.addFields({
               name: '🎨 Avatar Customization',
               value: `Frame: ${avatarCustomization.frame || 'None'}, Background: ${avatarCustomization.background || 'None'}`,
               inline: false,
            });
         }

         const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
               .setLabel('🌐 View in Browser')
               .setStyle(ButtonStyle.Link)
               .setURL(userAvatar),
            new ButtonBuilder()
               .setCustomId('avatar_refresh')
               .setLabel('🔄 Refresh')
               .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
               .setCustomId('avatar_delete')
               .setLabel('🗑️ Delete')
               .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
               .setCustomId('avatar_compare')
               .setLabel('🔍 Compare Avatars')
               .setStyle(ButtonStyle.Secondary)
               .setDisabled(!memberAvatar || memberAvatar === userAvatar)
         );

         const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
               .setCustomId('avatar_customize')
               .setLabel('🎨 Customize Avatar')
               .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
               .setCustomId('avatar_challenge')
               .setLabel('🏆 Start Challenge')
               .setStyle(ButtonStyle.Secondary)
               .setDisabled(!!activeChallenge)
         );

         const response = await interaction.editReply({
            embeds: [embed],
            components: [row1, row2],
            files: styledAvatarAttachment ? [styledAvatarAttachment] : [],
         });

         const collector = response.createMessageComponentCollector({
            time: 300000, // 5 minutes
         });

         collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
               return i.reply({
                  content: 'You cannot use these buttons.',
                  ephemeral: true,
               });
            }

            switch (i.customId) {
               case 'avatar_refresh':
                  const refreshedEmbed = EmbedBuilder.from(embed).setImage(
                     getAvatarUrl(user, 1024) + '?t=' + Date.now()
                  );
                  await i.update({ embeds: [refreshedEmbed] });
                  break;
               case 'avatar_delete':
                  await i.message.delete();
                  break;
               case 'avatar_compare':
                  const compareEmbed = new EmbedBuilder()
                     .setTitle(`Avatar Comparison for ${user.username}`)
                     .setDescription('Global Avatar vs Server Avatar')
                     .setColor(member?.displayHexColor || '#eb3434')
                     .setImage(userAvatar)
                     .setThumbnail(memberAvatar);
                  await i.update({ embeds: [compareEmbed] });
                  break;

               case 'avatar_customize':
                  // Implement avatar customization logic here
                  await i.reply({
                     content: 'Avatar customization feature coming soon!',
                     ephemeral: true,
                  });
                  break;

               case 'avatar_challenge':
                  // Implement avatar challenge creation logic here
                  await i.reply({
                     content: 'Avatar challenge creation feature coming soon!',
                     ephemeral: true,
                  });
                  break;
            }
         });

         collector.on('end', async () => {
            const disabledRow1 = ActionRowBuilder.from(row1).setComponents(
               row1.components.map((component) =>
                  ButtonBuilder.from(component).setDisabled(true)
               )
            );
            const disabledRow2 = ActionRowBuilder.from(row2).setComponents(
               row2.components.map((component) =>
                  ButtonBuilder.from(component).setDisabled(true)
               )
            );
            await response
               .edit({ components: [disabledRow1, disabledRow2] })
               .catch(() => {});
         });
      } catch (error) {
         console.error('Error in avatar command:', error);
         await interaction.editReply({
            content:
               'An error occurred while processing the command. Please try again later.',
            ephemeral: true,
         });
      }
   },
};
