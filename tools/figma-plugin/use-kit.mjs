// Point the screens at the kit: copies become instances.
//
// The screens were transcribed from screenshots one node at a time, so every button
// on the board is its own little frame that happens to look like a button. This
// replaces each recognised subtree with an instance of the component it was always
// meant to be, and lifts the eyeballed numbers to the real ones on the way: a button
// label measured off a PNG came out at 13px semibold, and `text-button` is 16 bold.
//
//   node tools/figma-plugin/use-kit.mjs
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

function badgeTone(node) {
  if (node.fill === '@color-emphasis') return 'emphasis';
  if (node.fill === '@color-alternative') return 'club';
  if (node.fill === undefined) return 'live';
  return 'neutral';
}

/** `claimStatusTag` picks the words; the surface says which of the four states. */
function claimTone(badge) {
  if (badge.fill === '#2e7d4f') return 'richtig';
  if (badge.fill === '@color-emphasis') return 'falsch';
  if (badge.stroke !== undefined) return 'inArbeit';
  return 'offen';
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
      return { Status: claimTone(badge), Label: texts(badge, [])[0].chars };
    },
  },
  {
    of: 'profile/ClubCard',
    when: (n) => (n.name || '') === 'ClubCard',
    read: (n) => {
      const all = texts(n, []);
      // Kicker, heart, name, tier line. The heart is a glyph, so it counts as text.
      const words = all.filter((t) => t.chars !== '♡' && t.chars !== '♥');
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
      return {
        Label: lines[0].chars,
        Beschreibung: lines[1] === undefined ? '' : lines[1].chars,
        'Beschreibung zeigen': lines[1] !== undefined,
        An: knob !== null && knob.fill === '@color-emphasis' ? 'ja' : 'nein',
      };
    },
  },
  {
    of: 'discover/ProjectRow',
    when: (n) => (n.name || '').startsWith('ProjectRow'),
    eats: ['space', 'line', 'space'],
    read: (n) => {
      const lines = texts(n, []).filter((t) => t.chars !== '›');
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
      if (label === undefined) return null;
      return { Ton: badgeTone(n), Label: label.chars };
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
for (const s of skipped) console.log(`  skipped: ${s}`);
