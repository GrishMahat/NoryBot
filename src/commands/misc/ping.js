// Import necessary modules from discord.js package
const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');

// Export the module to be used elsewhere
module.exports = {
    // Slash command data
    data: new SlashCommandBuilder()
        .setName('ping') // Sets the command name
        .setDescription('Bot ping'), // Sets the command description

    userPermissions: [],

    bot: [],

    // Function to be executed when the command is used
    run: async (client, interaction) => {
        // Check if interaction has already been replied to or deferred
        if (interaction.replied || interaction.deferred) {
            return;
        }

        let pingColor;
        const ping = interaction.client.ws.ping; // Get the websocket ping of the client

        // Determine color based on ping value
        if (ping < 150) {
            pingColor = '#00ff00'; // Green color for low ping
        } else if (ping >= 150 && ping <= 250) {
            pingColor = '#ffff00'; // Yellow color for moderate ping
        } else {
            pingColor = '#ff0000'; // Red color for high ping
        }

        // Construct embed to display ping
        const pongEmbed = new EmbedBuilder()
            .setColor(pingColor) // Set embed color based on ping
            .setTitle('Pong') // Set embed title
            .setDescription(`**${ping} ms**`) // Set embed description with ping value
            .setTimestamp(); // Set embed timestamp

        // Send the embed as a reply to the interaction
        await interaction.reply({ embeds: [pongEmbed] });
    }
};
