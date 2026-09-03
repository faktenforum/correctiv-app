// Point the screens at the kit: copies become instances.
//
// The screens were transcribed from screenshots one node at a time, so every button
// on the board is its own little frame that happens to look like a button. This
// replaces each recognised subtree with an instance of the component it was always
// meant to be, and lifts the eyeballed numbers to the real ones on the way: a button
// label measured off a PNG came out at 13px semibold, and `text-button` is 16 bold.
//
//   node tools/figma-plugin/sync-tokens.mjs      # FIRST, always
//   node tools/figma-plugin/use-kit.mjs
//
// That order is load-bearing. The matchers below read `@color-emphasis` and friends,
// because the board's transcribed hexes are eyeballed approximations that only the
// token map resolves. Run this first and every rule that classifies by colour comes
// up empty — which is now a hard failure rather than a wrong-coloured board.
//
// Destructive and deliberately so. `spec.json` is committed, so the copies are one
// `git checkout` away; there is no second description kept alongside.
//
// What it does NOT convert is as interesting as what it does. `Card` appears sixteen
// times and stays a copy every time, because a Figma instance may override text and
// visibility but can never be given children, and every one of those cards carries
// content. That is the same wall the app hits: the content-bearing card has no name
// in the code either. See the README.

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SPEC = join(HERE, 'spec.json');

/** Depth-first text of a subtree, in reading order. */
function texts(node, out) {
  if (node.t === 'text') out.push(node);
  for (const child of node.children || []) texts(child, out);
  return out;
}

function named(node, prefix) {
  for (const child of node.children || []) {
    if ((child.name || '').startsWith(prefix)) return child;
    const deeper = named(child, prefix);
    if (deeper !== null) return deeper;
  }
  return null;
}

/**
 * Which button this is.
 *
 * By fill, because that is the only thing `SURFACE` in Button.tsx varies. The pale
 * red is the disabled primary — `disabled ? 'opacity-40'` — which the kit does not
 * carry as a variant, so it comes back as a primary at four tenths.
 */
function buttonTone(node) {
  const fill = node.fill;
  if (fill === '#ffc0c8') return { value: 'primary', opacity: 0.4 };
  if (fill === '@color-emphasis') return { value: 'primary' };
  if (fill === '@color-grey-200') return { value: 'secondary' };
  if (fill === '@color-alternative') return { value: 'club' };
  if (fill === '@color-grey-100') {
    // A white button with a hairline is the outline variant; without one it is the
    // CTA that sits on the red mission screen, where white IS the surface.
    return { value: node.stroke === undefined ? 'onEmphasis' : 'outline' };
  }
  return null;
}

/**
 * Which badge tone this is.
 *
 * An unrecognised fill returns null rather than falling through to `neutral`. It used
 * to fall through, and on a spec that had not been through `sync-tokens.mjs` that
 * turned five brand-red badges into grey ones with no complaint anywhere — the count
 * in the summary was right and the board was wrong.
 */
function badgeTone(node) {
  if (node.fill === undefined) return 'live';
  if (node.fill === '@color-emphasis') return 'emphasis';
  if (node.fill === '@color-alternative') return 'club';
  if (['@color-grey-100', '@color-grey-200', '@color-grey-250'].indexOf(node.fill) !== -1) {
    return 'neutral';
  }
  return null;
}

/**
 * `claimStatusTag` picks the words; the surface says which of the four states.
 *
 * Null on anything else, for the same reason as `badgeTone`: the old `return 'offen'`
 * default made every tag on an untokenised spec read as unchecked.
 */
function claimTone(badge) {
  if (badge.fill === '#2e7d4f') return 'richtig';
  if (badge.fill === '@color-emphasis') return 'falsch';
  if (badge.stroke !== undefined) return 'inArbeit';
  if (['@color-grey-200', '@color-grey-250'].indexOf(badge.fill) !== -1) return 'offen';
  return null;
}

/**
 * One entry per component the screens can point at.
 *
 * `when` recognises a node, `read` turns it into an instance. Order matters: NavCard
 * and ClaimStatusTag both CONTAIN a badge, and a matched node is never descended
 * into, so the containers have to come first or their badges would be converted out
 * from under them.
 */
