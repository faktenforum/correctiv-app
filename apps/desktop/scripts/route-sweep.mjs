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

import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_HOST, FAILURE_PATTERN, HOSTS } from './hosts.mjs';

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
const BUNDLE = join(APP, HOST.bundle);

/** Milliseconds each route gets to render before the process is killed. */
const DWELL = Number(process.env.SWEEP_DWELL_MS ?? '3500');

/**
 * The kill deadline, in the CHILD's own terms rather than a wrapper's.
 *
 * This used to shell out to `timeout(1)`, which is GNU coreutils: absent on macOS
 * (where it is `gtimeout`) and on Windows entirely. `execFileSync` carries the same
 * capability itself, so the deadline now costs no external program and works on all
 * three hosts. SIGKILL rather than SIGTERM because a wedged GTK process in a
 * screenshot-armed state has already shown it will not unwind on request.
 */
const KILL_AFTER_MS = DWELL + 6000;

const FAILURE = FAILURE_PATTERN;

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
  if (contextKey.includes('[')) return null;
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

let failed = 0;
for (const [key, href] of targets) {
  let log = '';
  try {
    log = execFileSync(HOST.command, [...HOST.args, BUNDLE], {
      cwd: APP,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: KILL_AFTER_MS,
      killSignal: 'SIGKILL',
      env: {
        ...process.env,
        CORRECTIV_DESKTOP_ASSETS: resolve(APP, '..', 'mobile'),
        CORRECTIV_DESKTOP_ROUTE: href,
        // A PNG per route — the visual half this sweep does not check, but a human
        // can then flip through.
        CORRECTIV_DESKTOP_SCREENSHOT: join(APP, 'dist', 'sweep', `${key.replaceAll('/', '_')}.png`),
        CORRECTIV_DESKTOP_SCREENSHOT_DELAY_MS: String(DWELL),
        // THE CAPTURE MUST NOT END THE OBSERVATION, and this line is the whole
        // difference between a sweep and a screenshot session. Closing the window on
        // capture made the process exit at DWELL + ~1.2 s, so anything the app refused
        // after that was never in the log — measured: `/suche` and `/gespeichert` both
        // reported `ok` with a capture attached while a run of the SAME bundle without
        // the capture threw `<TextInput> prop "placeholderTextColor"` and `<FlatList>
        // prop "contentContainerClassName"`. The screens render first and refuse when
        // their data arrives, which is later than any capture delay worth waiting for.
        // So the deadline below bounds the run, not the capture; the cost is that every
        // route now takes the full KILL_AFTER_MS, and that cost buys the sweep its
        // subject back.
        CORRECTIV_DESKTOP_SCREENSHOT_QUIT: '0',
      },
    });
  } catch (error) {
    // Reaching the deadline throws (`error.killed`), and so does a signal death — which
    // on the node host is a real possibility, the GI bridge having a known intermittent
    // lifetime fault. Neither is a failure BY ITSELF, and since the capture no longer
    // closes the window, the deadline is now the ORDINARY end of a healthy run. The log
    // decides, so the output is salvaged and read.
    log = `${error.stdout ?? ''}${error.stderr ?? ''}`;
  }

  const problems = log
    .split('\n')
    .filter((line) => FAILURE.test(line))
    .slice(0, 2);

  if (problems.length > 0) {
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
