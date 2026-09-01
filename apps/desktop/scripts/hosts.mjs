// Which interpreter runs which bundle, on which operating system.
//
// One table, imported by `start.mjs` and `route-sweep.mjs`. It lives in its own module
// because there are now two build targets and two launch sites: a second copy of this
// mapping would be a second truth, and the one that drifts is the one that gets read.
//
// Linux runs the `--app gjs` bundle on the distribution's own GJS. macOS and Windows
// have no system GJS, so they run the `--app node` bundle with `@gjsify/node-gi`
// bridging `gi://`. See ADR 0024 for why that split is the packaging answer too, and
// `apps/desktop/README.md` for what the desktop host is and is not.

import { execPath, platform } from 'node:process';

/** Keyed by the `--host` value each entry accepts. */
export const HOSTS = {
  gjs: { bundle: 'dist/app.gjs.mjs', command: 'gjs', args: ['-m'], build: 'npm run build:gjs' },
  node: { bundle: 'dist/app.node.mjs', command: execPath, args: [], build: 'npm run build:node' },
};

/** GJS on Linux, Node everywhere else. */
export const DEFAULT_HOST = platform === 'linux' ? 'gjs' : 'node';

/**
 * Diagnostics that mean a route did not render, per host.
 *
 * `JS ERROR` is GJS's own uncaught-exception prefix and never appears under Node, which
 * writes a bare stack — so a sweep that only looked for the GJS spelling would report a
 * clean run on the node host no matter what happened. Both spellings are matched here
 * rather than switched on the host, because a false positive costs a second look and a
 * false negative costs the whole point of the sweep.
 */
export const FAILURE_PATTERN =
  /UnknownUtilityError|PrimitiveError|GtkHostError|RouterError|JS ERROR|no boundary caught|^\s+at .*\n.*Error:|Error: .*\n\s+at /m;
