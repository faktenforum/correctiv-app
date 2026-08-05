module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // jsxImportSource: 'nativewind' aktiviert className auf RN-Komponenten.
      // babel-preset-expo ergänzt automatisch das Worklets-/Reanimated-Plugin.
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
