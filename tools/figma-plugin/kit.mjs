// Build the component kit from the APP, not from the board.
//
// An earlier version cut components out of the drawn screens by name. That is the
// wrong direction and it showed: the screens are transcribed from screenshots, so
// what came out was a *usage* wearing a component's name — `ui/Card` arrived
// carrying a heading, a paragraph and two buttons, none of which `ui/Card.tsx` has
// ever known about.
//
// So this file describes each component the way its source file does, and takes the
// numbers from the same tokens the app compiles. A component here has the props its
// React counterpart has, as Figma component properties, and the ones with a `variant`
// union become a Figma variant set. Editing the main component in Figma therefore
// changes every instance, exactly as editing the .tsx changes every call site.
//
//   node tools/figma-plugin/kit.mjs
//
// It only ever rewrites the `Bausteine` page. Screens are untouched.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../..');
const SPEC = join(HERE, 'spec.json');
const PAGE = 'Bausteine';
const SKETCH_PAGE = 'Bausteine, Wireframe';

// ---------------------------------------------------------------- the scales
//
// Read, not retyped. A size that moves in the tokens moves the kit on the next run;
// a size typed in here would be a second opinion about a number that already has an
// owner.

const themeCss = await readFile(join(ROOT, 'packages/design-tokens/theme.css'), 'utf8');
const typographyTs = await readFile(
  join(ROOT, 'packages/design-tokens/src/typography.generated.ts'),
  'utf8',
);

/** Every `--name: value` in the file's first block, which is `@theme`. */
const scale = {};
for (const line of themeCss.split('\n')) {
  const m = line.match(/^\s*--([a-z0-9-]+):\s*([^;]+);/);
  if (m && scale[m[1]] === undefined) scale[m[1]] = m[2].trim();
}

/** rem at the 16px root the app assumes, px as written, bare numbers as numbers. */
function px(name) {
  const value = scale[name];
  if (value === undefined) throw new Error('no such token: --' + name);
  const rem = value.match(/^(-?[\d.]+)rem$/);
  if (rem) return Math.round(Number.parseFloat(rem[1]) * 16 * 1000) / 1000;
  const p = value.match(/^(-?[\d.]+)px$/);
  if (p) return Number.parseFloat(p[1]);
  return Number.parseFloat(value);
}

const S = {
  '4xs': px('spacing-4xs'),
  '3xs': px('spacing-3xs'),
  '2xs': px('spacing-2xs'),
  xs: px('spacing-xs'),
  s: px('spacing-s'),
  sm: px('spacing-sm'),
  m: px('spacing-m'),
};
const R = { xs: px('radius-xs'), s: px('radius-s'), md: px('radius-md') };

const specs = JSON.parse(
  typographyTs.slice(typographyTs.indexOf('{'), typographyTs.lastIndexOf('}') + 1),
);

/**
 * One `ty-*` variant as the interpreter's text properties.
 *
 * `leading` is a percentage here and a factor in the tokens; `tracking` is a
 * percentage here and px there, so it is divided by the size it applies to. Both
 * conversions belong to Figma, not to the token, which is why they live here.
 */
function ty(variant, extra) {
  const spec = specs[variant];
  if (spec === undefined) throw new Error('no such variant: ' + variant);
  const size = px('text-' + spec.size.replace(/^text-/, ''));
  const out = {
    t: 'text',
    // The variant's name, which is also the name of its Figma text style. The
    // numbers below stay as well: the replica binds the style, the wireframe draws
    // from the numbers, and neither needs the other.
    style: variant,
    font: spec.family,
    weight: spec.weight === 'normal' ? 'regular' : spec.weight,
    size: size,
    leading: Math.round(px('leading-' + spec.leading) * 100),
    tracking: Math.round((px('tracking-' + spec.tracking) / size) * 10000) / 100,
    color: '@color-grey-700',
  };
  // `Object.keys` does not skip an explicit `undefined`, and the specimen sheet
  // passes `weight: undefined` for the eleven variants that take their own weight.
  // Copying that over made `out.weight` undefined, which then read as an override
  // and named a style — `headline-l/undefined` — that does not exist, so those rows
  // bound no style and drew in Regular under a label saying Bold.
  for (const key of Object.keys(extra || {})) {
    if (extra[key] !== undefined) out[key] = extra[key];
  }
  // `<Typo variant="text-m" weight="bold">` is a variant with its weight overridden,
  // and Figma has no such thing: a text style pins the whole font, cut included. So
  // the pair gets a style of its own, named the way the JSX reads.
  if (out.weight !== (spec.weight === 'normal' ? 'regular' : spec.weight)) {
    out.style = variant + '/' + out.weight;
  }
  // A hand-set size or leading is not this variant any more, and a style would
  // silently undo it.
  if ((extra || {}).size !== undefined || (extra || {}).leading !== undefined) {
    delete out.style;
  }
  return out;
}

