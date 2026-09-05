/**
 * Point this host at a gjsify WORKING COPY instead of the published `@gjsify/*`.
 *
 * WHY. Every defect this host has left is in gjsify, not here: the reader's fade
 * (#1451), the props the GTK layer refuses, the header bars a routed window stacks.
 * Waiting for a release to try a fix makes the loop days long, and the version this
 * app pins is then the only thing that can be measured — so a claim like "fixed
 * upstream, we pick it up on the next bump" gets written down and quietly ages. It
 * already did once, and `apps/desktop/README.md` keeps the incident.
 *
 * WHAT IT DOES. Replaces each `node_modules/@gjsify/<name>` for which the working
 * copy holds a package of that name with a symlink to it, stashing the published
 * directory under `node_modules/.gjsify-published/<name>` so `--unlink` is a rename
 * rather than a download.
 *
 * ALL OF THEM, not a chosen few. A linked `@gjsify/react-native` resolves its own
 * imports through the working copy, so linking the four this app names by hand would
 * still leave the ones IT reaches at whatever npm installed — one bundle holding two
 * release trains, which gjsify's own release train does not promise to survive
 * (ADR 0008: compatibility inside a release, not across). One tree or the other.
 *
 * THE LINK IS NOT THE POINT, THE READOUT IS. `--status` prints every `@gjsify/*` this
 * app resolves with its version, whether it is a link, and what the working copy's git
 * says — and `build` runs it, so the answer to "which gjsify produced this bundle" is
 * in the build log rather than in someone's memory. A working copy moves under you:
 * it is a checkout other people commit to, and `git describe` is the only thing that
 * distinguishes two bundles built an hour apart from the same version number.
 *
 *   node scripts/gjsify-link.mjs --repo <path>   # link, and remember the path
 *   node scripts/gjsify-link.mjs                 # link, using the remembered path
 *   node scripts/gjsify-link.mjs --status        # what is linked, and to what
 *   node scripts/gjsify-link.mjs --unlink        # put the published tree back
 *
 * The path comes from `--repo`, else `GJSIFY_REPO`, else `.gjsify-repo` beside this
 * app — written by the first `--repo` and gitignored, because where a developer keeps
 * a checkout of another project is not a fact about this repository.
 */

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { argv, exit, env } from 'node:process';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '..');
const ROOT = resolve(APP, '../..');
const SCOPE = join(ROOT, 'node_modules', '@gjsify');
const STASH = join(ROOT, 'node_modules', '.gjsify-published');
const REMEMBERED = join(APP, '.gjsify-repo');

/** Where a gjsify working copy keeps its packages. Two levels, `packages/<pillar>/<name>`. */
const PACKAGE_GLOB_DEPTH = 2;

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Every package in a gjsify working copy, by npm name.
 *
 * Walked rather than listed, because the pillar a package sits under is gjsify's
 * business and it moves them: `@gjsify/node-gi` is not even a workspace member. A
 * hard-coded `packages/framework/react-native` would go silently un-linked the day it
 * moves, and this script's whole job is to leave nothing at the published version by
 * accident.
 */
function packagesIn(repo) {
  const found = new Map();
  const walk = (dir, depth) => {
    if (depth > PACKAGE_GLOB_DEPTH) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }
      const child = join(dir, entry.name);
      const manifest = join(child, 'package.json');
      if (existsSync(manifest)) {
        const { name, version } = readJson(manifest);
        if (typeof name === 'string' && name.startsWith('@gjsify/')) {
          found.set(name, { dir: child, version });
        }
      }
      walk(child, depth + 1);
    }
  };
  walk(join(repo, 'packages'), 0);
  return found;
}

/**
 * Whether a package in the working copy has been BUILT.
 *
 * Not a nicety. `@gjsify/*` publish `lib/`, which is a build output and is gitignored,
 * so a fresh checkout holds every package's source and none of its entry points. Linked
 * unbuilt, the bundler reports a missing module for a package that is plainly there,
 * which reads as a resolution bug and is not one.
 *
 * The entry is taken from the manifest rather than assumed to be `lib/esm/index.js`:
 * `@gjsify/cli` ships `lib/index.js` and the two native shims ship no JavaScript at all.
 */
