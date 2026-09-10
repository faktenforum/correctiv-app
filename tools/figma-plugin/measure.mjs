// Reads a component's geometry off the app's own rendering, as a spec subtree.
//
//   npm run web              # the app's dev server, port 8081
//   node tools/figma-plugin/measure.mjs ui/Badge ui/SectionCard
//
// The other direction from `kit.mjs`, which describes each component by hand. Here
// the gallery renders the real component with real props and this reads back what
// the browser computed: box, padding, gap, radius, fill, and the type. What comes
// out is the same vocabulary `spec.json` speaks, so the two can be compared line by
// line — which is the whole point of this first version, and why it prints rather
// than writes.
//
// **Not the board.** ADR 0021 and the plugin's README both warn against lifting a
// component out of the drawn screens: those are transcribed from screenshots, so
// what comes back is a usage wearing a component's name. This measures the app,
// which is the opposite direction and the only rendering that is not a transcription.
//
// Chrome has to be listening on 9222. `CHROME=...` overrides the endpoint.

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CHROME = process.env.CHROME ?? 'http://localhost:9222';
const APP = process.env.APP ?? 'http://localhost:8081';

/**
 * What the app finds in storage before it boots.
 *
 * The gallery is behind the app's door like every other route, and this origin is
 * the app's own rather than the handbook's, so the workbench's fixtures are not
 * here. Only the entitlement, and only enough of it to open the door.
 */
const SESSION = {
  account: { email: 'alex.beispiel@example.org', name: 'Alex Beispiel' },
  entitlement: {
    tier: 'paid',
    appAccess: true,
    source: 'paid',
    validUntil: null,
    localAreas: [],
    memberSince: '2026-03-04T09:12:00.000Z',
  },
};