const VARIANTS = Object.keys(specs);

/**
 * Every `ty-*` variant as a Figma text style.
 *
 * This, not a component, is what `<Typo variant="headline-l">` is: a style applied
 * to a text node. Change `headline-l` in Figma and every headline on every page
 * follows, including the ones inside components — which is the behaviour a variant
 * set could never give, because a component only reaches what it contains.
 */
function styleOf(name, variant, weight) {
  const one = ty(variant, weight === undefined ? undefined : { weight: weight });
  return {
    name: name,
    font: one.font,
    weight: one.weight,
    size: one.size,
    leading: one.leading,
    tracking: one.tracking,
  };
}

/**
 * Which `variant` + `weight` pairs the app actually writes.
 *
 * Read off the JSX rather than listed here, because a list would be a second place
 * to remember. Four pairs today; a fifth appears in the kit the moment somebody
 * writes it in a screen.
 */
async function usedWeightOverrides() {
  const files = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.endsWith('.tsx')) files.push(full);
    }
  }
  await walk(join(ROOT, 'apps/mobile/src'));

  const pairs = {};
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    // The whole opening tag, newlines included: three call sites break the
    // attributes across lines and a single-line regex would miss them.
    for (const tag of source.match(/<Typo\b[^>]*>/g) || []) {
      const variant = tag.match(/variant="([a-z0-9-]+)"/);
      const weight = tag.match(/weight="([a-z]+)"/);
      if (variant === null || weight === null) continue;
      const spec = specs[variant[1]];
      if (spec === undefined) continue;
      const own = spec.weight === 'normal' ? 'regular' : spec.weight;
      if (weight[1] === own) continue;
      pairs[variant[1] + '/' + weight[1]] = [variant[1], weight[1]];
    }
  }
  return pairs;
}

const overrides = await usedWeightOverrides();
const TEXT_STYLES = VARIANTS.map((v) => styleOf(v, v)).concat(
  Object.keys(overrides)
    .sort()
    .map((name) => styleOf(name, overrides[name][0], overrides[name][1])),
);

// ---------------------------------------------------------------- the components
//
// Named after the file each one lives in, so that moving a `NavCard` in Figma and
// opening `profile/NavCard.tsx` are the same conversation. Order matters: a
// component may only instance one that is already registered, which is why the ui/
// primitives come first — the same order their imports run in.

/** `text-button` is the label of every button; only the two colours differ. */
const BUTTON_TONES = [
  ['primary', '@color-emphasis', '@color-always-light', null],
  ['secondary', '@color-grey-200', '@color-grey-700', null],
  ['outline', '@color-grey-100', '@color-grey-700', '@color-grey-300'],
  ['club', '@color-alternative', '@color-always-dark', null],
  ['onEmphasis', '@color-always-light', '@color-always-dark', null],
];

const BADGE_TONES = [
  ['emphasis', '@color-emphasis', '@color-always-light'],
  ['club', '@color-alternative', '@color-always-dark'],
  ['neutral', '@color-grey-250', '@color-grey-600'],
  ['live', null, '@color-emphasis'],
];

/** `claimStatusTag` decides the words; this file only carries the four surfaces. */
const CLAIM_TONES = [
  ['richtig', '#2e7d4f', '@color-always-light', null, 'RICHTIG'],
  ['falsch', '@color-emphasis', '@color-always-light', null, 'FALSCH'],
  ['inArbeit', '@color-grey-100', '@color-grey-700', '@color-grey-400', 'IN ARBEIT'],
  ['offen', '@color-grey-250', '@color-grey-600', null, 'OFFEN'],
];

/** A chevron, a switch, an icon: glyphs until the spec learns to carry vectors. */
const CHEVRON = '›';

