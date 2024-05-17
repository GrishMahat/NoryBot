import path from 'path';
import { fileURLToPath } from 'url';
import getAllFiles from '../utils/getAllFiles.js';

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

    client.on(eventName, async (arg) => {
      for (const eventFile of eventFiles) {
        const { default: eventFunction } = await import(`file://${eventFile}`);
        await eventFunction(client, arg);
      }
    });
  }
};