function entryOf(pkgDir) {
  const manifest = readJson(join(pkgDir, 'package.json'));
  const dot = manifest.exports?.['.'];
  const candidate =
    typeof dot === 'string'
      ? dot
      : typeof dot === 'object' && dot !== null
        ? (dot.import ?? dot.default ?? dot.node)
        : (manifest.main ?? (manifest.bin && Object.values(manifest.bin)[0]));
  if (typeof candidate !== 'string') return { path: null, built: true };
  const path = resolve(pkgDir, candidate);
  return { path, built: existsSync(path) };
}

/** `git describe` of a working copy, or null where it is not a checkout. */
function provenanceOf(repo) {
  const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();
  try {
    const head = git('describe', '--always', '--dirty');
    // A worktree checked out at a tag is detached, and "HEAD" as a branch name reads
    // like a bug rather than like the answer.
    const named = git('rev-parse', '--abbrev-ref', 'HEAD');
    const branch = named === 'HEAD' ? 'detached' : named;
    const subject = git('log', '-1', '--format=%s');
    return { head, branch, subject };
  } catch {
    return null;
  }
}

function repoFromArgs(args) {
  const flag = args.indexOf('--repo');
  const given = flag === -1 ? undefined : args[flag + 1];
  const path =
    given ??
    env.GJSIFY_REPO ??
    (existsSync(REMEMBERED) ? readFileSync(REMEMBERED, 'utf8').trim() : undefined);
  if (path === undefined) {
    throw new Error(
      'gjsify-link: no working copy given. Pass --repo <path>, set GJSIFY_REPO, or run\n' +
        '            it once with --repo so the path is remembered in apps/desktop/.gjsify-repo.',
    );
  }
  const resolved = resolve(path);
  if (!existsSync(join(resolved, 'packages'))) {
    throw new Error(`gjsify-link: ${resolved} has no packages/ — is that a gjsify checkout?`);
  }
  if (given !== undefined) writeFileSync(REMEMBERED, `${resolved}\n`);
  return resolved;
}

/** What `node_modules/@gjsify/<name>` currently is. */
function stateOf(name) {
  const path = join(SCOPE, name);
  if (!existsSync(path) && !isLink(path)) return { kind: 'absent', path };
  if (isLink(path)) {
    const target = resolve(SCOPE, readlinkSync(path));
    return { kind: 'linked', path, target, dangling: !existsSync(target) };
  }
  return { kind: 'published', path, version: readJson(join(path, 'package.json')).version };
}

function isLink(path) {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
}

function link(repo) {
  const available = packagesIn(repo);
  const installed = readdirSync(SCOPE).filter((name) => !name.startsWith('.'));
  mkdirSync(STASH, { recursive: true });

  const linked = [];
  const unbuilt = [];
  const untouched = [];

  for (const name of installed) {
    const full = `@gjsify/${name}`;
    const source = available.get(full);
    if (source === undefined) {
      untouched.push(name);
      continue;
    }
    const { built, path: entry } = entryOf(source.dir);
    if (!built) {
      unbuilt.push({ name, entry: relative(repo, entry) });
      continue;
    }
    const state = stateOf(name);
    if (
      state.kind === 'linked' &&
      !state.dangling &&
      realpathSync(state.target) === realpathSync(source.dir)
    ) {
      linked.push({ name, version: source.version, fresh: false });
      continue;
    }
    if (state.kind === 'published') {
      const stashed = join(STASH, name);
      rmSync(stashed, { recursive: true, force: true });
      renameSync(state.path, stashed);
    } else if (state.kind === 'linked') {
      rmSync(state.path);
    }
    symlinkSync(source.dir, join(SCOPE, name), 'dir');
    linked.push({ name, version: source.version, fresh: true });
  }

  return { linked, unbuilt, untouched };
}

