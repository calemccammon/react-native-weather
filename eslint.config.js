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
  // The layers of `src`, each allowed to import only what lies further in.
  // See "Architecture" in the README.
  {
    files: ['src/domain/**'],
    ignores: ['**/*.test.*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Anything that is not a relative path is a library.
              regex: '^[^.]',
              message: 'The domain is plain TypeScript: no libraries.',
            },
            {
              group: ['**/data/**', '**/ui/**', '**/di/**', '**/l10n/**'],
              message: 'The domain imports nothing from the layers around it.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/data/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/ui/**', '**/di/**', '**/l10n/**'],
              message: 'The data layer imports the domain and nothing else of the app.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/ui/**'],
    ignores: ['**/*.test.*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/data/**', '**/di/**'],
              message: 'The UI reaches data through the domain, and is handed its view models.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/ui/**/components/**', 'src/ui/**/*Screen.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/data/**', '**/di/**', '**/domain/**'],
              message: 'Components draw UI models; the domain stops at the view models.',
            },
          ],
        },
      ],
    },
  },
  {
    ignores: ['dist/*', 'android/*', 'ios/*', '.expo/*'],
  },
]);