function badgeLabel(color) {
  return ty('text-s', {
    chars: 'CLUB',
    weight: 'bold',
    size: 11,
    tracking: Math.round((0.4 / 11) * 10000) / 100,
    color: color,
    bind: 'Label',
  });
}

const KIT = [
  {
    // A specimen sheet, deliberately not a component. The styles are the deliverable;
    // this frame only makes them visible, and puts each name next to what it does.
    t: 'frame',
    name: 'ui/Typo, Textstile',
    dir: 'V',
    w: 'hug',
    gap: S.m,
    pad: [S.m, S.m, S.m, S.m],
    fill: '@color-grey-100',
    children: VARIANTS.map((v) => [v, v, undefined])
      .concat(
        Object.keys(overrides)
          .sort()
          .map((n) => [n, overrides[n][0], overrides[n][1]]),
      )
      .map(([name, variant, weight]) => ({
        t: 'frame',
        name: name,
        dir: 'V',
        w: 'hug',
        gap: S['4xs'],
        children: [
          ty('text-s', { chars: name, size: 11, color: '@color-grey-500' }),
          ty(variant, { chars: 'Recherchen, die etwas ändern', weight: weight }),
        ],
      })),
  },
  {
    t: 'variants',
    name: 'ui/Button',
    prop: 'Variante',
    props: { Titel: { type: 'TEXT', default: 'Beitrag festlegen' } },
    options: BUTTON_TONES.map(([value, surface, label, border]) => {
      const option = {
        value: value,
        dir: 'H',
        w: 'hug',
        align: 'CENTER',
        cross: 'CENTER',
        pad: [S.m, S.m, S.s, S.s],
        radius: R.md,
        fill: surface,
        children: [ty('button', { chars: 'Beitrag festlegen', color: label, bind: 'Titel' })],
      };
      if (border !== null) option.stroke = border;
      return option;
    }),
  },
  {
    t: 'variants',
    name: 'ui/Badge',
    prop: 'Ton',
    props: { Label: { type: 'TEXT', default: 'CLUB' } },
    options: BADGE_TONES.map(([value, surface, label]) => {
      const children = [];
      // The live tone is a red dot plus a label on no fill at all.
      if (value === 'live') children.push({ t: 'ellipse', w: 7, h: 7, fill: '@color-emphasis' });
      children.push(badgeLabel(label));
      const option = {
        value: value,
        dir: 'H',
        w: 'hug',
        cross: 'CENTER',
        gap: S['3xs'],
        pad: [S['2xs'], S['2xs'], S['4xs'], S['4xs']],
        radius: R.s,
        children: children,
      };
      if (surface !== null) option.fill = surface;
      return option;
    }),
  },
  {
    t: 'variants',
    name: 'ui/Chip',
    prop: 'Gewählt',
    props: { Label: { type: 'TEXT', default: 'Klima' } },
    options: [
      ['ja', '@color-emphasis', '@color-always-light', null],
      ['nein', '@color-grey-200', '@color-grey-700', '@color-grey-300'],
    ].map(([value, surface, label, border]) => {
      const option = {
        value: value,
        dir: 'H',
        w: 'hug',
        cross: 'CENTER',
        pad: [S.s, S.s, S['2xs'], S['2xs']],
        radius: R.md,
        fill: surface,
        children: [
          ty('text-s', { chars: 'Klima', weight: 'semibold', color: label, bind: 'Label' }),
        ],
      };
      if (border !== null) option.stroke = border;
      return option;
    }),
  },
  {
    // The container, and nothing else. What used to stand here was one filled-in
    // card off the profile screen; `Card.tsx` is thirteen lines and holds no copy.
    // The dashed slot is what a Figma component cannot express: an instance may
    // override text and visibility, never add children. Cards that DO carry content
    // are their own components in the app, or should be — see the four still inline.
    t: 'variants',
    name: 'ui/Card',
    prop: 'Ton',
    props: {},
    options: [
      ['surface', '@color-grey-200', null],
      ['outline', '@color-grey-100', '@color-grey-300'],
    ].map(([value, surface, border]) => {
      const option = {
        value: value,
        dir: 'V',
        w: 280,
        pad: [S.sm, S.sm, S.sm, S.sm],
        radius: R.md,
        fill: surface,
        children: [
          {
            t: 'frame',
            name: 'Inhalt',
            dir: 'V',
            w: 'fill',
            h: 56,
            cross: 'CENTER',
            align: 'CENTER',
            stroke: '@color-grey-400',
            dash: [4, 4],
            children: [ty('text-s', { chars: 'Inhalt', color: '@color-grey-500' })],
          },
        ],
      };
      if (border !== null) option.stroke = border;
      return option;
    }),
  },
  {
    t: 'component',
    name: 'ui/Overline',
    props: { Label: { type: 'TEXT', default: 'IHRE MITGLIEDSCHAFT' } },
    dir: 'V',
    w: 'hug',
    fill: '@color-grey-100',
    children: [
      ty('text-s', {
        chars: 'IHRE MITGLIEDSCHAFT',
        weight: 'bold',
        size: 12,
        tracking: 10,
        color: '@color-grey-600',
        bind: 'Label',
      }),
    ],
  },
  {
    t: 'component',
    name: 'ui/Hairline',
    props: {},
    dir: 'V',
    w: 280,
    fill: '@color-grey-100',
    // `w: 'fill'` for the same reason as in ui/ScreenHeader: a line is born 10px wide.
    children: [{ t: 'line', color: '@color-grey-300', w: 'fill' }],
  },
  {
    t: 'component',
    name: 'ui/SectionHeader',
    props: {
      Titel: { type: 'TEXT', default: 'Aus dem Backstage' },
      Aktion: { type: 'TEXT', default: 'Alles ansehen' },
      'Aktion zeigen': { type: 'BOOLEAN', default: true },
    },
    dir: 'H',
    w: 320,
    cross: 'MAX',
    align: 'SPACE_BETWEEN',
    fill: '@color-grey-100',
    children: [
      ty('headline-m', { chars: 'Aus dem Backstage', bind: 'Titel' }),
      {
        t: 'frame',
        name: 'Aktion',
        dir: 'H',
        w: 'hug',
        bind: 'Aktion zeigen',
        children: [
          ty('text-s', { chars: 'Alles ansehen', color: '@color-emphasis', bind: 'Aktion' }),
        ],
      },
    ],
  },
  {
    t: 'component',
    name: 'ui/ScreenHeader',
    props: { Zurück: { type: 'TEXT', default: 'Zurück' } },
    dir: 'V',
    w: 320,
    fill: '@color-grey-100',
    children: [
      {
        t: 'frame',
        dir: 'H',
        w: 'fill',
        cross: 'CENTER',
        gap: S['3xs'],
        pad: [S.sm, S.sm, S.s, S.s],
        children: [
          ty('text-m', { chars: '‹', size: 20, color: '@color-grey-700' }),
          ty('text-m', { chars: 'Zurück', color: '@color-grey-700', bind: 'Zurück' }),
        ],
      },
      // Without `w: 'fill'` a line keeps the 10px width a fresh frame is born at.
      { t: 'line', color: '@color-grey-300', w: 'fill' },
    ],
  },
  {
    t: 'component',
    name: 'profile/NavCard',
    props: {
      Titel: { type: 'TEXT', default: 'Backstage' },
      Untertitel: { type: 'TEXT', default: 'Was gerade in der Redaktion passiert' },
      Club: { type: 'BOOLEAN', default: true },
    },
    dir: 'H',
    w: 320,
    cross: 'CENTER',
    pad: [0, 0, S.s, S.s],
    stroke: '@color-grey-300',
    strokeSides: 'bottom',
    fill: '@color-grey-100',
    children: [
      ty('text-m', { chars: '◎', size: 20, color: '@color-grey-600' }),
      {
        t: 'frame',
        dir: 'V',
        w: 'fill',
        gap: S['4xs'],
        pad: [S.s, 0, 0, 0],
        children: [
          {
            t: 'frame',
            dir: 'H',
            w: 'hug',
            cross: 'CENTER',
            gap: S['2xs'],
            children: [
              ty('text-m', { chars: 'Backstage', weight: 'bold', bind: 'Titel' }),
              // A nested instance, because `NavCard.tsx` renders a `<Badge>`. Change
              // the badge once and it changes here too, in Figma as in the app.
              { t: 'instance', of: 'ui/Badge', set: { Ton: 'club', Label: 'CLUB' }, bind: 'Club' },
            ],
          },
          ty('text-s', {
            chars: 'Was gerade in der Redaktion passiert',
            color: '@color-grey-600',
            w: 'fill',
            bind: 'Untertitel',
          }),
        ],
      },
      ty('text-m', { chars: CHEVRON, size: 16, color: '@color-grey-500' }),
    ],
  },
  {
    // A variant set, not a BOOLEAN. Binding the switch's VISIBILITY to `An` made the
    // whole control vanish when it was off, which is not what off looks like. Figma
    // has no way to swap one node's fill from a property, so the two appearances have
    // to be two variants.
    t: 'variants',
    name: 'profile/SettingRow',
    prop: 'An',
    props: {
      Label: { type: 'TEXT', default: 'Push-Mitteilungen' },
      Beschreibung: { type: 'TEXT', default: 'Neue Recherchen und Mitmach-Aufrufe' },
      'Beschreibung zeigen': { type: 'BOOLEAN', default: true },
    },
    options: [
      ['ja', '@color-emphasis', 'MAX'],
      ['nein', '@color-grey-300', 'MIN'],
    ].map(([value, track, knob]) => ({
      value: value,
      dir: 'H',
      w: 320,
      cross: 'CENTER',
      gap: S.s,
      pad: [0, 0, S['2xs'], S['2xs']],
      fill: '@color-grey-100',
      children: [
        {
          t: 'frame',
          dir: 'V',
          w: 'fill',
          gap: S['4xs'],
          children: [
            ty('text-m', { chars: 'Push-Mitteilungen', w: 'fill', bind: 'Label' }),
            {
              t: 'frame',
              dir: 'V',
              w: 'fill',
              bind: 'Beschreibung zeigen',
              children: [
                ty('text-s', {
                  chars: 'Neue Recherchen und Mitmach-Aufrufe',
                  color: '@color-grey-600',
                  w: 'fill',
                  bind: 'Beschreibung',
                }),
              ],
            },
          ],
        },
        {
          t: 'frame',
          name: 'Schalter',
          dir: 'H',
          w: 44,
          h: 26,
          cross: 'CENTER',
          align: knob,
          pad: [3, 3, 3, 3],
          radius: 13,
          fill: track,
          children: [{ t: 'ellipse', w: 20, h: 20, fill: '@color-always-light' }],
        },
      ],
    })),
  },
  {
    t: 'component',
    name: 'discover/ProjectRow',
    props: {
      Name: { type: 'TEXT', default: 'CrimeTech' },
      Teaser: {
        type: 'TEXT',
        default: 'Wie Polizeibehörden mit Technik gegen Kriminalität vorgehen',
      },
    },
    dir: 'H',
    w: 320,
    cross: 'CENTER',
    pad: [0, 0, S.s, S.s],
    stroke: '@color-grey-300',
    strokeSides: 'bottom',
    fill: '@color-grey-100',
    children: [
      {
        t: 'frame',
        dir: 'V',
        w: 'fill',
        gap: S['4xs'],
        pad: [0, S.s, 0, 0],
        children: [
          ty('text-m', { chars: 'CrimeTech', weight: 'bold', bind: 'Name' }),
          ty('text-s', {
            chars: 'Wie Polizeibehörden mit Technik gegen Kriminalität vorgehen',
            color: '@color-grey-600',
            w: 'fill',
            bind: 'Teaser',
          }),
        ],
      },
      ty('text-m', { chars: CHEVRON, size: 16, color: '@color-grey-500' }),
    ],
  },
  {
    t: 'variants',
    name: 'participate/ClaimStatusTag',
    prop: 'Status',
    props: { Label: { type: 'TEXT' } },
    options: CLAIM_TONES.map(([value, surface, label, border, text]) => {
      const option = {
        value: value,
        dir: 'H',
        w: 'hug',
        pad: [S['2xs'], S['2xs'], S['4xs'], S['4xs']],
        radius: R.xs,
        fill: surface,
        children: [
          ty('text-s', { chars: text, weight: 'bold', size: 11, color: label, bind: 'Label' }),
        ],
      };
      if (border !== null) option.stroke = border;
      return option;
    }),
  },
  {
    t: 'component',
    name: 'profile/ClubCard',
    props: {
      Name: { type: 'TEXT', default: 'Alex Beispiel' },
      Stufe: { type: 'TEXT', default: 'Mitgliedschaft mit Beitrag · seit 12.03.2024' },
    },
    dir: 'V',
    w: 320,
    pad: [S.m, S.m, S.m, S.m],
    radius: R.md,
    // Yellow in both schemes, so everything on it takes the fixed dark role colour
    // rather than the page's text colour, which turns near-white in dark mode and
    // would vanish on the yellow.
    fill: '@color-alternative',
    children: [
      {
        t: 'frame',
        name: 'Kopf',
        dir: 'H',
        w: 'fill',
        cross: 'CENTER',
        align: 'SPACE_BETWEEN',
        children: [
          // Not a `ui/Overline` instance, though `ClubCard.tsx` does import Overline:
          // it passes `color="always-dark"`, and an instance may override text and
          // visibility but never a colour. A colour prop would have to become a
          // variant, and one variant per colour is the worse trade.
          ty('text-s', {
            chars: 'CORRECTIV CLUB',
            weight: 'bold',
            size: 12,
            tracking: 10,
            color: '@color-always-dark',
          }),
          ty('text-m', { chars: '♥', size: 20, color: '@color-always-dark' }),
        ],
      },
      { t: 'space', h: S.m },
      ty('headline-l', {
        chars: 'Alex Beispiel',
        color: '@color-always-dark',
        w: 'fill',
        bind: 'Name',
      }),
      ty('text-s', {
        chars: 'Mitgliedschaft mit Beitrag · seit 12.03.2024',
        color: '@color-always-dark',
        opacity: 0.7,
        w: 'fill',
        bind: 'Stufe',
      }),
    ],
  },
];