function unlink() {
  if (!existsSync(STASH)) return { restored: [], removed: [] };
  const restored = [];
  const removed = [];
  for (const name of readdirSync(SCOPE)) {
    const path = join(SCOPE, name);
    if (!isLink(path)) continue;
    rmSync(path);
    const stashed = join(STASH, name);
    if (existsSync(stashed)) {
      renameSync(stashed, path);
      restored.push(name);
    } else {
      removed.push(name);
    }
  }
  return { restored, removed };
}

/**
 * The readout `build` prints.
 *
 * Returns the exit code, because a DANGLING link is a hard failure: the working copy
 * moved or was deleted, and the bundler's message for that is a missing module rather
 * than a missing checkout.
 */
function status() {
  if (!existsSync(SCOPE)) {
    console.log('gjsify: no @gjsify/* installed. Run npm install.');
    return 1;
  }
  const names = readdirSync(SCOPE).filter((name) => !name.startsWith('.'));
  const links = [];
  const published = new Map();
  let dangling = 0;

  for (const name of names.sort()) {
    const state = stateOf(name);
    if (state.kind === 'linked') {
      if (state.dangling) dangling += 1;
      links.push({ name, ...state });
      continue;
    }
    if (state.kind === 'published') {
      published.set(state.version, (published.get(state.version) ?? 0) + 1);
    }
  }

  if (links.length === 0) {
    const versions = [...published].map(([v, n]) => `${v} (${n})`).join(', ');
    console.log(`gjsify: published, ${versions}`);
    return 0;
  }

  const roots = new Set(
    links.filter((l) => !l.dangling).map((l) => gitRootOf(realpathSync(l.target))),
  );
  console.log(`gjsify: LINKED — ${links.length} package(s) from a working copy, not npm.`);
  for (const root of roots) {
    if (root === null) continue;
    const git = provenanceOf(root);
    const version = versionAt(root);
    console.log(`  ${root}`);
    console.log(
      git === null
        ? `    v${version}, not a git checkout`
        : `    v${version} · ${git.branch} · ${git.head} · ${git.subject}`,
    );
  }
  if (published.size > 0) {
    const versions = [...published].map(([v, n]) => `${v} (${n})`).join(', ');
    console.log(`  still published: ${versions} — no package of that name in the working copy`);
  }
  if (dangling > 0) {
    console.error(
      `gjsify-link: ${dangling} link(s) point at a path that is gone. ` +
        'Re-run scripts/gjsify-link.mjs, or --unlink to go back to the published tree.',
    );
    return 1;
  }
  return 0;
}

/** The checkout a linked package belongs to: the nearest ancestor holding a `.git`. */
function gitRootOf(pkgDir) {
  let dir = pkgDir;
  for (;;) {
    if (existsSync(join(dir, '.git'))) return dir;
    const up = dirname(dir);
    if (up === dir) return null;
    dir = up;
  }
}

function versionAt(repo) {
  try {
    return readJson(join(repo, 'package.json')).version;
  } catch {
    return 'unknown';
  }
}

const args = argv.slice(2);

if (args.includes('--status')) {
  exit(status());
}

if (args.includes('--unlink')) {
  const { restored, removed } = unlink();
  console.log(`gjsify-link: restored ${restored.length} published package(s).`);
  if (removed.length > 0) {
    console.error(
      `gjsify-link: ${removed.length} link(s) had no stashed original and were removed: ` +
        `${removed.join(', ')}. Run npm install.`,
    );
    exit(1);
  }
  exit(0);
}

const repo = repoFromArgs(args);
const { linked, unbuilt, untouched } = link(repo);
const fresh = linked.filter((l) => l.fresh).length;
console.log(
  `gjsify-link: ${linked.length} package(s) linked to ${repo} (${fresh} changed), ` +
    `${untouched.length} left published.`,
);
if (unbuilt.length > 0) {
  console.error(
    `gjsify-link: ${unbuilt.length} package(s) are in the working copy but NOT BUILT, so they ` +
      'were left published:',
  );
  for (const { name, entry } of unbuilt) console.error(`  @gjsify/${name} — no ${entry}`);
  console.error('  Build them there first: gjsify run build');
}
exit(status());
