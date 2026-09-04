/**
 * Stage the app's brand faces into `data/fonts/`, where `gjsify ship` picks them up.
 *
 * WHY THE FILES ARE NOT IN GIT. They are already in the tree, as a dependency:
 * `@expo-google-fonts/merriweather` and `@expo-google-fonts/source-sans-3` ship 37
 * `.ttf` files between them, of which this app names five. Committing copies would
 * put binaries in the repository and give the licence texts a second home to drift
 * from, so `data/fonts/` is generated and gitignored — the same shape as
 * `src/generated/tokens.generated.ts`.
 *
 * WHY IT IMPORTS THE TABLE RATHER THAN LISTING THE FILES. `src/style/fonts.ts` is the
 * one place that says which cut is which, because the runtime has to split
 * `Merriweather_700Bold` into a family and a weight anyway. A second list here would
 * be a second truth, and the failure it produces is invisible: a face that did not
 * ship is a substituted typeface, and Pango does not report a missing family.
 *
 * Node 24 strips the types itself, so the table is read from the TypeScript module
 * directly rather than mirrored.
 *
 * Run: `npm run fonts -w @correctiv/desktop` (also run by `build`).
 */

import { cpSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { FONT_CUTS } from '../src/style/fonts.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '..');
const OUT = join(APP, 'data', 'fonts');
const require = createRequire(import.meta.url);

/**
 * The licence each family travels under. Both are SIL OFL 1.1, which requires the
 * licence to accompany the fonts — so it ships beside them rather than being assumed.
 * Named per PACKAGE, because that is where the text lives.
 */
const LICENCE_PACKAGES = ['@expo-google-fonts/merriweather', '@expo-google-fonts/source-sans-3'];

/** Resolve a package-relative specifier to a real path, or fail by name. */
function resolveFace(source) {
  try {
    return require.resolve(source);
  } catch {
    throw new Error(
      `stage-fonts: cannot resolve "${source}". Is the @expo-google-fonts dependency installed?`,
    );
  }
}

/** The licence file inside a font package, if it has one. */
function licenceIn(pkg) {
  let root;
  try {
    root = dirname(require.resolve(`${pkg}/package.json`));
  } catch {
    return null;
  }
  for (const name of readdirSync(root)) {
    if (/^(licen[cs]e|ofl)/i.test(name) && statSync(join(root, name)).isFile()) {
      return { from: join(root, name), to: `${pkg.split('/').pop()}-${name}` };
    }
  }
  return null;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const staged = [];
const seen = new Map();
for (const [name, cut] of Object.entries(FONT_CUTS)) {
  const from = resolveFace(cut.source);
  const leaf = basename(from);
  // A basename collision would silently ship one face and drop the other, and a face
  // that did not ship is a substituted typeface. So it is a named failure.
  if (seen.has(leaf)) {
    throw new Error(
      `stage-fonts: "${leaf}" is claimed by both ${seen.get(leaf)} and ${name}. ` +
        'Two faces cannot share a basename — one of them would not ship.',
    );
  }
  seen.set(leaf, name);
  cpSync(from, join(OUT, leaf));
  staged.push(`${leaf}  (${cut.family} ${cut.weight})`);
}

const licences = [];
for (const pkg of LICENCE_PACKAGES) {
  const licence = licenceIn(pkg);
  if (licence === null) {
    console.warn(`stage-fonts: no licence file found in ${pkg}; the faces ship without its text.`);
    continue;
  }
  cpSync(licence.from, join(OUT, licence.to));
  licences.push(licence.to);
}

console.log(`stage-fonts: ${staged.length} face(s) into data/fonts/`);
for (const line of staged) console.log(`  ${line}`);
console.log(`stage-fonts: ${licences.length} licence file(s): ${licences.join(', ') || 'none'}`);
