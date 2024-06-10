import path from 'path';
<<<<<<< HEAD
import { fileURLToPath, pathToFileURL } from 'url';
=======
import { fileURLToPath } from 'url';
>>>>>>> 8cca8a2f208c8cfde72a01dbc48df9abd2e90f85
import getAllFiles from './getAllFiles.js';

// Get the directory name of the current module's file
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async (exceptions = []) => {
<<<<<<< HEAD
  const localCommands = [];
=======
  let localCommands = [];
>>>>>>> 8cca8a2f208c8cfde72a01dbc48df9abd2e90f85
  const commandCategories = getAllFiles(path.join(__dirname, '..', 'commands'), true);

  for (const commandCategory of commandCategories) {
    const commandFiles = getAllFiles(commandCategory);

    for (const commandFile of commandFiles) {
      try {
<<<<<<< HEAD
        // Convert the command file path to a file URL
        const commandFileURL = pathToFileURL(commandFile).href;

        // Dynamically import the module using the file URL
        const commandModule = await import(commandFileURL);
        
        // Check if the module has a default export
        if (commandModule.default) {
          const commandObject = commandModule.default;
          
          // Check if the commandObject has a name property
          if (commandObject.data && commandObject.data.name && !exceptions.includes(commandObject.data.name)) {
            localCommands.push(commandObject);
          } else {
            console.warn(`Command file ${commandFile} does not have a valid name property.`);
          }
        } else {
          console.warn(`Command file ${commandFile} does not have a default export.`);
=======
        // Dynamically import the module and get the default export
        const commandObject = await import(commandFile);
        
        // Check if the commandObject has a name property
        if (!exceptions.includes(commandObject.default.name)) {
          localCommands.push(commandObject.default);
>>>>>>> 8cca8a2f208c8cfde72a01dbc48df9abd2e90f85
        }
  
      } catch (error) {
        console.error(`Error importing command file ${commandFile}: ${error}`);
      }
    }
  }

  return localCommands;
};
