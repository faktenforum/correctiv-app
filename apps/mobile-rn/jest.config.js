const preset = require('jest-expo/jest-preset');

/** @type {import('jest').Config} */
module.exports = {
  ...preset,
  // Reine Logik-Tests (Token-Brücke, Feed-Parser, Extraktion) brauchen kein RN-Setup,
  // laufen aber problemlos unter jest-expo. Node-Skripte unter scripts/ werden mitgetestet.
  testMatch: ['**/__tests__/**/*.test.{ts,tsx,js,mjs}'],
  transform: {
    ...preset.transform,
    // @correctiv/app-core ships two .mjs modules (the feed parser and the article
    // extractor). jest-expo's transform only matches .js/.jsx/.ts/.tsx, so importing
    // anything that reaches them fails with "Cannot use import statement outside a
    // module". Spread the preset's transform rather than replacing it, or the React
    // Native transforms go away with it.
    '^.+\\.mjs$': 'babel-jest',
  },
  moduleNameMapper: {
    /**
     * This ONE entry has to come before the preset's.
     *
     * jest-expo derives its moduleNameMapper from tsconfig.json "paths" (verified:
     * the preset already carries ^@/(.*)$, ^@/assets/(.*)$ and both
     * @correctiv/app-core patterns — so none of those need mirroring here). But
     * jest takes the first pattern that MATCHES and does not fall through when the
     * file is missing, while tsc consults only the first matching pattern and needs
     * the generic one there so that `declare module '*.mp3'` can apply.
     *
     * Two tools, opposite orders. tsconfig.json keeps the order tsc needs and this
     * line carries the difference: without it, importing the bundled sample episode
     * makes the whole suite fail to run with "Could not locate module".
     */
    '^@/assets/(.*)$': '<rootDir>/assets/$1',
    ...preset.moduleNameMapper,
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|react-native-css-interop|htmlparser2|css-select|css-what|domutils|dom-serializer|domhandler|domelementtype|entities|boolbase|nth-check))',
  ],
};
