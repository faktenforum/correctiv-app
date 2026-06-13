/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Reine Logik-Tests (Token-Brücke, Feed-Parser, Extraktion) brauchen kein RN-Setup,
  // laufen aber problemlos unter jest-expo. Node-Skripte unter scripts/ werden mitgetestet.
  testMatch: ['**/__tests__/**/*.test.{ts,tsx,js,mjs}'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|react-native-css-interop))',
  ],
};
