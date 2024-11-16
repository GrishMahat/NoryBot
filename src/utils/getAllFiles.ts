import fs from 'fs';
import path from 'path';

/**
 * Recursively retrieves only .js and .ts files from a specified directory,
 * explicitly excluding .d.ts and .js.map files.
 *
 * @param {string} directory - The path of the starting directory.
 * @param {boolean} [foldersOnly=false] - If true, returns only folder paths.
 * @returns {string[]} - An array of file paths.
 */
const getAllFiles = (
  directory: string,
  foldersOnly: boolean = false
): string[] => {
  const stack: string[] = [directory];
  const result: string[] = [];

  while (stack.length > 0) {
    const currentPath = stack.pop();
    if (!currentPath) continue;

    try {
      const items = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(currentPath, item.name);

        if (item.isDirectory()) {
          stack.push(fullPath);
          if (foldersOnly) {
            result.push(fullPath);
          }
        } else if (!foldersOnly && item.isFile()) {
          // Check if the file matches our criteria
          if (
            (item.name.endsWith('.js') || item.name.endsWith('.ts')) &&
            !item.name.endsWith('.d.ts') &&
            !item.name.endsWith('.js.map')
          ) {
            result.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${currentPath}:`, error);
    }
  }

  return result;
};

export default getAllFiles;