// ---------------------------------------------------------------- the audit
//
// A component that quietly lacks a prop its source has is the same failure as a
// comment that says serif over sans: the drawing looks finished and is wrong, and
// nothing says so. So every prop in the source has to be accounted for here, in one
// of three ways, and an unaccounted one fails this script rather than shipping.
//
//   maps    the prop IS a Figma property (one prop may feed several)
//   ignore  the prop has no visual effect, or belongs to the call site
//   gaps    the prop is visual and Figma cannot express it — printed, every run
//
// The third is the point. A gap that is written down is a decision; a gap that is
// merely absent is a bug waiting to be found by eye.

/** Never visual in this sense, whatever component they appear on. */
const NEVER_VISUAL = ['className', 'style', 'children'];

const AUDIT = {
  'ui/Button': {
    maps: { title: 'Titel', variant: 'Variante' },
    // Whether the button stretches is a fact about the column it sits in, and the
    // spec carries that as `w` on the instance.
    ignore: ['fullWidth'],
    gaps: {
      disabled:
        'four tenths opacity, not a variant — one per variant would double the set,' +
        ' so `use-kit.mjs` puts the opacity on the instance instead',
    },
  },
  'ui/Badge': { maps: { label: 'Label', tone: 'Ton' } },
  'ui/Chip': { maps: { label: 'Label', selected: 'Gewählt' } },
  'ui/Card': { maps: { tone: 'Ton' } },
  'ui/Overline': {
    maps: { label: 'Label' },
    gaps: { color: 'an instance cannot override a colour; it would need a variant per colour' },
  },
  'ui/Hairline': { maps: {} },
  'ui/SectionHeader': { maps: { title: 'Titel', actionLabel: ['Aktion', 'Aktion zeigen'] } },
  'ui/ScreenHeader': {
    maps: { backLabel: 'Zurück' },
    gaps: { children: 'a slot — the search field on /suche — and an instance takes no children' },
  },
  'profile/NavCard': {
    maps: { title: 'Titel', subtitle: 'Untertitel', club: 'Club' },
    gaps: { icon: 'an Ionicon; the spec has no vectors, so the kit draws a glyph' },
  },
  'profile/SettingRow': {
    maps: {
      label: 'Label',
      description: ['Beschreibung', 'Beschreibung zeigen'],
      value: 'An',
    },
  },
  'profile/ClubCard': { maps: { name: 'Name', tierLabel: 'Stufe', memberSince: 'Stufe' } },
  'discover/ProjectRow': { maps: { project: ['Name', 'Teaser'] } },
  'participate/ClaimStatusTag': { maps: { claim: ['Status', 'Label'] } },
};

