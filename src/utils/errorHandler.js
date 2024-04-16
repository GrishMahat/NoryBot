const { WebhookClient, Constants ,EmbedBuilder} = require("discord.js");
const mConfig = require("../config/messageConfig.json");


const webhookURL = process.env.WEBHOOK_URL;
const summaryWebhookURL = process.env.SUMMARY_WEBHOOK_URL;

if (!webhookURL || !summaryWebhookURL) {
    console.error("Error: Webhook URLs are not defined.");
    process.exit(1);
}

/**
 * Handles errors by sending a Discord webhook notification.
 *
 * This function checks if the required webhook URLs are defined in the environment variables.
 * If the URLs are not defined, it logs an error and exits the process.
 */

// Error tracking variables
let errorCounts = {};
const cooldownPeriod = 60000; // 1 minute cooldown period
const maxErrorsPerCooldown = 5; // Maximum 5 errors per cooldown period
async function generateErrorSummary(errorCounts) {
  const embed = new EmbedBuilder()
    .setColor(mConfig.embedColorDefault)
    .setTitle("Error Summary Report")
    .setDescription("Summary of errors that occurred in the last 24 hours:");

  // Calculate total number of errors
  let totalErrors = 0;
  for (const errorType in errorCounts) {
    totalErrors += errorCounts[errorType];
  }

  embed.addField("Total Errors", totalErrors);

  // Add individual error type counts
  for (const errorType in errorCounts) {
    embed.addField(errorType, errorCounts[errorType], true);
  }

  return embed;
}


// Function to send error summary report to a webhook and reset error counts
async function sendDailyErrorSummaryReport(errorCounts) {
  try {
    const embed = await generateErrorSummary(errorCounts);
    await summaryWebhook.send({ embeds: [embed] });
    

    // Reset error counts for the next day
    resetErrorCounts(errorCounts);
  } catch (error) {
    
  }
}

// Function to reset error counts
function resetErrorCounts(errorCounts) {
  for (const errorType in errorCounts) {
    errorCounts[errorType] = 0;
  }
}

async function logError(errorType, error, additionalInfo = {}) {
  const formattedStack =
    error.stack.length > 2048
      ? error.stack.slice(0, 2045) + "..."
      : error.stack;

  const Rembed = {
    color: mConfig.embedColorError,
    title: `${errorType}`,
    description: "```diff\n- " + formattedStack + "\n```",
    timestamp: new Date(),
    ...additionalInfo,
  };

  await webhook.send({ embeds: [Rembed] });

  // Integrate with logging service for additional flexibility
}

function shouldLogError(errorType) {
  // Check if error logging is allowed based on cooldown period and maximum errors per cooldown
  const now = Date.now();
  if (!errorCounts[errorType]) {
    errorCounts[errorType] = { timestamp: now, count: 1 };
    return true;
  } else {
    const { timestamp, count } = errorCounts[errorType];
    if (now - timestamp < cooldownPeriod) {
      // Still within cooldown period
      if (count < maxErrorsPerCooldown) {
        // Below maximum errors allowed per cooldown, increment count
        errorCounts[errorType].count++;
        return true;
      } else {
        // Reached maximum errors allowed per cooldown, don't log error
        return false;
      }
    } else {
      // Cooldown period elapsed, reset error count
      errorCounts[errorType] = { timestamp: now, count: 1 };
      return true;
    }
  }
}

function handleError(errorType, error, additionalInfo = {}) {
  if (shouldLogError(errorType)) {
    logError(errorType, error, additionalInfo);
  }
}

module.exports = {
  sendDailyErrorSummaryReport,
  errorHandler: async (client) => {
    process.on("unhandledRejection", async (reason) => {
      handleError("Unhandled Rejection", reason);
    });

    process.on("uncaughtException", async (error) => {
      handleError("Uncaught Exception", error);
      process.exit(1); // Exit with error code
    });

    client.on(Constants.Events.ERROR, async (error) => {
      handleError("Discord.js Error", error);
    });

    process.on("SIGINT", () => {
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      process.exit(0);
    });
  },
};
