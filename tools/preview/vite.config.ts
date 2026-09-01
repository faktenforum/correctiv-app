import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const ASSETS = fileURLToPath(new URL('../../apps/mobile/public/preview-assets', import.meta.url));

/**
 * Clears our own asset folder, and only that.
 *
 * `emptyOutDir` cannot be used here: the out directory is the app's `public/`,
 * and Vite would take the rest of it with the sweep. Without this, every build
 * leaves its hashed pair behind and `expo export` faithfully copies all of them
 * into `dist/` — a folder that grows by two files per build, forever, on a
 * target that is published on every push.
 */
const cleanAssets: Plugin = {
  name: 'preview-clean-assets',
  buildStart: () => rmSync(ASSETS, { recursive: true, force: true }),
};

/**
 * Builds the shell straight into the app's `public/` folder, and nowhere else.
 *
 * This is the one setting the whole tool hangs on. `@expo/cli` serves `public/`
 * from the dev server and copies it into `dist/` on export, so a single build
 * output answers at `localhost:8081/preview.html`, at `serve-clean.mjs`'s port
 * and on Pages — always **same-origin with the app**. Same-origin is not a
 * convenience here: it is what lets the shell reach `frame.contentWindow`, read
 * the app's console, seed its storage and dispatch into its store. Give this
 * package a dev server of its own and every one of those capabilities is gone,
 * silently, because the browser simply refuses the property access.
 *
 * `emptyOutDir: false` because the out directory is the app's, not ours.
 * `base: './'` because the export is published under `/correctiv-app/` on Pages
 * and under `/` locally; relative asset URLs are correct in both without anyone
 * having to thread a base path through.
 */
export default defineConfig({
  plugins: [cleanAssets, react()],
  base: './',
  build: {
    outDir: fileURLToPath(new URL('../../apps/mobile/public', import.meta.url)),
    emptyOutDir: false,
    assetsDir: 'preview-assets',
    rollupOptions: {
      input: fileURLToPath(new URL('./preview.html', import.meta.url)),
    },
  },
});