/** The innermost `{ … }` starting at `from`, by brace matching. */
function literal(source, from) {
  const open = source.indexOf('{', from);
  if (open === -1) return null;
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}') {
      depth--;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return null;
}

/** The text between a bracket at `from` and its match, exclusive. */
function between(source, from, opener, closer) {
  if (from === -1 || source[from] !== opener) return null;
  let depth = 0;
  for (let i = from; i < source.length; i++) {
    if (source[i] === opener) depth++;
    if (source[i] === closer) {
      depth--;
      if (depth === 0) return source.slice(from + 1, i);
    }
  }
  return null;
}

/** Split on commas that are not inside a bracket of any kind. */
function topLevel(text) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if ('({['.indexOf(ch) !== -1) depth++;
    else if (')}]'.indexOf(ch) !== -1) depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.filter((p) => p.trim() !== '');
}

/**
 * The props a component file declares, from `export type XProps` or from the inline
 * type on the function's own parameter.
 *
 * The inline search is anchored at `export function`, because a file may well hold a
 * helper whose RETURN type is an object literal — `toneFor` in ClaimStatusTag does —
 * and the first `}: {` in the file would otherwise be that one.
 */
function sourceProps(source, component) {
  const clean = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  // Anchored on the component's OWN function, by name. Anchoring on the first
  // `export function` was not enough: a file may declare a private subcomponent
  // BELOW the exported one — `LoginGate.tsx` has `NoAccess({ shortfall })` — and the
  // audit would then check the helper's props and pass, having verified nothing.
  // The name is escaped and a generic is allowed, so `Foo<T>({ … })` reports the
  // real problem rather than "no such function".
  const escaped = component.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const fn = clean.search(new RegExp('export function ' + escaped + '\\s*[<(]'));
  if (fn === -1) throw new Error('no `export function ' + component + '` to read props from');

  // The parameter list, bounded by its own parentheses. Reaching for the first `{`
  // after `(` walked into the function BODY whenever the component destructures
  // nothing — `LoginGate()` came back with `const`, `Date` and a word out of a German
  // string — so the brace has to be found inside the parens or not at all.
  const open = clean.indexOf('(', fn);
  const params = between(clean, open, '(', ')');
  const brace = params === null ? -1 : params.indexOf('{');
  const used = [];
  if (brace !== -1) {
    // Split at depth zero. `{ a = pick(1, 2), b }` and `{ item: { id } }` both broke a
    // plain `split(',')`, one inventing a prop called "2" and the other losing `id`.
    for (const part of topLevel(literal(params, brace) || '')) {
      if (part.indexOf('...') !== -1) continue;
      const m = part.match(/^\s*(\w+)\s*:\s*\{/);
      if (m) {
        // A nested destructure names no prop of its own beyond the outer key.
        used.push(m[1]);
        continue;
      }
      const plain = part.match(/^\s*(\w+)/);
      if (plain) used.push(plain[1]);
    }
  }

  // And the declared type, which carries props the destructuring passes through.
  // Bounded the same way: the inline form has to sit inside this function's parens,
  // or a private subcomponent further down the file supplies it instead.
  const named = clean.match(/export type \w*Props\s*=/);
  const inline = params === null ? -1 : params.search(/\}\s*:\s*\{/);
  const body = named
    ? literal(clean, named.index)
    : inline === -1
      ? null
      : literal(params, inline + 1);
  if (body === null) return [...new Set(used)];

  const out = used.slice();
  let depth = 0;
  let atTop = true;
  let word = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    else if (depth === 0) {
      if (/[A-Za-z0-9_]/.test(ch)) {
        word += ch;
        continue;
      }
      if ((ch === ':' || (ch === '?' && body[i + 1] === ':')) && atTop && word) out.push(word);
      if (ch === ';' || ch === ',' || ch === '\n') {
        atTop = true;
        word = '';
        continue;
      }
      if (ch !== ' ' && ch !== '?') atTop = false;
      word = '';
      continue;
    }
    word = '';
  }
  return [...new Set(out)];
}

