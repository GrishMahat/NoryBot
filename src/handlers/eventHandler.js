<<<<<<< HEAD
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
=======
import path from 'path';
import { fileURLToPath } from 'url';
import getAllFiles from '../utils/getAllFiles.js';
>>>>>>> 8cca8a2f208c8cfde72a01dbc48df9abd2e90f85

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async (client) => {
  const eventFolders = getAllFiles(path.join(__dirname, "..", "events"), true);

  for (const eventFolder of eventFolders) {
    const eventFiles = getAllFiles(eventFolder);
    let eventName = eventFolder.replace(/\\/g, "/").split("/").pop();

    if (eventName === "validations") {
      eventName = "interactionCreate";
    }

    client.on(eventName, async (...args) => {
      for (const eventFile of eventFiles) {
        try {
          const { default: eventFunction } = await import(`file://${eventFile}`);
          await eventFunction(client, ...args);
        } catch (error) {
          console.error(`Error loading event file ${eventFile}:`, error);
        }
      }
    });
  }
};
