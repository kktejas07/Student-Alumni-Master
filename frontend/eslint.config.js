// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      'react/no-unescaped-entities': 'off',
      'react/jsx-no-undef': 'off',
      'no-dupe-keys': 'off',
    },
  },
  {
    // Design-system guard: colour literals belong in src/theme (see src/theme/README.md).
    // Warning, not error, so the ~17k existing literals become a burn-down list.
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    ignores: ['src/theme/**', 'src/ui/theme.ts', 'src/views/web/portals/*/tokens.ts', 'src/views/web/theme/**'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: "Literal[value=/^#(?:[0-9a-fA-F]{3}){1,2}$/], Literal[value=/^rgba?\\(/]",
          message: 'Colour literal: use a token from @/src/theme/tokens instead.',
        },
      ],
    },
  },
]);
