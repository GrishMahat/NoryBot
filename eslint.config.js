import { ESLint } from 'eslint';
import globals from 'globals';
import pluginJs from '@eslint/js';
import eslintPluginImport from 'eslint-plugin-import';

const eslint = new ESLint({
   overrideConfig: {
      rules: {
         'no-unused-vars': 'warn',
         'import/no-unresolved': 'error',
         'prefer-const': 'error',
         eqeqeq: ['error', 'always'],
         curly: ['error', 'all'],
         'arrow-body-style': ['error', 'as-needed'],
         'consistent-return': 'error',
         'indent': ['error', 2], // Enforce consistent indentation (2 spaces)
         'linebreak-style': ['error', 'unix'], // Enforce consistent linebreak style
         'no-console': 'warn', // Disallow the use of console
         'quotes': ['error', 'single'], // Enforce the use of single quotes
         'object-curly-spacing': ['error', 'always'], // Enforce consistent spacing inside braces
         'semi': ['error', 'always'], // Enforce semi-colons
         'comma-dangle': ['error', 'es5'], // Enforce trailing commas where valid in ES5
         'space-before-function-paren': ['error', 'always'], // Enforce consistent spacing before function parentheses
         'keyword-spacing': ['error', { 'before': true, 'after': true }], // Enforce consistent spacing around keywords
      },
   },
});

export default eslint;
