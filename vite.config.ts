import { defineConfig } from 'vite';
import { vueConfig } from '@nativescript/vite/vue';

export default defineConfig(({ mode }) => {
  const config = vueConfig({ mode });
  // Disable JS minification: a minified NativeScript release bundle crashes on
  // launch ("Module evaluation promise rejected: bundle.mjs"), while the
  // unminified bundle runs fine. (esbuild keepNames alone did not help, so it
  // is not only name mangling.) The size cost is negligible inside the ~100 MB
  // APK — native libraries dominate. Re-enable once fixed upstream in
  // @nativescript/vite.
  config.build = { ...(config.build ?? {}), minify: false };
  return config;
});