const problems = [];
const gaps = [];

for (const entry of KIT) {
  const plan = AUDIT[entry.name];
  if (plan === undefined) continue;
  const source = await readFile(
    join(ROOT, 'apps/mobile/src/components', entry.name + '.tsx'),
    'utf8',
  );

  // Which Figma properties this entry actually has, variant property included.
  const has = {};
  for (const name of Object.keys(entry.props || {})) has[name] = true;
  if (entry.prop) has[entry.prop] = true;

  const found = sourceProps(source, entry.name.slice(entry.name.indexOf('/') + 1));
  // An empty list is indistinguishable from "no props", so the loop below would pass
  // having checked nothing. A component the audit claims to map must have props.
  if (found.length === 0 && Object.keys(plan.maps).length > 0) {
    problems.push(`${entry.name}: read no props at all, but the audit maps some`);
  }
  for (const prop of found) {
    if (NEVER_VISUAL.indexOf(prop) !== -1 && plan.gaps?.[prop] === undefined) continue;
    // A handler is behaviour; the board draws no behaviour.
    if (/^on[A-Z]/.test(prop)) continue;
    if ((plan.ignore || []).indexOf(prop) !== -1) continue;
    if (plan.gaps?.[prop] !== undefined) {
      gaps.push(`${entry.name}.${prop}: ${plan.gaps[prop]}`);
      continue;
    }
    const to = plan.maps[prop];
    if (to === undefined) {
      problems.push(`${entry.name}.${prop} is neither a Figma property nor a declared gap`);
      continue;
    }
    for (const one of Array.isArray(to) ? to : [to]) {
      if (has[one] !== true)
        problems.push(`${entry.name}.${prop} points at "${one}", which does not exist`);
    }
  }
}