async function connect(url) {
  const target = await (
    await fetch(`${CHROME}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })
  ).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => (ws.onopen = resolve));
  let id = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) pending.get(message.id)(message);
  };
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const n = ++id;
      pending.set(n, resolve);
      ws.send(JSON.stringify({ id: n, method, params }));
    });
  const evaluate = async (expression) => {
    const out = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (out.result?.exceptionDetails) {
      throw new Error(out.result.exceptionDetails.exception?.description ?? 'evaluate failed');
    }
    return out.result?.result?.value;
  };
  return {
    send,
    evaluate,
    close: async () => {
      await fetch(`${CHROME}/json/close/${target.id}`);
      ws.close();
    },
  };
}

/**
 * The reader that runs inside the page.
 *
 * A string rather than a function passed over, because it is evaluated in the
 * frame's own realm. It walks one specimen and reports what the browser computed,
 * with no interpretation: resolving a number to a token happens out here, where the
 * token table is, and where a mismatch can be printed instead of rounded away.
 */
const READER = `(() => {
  // The gallery draws each specimen inside a bordered box labelled canvas/surface.
  // The specimen itself is that box's last element, after the label.
  const boxes = [...document.querySelectorAll('div')].filter((el) => {
    const first = el.firstElementChild;
    return first && ['canvas', 'surface'].includes((first.textContent || '').trim())
      && first.childElementCount === 0;
  });

  const px = (v) => Math.round(parseFloat(v) || 0);

  function rgb(value) {
    const m = /rgba?\\(([^)]+)\\)/.exec(value || '');
    if (!m) return null;
    const [r, g, b, a] = m[1].split(',').map((n) => parseFloat(n));
    if (a === 0) return 'none';
    return '#' + [r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('');
  }

  function walk(el, depth) {
    const s = getComputedStyle(el);
    const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
    const kids = [...el.children].filter((c) => c.offsetParent !== null || c.getClientRects().length);
    // Fill or hug, which is what auto-layout takes, rather than the pixel width a
    // filling row happens to have in this window.
    const box = el.getBoundingClientRect();
    const parent = el.parentElement;
    let width = Math.round(box.width);
    if (getComputedStyle(el).alignSelf === 'flex-start') width = 'hug';
    else if (parent) {
      const ps = getComputedStyle(parent);
      const inner =
        parent.getBoundingClientRect().width - parseFloat(ps.paddingLeft) - parseFloat(ps.paddingRight);
      if (Math.abs(inner - box.width) < 1) width = 'fill';
    }

    const node = {
      tag: el.tagName.toLowerCase(),
      // The app's own classes, which survive into the DOM. They say which token was
      // ASKED FOR; the computed values below say what came out. Both are needed:
      // several tokens share one value, so a colour alone cannot say whether the
      // component reached for \`accent\` or for \`red-500\`, and that difference is
      // most of what a design system is.
      classes: [...el.classList].filter((c) => !c.startsWith('css-')),
      w: width,
      h: Math.round(box.height),
      display: s.display,
      dir: s.flexDirection === 'row' ? 'H' : 'V',
      gap: px(s.rowGap === 'normal' ? 0 : s.rowGap) || px(s.columnGap === 'normal' ? 0 : s.columnGap),
      pad: [px(s.paddingLeft), px(s.paddingRight), px(s.paddingTop), px(s.paddingBottom)],
      radius: px(s.borderTopLeftRadius),
      fill: rgb(s.backgroundColor),
      stroke: px(s.borderTopWidth) > 0 ? rgb(s.borderTopColor) : null,
      strokeWeight: px(s.borderTopWidth),
      align: s.justifyContent,
      cross: s.alignItems,
      self: s.alignSelf,
      opacity: s.opacity === '1' ? undefined : Number(s.opacity),
      // Auto-layout has no word for either of these, so the caller has to translate.
      position: s.position === 'absolute' ? 'absolute' : undefined,
      margin: [px(s.marginLeft), px(s.marginRight), px(s.marginTop), px(s.marginBottom)],
    };
    if (parent && s.position === 'absolute') {
      const p = parent.getBoundingClientRect();
      node.x = Math.round(box.left - p.left);
      node.y = Math.round(box.top - p.top);
    }
    // A text node, which React Native Web marks with a class of its own. Without
    // that marker every empty box read as empty text, and the badge's seven-pixel
    // live dot arrived as a string.
    if (text || [...el.classList].some((c) => c.startsWith('css-text-'))) {
      node.chars = text;
      node.font = s.fontFamily.split(',')[0].replace(/["']/g, '');
      node.size = px(s.fontSize);
      node.weight = s.fontWeight;
      node.lineHeight = px(s.lineHeight);
      node.tracking = s.letterSpacing === 'normal' ? 0 : parseFloat(s.letterSpacing);
      node.color = rgb(s.color);
      node.transform = s.textTransform === 'none' ? undefined : s.textTransform;
    }
    if (kids.length && depth < 12) node.children = kids.map((k) => walk(k, depth + 1));
    return node;
  }

  return boxes.map((box) => ({
    surface: (box.firstElementChild.textContent || '').trim(),
    // The label of the specimen pair, which the gallery puts above the two boxes.
    label: (box.parentElement?.firstElementChild?.textContent || '').trim(),
    root: walk(box.lastElementChild, 0),
  }));
})()`;

/** `#ff5064` back to `@color-accent`, in the scheme it was measured in. */
/**
 * The order to prefer when several tokens share one value.
 *
 * `always-light` and `white` are the same hex, and so are `accent` and `red-500`.
 * Which name to write is not a detail: AGENTS.md keeps `always-light` as the app's
 * spelling and reserves the primitives for the places a colour must NOT follow the
 * scheme. A class says which was meant and is preferred over any of this; these are
 * the colours set in TypeScript, where there is no class to read.
 */
const PREFERRED = {
  text: ['on-', 'accent', 'always-', 'canvas', 'surface', 'stroke'],
  fill: ['accent', 'canvas', 'surface', 'always-', 'stroke', 'on-'],
  stroke: ['stroke', 'accent', 'on-', 'always-', 'canvas', 'surface'],
};

function rank(name, role) {
  const order = PREFERRED[role] ?? PREFERRED.fill;
  const i = order.findIndex((p) => name.startsWith(`color-${p}`));
  return i === -1 ? order.length : i;
}

function tokeniser(tokens, unnamed) {
  /**
   * Both schemes, which is what tells a role from a colour.
   *
   * `always-dark` and `on-canvas` are the same hex in light and different in dark:
   * one is a colour that must not follow the scheme, the other is the role of text
   * on the page. A light-only reading cannot tell them apart and named every title
   * `always-dark`, which would have made a dark board unreadable — the very fault
   * the gallery draws two surfaces to catch. So the measurement runs twice and a
   * token has to match on both.
   */
  const pairs = { text: {}, fill: {}, stroke: {} };
  const lightOnly = { text: {}, fill: {}, stroke: {} };
  for (const [name, value] of Object.entries(tokens)) {
    if (!name.startsWith('color-') || typeof value !== 'object') continue;
    const { light, dark } = value;
    if (!light) continue;
    const both = `${light}|${dark ?? light}`;
    // Per role, because what a colour should be CALLED depends on what it paints.
    // The same hex is `stroke-strong` under a rule and `on-canvas-muted` under a
    // date, and only one of those reads as a mistake in the other place.
    for (const role of Object.keys(pairs)) {
      if (
        pairs[role][both] === undefined ||
        rank(name, role) < rank(pairs[role][both].slice(1), role)
      ) {
        pairs[role][both] = `@${name}`;
      }
      if (
        lightOnly[role][light] === undefined ||
        rank(name, role) < rank(lightOnly[role][light].slice(1), role)
      ) {
        lightOnly[role][light] = `@${name}`;
      }
    }
  }
  /**
   * Exact on both schemes, or nothing.
   *
   * The light value alone was enough to guess with, and guessing is what this must
   * not do: a name that is confidently wrong reads as a decision somebody made. A
   * pair that matches no token comes through as the two hexes, and the run says
   * which node it was — a question for a person rather than a silent answer.
   */
  const named = (hex, dark, role) => pairs[role][`${hex}|${dark ?? hex}`];
  const numbers = (prefix) =>
    Object.entries(tokens)
      .filter(([name, value]) => name.startsWith(prefix) && typeof value === 'number')
      .reduce((map, [name, value]) => ({ ...map, [value]: `@${name}` }), {});
  const spacing = numbers('spacing-');
  const radius = numbers('radius-');
  return {
    colour: (hex, dark, role = 'fill') => {
      if (!hex || hex === 'none') return null;
      const name = named(hex, dark, role);
      if (name) return name;
      unnamed.add(`${hex}${dark && dark !== hex ? ` / ${dark}` : ''} as a ${role}`);
      return hex;
    },
    spacing: (n) => (n === 0 ? 0 : (spacing[n] ?? n)),
    radius: (n) => (n === 0 ? 0 : (radius[n] ?? n)),
  };
}

/**
 * What the classes asked for, in the spec's vocabulary.
 *
 * Uniwind writes the app's classes into the DOM unchanged, so this is the
 * component's own words rather than an inference from pixels. Only the handful of
 * shapes the kit needs are read; anything else stays in `classes` for a person to
 * look at.
 */
function fromClasses(classes) {
  const asked = {};
  for (const name of classes) {
    let m;
    if ((m = /^bg-(.+)$/.exec(name))) asked.fill = m[1] === 'transparent' ? null : `@color-${m[1]}`;
    else if ((m = /^border-([a-z].*)$/.exec(name))) asked.stroke = `@color-${m[1]}`;
    else if ((m = /^rounded-(.+)$/.exec(name)))
      asked.radius = m[1] === 'full' ? 'full' : `@radius-${m[1]}`;
    else if ((m = /^p([xy]?)-(.+)$/.exec(name))) asked[`pad${m[1] || 'a'}`] = `@spacing-${m[2]}`;
    // `gap-y-2xs` names the same scale step as `gap-2xs`, on one axis. The axis is
    // the parent's business and auto-layout has one gap, so the letter goes.
    else if ((m = /^gap(?:-[xy])?-(.+)$/.exec(name))) asked.gap = `@spacing-${m[1]}`;
    else if (name === 'flex-row') asked.dir = 'H';
  }
  return asked;
}

/**
 * The app's font files back to the two things the spec says about type.
 *
 * `theme/fonts.ts` loads one file per cut, because Android ignores `fontWeight` on a
 * custom font, so the family name is where the weight is. Reading `font-weight`
 * instead calls every cut regular, and did: the badge's label was bold on the board
 * for that reason and had never been bold in the app.
 */
function typeOf(font) {
  const family = /merriweather/i.test(font ?? '') ? 'serif' : 'sans';
  const weight = /bold/i.test(font ?? '')
    ? /semibold/i.test(font)
      ? 'semibold'
      : 'bold'
    : 'regular';
  return { family, weight, icon: /ionicons/i.test(font ?? '') };
}

/**
 * Which of the fifteen text styles this is, if it is one of them.
 *
 * A style rather than three numbers, because a style reaches every text node
 * carrying it across every page, including nodes inside other components, which a
 * component can never reach. `kit.mjs` makes the same argument at greater length.
 */
function styleNamer(tokens, specs) {
  const byShape = {};
  for (const [name, spec] of Object.entries(specs)) {
    const size = tokens[`text-${String(spec.size).replace(/^text-/, '')}`];
    const weight = spec.weight === 'normal' ? 'regular' : spec.weight;
    byShape[`${spec.family}|${weight}|${size}`] ??= name;
  }
  return (font, size) => {
    const { family, weight } = typeOf(font);
    return byShape[`${family}|${weight}|${size}`];
  };
}

/**
 * The measured tree, in the spec's vocabulary, with the four things auto-layout has
 * no word for translated on the way.
 *
 * Each rule is here rather than left for the reader of the output, because each one
 * is a decision and a decision that is not written down gets made again differently.
 * The gaps it cannot close are collected in `gaps` and printed, the way `kit.mjs`
 * prints its own.
 */
function tokenise(node, t, style, gaps, name, twin) {
  const out = { t: node.chars !== undefined ? 'text' : 'frame' };

  if (node.chars !== undefined) {
    const { family, weight, icon } = typeOf(node.font);
    if (icon) {
      // RULE 1, an icon. A glyph from an icon font reads back as the empty string,
      // its codepoint being in a private-use area. `NavCard.icon` is already a
      // declared gap in `kit.mjs`; this is the same gap seen from the other side.
      gaps.add(`${name}: an icon font glyph, drawn as a placeholder until the spec learns vectors`);
      return {
        t: 'text',
        chars: '◎',
        font: 'sans',
        size: node.size,
        color: t.colour(node.color, twin?.color, 'text'),
      };
    }
    Object.assign(out, {
      style: style(node.font, node.size),
      chars: node.chars,
      font: family === 'sans' ? undefined : family,
      weight: weight === 'regular' ? undefined : weight,
      size: node.size,
      color: t.colour(node.color, twin?.color, 'text'),
      // The spec takes tracking as a percentage of the size, which is what Figma
      // takes; the browser reports pixels.
      tracking: node.tracking ? Math.round((node.tracking / node.size) * 10000) / 100 : undefined,
      transform: node.transform,
    });
  } else {
    const asked = fromClasses(node.classes ?? []);
    const stacked = (node.children ?? []).some((c) => c.position === 'absolute');

    // RULE 5, a circle. `rounded-full` is a radius the spec cannot take, because
    // its `radius` is a number; a box that is round and has nothing in it is an
    // ellipse, which the vocabulary does have. One with children keeps its corners
    // as half its height, which is the same drawing by another route.
    if (asked.radius === 'full' && !node.children?.length) {
      return {
        t: 'ellipse',
        w: node.w,
        h: node.h,
        x: node.x,
        y: node.y,
        fill: asked.fill !== undefined ? asked.fill : t.colour(node.fill, twin?.fill),
      };
    }
    if (asked.radius === 'full') asked.radius = Math.round(node.h / 2);
    Object.assign(out, {
      // RULE 2, a stack. Figma honours x/y only when the parent is a plain frame and
      // ignores them inside auto-layout, so a parent holding an absolute child has to
      // give up its layout. That is the same rule the Plugin API has, so there is
      // nothing extra to remember — but it has to be decided here, because nothing
      // about the measurement says which of the two a stack should become.
      dir: stacked ? undefined : node.dir,
      w: node.w,
      h: node.h,
      x: node.x,
      y: node.y,
      gap: node.gap ? (asked.gap ?? t.spacing(node.gap)) : undefined,
      pad: node.pad.some(Boolean) ? node.pad.map((n) => t.spacing(n)) : undefined,
      radius: node.radius ? (asked.radius ?? t.radius(node.radius)) : undefined,
      // RULE 3, a fill at part opacity. `bg-always-dark/70` survives as the class
      // says it, because the interpreter now reads `@color-x/NN` and puts the alpha
      // on the paint rather than on the node — so a translucent surface does not
      // fade the icon standing on it.
      fill: asked.fill !== undefined ? asked.fill : t.colour(node.fill, twin?.fill),
      stroke: asked.stroke ?? t.colour(node.stroke, twin?.stroke, 'stroke'),
      strokeWeight: node.stroke ? node.strokeWeight || undefined : undefined,
      opacity: node.opacity,
    });
  }

  for (const key of Object.keys(out)) {
    if (out[key] === undefined || out[key] === null) delete out[key];
  }

  if (node.children) {
    const children = [];
    const row = node.dir === 'H';
    const last = node.children.length - 1;
    for (const [i, child] of node.children.entries()) {
      // RULE 4, a margin. The spec has no margins, only gaps and `space` nodes, and
      // a gap belongs to the parent while a margin belongs to one child. A `space`
      // is the honest translation: it says exactly what the margin said, between the
      // two children it stood between. Along the axis the parent lays out on, since
      // a row's spacing is written `mr-3xs` and a column's `mt-2xs`.
      const [left, right, top, bottom] = child.margin ?? [0, 0, 0, 0];
      const [before, after] = row ? [left, right] : [top, bottom];
      const space = (n) =>
        row ? { t: 'space', w: t.spacing(n) } : { t: 'space', h: t.spacing(n) };
      if (before && !stackedIn(node)) children.push(space(before));
      children.push(tokenise(child, t, style, gaps, name, twin?.children?.[i]));
      if (after && i !== last && !stackedIn(node)) children.push(space(after));
    }
    out.children = children;
  }
  return out;
}

function stackedIn(node) {
  return (node.children ?? []).some((c) => c.position === 'absolute');
}

/**
 * `tone="club"` — the specimen's own label, which is already the variant.
 *
 * The catalogue writes each label "in the props' own words", so the gallery has
 * been carrying the variant axis all along. `default` and anything that does not
 * parse are not variants: one specimen is a component, several unnamed ones are a
 * component per specimen, and neither is a set.
 */
function variantOf(label) {
  const pair = /^([A-Za-z][\w]*)="([^"]*)"$/.exec(label ?? '');
  if (pair) return { prop: pair[1], value: pair[2] };
  const bare = /^([A-Za-z][\w]*)$/.exec(label ?? '');
  if (bare && bare[1] !== 'default') return { prop: bare[1], value: 'true' };
  return null;
}

/** One component, from its specimens: a variant set, or a single component. */
function assemble(id, boxes, dark, t, style, gaps) {
  const name = id;
  const drawn = boxes.map((box, i) => ({
    variant: variantOf(box.label),
    node: tokenise(box.root, t, style, gaps, name, dark[i]?.root),
  }));

  const props = new Set(drawn.map((d) => d.variant?.prop).filter(Boolean));
  if (props.size === 1 && drawn.every((d) => d.variant)) {
    const prop = [...props][0];
    return {
      t: 'variants',
      name: name,
      prop: prop,
      options: drawn.map((d) => Object.assign({ value: d.variant.value }, d.node)),
    };
  }

  if (drawn.length > 1) {
    gaps.add(
      `${name}: ${drawn.length} specimens on ${props.size} axes, so they are ${drawn.length} components rather than one set`,
    );
  }
  return drawn.map((d, i) =>
    Object.assign(
      { t: 'component', name: drawn.length === 1 ? name : `${name}, ${boxes[i].label}` },
      d.node,
    ),
  );
}

const args = process.argv.slice(2);
const emit = args.includes('--emit');
const ids = args.filter((a) => !a.startsWith('--'));
if (ids.length === 0) throw new Error('name at least one component, for example ui/Badge');

const spec = JSON.parse(await readFile(join(HERE, 'spec.json'), 'utf8'));
const unnamed = new Set();
const t = tokeniser(spec.tokens, unnamed);

/**
 * The typography specs, read out of the generated TypeScript rather than imported.
 *
 * This script runs in plain node and that file is a module of the app's toolchain;
 * what is needed from it is one literal, and a regex reaches it without dragging in
 * a compiler. It fails loudly if the shape ever changes, which is the point.
 */
const TYPOGRAPHY = await (async () => {
  const source = await readFile(
    join(HERE, '../../packages/design-tokens/src/typography.generated.ts'),
    'utf8',
  );
  const body = /=\s*(\{[\s\S]*?\n\})/.exec(source);
  if (!body) throw new Error('typography.generated.ts no longer holds one object literal');
  return JSON.parse(body[1]);
})();
const style = styleNamer(spec.tokens, TYPOGRAPHY);

const gaps = new Set();
const measured = {};

/** One pass over one component, in one scheme. */
async function read(id, scheme) {
  const page = await connect(`${APP}/`);
  await page.send('Page.enable');
  await page.send('Runtime.enable');
  // A phone, because a component that fills its parent is only itself at the width
  // it ships at: measured in a 1280px window, every filling row came out 691 wide
  // and the number said nothing.
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: 393,
    height: 852,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await page.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: scheme }],
  });
  // The tab answers before it has left about:blank, and `localStorage` on that
  // document is not this origin's — reading it throws SecurityError rather than
  // returning empty, which is the one helpful thing about it.
  for (let tries = 0; tries < 40; tries++) {
    const here = await page.evaluate('document.URL');
    if (typeof here === 'string' && here.startsWith(APP)) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  await page.evaluate(
    `localStorage.setItem('kv:store.session', ${JSON.stringify(JSON.stringify(SESSION))})`,
  );
  await page.send('Page.navigate', { url: `${APP}/gallery?c=${id}&bare=1` });

  let boxes = [];
  for (let tries = 0; tries < 40 && boxes.length === 0; tries++) {
    await new Promise((r) => setTimeout(r, 500));
    boxes = (await page.evaluate(READER)) ?? [];
  }
  await page.close();
  return boxes.filter((b) => b.surface === 'canvas');
}

