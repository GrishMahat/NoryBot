import {
  SlashCommandBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  TextInputBuilder,
  ModalBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  Client,
  ChatInputCommandInteraction,
} from 'discord.js';

const testCommand: LocalCommand = {
  data: new SlashCommandBuilder()
    .setName('test')
    .setDescription('Test command')
    .addSubcommand((subcommand) =>
      subcommand.setName('button').setDescription('Test button'),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('modal').setDescription('Test modal'),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName('select').setDescription('Test select'),
    )
    .toJSON(),
  testMode: true,
  run: async (client: Client, interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case 'button': {
        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('test-button')
            .setLabel('Test Button')
            .setStyle(ButtonStyle.Primary),
        );
        await interaction.reply({ content: 'Button test', components: [row] });
        break;
      }
      case 'modal': {
        const modalRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId('test-input')
            .setLabel('Test Input')
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        );

        const modal = new ModalBuilder()
          .setCustomId('test-modal')
          .setTitle('Test Modal')
          .addComponents(modalRow);

        await interaction.showModal(modal);
        break;
      }
      case 'select': {
        const selectRow =
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('test-select')
              .setPlaceholder('Select an option')
              .addOptions(
                new StringSelectMenuOptionBuilder()
                  .setLabel('Test Option')
                  .setValue('test-option'),
              ),
          );
        await interaction.reply({
          content: 'Select test',
          components: [selectRow],
        });
        break;
      }
    }
  },
};

export default testCommand;
