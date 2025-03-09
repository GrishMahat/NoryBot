module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/src'],
	transform: {
		'^.+\\.tsx?$': 'ts-jest',
	},
	testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
	moduleNameMapper: {
		'@/(.*)': '<rootDir>/src/$1',
	},
	collectCoverage: true,
	coverageDirectory: 'coverage',
	collectCoverageFrom: [
		'src/**/*.{ts,tsx}',
		'!src/**/*.d.ts',
		'!src/test.ts',
		'!src/index.ts',
		'!**/node_modules/**',
	],
	testPathIgnorePatterns: [
		'/node_modules/',
		'/src/buttons/test.ts',
		'/src/commands/misc/test.ts',
		'/src/modals/test.modal.ts',
		'/src/commands/misc/testpangunation.ts',
	],
};
