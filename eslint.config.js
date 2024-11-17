// .eslintrc.js
import globals from 'globals';
import pluginJs from '@eslint/js';
import tsEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

/** @type {import('eslint').Linter.FlatConfig[]} */
const config = [
  {
    ignores: [
      '.eslintrc.js',
      '.eslintignore',
      '**/dist/**',
      '**/node_modules/**',
      '**/.git/**',
      '**/build/**',
    ],
  },

  {
    files: ['**/*.{js,mjs,cjs,ts}'], // Include both JS and TS files
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node, // Add Node.js globals
      },
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...pluginJs.configs.recommended,
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        project: './tsconfig.json', // Point to your TypeScript config
      },
    },
    plugins: {
      '@typescript-eslint': tsEslint,
    },
    rules: {
      ...tsEslint.configs.recommended.rules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      // Add more custom rules here
    },
  },
];

export default config;
