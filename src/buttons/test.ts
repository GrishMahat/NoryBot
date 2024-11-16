import { ButtonInteraction, Client } from 'discord.js';
import { Button } from '../types/index.js';
const testButton: Button = {
    customId: 'test',
    run: async (client: Client, interaction: ButtonInteraction) => {
        await interaction.reply('Test button clicked!');
    }
};
export default testButton;