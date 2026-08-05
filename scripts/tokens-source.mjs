/**
 * Where the design tokens come from — the single answer, shared by everything
 * that reads them.
 *
 * ## Why this file exists
 *
 * The tokens live in `tokens/`, vendored from correctiv/wp-design-tokens (see
 * tokens/README.md for the commit and why vendoring rather than a submodule or
 * an npm dependency). Before that they were a SIBLING checkout, and every
 * consumer searched upwards for `wp-design-tokens/css`. That had two problems:
 *
 *   1. CI had no sibling, so the drift check skipped itself there.
 *   2. Worse, an upward search cannot tell the repo's own copy from any other
 *      checkout further up the tree. On this machine it found one at 17b87c8
 *      while the repo's own copy is at 501ee10 — a developer and CI would have
 *      generated from different sources and called it agreement.
 *
 * So resolution is now EXACT: find this repo's root by its own package.json,
 * then look in exactly one place. Nothing outside the repo can satisfy it.
 *
 * Counting `..` levels is what broke when the apps moved into `apps/*`; the
 * marker search below survives the next move without being able to wander off
 * into a foreign checkout.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The marker is the root package.json's name plus `workspaces` — specific enough
 * that no directory above this repo can match it.
 */
const ROOT_PKG_NAME = 'correctiv-app';

function findRepoRoot(from) {
  for (let dir = from; ; dir = dirname(dir)) {
    const pkg = resolve(dir, 'package.json');
    if (existsSync(pkg)) {
      try {
        const json = JSON.parse(readFileSync(pkg, 'utf8'));
        if (json.name === ROOT_PKG_NAME && json.workspaces) return dir;
      } catch {
        // Unparseable package.json — not our root, keep walking.
      }
    }
    if (dirname(dir) === dir) return null; // reached the filesystem root
  }
}

/**
 * Where to start walking up from.
 *
 * This module is loaded two ways: as real ESM by the npm scripts, and
 * transpiled to CommonJS by babel-jest for the drift test. Under the latter
 * `import.meta.url` is **null**, so using it unguarded throws before any test
 * can run. Fall back to the working directory, which is inside the repo for both
 * npm scripts (cwd = the package dir) and jest (cwd = rootDir).
 */
function startDir() {
  const self = typeof import.meta?.url === 'string' ? import.meta.url : null;
  return self ? dirname(fileURLToPath(self)) : process.cwd();
}

export const REPO_ROOT = findRepoRoot(startDir());

/** Absolute path to the vendored tokens directory, or null if it is missing. */
export function tokensDir() {
  if (!REPO_ROOT) return null;
  const dir = resolve(REPO_ROOT, 'tokens');
  return existsSync(resolve(dir, 'theme.css')) ? dir : null;
}

/**
 * Absolute path to theme.css. Throws rather than returning null, because every
 * caller needs it to do its job and a missing file here means the checkout is
 * broken, not that the caller should carry on with less.
 */
export function themeCssPath() {
  const dir = tokensDir();
  if (!dir) {
    throw new Error(
      'tokens/theme.css not found.\n\n' +
        'It is vendored into this repo — see tokens/README.md. If it is genuinely\n' +
        'missing, restore it from https://github.com/correctiv/wp-design-tokens\n' +
        'at the commit recorded there.\n\n' +
        (REPO_ROOT
          ? `Expected at: ${resolve(REPO_ROOT, 'tokens/theme.css')}`
          : `Could not even locate the repo root (no package.json with name "${ROOT_PKG_NAME}" and "workspaces" above this file).`),
    );
  }
  return resolve(dir, 'theme.css');
}
