module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // jsxImportSource: 'nativewind' aktiviert className auf RN-Komponenten.
      // babel-preset-expo adds the worklets/Reanimated plugin automatically.
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
