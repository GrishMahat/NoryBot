// Import necessary modules from discord.js package
const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionsBitField,
} = require("discord.js");
const Feedback = require("../../schemas/feedback");

// Export the module to be used elsewhere
module.exports = {
  // Slash command data
  data: new SlashCommandBuilder()
    .setName("feedback") // Sets the command name
    .setDescription("Manage the feedback system.") // Sets the command description
    .addSubcommand(
      (subcommand) =>
        subcommand
          .setName("setup") // Subcommand to set up the feedback system
          .setDescription("Setup the feedback system.")
          .addChannelOption((option) =>
            option
              .setName("feedback-channel")
              .setDescription("The channel for Feedbacks.")
              .setRequired(true)
          ) // Option to specify the feedback channel
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disable") // Subcommand to disable the feedback system
        .setDescription("Disable the feedback system.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("send") // Subcommand to send feedback
        .setDescription(`Give some feedback to the server staff's!`)
        .addStringOption((option) =>
          option
            .setName("feedback")
            .setDescription("Write your feedback.")
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName("star")
            .setDescription("Rate the feedback with stars.")
            .setRequired(true)
            .addChoices(
              { name: "⭐", value: "⭐" }, // Choices for rating feedback with stars
              { name: "⭐⭐", value: "⭐⭐" },
              { name: "⭐⭐⭐", value: "⭐⭐⭐" },
              { name: "⭐⭐⭐⭐", value: "⭐⭐⭐⭐" },
              { name: "⭐⭐⭐⭐⭐", value: "⭐⭐⭐⭐⭐" }
            )
        )
    )
    .toJSON(), // Converts the data to JSON format

  // Define user permissions (omitted for simplicity)
  userPermissions: [],

  // Define bot permissions (omitted for simplicity)
  botPermissions: [],

  // Function to be executed when the command is used
  async run(client, interaction) {
    // Find feedback data for the guild
    const data = await Feedback.findOne({ Guild: interaction.guild.id });

    // Get the subcommand used
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case "setup":
        // Check if user has administrator permissions
        if (
          !interaction.member.permissions.has(
            PermissionsBitField.Flags.Administrator
          )
        ) {
          const errEmbed = new EmbedBuilder()
            .setDescription(`You do not have permissions to use this command`)
            .setColor("#020202");

          return interaction.reply({ embeds: [errEmbed], ephemeral: true });
        }

        // Check if feedback system is already set up
        if (data) {
          const alreadyEmbed = new EmbedBuilder()
            .setColor(`#020202`)
            .setDescription(
              `Looks like you already have the feedback system set!`
            );
          return await interaction.reply({
            embeds: [alreadyEmbed],
            ephemeral: true,
          });
        } else {
          // Set up feedback system
          const FeedbackChannel =
            interaction.options.getChannel("feedback-channel");
          const newData = await Feedback.create({
            Guild: interaction.guild.id,
            FeedbackChannel: FeedbackChannel.id,
          });
          newData.save();

          const feedbacksetup = new EmbedBuilder()
            .setColor("#020202")
            .setDescription(
              `Feedback system has now been configured. To disable, run \`feedback disable\`!`
            )
            .addFields({
              name: "Feedback Channel",
              value: `${FeedbackChannel}`,
            });

          return await interaction.reply({
            embeds: [feedbacksetup],
            ephemeral: true,
          });
        }
        break;

      case "disable":
        // Check if user has administrator permissions
        if (
          !interaction.member.permissions.has(
            PermissionsBitField.Flags.Administrator
          )
        ) {
          const errEmbed1 = new EmbedBuilder()
            .setDescription(`You do not have permissions to use this command`)
            .setColor("#020202");

          return interaction.reply({ embeds: [errEmbed1], ephemeral: true });
        }

        // Check if feedback system is already disabled
        if (!data) {
          const alredy = new EmbedBuilder()
            .setColor(`#020202`)
            .setDescription(
              `Looks like you don't already have a feedback system set up!`
            );
          return interaction.reply({ embeds: [alredy], ephemeral: true });
        } else {
          // Disable feedback system
          await Feedback.deleteOne({ Guild: interaction.guild.id });
          const deleted = new EmbedBuilder()
            .setColor(`#020202`)
            .setDescription(`I have deleted your feedback channel!`);
          return interaction.reply({ embeds: [deleted], ephemeral: true });
        }
        break;

      case "send":
        // Check if feedback system is set up
        if (!data) {
          const notset = new EmbedBuilder()
            .setColor(`#020202`)
            .setDescription(
              `The feedback system is not set up here, use \`feedback setup\` to setup it!`
            );
          return await interaction.reply({ embeds: [notset], ephemeral: true });
        }

        // Get feedback and star rating from options
        const star = interaction.options.getString("star");
        const feedback = interaction.options.getString("feedback");
        const feedbackChannel = interaction.client.channels.cache.get(
          data.FeedbackChannel
        );

        // Construct embed to display feedback
        const embed = new EmbedBuilder()
          .setColor("#020202")
          .setTitle("**New Feedback!**")
          .setDescription(`${interaction.user} sent some feedback!`)
          .addFields({ name: "**Description:**", value: `${feedback}` })
          .addFields({ name: "**Stars**", value: `${star}` });

        // Embed to notify user that feedback was sent
        const embed1 = new EmbedBuilder()
          .setColor("#020202")
          .setDescription(
            `Your feedback successfully sent in ${feedbackChannel}!`
          );

        // Send feedback to feedback channel
        feedbackChannel.send({ embeds: [embed] });
        await interaction.reply({ embeds: [embed1], ephemeral: true });
        break;

      default:
        break;
    }
  },
};
