import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { vueConfig } from '@nativescript/vite/vue';

const CORE_SRC = fileURLToPath(new URL('../../packages/app-core/src', import.meta.url));

export default defineConfig(({ mode }) => {
  const config = vueConfig({ mode });

  // Resolve @correctiv/app-core to its TypeScript source rather than through the
  // workspace symlink. The package ships no build output, and its subpath
  // exports are extensionless (`@correctiv/app-core/lib/format`), which Node-style
  // exports resolution would not complete. Aliasing makes it deterministic and
  // keeps the core inside Vite's transform pipeline (so it is type-stripped and
  // tree-shaken like app source).
  // vueConfig already populates resolve.alias (vue -> nativescript-vue), so
  // merge instead of replacing, and normalise the object form to the array form.
  const existing = config.resolve?.alias;
  const inherited = Array.isArray(existing)
    ? existing
    : Object.entries(existing ?? {}).map(([find, replacement]) => ({ find, replacement }));

  config.resolve = {
    ...(config.resolve ?? {}),
    alias: [
      { find: /^@correctiv\/app-core$/, replacement: `${CORE_SRC}/index.ts` },
      { find: /^@correctiv\/app-core\/(.*)$/, replacement: `${CORE_SRC}/$1` },
      ...inherited,
    ],
  };

  // Disable JS minification: a minified NativeScript release bundle crashes on
  // launch ("Module evaluation promise rejected: bundle.mjs"), while the
  // unminified bundle runs fine. (esbuild keepNames alone did not help, so it
  // is not only name mangling.) The size cost is negligible inside the ~100 MB
  // APK — native libraries dominate. Re-enable once fixed upstream in
  // @nativescript/vite.
  config.build = { ...(config.build ?? {}), minify: false };
  return config;
});
