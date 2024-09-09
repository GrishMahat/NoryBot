import { ESLint } from 'eslint';
import globals from 'globals';
import pluginJs from '@eslint/js';
import eslintPluginImport from 'eslint-plugin-import';

const eslint = new ESLint({
  overrideConfig: {


    rules: {
      "no-unused-vars": "warn",
      "import/no-unresolved": "error",
      "prefer-const": "error",
      "eqeqeq": ["error", "always"],
      "curly": ["error", "all"],
      "arrow-body-style": ["error", "as-needed"],
      "consistent-return": "error",

    },
  },
});

export default eslint;
