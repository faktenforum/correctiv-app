/**
 * Open the gallery and report whether every component in it rendered.
 *
 * WHY THIS EXISTS BESIDE `route-sweep.mjs`. That sweep opens 25 screens and is the
 * only oracle this host has for a render-time refusal. What it covers is whichever
 * components those screens happen to USE, in whichever variants they happen to
 * PASS. `apps/mobile/src/gallery/catalogue.tsx` covers every component in
 * `src/components`, in the variants its props allow, and
 * `apps/mobile/__tests__/gallery-catalogue.test.ts` on the phone's side fails when
 * one is missing — so the list cannot quietly shrink. This sweep is that catalogue,
 * opened on GTK.
 *
 * The difference is not the count, it is the VARIANTS. `<Badge tone="live">` renders
 * a dot the other three tones do not; `EpisodeRow` has a club form and a default
 * one; `ProgressBar` has a `durationSec={0}` case that exists because nothing is
 * known yet. A screen passes one of each. The catalogue passes all of them, and
 * every prop-refusal this host has hit was a prop some particular variant passes.
 *
 * TWO PHASES, because the catalogue at the deadline below is over half an hour. The
 * count is deliberately not written here: it was `44` for one commit, `main` added
 * `ui/SectionCard`, and nothing failed. The script prints what it enumerated.
 *
 *   1. One process, `/gallery` unfiltered, every component in one tree. Clean means
 *      clean, and it costs one run.
 *   2. Only if that run shows a refusal: one process per component,
 *      `/gallery?c=folder/Name`, so the log names the component instead of the
 *      primitive alone. `<Text> prop "onPress"` says what was refused; it does not
 *      say which component asked.
 *
 * `--each` forces phase 2 on its own. A component id narrows it further:
 *
 *     npm run component-sweep -w @correctiv/desktop
 *     npm run component-sweep -w @correctiv/desktop -- --each
 *     npm run component-sweep -w @correctiv/desktop -- ui/Badge media/LiveBanner
 *
 * WHAT IT DOES NOT PROVE, the same limit `route-sweep.mjs` states about itself: it
 * opens a page and reads the log. It does not look at the window, so a component
 * that draws an empty box with no diagnostic passes here. `dist/components/*.png`
 * is the other half, and `/gallery` in a browser is the reference to hold it
 * against.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_HOST, FAILURE_PATTERN, HOSTS } from './hosts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '..');
const COMPONENTS = resolve(APP, '..', 'mobile', 'src', 'components');

const hostArg = process.argv.indexOf('--host');
const HOST_NAME = hostArg === -1 ? DEFAULT_HOST : process.argv[hostArg + 1];
const HOST = HOSTS[HOST_NAME];
if (!HOST) {
  console.error(`unknown host "${HOST_NAME}". Known: ${Object.keys(HOSTS).join(', ')}`);
  process.exit(2);
}
const BUNDLE = join(APP, HOST.bundle);

// The same numbers `route-sweep.mjs` uses, and for the reasons its own comment
// gives: the deadline bounds the RUN and not the capture, because these screens
// refuse when their data arrives rather than when they mount.
const DWELL = Number(process.env.SWEEP_DWELL_MS ?? '3500');
const KILL_AFTER_MS = DWELL + 12000;

/** Not components: shared prop contracts and the barrel. The phone's own list. */
const NOT_A_COMPONENT = new Set(['ui/index.ts', 'media/videoFrameTypes.ts', 'reader/types.ts']);

function files(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? files(full) : [full];
  });
}

/**
 * Every component id the gallery answers to, read off the filesystem.
 *
 * The FILESYSTEM and not the catalogue file, which would mean parsing TSX. It is
 * the same enumeration `gallery-catalogue.test.ts` does, and that test is what
 * guarantees the catalogue has an entry for each of these — so this list and the
 * gallery's cannot disagree without the phone's own check going red first. A `.web`
 * or `.native` sibling is the same component twice and counts once, exactly as
 * `componentId` in the catalogue treats it.
 */
function componentIds() {
  const seen = new Set();
  for (const file of files(COMPONENTS)) {
    const rel = relative(COMPONENTS, file).replaceAll('\\', '/');
    if (NOT_A_COMPONENT.has(rel)) continue;
    const match = /^([^/]+)\/([^/.]+)(?:\.(?:web|native|android|ios))?\.tsx$/.exec(rel);
    if (!match) continue;
    seen.add(`${match[1]}/${match[2]}`);
  }
  return [...seen].sort();
}

const CAPTURES = join(APP, 'dist', 'components');

