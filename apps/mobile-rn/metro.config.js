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

module.exports = withNativeWind(config, { input: './src/global.css' });
