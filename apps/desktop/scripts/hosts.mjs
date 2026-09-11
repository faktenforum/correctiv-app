// Which interpreter runs which bundle, on which operating system.
//
// One table, imported by `start.mjs` and `route-sweep.mjs`. It lives in its own module
// because there are now two build targets and two launch sites: a second copy of this
// mapping would be a second truth, and the one that drifts is the one that gets read.
//
// Linux runs the `--app gjs` bundle on the distribution's own GJS. macOS and Windows
// have no system GJS, so they run the `--app node` bundle with `@gjsify/node-gi`
// bridging `gi://`. See gjsify's own ADR 0024 for why that split is the packaging answer too, and
// `apps/desktop/README.md` for what the desktop host is and is not.

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
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
 *
 * `was never applied within` is the debug router giving up on a requested route. It is
 * a failure for the sweep specifically: every line the sweep prints is about a named
 * route, and a run that never reached that route has nothing to say about it.
 *
 * The last two alternatives span a newline, so they only match against a WHOLE log —
 * `route-sweep.mjs` tests both ways for that reason.
 */
export const FAILURE_PATTERN =
  /UnknownUtilityError|PrimitiveError|GtkHostError|RouterError|JS ERROR|no boundary caught|was never applied within|^\s+at .*\r?\n.*Error:|Error: .*\r?\n\s+at /m;

/**
 * How long a sweep waits before killing the process, and how long it dwells first.
 *
 * `SWEEP_DWELL_MS` is read here rather than in each sweep, and it is VALIDATED, which
 * is not fussiness: a non-numeric value made `Number()` answer `NaN`, `execFileSync`
 * then threw `ERR_OUT_OF_RANGE` before spawning anything, and the sweep read the empty
 * output as a clean run. Every route passed without a single process starting.
 */
export function sweepTimings(raw = process.env.SWEEP_DWELL_MS) {
  const dwell = raw === undefined ? 3500 : Number(raw);
  if (!Number.isFinite(dwell) || dwell < 0) {
    throw new Error(`SWEEP_DWELL_MS must be a non-negative number, got ${JSON.stringify(raw)}`);
  }
  // The deadline bounds the RUN and not the capture: these screens refuse when their
  // data arrives, which is later than any capture delay worth waiting for. See
  // `route-sweep.mjs` for the measurement that set this.
  return { dwell, killAfterMs: dwell + 12000 };
}

/**
 * Open the app once and hand back its log.
 *
 * THE WHOLE REASON THIS IS SHARED. Both sweeps used to salvage a failed spawn as an
 * empty log — `${error.stdout ?? ''}` — and an empty log contains no refusal, so it
 * read as a pass. Measured: `gjs` off PATH gives `ENOENT` with `error.stdout === null`,
 * and the sweep printed "25 of 25 routes rendered" and exited 0 without starting a
 * single process. An unbuilt bundle did the same. That is the exact failure shape the
 * sweeps exist to catch, sitting in the sweeps.
 *
 * So three things are checked here rather than in either caller:
 *
 *   1. the bundle exists, before anything is spawned;
 *   2. a spawn failure that is NOT the deadline is fatal — the deadline is the ordinary
 *      end of a healthy run, because the capture no longer closes the window;
 *   3. an empty log is fatal. A run of this app always says something, so no output
 *      means no process, whatever the exit code claimed.
 *
 * `throw` and not a return value, because a caller that could ignore this would.
 */
export function openOnce({ host, appDir, env, killAfterMs }) {
  const bundle = `${appDir}/${host.bundle}`;
  if (!existsSync(bundle)) {
    throw new Error(`${bundle} is missing. Run \`${host.build}\` first.`);
  }

  let log = '';
  try {
    log = execFileSync(host.command, [...host.args, bundle], {
      cwd: appDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: killAfterMs,
      killSignal: 'SIGKILL',
      env,
    });
  } catch (error) {
    // `killed` is the deadline, and a signal death is the node host's known
    // intermittent GI-bridge lifetime fault. Both leave a log worth reading.
    const deadline = error.killed === true || typeof error.signal === 'string';
    log = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    if (!deadline) {
      throw new Error(
        `${host.command} could not be run (${error.code ?? error.message}). ` +
          `Nothing was swept; a sweep that reports a pass here would be reporting on nothing.`,
        { cause: error },
      );
    }
  }

  if (log.trim() === '') {
    throw new Error(
      `${host.command} produced no output at all, so nothing rendered and nothing can be read ` +
        `from it. This is the case that used to report a pass.`,
    );
  }
  return log;
}

/**
 * The refusals in a log, at most `limit`, or null when it is clean.
 *
 * Two of `FAILURE_PATTERN`'s alternatives span a newline and a per-line filter can
 * never see either, so the whole log is tested as well — and the cross-line match is
 * RETURNED rather than replaced by a placeholder, because on the node host, where the
 * per-line half never matches, the placeholder was the only thing a failure printed.
 */
export function refusalsIn(log, limit = 2) {
  const lines = log
    .split('\n')
    .filter((line) => FAILURE_PATTERN.test(line))
    .slice(0, limit);
  if (lines.length > 0) return lines;
  const straddling = FAILURE_PATTERN.exec(log);
  return straddling === null ? null : [straddling[0]];
}
