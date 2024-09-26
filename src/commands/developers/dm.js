import {
   SlashCommandBuilder,
   PermissionFlagsBits,
   ActionRowBuilder,
   ButtonBuilder,
   ButtonStyle,
   EmbedBuilder,
} from 'discord.js';
import Bottleneck from 'bottleneck';

const limiter = new Bottleneck({
   minTime: 1000,
   maxConcurrent: 1,
});

const funnyMessages = [
   "Oops! Looks like we're playing hide and seek with your DMs!",
   "Houston, we have a problem... Your DMs are in stealth mode!",
   "Knock knock! Who's there? Not your DMs, apparently!",
   "Your DMs are like my ex - they won't let me in!",
   "I tried to slide into your DMs, but they're too slippery!",
];

export default {
   data: new SlashCommandBuilder()
      .setName('dm')
      .setDescription(
         'Send a fun direct message to a user, role, or all members in the server'
      )
      .addSubcommand((subcommand) =>
         subcommand
            .setName('user')
            .setDescription('Send a quirky DM to a specific user')
            .addUserOption((option) =>
               option
                  .setName('target')
                  .setDescription('The lucky user to receive your message')
                  .setRequired(true)
            )
            .addStringOption((option) =>
               option
                  .setName('message')
                  .setDescription(
                     "Your witty message (Use {user} for recipient's name and {emoji} for a random emoji)"
                  )
                  .setRequired(true)
            )
      )
      .addSubcommand((subcommand) =>
         subcommand
            .setName('role')
            .setDescription('Send a hilarious DM to all users with a specific role')
            .addRoleOption((option) =>
               option
                  .setName('target')
                  .setDescription('The role to bombard with fun')
                  .setRequired(true)
            )
            .addStringOption((option) =>
               option
                  .setName('message')
                  .setDescription(
                     "Your comedic message (Use {user} for recipient's name and {emoji} for a random emoji)"
                  )
                  .setRequired(true)
            )
      )
      .addSubcommand((subcommand) =>
         subcommand
            .setName('all')
            .setDescription('Send a jolly DM to all members in the server')
            .addStringOption((option) =>
               option
                  .setName('message')
                  .setDescription(
                     "Your merry message (Use {user} for recipient's name and {emoji} for a random emoji)"
                  )
                  .setRequired(true)
            )
      )
      .toJSON(),

   userPermissions: [PermissionFlagsBits.ManageMessages],
   botPermissions: [PermissionFlagsBits.SendMessages],
   cooldown: 5,
   nwfwMode: false,
   testMode: false,
   devOnly: true,
   category: 'Developer',
   prefix: false,

   run: async (client, interaction) => {
      const subcommand = interaction.options.getSubcommand();
      let message = interaction.options.getString('message').trim();

      const sendMessage = async (user) => {
         if (!user || user.bot) {
            return { success: false, reason: 'USER_NOT_FOUND_OR_BOT' };
         }

         try {
            const personalizedMessage = message
               .replace(/{user}/g, user.displayName)
               .replace(/{emoji}/g, getRandomEmoji());
            await limiter.schedule(() => user.send(personalizedMessage));
            return { success: true };
         } catch (error) {
            return { success: false, reason: error.code };
         }
      };

      const handleProcess = async (members, description) => {
         const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
               .setCustomId('confirm')
               .setLabel('Let\'s do this!')
               .setStyle(ButtonStyle.Primary)
               .setEmoji('🎉'),
            new ButtonBuilder()
               .setCustomId('cancel')
               .setLabel('Oops, nevermind!')
               .setStyle(ButtonStyle.Danger)
               .setEmoji('🙈')
         );

         const confirmEmbed = new EmbedBuilder()
            .setColor("Green")
            .setTitle('Time for some fun! 🎈')
            .setDescription(`Are you ready to spread joy to ${members.size} ${description}?`)
            .addFields(
               { name: 'Your Masterpiece', value: message.substring(0, 1024) }
            )
            .setFooter({ text: 'Brought to you by the Ministry of Silly Messages' })
            .setTimestamp();

         await interaction.reply({
            embeds: [confirmEmbed],
            components: [row],
            ephemeral: true,
         });

         const filter = (i) => i.user.id === interaction.user.id;
         const confirmation = await interaction.channel
            .awaitMessageComponent({ filter, time: 30000 })
            .catch(() => null);

         if (!confirmation || confirmation.customId === 'cancel') {
            return interaction.editReply({
               content: 'Mission aborted! The fun police caught us. 👮‍♂️',
               components: [],
               embeds: [],
            });
         }

         let successCount = 0;
         let failureCount = 0;
         let count = 0;
         const totalMembers = members.size;
         const updateInterval = Math.max(1, Math.floor(totalMembers / 20));
         let cancelled = false;

         const processMember = async (member) => {
            if (cancelled) return;
            const result = await sendMessage(member.user);
            if (result.success) successCount++;
            else failureCount++;
            count++;

            if (count % updateInterval === 0 || count === totalMembers) {
               const progress = ((count / totalMembers) * 100).toFixed(2);
               const progressBar =
                  '🟩'.repeat(Math.floor(progress / 5)) +
                  '⬜'.repeat(20 - Math.floor(progress / 5));
               
               const progressEmbed = new EmbedBuilder()
                  .setColor("Yellow")
                  .setTitle('Fun-O-Meter 📊')
                  .setDescription(`${progressBar} ${progress}%`)
                  .addFields(
                     { name: 'Joy Spread', value: `${count}/${totalMembers}`, inline: true },
                     { name: 'Smiles Delivered', value: successCount.toString(), inline: true },
                     { name: 'Party Poopers', value: failureCount.toString(), inline: true }
                  )
                  .setFooter({ text: 'Spreading happiness, one DM at a time!' })
                  .setTimestamp();

               await interaction.editReply({
                  embeds: [progressEmbed],
                  components: [
                     new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                           .setCustomId('cancel_sending')
                           .setLabel('Stop the madness!')
                           .setStyle(ButtonStyle.Danger)
                           .setEmoji('🛑')
                     ),
                  ],
                  ephemeral: true,
               });
            }
         };

         const cancelListener =
            interaction.channel.createMessageComponentCollector({
               filter,
               time: 600000,
            });
         cancelListener.on('collect', async (i) => {
            if (i.customId === 'cancel_sending') {
               cancelled = true;
               await i.update({
                  content: 'Whoa there! Putting the brakes on this fun train. 🚂💨',
                  components: [],
                  embeds: [],
               });
            }
         });

         for (const member of members.values()) {
            await processMember(member);
            if (cancelled) break;
         }

         cancelListener.stop();

         const finalMessage = cancelled
            ? `Operation cancelled. ${successCount} people got a dose of fun, ${failureCount} missed out.`
            : `Mission accomplished! ${successCount} people are now slightly happier, ${failureCount} need more coffee.`;

         const finalEmbed = new EmbedBuilder()
            .setColor(cancelled ? '#ff9999' : '#99ff99')
            .setTitle(cancelled ? 'Fun Fiesta Fizzled Out 😢' : 'Epic Fun Mission Complete! 🎊')
            .setDescription(finalMessage)
            .setFooter({ text: 'Remember, laughter is the best medicine (except for actual medicine)' })
            .setTimestamp();

         await interaction.editReply({
            embeds: [finalEmbed],
            components: [],
         });
      };

      if (subcommand === 'user') {
         const user = interaction.options.getUser('target');
         const result = await sendMessage(user);

         if (result.success) {
            await interaction.reply({
               content: `Message successfully sneaked into ${user.tag}'s DMs! 🕵️‍♂️`,
               ephemeral: true,
            });
         } else {
            const funnyMessage = funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
            await interaction.reply({ content: `${funnyMessage} (Error: ${result.reason})`, ephemeral: true });
         }
      } else if (subcommand === 'role') {
         const role = interaction.options.getRole('target');
         const members = role.members;
         await handleProcess(members, `lucky ducks with the ${role.name} role`);
      } else if (subcommand === 'all') {
         const members = await interaction.guild.members.fetch();
         const humanMembers = members.filter((member) => !member.user.bot);
         await handleProcess(humanMembers, 'unsuspecting victims... I mean, valued server members');
      }
   },
};