// ---------------------------------------------------------------- the page
//
// Laid out by hand rather than by a grid: a variant set grows downwards with its
// options, so a column that fits `ui/Typo` (eleven of them) wastes a screen on
// `ui/Hairline`. Three columns, each with its own running y.

const COLUMN_X = [0, 460, 920];
const columnY = [0, 0, 0];
const HEADS = ['ui/Typo, Textstile', 'ui/Button', 'profile/NavCard'];

const screens = [];
let column = -1;
for (const entry of KIT) {
  if (HEADS.indexOf(entry.name) !== -1) column++;
  const at = Math.max(column, 0);
  const placed = { t: entry.t, name: entry.name, x: COLUMN_X[at], y: columnY[at] };
  for (const key of Object.keys(entry)) if (key !== 't' && key !== 'name') placed[key] = entry[key];
  screens.push(placed);
  // Enough room for the tallest variant set; the exact height is only known in Figma.
  const options = entry.options ? entry.options.length : 1;
  columnY[at] += 120 + options * 90;
}

// Refuse BEFORE writing, for the same reason `use-kit.mjs` does: throwing after the
// file is on disk stops the script and not the damage, and ADR 0020 claims this fails
// rather than emitting a kit that is quietly incomplete.
for (const gap of gaps) console.log(`  gap: ${gap}`);
if (problems.length > 0) {
  for (const problem of problems) console.error(`  MISSING: ${problem}`);
  throw new Error(`${problems.length} prop(s) the kit does not account for`);
}