/**
 * Open one gallery page and hand back the log.
 *
 * `label` names the capture; `href` is what `CORRECTIV_DESKTOP_ROUTE` gets. Both
 * halves of the environment below are copied from `route-sweep.mjs` deliberately,
 * including `CORRECTIV_DESKTOP_SCREENSHOT_QUIT: '0'` — closing the window on
 * capture ended the observation early there and would do it here too.
 */
function open(href, label) {
  try {
    return execFileSync(HOST.command, [...HOST.args, BUNDLE], {
      cwd: APP,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: KILL_AFTER_MS,
      killSignal: 'SIGKILL',
      env: {
        ...process.env,
        CORRECTIV_DESKTOP_ASSETS: resolve(APP, '..', 'mobile'),
        CORRECTIV_DESKTOP_ROUTE: href,
        CORRECTIV_DESKTOP_SCREENSHOT: join(CAPTURES, `${label.replaceAll('/', '_')}.png`),
        CORRECTIV_DESKTOP_SCREENSHOT_DELAY_MS: String(DWELL),
        CORRECTIV_DESKTOP_SCREENSHOT_QUIT: '0',
      },
    });
  } catch (error) {
    // The deadline is the ordinary end of a healthy run here, exactly as in
    // `route-sweep.mjs`, so the output is salvaged and the log decides.
    return `${error.stdout ?? ''}${error.stderr ?? ''}`;
  }
}

/** The refusals in a log, at most two, or null when it is clean. */
function refusals(log) {
  const lines = log
    .split('\n')
    .filter((line) => FAILURE_PATTERN.test(line))
    .slice(0, 2);
  if (lines.length > 0) return lines;
  // Two of the pattern's alternatives span a newline, so the whole log is tested as
  // well; `route-sweep.mjs` says what a per-line filter alone misses.
  if (FAILURE_PATTERN.test(log)) return ['(matched across lines)'];
  return null;
}

const CATALOGUED = componentIds();
const args = process.argv.slice(2).filter((a) => !a.startsWith('--') && a !== HOST_NAME);
const forceEach = process.argv.includes('--each');

// A name nothing matches is refused rather than swept: the gallery answers an
// unknown `?c=` with "no component of that name", which renders cleanly and would
// be reported here as a component that passed.
const unknown = args.filter((id) => !CATALOGUED.includes(id));
if (unknown.length > 0) {
  console.error(`no such component: ${unknown.join(', ')}`);
  process.exit(2);
}

const ids = args.length > 0 ? args : CATALOGUED;

rmSync(CAPTURES, { recursive: true, force: true });
mkdirSync(CAPTURES, { recursive: true });

console.log(`component sweep [--host ${HOST_NAME}]: ${ids.length} components from the catalogue\n`);

let perComponent = forceEach || args.length > 0;
/**
 * Did the whole catalogue in one page refuse?
 *
 * Carried to the exit code, and that is not bookkeeping. A refusal phase 1 sees and
 * phase 2 does not is a REAL failure — it is the composition, not a component — and
 * an early version of this script exited 0 on exactly that, printing "45 of 45" over
 * a page that had thrown. The first full run of this sweep was that case.
 */
let wholePageRefused = false;

if (!perComponent) {
  // PHASE 1. Every component in one tree, which is what the page does unfiltered.
  process.stdout.write('all of them, in one page ... ');
  const problems = refusals(open('/gallery?bare=1', 'all'));
  if (problems === null) {
    console.log('ok');
    console.log(`\n${ids.length} of ${ids.length} components rendered without a refusal.`);
    console.log('(one page, one process; --each opens them one at a time)');
    process.exit(0);
  }
  console.log('FAIL');
  for (const problem of problems) console.log(`        ${problem.trim().slice(0, 180)}`);
  console.log('\nOpening them one at a time, to name the component.\n');
  wholePageRefused = true;
  perComponent = true;
}

// PHASE 2. One process per component, so a refusal names its subject.
let failed = 0;
for (const id of ids) {
  const problems = refusals(open(`/gallery?c=${id}&bare=1`, id));
  if (problems === null) {
    console.log(`ok    ${id}`);
    continue;
  }
  failed++;
  console.log(`FAIL  ${id}`);
  for (const problem of problems) console.log(`        ${problem.trim().slice(0, 180)}`);
}

console.log(`\n${ids.length - failed} of ${ids.length} components rendered without a refusal.`);
if (wholePageRefused && failed === 0) {
  console.log(
    'But the whole catalogue in ONE page refused, and no single component did. That is\n' +
      'a fault in the composition rather than in a component, and it is still a failure.',
  );
}
process.exit(failed === 0 && !wholePageRefused ? 0 : 1);
