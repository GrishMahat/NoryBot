import fs from 'fs';
import path from 'path';

export default (directory, foldersOnly = false) => {
<<<<<<< HEAD
  const items = [];
=======
  let fileNames = [];
>>>>>>> 8cca8a2f208c8cfde72a01dbc48df9abd2e90f85

  const files = fs.readdirSync(directory, { withFileTypes: true });

  for (const file of files) {
    const filePath = path.join(directory, file.name); // Using file.name to get the proper name

    if (foldersOnly) {
      if (file.isDirectory()) {
        items.push(filePath);
      }
    } else {
      if (file.isFile()) {
        items.push(filePath);
      }
    }
  }

  return items;
};
