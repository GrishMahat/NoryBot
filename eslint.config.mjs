import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
	{ files: ['**/*.{js,mjs,cjs,ts}'] },
	{ languageOptions: { globals: globals.browser } },
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	{
		rules: {
			// General rules
			'no-unused-vars': ['error', { vars: 'all', args: 'none' }],
			// 'no-undef': 'error',  this  is  to much work to fix rn
			// 'no-undef-init': 'error',

			// Discord.js specific
			'no-async-promise-executor': 'error', // Important for Discord.js async operations
			'require-await': 'error', // Enforce async/await usage
			'no-return-await': 'error', // Prevent redundant return await

			// TypeScript specific
			'@typescript-eslint/explicit-function-return-type': 'error',
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-non-null-assertion': 'error',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					vars: 'all',
					args: 'none',
					ignoreRestSiblings: true,
				},
			],

			// Best practices
			eqeqeq: ['error', 'always'],
			'prefer-const': 'error',
			'no-var': 'error',
			'object-shorthand': 'error',
			'arrow-body-style': ['error', 'as-needed'],
		},
		ignores: ['src/config/*', 'src/types/*', 'dist/**', 'src/__tests__/**'],
	},
];
