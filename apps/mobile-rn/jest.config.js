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
    ...preset.moduleNameMapper,
    // tsconfig paths are not visible to jest; mirror the two aliases it needs.
    '^@correctiv/app-core$': '<rootDir>/../../packages/app-core/src/index.ts',
    '^@correctiv/app-core/(.*)$': '<rootDir>/../../packages/app-core/src/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|react-native-css-interop|htmlparser2|css-select|css-what|domutils|dom-serializer|domhandler|domelementtype|entities|boolbase|nth-check))',
  ],
};