const RULES = [
  {
    of: 'profile/NavCard',
    when: (n) => (n.name || '').startsWith('NavCard'),
    // The board separates its rows with `space, line, space`; the component brings
    // its own bottom hairline and its own padding, so all three have to go or every
    // row ends up underlined twice.
    eats: ['space', 'line', 'space'],
    read: (n) => {
      const title = named(n, 'Titel');
      const all = texts(n, []);
      const badge = named(n, 'Badge');
      // The subtitle is the last line that is neither the title nor the badge.
      const titleText = title === null ? all[0] : texts(title, [])[0];
      if (titleText === undefined) return null;
      const subtitle = all.filter((t) => t !== titleText && (badge === null || t.chars !== 'CLUB'));
      return {
        Titel: titleText.chars,
        Untertitel: subtitle.length > 0 ? subtitle[subtitle.length - 1].chars : '',
        Club: badge !== null,
      };
    },
  },
  {
    of: 'participate/ClaimStatusTag',
    when: (n) => (n.name || '').startsWith('ClaimStatusTag'),
    read: (n) => {
      const badge = named(n, 'Badge');
      if (badge === null) return null;
      const label = texts(badge, [])[0];
      const status = claimTone(badge);
      if (label === undefined || status === null) return null;
      return { Status: status, Label: label.chars };
    },
  },
  {
    of: 'profile/ClubCard',
    when: (n) => (n.name || '') === 'ClubCard',
    read: (n) => {
      const all = texts(n, []);
      // Kicker, heart, name, tier line. The heart is a glyph, so it counts as text.
      const words = all.filter((t) => t.chars !== '♡' && t.chars !== '♥');
      if (words[1] === undefined) return null;
      return { Name: words[1].chars, Stufe: words[2] === undefined ? '' : words[2].chars };
    },
  },
  {
    of: 'profile/SettingRow',
    when: (n) => (n.name || '').startsWith('SettingRow'),
    read: (n) => {
      const label = named(n, 'Text');
      const lines = label === null ? texts(n, []) : texts(label, []);
      const knob = named(n, 'Schalter');
      // The knob's own fill is the only thing that says on or off, so a row without
      // one cannot be read. Defaulting to 'nein' would have drawn every switch off.
      if (lines[0] === undefined || knob === null || knob.fill === undefined) return null;
      return {
        Label: lines[0].chars,
        Beschreibung: lines[1] === undefined ? '' : lines[1].chars,
        'Beschreibung zeigen': lines[1] !== undefined,
        An: knob.fill === '@color-emphasis' ? 'ja' : 'nein',
      };
    },
  },
  {
    of: 'discover/ProjectRow',
    when: (n) => (n.name || '').startsWith('ProjectRow'),
    eats: ['space', 'line', 'space'],
    read: (n) => {
      const lines = texts(n, []).filter((t) => t.chars !== '›');
      if (lines[0] === undefined) return null;
      return { Name: lines[0].chars, Teaser: lines[1] === undefined ? '' : lines[1].chars };
    },
  },
  {
    of: 'ui/ScreenHeader',
    when: (n) => (n.name || '').startsWith('ScreenHeader'),
    // The kit's header carries its own hairline, and the board draws one as the next
    // sibling. `eats` says so, and the walk drops it.
    eats: ['line'],
    read: (n) => {
      const lines = texts(n, []).filter((t) => t.chars !== '‹');
      return { Zurück: lines.length > 0 ? lines[0].chars : 'Zurück' };
    },
  },
  {
    of: 'ui/Button',
    when: (n) => (n.name || '').startsWith('Button,'),
    read: (n) => {
      const tone = buttonTone(n);
      const label = texts(n, [])[0];
      if (tone === null || label === undefined) return null;
      return { Variante: tone.value, Titel: label.chars, __opacity: tone.opacity };
    },
  },
  {
    of: 'ui/Badge',
    when: (n) => (n.name || '').startsWith('Badge,'),
    read: (n) => {
      const label = texts(n, [])[0];
      const tone = badgeTone(n);
      if (label === undefined || tone === null) return null;
      return { Ton: tone, Label: label.chars };
    },
  },
];

const counts = {};
const skipped = [];

/**
 * Replace what can be replaced, in one children array.
 *
 * Width is carried over, because 'fill' is a fact about the column the node sits in
 * and not about the component. Height is NOT: the whole point is to let the
 * component's own padding decide, and a transcribed 48 would pin it to the number
 * somebody measured off a screenshot.
 */
function convert(children) {
  const out = [];
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    let done = false;
    for (const rule of RULES) {
      // An instance keeps the name of the copy it replaced, so every rule would match
      // it again on a second run — and then find none of the text it reads, because
      // an instance has no children. Converting is a one-way step.
      if (node.t === 'instance') break;
      if (!rule.when(node)) continue;
      const set = rule.read(node);
      if (set === null) {
        skipped.push(rule.of + ': ' + (node.name || '?'));
        break;
      }
      const opacity = set.__opacity;
      delete set.__opacity;
      const instance = { t: 'instance', of: rule.of, name: node.name, set: set };
      if (node.w !== undefined) instance.w = node.w;
      if (node.x !== undefined) instance.x = node.x;
      if (node.y !== undefined) instance.y = node.y;
      if (opacity !== undefined) instance.opacity = opacity;
      out.push(instance);
      counts[rule.of] = (counts[rule.of] || 0) + 1;
      // Whatever the component now brings itself, the board must stop drawing.
      // The types are eaten in order and each one is optional, so a row that happens
      // to be last in its list loses only the separators it actually has.
      for (const eat of rule.eats || []) {
        if (children[i + 1] !== undefined && children[i + 1].t === eat) i++;
      }
      done = true;
      break;
    }
    if (done) continue;
    if (node.children) node.children = convert(node.children);
    out.push(node);
  }
  return out;
}

const spec = JSON.parse(await readFile(SPEC, 'utf8'));
spec.screens = convert(spec.screens || []);
await writeFile(SPEC, `${JSON.stringify(spec, null, 2)}\n`);

const total = Object.values(counts).reduce((a, b) => a + b, 0);
console.log(`${total} copies are now instances`);
for (const of of Object.keys(counts).sort())
  console.log(`  ${String(counts[of]).padStart(3)}  ${of}`);
// A skip is a node that matched a rule by name and then could not be read. That is
// never fine: it leaves one row on the board a copy while its neighbours became
// instances, which looks like a rendering bug and is a silent hole in the kit.
//
// The usual cause is running this before `sync-tokens.mjs`. The tone functions read
// `@color-emphasis` and friends, because the board's transcribed hexes are eyeballed
// approximations that only the token map resolves — so on an untokenised spec
// twenty-five of twenty-six buttons match by name and then classify as nothing.
if (skipped.length > 0) {
  for (const s of skipped) console.error(`  UNREADABLE: ${s}`);
  throw new Error(
    `${skipped.length} node(s) matched a rule and could not be read, run sync-tokens.mjs first`,
  );
}
