// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Auto-generierte Token-Brücke + native Ordner nicht linten.
    ignores: ['dist/*', 'android/*', 'ios/*', '*.generated.*', 'src/lib/theme/*.generated.ts'],
  },
]);
