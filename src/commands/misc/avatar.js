
const { EmbedBuilder , SlashCommandBuilder} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription("show  avatar of any user")
        .addUserOption(option =>
            option.setName('user')
                .setDescription('user that  you  avatar:')
                .setRequired(true)),
                userPermissions: [],
                bot: [],
      run: async (client, interaction) => {
        const user = interaction.options.getUser('user');
        const member = interaction.guild.members.cache.find(m => m.user.id === user.id) || interaction.member;

        const avatar = member.user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 });

        const embed = new EmbedBuilder()
            .setTitle(`${member.user.username} Avatar`)
            .setURL(avatar)
            .setImage(avatar)
            .setFooter({
                text: `Request by ${interaction.user.username}`,
                iconURL: interaction.user.displayAvatarURL({ format: 'png', dynamic: true, size: 1024 })
            })
            .setColor('#eb3434');

        await interaction.reply({ embeds: [embed] });
    },
};
