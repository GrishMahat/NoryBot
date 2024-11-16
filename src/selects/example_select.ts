import { Client, StringSelectMenuInteraction } from 'discord.js';
import { SelectMenu } from '../types/index.js';

const exampleSelectMenu: SelectMenu = {
  customId: 'example_select',
  cooldown: 5,
  userPermissions: [],
  async run(client: Client, interaction: StringSelectMenuInteraction) {
    const selectedValue = interaction.values[0];
    await interaction.reply(`You selected: ${selectedValue}`);
  },
};
export default exampleSelectMenu;
