module.exports = function (api) {
  api.cache(true);
  return {
    // Uniwind is a Metro plugin with no Babel step of its own — see
    // metro.config.js. babel-preset-expo adds the worklets/Reanimated plugin.
    presets: ['babel-preset-expo'],
  };
};
