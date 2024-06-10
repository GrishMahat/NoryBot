import path from 'path';
<<<<<<< HEAD
import { fileURLToPath, pathToFileURL } from 'url';
import getAllFiles from './getAllFiles.js';
=======
import getAllFiles from './getAllFiles.js';
import { fileURLToPath } from 'url';
>>>>>>> 8cca8a2f208c8cfde72a01dbc48df9abd2e90f85


const __dirname = path.dirname(fileURLToPath(import.meta.url));


<<<<<<< HEAD
export default async(exepctions = []) => {
=======
export default (exepctions = []) => {
>>>>>>> 8cca8a2f208c8cfde72a01dbc48df9abd2e90f85
  let buttons = [];
  const buttonFiles = getAllFiles(path.join(__dirname, "..", "buttons"));

  for (const buttonFile of buttonFiles) {
    const buttonFileURL = pathToFileURL(buttonFile).href;



    const {default: buttonObject} = await import(buttonFileURL);

    if (exepctions.includes(buttonObject.name)) continue;
    buttons.push(buttonObject);
  };

  return buttons;
};