const spec = JSON.parse(await readFile(SPEC, 'utf8'));
spec.textStyles = TEXT_STYLES;
spec.pages = (spec.pages || []).filter((p) => p.name !== PAGE && p.name !== SKETCH_PAGE);

// One kit per rendering, from one description — the same trade the screens make.
// A screen page drawn as a sketch has to instance a sketched kit, or the wireframe
// fills with the app's real colours and stops being a wireframe. The components
// carry the same names in both, and an instance resolves against the mode of the
// page it lands on.
for (const [name, mode] of [
  [PAGE, 'replica'],
  [SKETCH_PAGE, 'wireframe'],
]) {
  spec.pages.push({
    name: name,
    mode: mode,
    // The kit is the only thing on these pages, so they sweep themselves rather than
    // naming what they made: a component that loses its name would otherwise stay.
    owned: '*',
    screens: JSON.parse(JSON.stringify(screens)),
  });
}
await writeFile(SPEC, `${JSON.stringify(spec, null, 2)}\n`);

const sets = screens.filter((s) => s.t === 'variants');
console.log(`two kit pages: "${PAGE}" and "${SKETCH_PAGE}"`);
console.log(
  `${screens.length - 1} components on "${PAGE}" (${sets.length} variant sets, ` +
    `${sets.reduce((n, s) => n + s.options.length, 0)} variants), ` +
    `${TEXT_STYLES.length} text styles`,
);
