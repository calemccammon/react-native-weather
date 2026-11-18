// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  expoConfig,
  // Turns off ESLint's formatting rules so they cannot disagree with Prettier.
  // Formatting is checked separately by `npm run format:check`.
  prettierConfig,
  {
    rules: {
      // Stray debugging output, loose equality, and effects with missing
      // dependencies are the mistakes worth failing a build over.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    ignores: ['dist/*', 'android/*', 'ios/*', '.expo/*'],
  },
]);
