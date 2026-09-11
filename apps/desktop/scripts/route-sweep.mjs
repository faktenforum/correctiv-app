/**
 * Launch the app once per route and report whether that route rendered.
 *
 * WHY A SWEEP AND NOT A TEST. "All routes render" is a claim about a GTK process, and
 * the failure it is looking for is the one that cannot be seen any other way: this
 * layer refuses an unmappable prop or an unknown utility at RENDER time, per screen.
 * A build that succeeds says nothing about it, a typecheck says nothing about it, and
 * Home rendering says nothing about the other twenty-five. So each route is actually
 * opened.
 *
 * WHAT COUNTS AS A FAILURE. Any of the layer's named refusals reaching the log
 * (`UnknownUtilityError`, `PrimitiveError`, `GtkHostError`, `RouterError`), plus each
 * host's own uncaught-exception spelling and React's uncaught-error line — see
 * `FAILURE_PATTERN` in `hosts.mjs`, which carries both, because `JS ERROR` is GJS's
 * word and a node-host sweep matching only that would report a clean run no matter what
 * happened. Deliberately NOT the `[desktop]` bridge reports — those are the shims saying
 * they did their job, and they are expected on several screens.
 *
 * WHICH HOST. `--host gjs` (the Linux default) or `--host node` (the macOS/Windows
 * bundle). Sweeping the node host from Linux is the only coverage it gets, this being
 * the one machine that runs both.
 *
 * The sweep is honest about what it does not prove: it opens a route and reads the
 * log. It does not look at the window, so a screen that renders an empty box with no
 * diagnostic passes here. `dist/*.png` and the README's screenshots are the other half.
 */

import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_HOST, HOSTS, openOnce, refusalsIn, sweepTimings } from './hosts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '..');
const ROUTES_DIR = join(APP, 'src', 'app');

/**
 * Which host to sweep. `--host node` sweeps the macOS/Windows bundle, which on Linux is
 * the only way it gets swept at all — this is the one machine that can run both.
 */
const hostArg = process.argv.indexOf('--host');
const HOST_NAME = hostArg === -1 ? DEFAULT_HOST : process.argv[hostArg + 1];
const HOST = HOSTS[HOST_NAME];
if (HOST === undefined) {
  console.error(
    `route sweep: unknown --host '${HOST_NAME}'. Expected: ${Object.keys(HOSTS).join(', ')}`,
  );
  process.exit(2);
}

/**
 * The dwell and the kill deadline, from `hosts.mjs` so both sweeps agree on them.
 *
 * VALIDATED there, and that is not fussiness: a non-numeric `SWEEP_DWELL_MS` made
 * `Number()` answer `NaN`, `execFileSync` threw `ERR_OUT_OF_RANGE` before spawning
 * anything, and this sweep read the empty output as a clean run. Every route passed
 * without a single process starting.
 */
const { dwell: DWELL, killAfterMs: KILL_AFTER_MS } = sweepTimings();

/**
 * The kill deadline, in the CHILD's own terms rather than a wrapper's.
 *
 * This used to shell out to `timeout(1)`, which is GNU coreutils: absent on macOS
 * (where it is `gtimeout`) and on Windows entirely. `execFileSync` carries the same
 * capability itself, so the deadline now costs no external program and works on all
 * three hosts. SIGKILL rather than SIGTERM because a wedged GTK process in a
 * screenshot-armed state has already shown it will not unwind on request.
 */
// THE BUDGET HAS TO CONTAIN THE CAPTURE, and since `CORRECTIV_DESKTOP_SCREENSHOT_QUIT`
// is '0' below, nothing else ends the run — the deadline is the ordinary end of a
// healthy one, so a capture that does not fit inside it simply never happens.
//
// It was DWELL + 6000, sized for a capture timer that started at ARMING. It now starts
// when the requested route has actually been applied, so startup, mount and store
// hydration sit inside the window too: route landing + DWELL + the capture's own second
// frame (1200 ms). On this host the route lands in 0.5-0.8 s and the capture follows at
// 5-6 s, but the macOS VM that lost a 4 s race to its own mount would land at roughly
// 9 s — inside the old 9.5 s budget by 500 ms. A miss there is printed as
// `[no capture]` beside an `ok`, which is the quiet kind of wrong this sweep exists to
// avoid, so the slack is bought rather than the margin trusted.

/** Every route file, as the manifest's context keys. */
function routeFiles(dir, prefix = '') {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return routeFiles(full, `${prefix}${entry}/`);
    return entry.endsWith('.tsx') ? [`${prefix}${entry}`] : [];
  });
}

/**
 * A context key -> the href the router would match.
 *
 * `_layout` files are not routes; a `[param]` needs a value, and the values below are
 * real ids out of the app's own bundled sample data, because a route that 404s inside
 * its own screen renders a legitimate empty state and would pass for the wrong reason.
 */
const PARAM_VALUES = {
  'aufruf/[slug].tsx': 'heizungsgesetz',
  'behauptung/[id].tsx': 'c1',
  'projekt/[id].tsx': 'klimacheck',
  'serie/[id].tsx': 'salon5-nachrichten',
  'tagebuch/[id].tsx': 'd1',
};

