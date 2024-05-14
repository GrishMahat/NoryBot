// Import necessary modules from discord.js package
const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const { formatDistanceToNow } = require('date-fns');

// Export the module to be used elsewhere
module.exports = {
    // Slash command data
    data: new SlashCommandBuilder()
        .setName('ping') // Sets the command name
        .setDescription('Bot ping'), // Sets the command description

    userPermissions: [],

    bot: [],
    nwfwMode: true,
    testMode: false,
    devOnly: false,


    // Function to be executed when the command is used
    run: async (client, interaction) => {
        // Check if interaction has already been replied to or deferred
        if (interaction.replied || interaction.deferred) {
            return;
        }

        let pingColor = '';
        const ping = interaction.client.ws.ping;

        // Determine color based on ping value
        if (ping < 150) {
            pingColor = '#00ff00'; // Green color for low ping
        } else if (ping >= 150 && ping <= 250) {
            pingColor = '#ffff00'; // Yellow color for moderate ping
        } else {
            pingColor = '#ff0000'; // Red color for high ping
        }

        const uptime = formatDistanceToNow(client.readyAt, { includeSeconds: true });

        // Initialize commandStats if it's undefined
        if (!client.commandStats) {
            client.commandStats = {};
        }

        // Increment command usage counter
        client.commandStats.ping = (client.commandStats.ping || 0) + 1;

        // Calculate average ping (just for demonstration, you might want to store ping times over a period)
        const totalPing = (client.commandStats.totalPing || 0) + ping;
        const averagePing = totalPing / client.commandStats.ping;

        // Construct embed to display ping
        const pongEmbed = new EmbedBuilder()
            .setColor(pingColor) // Set embed color based on ping
            .setTitle('Pong') // Set embed title
            .setDescription(`**Ping:** ${ping} ms\n**Average Ping:** ${averagePing.toFixed(2)} ms\n**Uptime:** ${uptime}\n**Command Usage:** ${client.commandStats.ping}`)
            .setFooter({
                text: `Requested by ${interaction.user.username}`,
                iconURL: `${interaction.user.displayAvatarURL({ dynamic: true })}`,
            })
            .setTimestamp(); // Set embed timestamp

        // Send the embed as a reply to the interaction
        await interaction.reply({ embeds: [pongEmbed] });
    }
};
