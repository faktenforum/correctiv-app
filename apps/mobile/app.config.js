// app.json holds the config; this file adds the one value that cannot be static.
//
// GitHub Pages serves this app from https://faktenforum.github.io/correctiv-app/,
// not from a domain root. A default export writes absolute URLs — `/_expo/...`,
// `/assets/...` — which resolve to faktenforum.github.io/_expo/... there and 404,
// giving a blank page from a green build. `experiments.baseUrl` prefixes them, and
// expo-router uses the same value for its own hrefs and history.
//
// It has to be conditional: the prefix is wrong everywhere else. `npm run web`,
// `serve-clean.mjs` and the native builds all serve from a root, so only the Pages
// workflow sets EXPO_BASE_URL.
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL?.trim();
  if (!baseUrl) return config;

  return {
    ...config,
    experiments: { ...config.experiments, baseUrl: baseUrl.replace(/\/+$/, '') },
  };
};
