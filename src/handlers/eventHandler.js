/**
 * Registers event handlers for the Discord client.
 *
 * This function iterates through all event folders in the "events" directory,
 * loads the event handlers from each file, and registers them with the provided
 * Discord client.
 *
 * The event name is determined by the name of the event folder, with the
 * exception of the "validations" folder, which is mapped to the "interactionCreate"
 * event.
 *
 * @format
 * @param {Discord.Client} client - The Discord client to register the event handlers with.
 */

const path = require("path");
const getAllFiles = require("../utils/getAllFiles");

module.exports = (client) => {
  const eventFolders = getAllFiles(path.join(__dirname, "..", "events"), true);

  for (const eventFolder of eventFolders) {
    const eventFiles = getAllFiles(eventFolder);
    let eventName;
    eventName = eventFolder.replace(/\\/g, "/").split("/").pop();

    eventName === "validations" ? (eventName = "interactionCreate") : eventName;

    client.on(eventName, async (arg) => {
      for (const eventFile of eventFiles) {
        const eventFunction = require(eventFile);
        await eventFunction(client, arg);
      }
    });
  }
};