function hrefFor(contextKey) {
  if (contextKey.endsWith('_layout.tsx')) return null;
  if (contextKey in PARAM_VALUES) {
    return '/' + contextKey.replace(/\/\[[^\]]+\]\.tsx$/, `/${PARAM_VALUES[contextKey]}`);
  }
  // A DYNAMIC ROUTE WITH NO VALUE IS A FAILURE, not a route to skip. It used to
  // `return null`, which dropped it from the target list: a new `foo/[id].tsx` swept
  // nothing, the printed count shrank by one, and the summary still said every route
  // rendered. The values are a judgement about the app's own sample data, so they have
  // to be added by hand — and this is where somebody finds out they have to.
  if (contextKey.includes('[')) {
    throw new Error(
      `${contextKey} takes a [param] and PARAM_VALUES has no value for it. Add one — a real id ` +
        `out of the app's bundled data, because a route that 404s inside its own screen renders a ` +
        `legitimate empty state and would pass for the wrong reason.`,
    );
  }
  const withoutGroups = contextKey
    .replace(/\.tsx$/, '')
    .split('/')
    .filter((segment) => !segment.startsWith('('))
    .join('/');
  if (withoutGroups === 'index') return '/';
  return `/${withoutGroups}`;
}

const keys = routeFiles(ROUTES_DIR).sort();
const targets = keys.map((key) => [key, hrefFor(key)]).filter(([, href]) => href !== null);

// Naming the host is not decoration: the two bundles fail differently, and a sweep
// result without it is a number whose subject nobody can reconstruct later.
console.log(
  `route sweep [--host ${HOST_NAME}]: ${keys.length} route files, ${targets.length} openable hrefs\n`,
);

// EMPTY THE CAPTURE DIRECTORY FIRST, because a route that stops producing one must
// LOOK like it stopped. Left alone, `dist/sweep/` keeps the PNG from the last run that
// managed one, so a screen that broke since then still has a picture — and
// `capture-diff` compares it happily, reporting a screen as unchanged that no longer
// renders at all. Measured: a baseline saved after a failing run carried three captures
// from the previous, working one.
const CAPTURES = join(APP, 'dist', 'sweep');
rmSync(CAPTURES, { recursive: true, force: true });
mkdirSync(CAPTURES, { recursive: true });

let failed = 0;
for (const [key, href] of targets) {
  // `openOnce` is shared with `component-sweep.mjs` and is where the three checks live
  // that stop a sweep passing on nothing: the bundle exists, a spawn failure that is
  // not the deadline is fatal, and an empty log is fatal. Its header carries the
  // measurement — `gjs` off PATH used to print "25 of 25 routes rendered".
  //
  // `CORRECTIV_DESKTOP_SCREENSHOT_QUIT: '0'` is the line that matters most in here, and
  // it is the difference between a sweep and a screenshot session. Closing the window
  // on capture made the process exit at DWELL + ~1.2 s, so anything the app refused
  // after that was never in the log — measured: `/suche` and `/gespeichert` both
  // reported `ok` with a capture attached while a run of the SAME bundle without the
  // capture threw `<TextInput> prop "placeholderTextColor"` and `<FlatList> prop
  // "contentContainerClassName"`. The screens render first and refuse when their data
  // arrives, which is later than any capture delay worth waiting for. So the deadline
  // bounds the run, not the capture; every route takes the full budget, and that cost
  // buys the sweep its subject back.
  const log = openOnce({
    host: HOST,
    appDir: APP,
    killAfterMs: KILL_AFTER_MS,
    env: {
      ...process.env,
      CORRECTIV_DESKTOP_ASSETS: resolve(APP, '..', 'mobile'),
      CORRECTIV_DESKTOP_ROUTE: href,
      // A PNG per route — the visual half this sweep does not check, but a human can
      // then flip through.
      CORRECTIV_DESKTOP_SCREENSHOT: join(CAPTURES, `${key.replaceAll('/', '_')}.png`),
      CORRECTIV_DESKTOP_SCREENSHOT_DELAY_MS: String(DWELL),
      CORRECTIV_DESKTOP_SCREENSHOT_QUIT: '0',
    },
  });

  const problems = refusalsIn(log);

  if (problems !== null) {
    failed++;
    console.log(`FAIL  ${href}  (${key})`);
    for (const problem of problems) console.log(`        ${problem.trim().slice(0, 180)}`);
  } else {
    const wrote = /screenshot: wrote (\d+) bytes/.exec(log);
    console.log(
      `ok    ${href}  (${key})${wrote ? `  [${wrote[1]} byte capture]` : '  [no capture]'}`,
    );
  }
}

console.log(`\n${targets.length - failed} of ${targets.length} routes rendered without a refusal.`);
const layouts = keys.filter((key) => key.endsWith('_layout.tsx'));
console.log(`(${layouts.length} layout files are not openable hrefs: ${layouts.join(', ')})`);
process.exit(failed === 0 ? 0 : 1);
