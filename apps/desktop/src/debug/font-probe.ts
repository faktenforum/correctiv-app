// A standalone probe for the brand faces: does Pango actually END UP with them?
//
// WHY THIS EXISTS SEPARATELY FROM THE APP, and why a green `initFonts()` is not the
// answer. `initFonts()` reports what `pango_font_map_add_font_file()` returned, which
// is a claim about a call rather than about the font map. Pango's whole failure mode
// here is that it does not report a missing family: `set_family('Merriweather')`
// against a map that never got the file resolves to the default sans, the window
// draws, the process exits 0 and nothing says a word. So the useful question is not
// "did the call succeed" but "what does the map answer NOW", and only the map can say.
//
// It matters most on macOS, where `initFonts()` reports the faces as DECLINED and is
// right to: `add_font_file` is a vfunc the CoreText map does not implement, and the
// faces are supposed to be there already, activated by the OS from a `.app` bundle's
// `ATSApplicationFontsPath` before the process started. "Declined" is therefore
// consistent both with everything working and with nothing working, and this probe is
// what separates the two. Run outside a `.app` it should report the families ABSENT;
// run inside one, present.
//
// The last section is the real discriminator, on both axes. Asking the map for a
// family AT A WEIGHT and reading back what it handed over catches a substitution
// directly, whatever the registration said — and the weight is the half a family check
// cannot see: a map holding Regular and not Bold answers a 700 request with Regular,
// so bold text renders unbolded with nothing reported.
//
// Run:
//   gjsify build src/debug/font-probe.ts --app node --outfile dist/font-probe.node.mjs
//   GJSIFY_FONT_DIR=$PWD/data/fonts node dist/font-probe.node.mjs

import Pango from 'gi://Pango?version=1.0';
import PangoCairo from 'gi://PangoCairo?version=1.0';

import { initFonts } from '@gjsify/gtk-host/fonts';

import { FONT_CUTS, FONT_FAMILIES } from '../style/fonts.js';

const map = PangoCairo.FontMap.get_default();

/** The families the default map knows, lowercased for comparison. */
function families(): Set<string> {
  return new Set(map.list_families().map((family) => family.get_name().toLowerCase()));
}

function report(label: string, known: Set<string>): void {
  console.log(`\n--- ${label} ---`);
  console.log(`families on the map: ${known.size}`);
  for (const family of FONT_FAMILIES) {
    console.log(`  ${family.padEnd(16)} ${known.has(family.toLowerCase()) ? 'present' : 'ABSENT'}`);
  }
}

// 1. Before. This is the half that makes the "after" mean something: if the families
// are already here, the registration cannot be what put them here.
const before = families();
report('before initFonts()', before);

// 2. The registration itself, and what it claims.
const result = initFonts();
console.log('\n--- what initFonts() reported ---');
console.log(`dir:          ${result.dir ?? '(nothing named one)'}`);
console.log(`registered:   ${result.registered.length}`);
console.log(`declined:     ${result.declined.length}`);
console.log(`failed:       ${result.failed.length}`);
for (const failure of result.failed) console.log(`  FAILED ${failure.path}: ${failure.message}`);

// 3. After.
const after = families();
report('after initFonts()', after);

// 4. What the map actually hands over for each cut. A substitution shows up here and
// nowhere else — Pango answers with the face it chose, not with the one asked for.
console.log('\n--- what the map resolves each cut to ---');
const context = map.create_context();
let substituted = 0;
for (const [name, cut] of Object.entries(FONT_CUTS)) {
  // NOT `FontDescription.from_string(`${family} ${weight}`)`. A trailing number in a
  // Pango description string is the SIZE IN POINTS, so that spelling asked for
  // "Merriweather at 700pt, weight normal" and the answer came back at weight 400 —
  // which a family-only predicate reads as a pass. Both axes are set explicitly, and
  // both are checked.
  const wanted = new Pango.FontDescription();
  wanted.set_family(cut.family);
  wanted.set_weight(cut.weight);
  wanted.set_size(12 * Pango.SCALE);

  const font = map.load_font(context, wanted);
  const got = font?.describe();
  const gotFamily = got?.get_family() ?? '(nothing)';
  const gotWeight = got?.get_weight() ?? 0;
  const familyOk = gotFamily.toLowerCase() === cut.family.toLowerCase();
  // The weight is the half a family check cannot see: a map that has Regular and not
  // Bold answers a 700 request with Regular, and bold text renders unbolded with no
  // diagnostic anywhere.
  const weightOk = Number(gotWeight) === cut.weight;
  if (!familyOk || !weightOk) substituted += 1;
  const verdict = familyOk ? (weightOk ? 'ok' : 'WRONG WEIGHT') : 'SUBSTITUTED';
  console.log(
    `  ${name.padEnd(24)} asked ${cut.family} ${cut.weight}  ->  ${gotFamily} ${gotWeight}  ${verdict}`,
  );
}

console.log(`\nsubstituted cuts: ${substituted} of ${Object.keys(FONT_CUTS).length} (must be 0)`);
if (substituted !== 0) {
  console.error('FAIL: Pango handed back a different family or weight than the one asked for.');
}
