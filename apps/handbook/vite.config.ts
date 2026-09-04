import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { docsPlugin } from './plugin/index.ts';
import { tokensPlugin } from './plugin/tokens.ts';

/**
 * The app's dev server, which this one borrows rather than replaces.
 *
 * `npm run web -w @correctiv/mobile` serves the app here. The handbook frames it,
 * and framing it is only useful if the frame can be reached, which means one
 * origin.
 */
const APP_DEV_SERVER = 'http://localhost:8081';

/**
 * The handbook is the site, and the app is a directory inside it.
 *
 * This is the one setting the workbench hangs on, and it is easy to get wrong in
 * a way that leaves no error. Everything the inspector does is a same-origin
 * property access into the frame: `contentWindow`, `matchMedia`,
 * `documentElement.classList`, `localStorage`, and the handle the app leaves on
 * its own global. None of it is path-sensitive, and all of it is refused outright
 * across origins, silently, because the browser simply does not answer the
 * property.
 *
 * On Pages that costs nothing: both halves are uploaded as one artifact, so `/`
 * and `/app/` are already the same origin. In development they are two servers,
 * so the app is proxied under this one instead of being framed across ports.
 * `ws: true` because the app's dev server pushes its reloads over a socket, and a
 * proxy that forwards only HTTP gives a frame that loads once and then never
 * updates.
 *
 * ADR 0014 put the older preview shell inside `apps/mobile/public/` to get this
 * same-origin guarantee. Its argument was right and its conclusion was one way of
 * several: assembling one origin at deploy time and proxying in development is
 * another, and it is the one that lets the handbook own the site root.
 */
export default defineConfig(({ command }) => ({
  base: process.env.HANDBOOK_BASE?.trim() || '/',
  plugins: [docsPlugin(), tokensPlugin(), react()],
  build: {
    outDir: fileURLToPath(new URL('./dist', import.meta.url)),
    emptyOutDir: true,
    // The documents are large strings and there are thirty of them. Reporting
    // them as oversized on every build would train everyone to ignore the
    // warning, and the number it would be reporting is not actionable.
    chunkSizeWarningLimit: 1500,
  },
  server:
    command === 'serve'
      ? {
          proxy: {
            '/app': {
              target: APP_DEV_SERVER,
              changeOrigin: false,
              ws: true,
              rewrite: (path) => path.replace(/^\/app/, '') || '/',
            },
          },
        }
      : undefined,
}));
