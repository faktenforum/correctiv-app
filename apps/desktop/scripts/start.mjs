// Launch the desktop host, on whichever of the three operating systems this is.
//
// This replaces four npm scripts that were POSIX-only in three separate ways, none of
// which is fixable by quoting: the `VAR=value command` prefix is not syntax in
// `cmd.exe` or PowerShell, `$PWD` does not exist there, and `gjs` is not the
// interpreter on macOS or Windows — it is not installed at all.
//
// Which interpreter runs which bundle is `hosts.mjs`, shared with `route-sweep.mjs`.
// This script picks the pair belonging to the machine it is on; `--host` overrides it,
// and on Linux `--host node` is how the macOS/Windows bundle gets exercised at all,
// this being the one machine that can run both.
//
// ## Why the asset root becomes absolute here
//
// The backend resolves a relative `CORRECTIV_DESKTOP_ASSETS` against
// `GLib.get_current_dir()`, so the old `../mobile` only worked when the process was
// launched from `apps/desktop`. Resolving it here removes the working directory from
// the contract — and on Windows a relative path mixed with the forward slashes the
// podcast data carries is exactly the shape `g_build_filenamev` will not normalise.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { argv, env, exit } from 'node:process';
import { fileURLToPath } from 'node:url';

import { DEFAULT_HOST, HOSTS } from './hosts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '..');

function parseArgs(args) {
  const out = { host: DEFAULT_HOST, bundle: null, screenshot: null, rest: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--host') {
      out.host = args[++i];
    } else if (arg === '--bundle') {
      out.bundle = args[++i];
    } else if (arg === '--screenshot') {
      // Optional value: bare `--screenshot` keeps the conventional destination.
      const next = args[i + 1];
      out.screenshot =
        next !== undefined && !next.startsWith('--') ? args[++i] : 'dist/screenshot.png';
    } else {
      out.rest.push(arg);
    }
  }
  return out;
}

const opts = parseArgs(argv.slice(2));
const host = HOSTS[opts.host];
if (host === undefined) {
  console.error(
    `[start] unknown --host '${opts.host}'. Expected one of: ${Object.keys(HOSTS).join(', ')}`,
  );
  exit(2);
}

const bundle = resolve(APP, opts.bundle ?? host.bundle);
if (!existsSync(bundle)) {
  // Naming the build that produces it is the whole value of this refusal: the two
  // targets have separate scripts, and reaching for the wrong one is the likely error.
  console.error(`[start] no bundle at ${bundle}\n[start] build it first: ${host.build}`);
  exit(2);
}

// `GJSIFY_FONT_DIR` is `gjsify ship`'s handover: its launcher exports it at wherever
// the staged faces ended up, because only the launcher knows whether the payload became
// `/usr`, a bundle's `Contents/Resources` or `C:\Program Files`. A dev run has no
// launcher, so it is set here — otherwise the chrome silently wears the system font in
// development and the brand faces only appear in a packaged build, which is the worst
// possible place to first notice a font problem. An existing value is left alone.
const childEnv = {
  GJSIFY_FONT_DIR: resolve(APP, 'data', 'fonts'),
  ...env,
  CORRECTIV_DESKTOP_ASSETS: resolve(APP, '..', 'mobile'),
};
if (opts.screenshot !== null) {
  childEnv.CORRECTIV_DESKTOP_SCREENSHOT = isAbsolute(opts.screenshot)
    ? opts.screenshot
    : resolve(APP, opts.screenshot);
}

const child = spawn(host.command, [...host.args, bundle, ...opts.rest], {
  cwd: APP,
  env: childEnv,
  stdio: 'inherit',
});

child.on('error', (error) => {
  const hint =
    opts.host === 'gjs'
      ? "gjs is not on PATH. On macOS and Windows that is expected — use '--host node'."
      : `could not launch ${host.command}`;
  console.error(`[start] ${hint}\n[start] ${error.message}`);
  exit(127);
});

// A signal death must not be reported as a clean exit: this host is being ported, and
// an intermittent SIGSEGV/SIGABRT in the GI bridge is precisely what a caller needs to
// see. Node's convention of 128 + signal number is what a shell would have reported.
child.on('exit', (code, signal) => {
  if (signal !== null) {
    console.error(`[start] the host died on ${signal}`);
    const numbers = { SIGABRT: 6, SIGSEGV: 11, SIGKILL: 9, SIGTERM: 15, SIGINT: 2 };
    exit(128 + (numbers[signal] ?? 0));
  }
  exit(code ?? 0);
});
