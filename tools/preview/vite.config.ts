import { readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const ASSETS_DIR = 'preview-assets';
const ASSETS = fileURLToPath(new URL(`../../apps/mobile/public/${ASSETS_DIR}`, import.meta.url));

/**
 * Removes our own stale assets, and only ours, and only once the new ones exist.
 *
 * `emptyOutDir` cannot be used here: the out directory is the app's `public/`,
 * and Vite would take the rest of it with the sweep. Without any cleanup, every
 * build leaves its hashed pair behind and `expo export` faithfully copies all of
 * them into `dist/` — a folder that grows by two files per build, forever, on a
 * target that is published on every push.
 *
 * The obvious spelling, deleting the folder in `buildStart`, is wrong and broke
 * the running dev server once: two builds at the same time, and the second one's
 * `buildStart` deletes the first one's freshly written output while leaving the
 * `preview.html` that points at it. The result is a blank page served by two
 * successful builds. Cleaning up afterwards, and keeping whatever this build just
 * wrote, leaves no window in which the referenced bundle is missing.
 */
function cleanStaleAssets(): Plugin {
  return {
    name: 'preview-clean-stale-assets',
    writeBundle(_options, bundle) {
      const keep = new Set(Object.keys(bundle));
      let present: string[];
      try {
        present = readdirSync(ASSETS);
      } catch {
        return; // nothing written yet, nothing stale
      }
      for (const name of present) {
        if (!keep.has(`${ASSETS_DIR}/${name}`)) rmSync(join(ASSETS, name), { force: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [cleanStaleAssets(), react()],
  base: './',
  build: {
    outDir: fileURLToPath(new URL('../../apps/mobile/public', import.meta.url)),
    emptyOutDir: false,
    assetsDir: ASSETS_DIR,
    rollupOptions: {
      input: fileURLToPath(new URL('./preview.html', import.meta.url)),
    },
  },
});
