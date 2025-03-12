import fs from 'fs';
import path from 'path';
import getAllFiles from '@/utils/helpers/getAllFiles';

// Mock fs module
jest.mock('fs', () => ({
	readdirSync: jest.fn(),
}));

describe('getAllFiles utility', () => {
	// Reset mocks before each test
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should return empty array for empty directory', () => {
		// Setup mock to return empty array
		(fs.readdirSync as jest.Mock).mockReturnValue([]);

		const result = getAllFiles('/test/directory');

		expect(result).toEqual([]);
		expect(fs.readdirSync).toHaveBeenCalledTimes(1);
	});

	it('should return only files with .js and .ts extensions', () => {
		// Setup mock with different file types
		(fs.readdirSync as jest.Mock).mockReturnValue([
			{ name: 'file1.js', isDirectory: (): boolean => false },
			{ name: 'file2.ts', isDirectory: (): boolean => false },
			{ name: 'file3.d.ts', isDirectory: (): boolean => false }, // Should be excluded
			{ name: 'file4.js.map', isDirectory: (): boolean => false }, // Should be excluded
			{ name: 'file5.txt', isDirectory: (): boolean => false }, // Should be excluded
		]);

		const result = getAllFiles('/test/directory');

		expect(result).toEqual([
			path.join('/test/directory', 'file1.js'),
			path.join('/test/directory', 'file2.ts'),
		]);
		expect(fs.readdirSync).toHaveBeenCalledTimes(1);
	});

	it('should return only folder paths when foldersOnly is true', () => {
		// Setup mock with both files and directories
		(fs.readdirSync as jest.Mock).mockImplementation((dir) => {
			if (dir === '/test/directory') {
				return [
					{ name: 'file1.js', isDirectory: (): boolean => false },
					{ name: 'subfolder', isDirectory: (): boolean => true },
				];
			} else {
				return []; // Empty for subfolders
			}
		});

		const result = getAllFiles('/test/directory', true);

		expect(result).toContain(path.join('/test/directory', 'subfolder'));
		expect(result).not.toContain(path.join('/test/directory', 'file1.js'));
	});

	it('should handle file system errors gracefully', () => {
		// Setup console.error mock to avoid cluttering test output
		const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

		// Setup fs to throw an error
		(fs.readdirSync as jest.Mock).mockImplementation(() => {
			throw new Error('Test file system error');
		});

		const result = getAllFiles('/test/directory');

		expect(result).toEqual([]);
		expect(mockConsoleError).toHaveBeenCalled();

		// Restore console.error
		mockConsoleError.mockRestore();
	});
});
