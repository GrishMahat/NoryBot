const { EmbedBuilder , SlashCommandBuilder} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Bot ping'),
      userPermissions: [],
      bot: [],
    run: async (client,interaction) => {
        if (interaction.replied || interaction.deferred) {
            return;
        }

        let pingColor;
        const ping = interaction.client.ws.ping;

        if (ping < 150) {
            pingColor = '#00ff00';
        } else if (ping >= 150 && ping <= 250) {
            pingColor = '#ffff00';
        } else {
            pingColor = '#ff0000';
        }

        const pongEmbed = new EmbedBuilder()
            .setColor(pingColor)
            .setTitle('Pong')
            .setDescription(`**${ping} ms**`)
            .setTimestamp();

        await interaction.reply({ embeds: [pongEmbed] });
    }
}