for (const id of ids) {
  // Twice, because one scheme cannot tell a role from a colour: see the tokeniser.
  const light = await read(id, 'light');
  if (light.length === 0) {
    console.error(`${id}: nothing drawn — is the app's dev server up, and does that name exist?`);
    continue;
  }
  const dark = await read(id, 'dark');

  measured[id] = assemble(id, light, dark, t, style, gaps);
  if (!emit) {
    console.log(`\n### ${id} — ${light.length} specimens\n`);
    console.log(JSON.stringify(measured[id], null, 1));
  }
}

for (const gap of [...gaps].sort()) console.log(`  gap: ${gap}`);
for (const colour of [...unnamed].sort()) {
  console.log(`  unnamed: ${colour} — no token has that pair of values`);
}

/**
 * `JSON.stringify` with short arrays kept on one line, which is what oxfmt wants.
 *
 * A generated file that fails the repository's own format check is a generated file
 * somebody has to remember to format, and `npm run check` would go red on every run
 * of this script. Four numbers of padding read better on one line anyway.
 */
function formatted(value) {
  const wide = JSON.stringify(value, null, 2);
  return wide.replace(
    /\[\n\s+((?:"[^"\n]*"|-?[\d.]+)(?:,\n\s+(?:"[^"\n]*"|-?[\d.]+))*)\n\s+\]/g,
    (all, body) => {
      const line = `[${body.split(/,\n\s+/).join(', ')}]`;
      return line.length <= 90 ? line : all;
    },
  );
}

if (emit) {
  const out = join(HERE, 'measured.json');
  // Merged, not replaced. This is a per-component tool: re-reading one after a fix
  // must not drop the other thirty-six, and losing them is the kind of thing only
  // the next full run would notice.
  const before = await readFile(out, 'utf8')
    .then((text) => JSON.parse(text))
    .catch(() => ({}));
  Object.assign(before, measured);
  for (const key of Object.keys(before)) measured[key] = before[key];
  await writeFile(out, `${formatted(measured)}\n`);
  const count = Object.keys(measured).length;
  console.log(`${count} component${count === 1 ? '' : 's'} written to ${out}`);
}
