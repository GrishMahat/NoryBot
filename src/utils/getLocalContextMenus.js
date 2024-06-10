import path from 'path';
<<<<<<< HEAD
import { fileURLToPath, pathToFileURL } from 'url';
import getAllFiles from './getAllFiles.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async (exceptions = []) => {
  const localContextMenus = [];
  const contextmenuCategories = getAllFiles(path.join(__dirname, '..', 'contextmenus'), true);
=======
import { fileURLToPath } from 'url';
import getAllFiles from './getAllFiles.js';

// Get the directory name of the current module's file
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async (exceptions = []) => {
  let localContextMenus = [];
  
  // Use path.join to construct the directory path
  const menuFiles = getAllFiles(path.join(__dirname, '..', 'contextmenus'));

  for (const menuFile of menuFiles) {
    // Assuming `menuFile` contains the exported object directly
    const menuObject = await import(menuFile);
>>>>>>> 8cca8a2f208c8cfde72a01dbc48df9abd2e90f85


  for (const contextmenuCategory of contextmenuCategories) {
    const contextmenuFiles = getAllFiles(contextmenuCategory);

    for (const contextmenuFile of contextmenuFiles) {
      try {
        const contextmenuFileURL = pathToFileURL(contextmenuFile).href;
        const { default: contextmenuModule } = await import(contextmenuFileURL);

        if (contextmenuModule && contextmenuModule.data && contextmenuModule.data.name && !exceptions.includes(contextmenuModule.data.name)) {
          localContextMenus.push(contextmenuModule);
        } else {
          console.warn(`Context menu file ${contextmenuFile} does not have a valid export or name property.`);
        }
      } catch (error) {
        console.error(`Error importing context menu file ${contextmenuFile}: ${error}`);
      }
    }
  }

  return localContextMenus;
};
