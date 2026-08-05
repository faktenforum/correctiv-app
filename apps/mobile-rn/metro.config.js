const path = require('node:path');

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// This app lives in an npm workspace (apps/mobile-rn). Metro defaults to a
// single-project layout, so two things have to be spelled out or module
// resolution fails in ways that look like missing packages:
//   1. watchFolders — without the repo root, edits in packages/app-core are
//      invisible to Fast Refresh and the bundler cannot read the files at all.
//   2. nodeModulesPaths — npm hoists most dependencies to the root
//      node_modules; Metro must look there as well as in the app's own.
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Resolve each dependency once. Without this a package hoisted to the root and
// also present locally can be loaded twice, which breaks React and any module
// holding singleton state (the store, the audio player).
config.resolver.disableHierarchicalLookup = true;

/**
 * …and this is the price of that line, paid once.
 *
 * React Native declares `pretty-format@^29` and carries its own copy in
 * react-native/node_modules. With hierarchical lookup off, Metro never walks up
 * from RN's source into that copy — it only consults the two paths above, where
 * npm has hoisted `pretty-format@30` (pulled in by jest 30). Version 30 exports a
 * different shape, so RN's HMR client reads `prettyFormat.default.default` off
 * `undefined` and the DEV BUNDLE DIES AT STARTUP: `npm run web` served a blank
 * page with one uncaught TypeError.
 *
 * It stayed unnoticed because every browser check in this project ran against
 * `expo export` output, which has no HMR client.
 *
 * The fix resolves the package from React Native's own directory, so RN gets the
 * version it declares while jest keeps its v30 — a Metro-only override, not a
 * dependency change. `resolver.alias` was tried first and did NOT help: the
 * standard resolution succeeds (to v30), so the alias never gets consulted.
 * `resolveRequest` intercepts before that.
 */
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'pretty-format') {
    return {
      type: 'sourceFile',
      // Resolved from React Native's own directory, so it finds RN's nested copy.
      filePath: require.resolve('pretty-format', {
        paths: [path.resolve(workspaceRoot, 'node_modules/react-native')],
      }),
    };
  }
  return (upstreamResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './src/global.css' });
