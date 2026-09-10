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

import { readFile } from 'node:fs/promises';
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
    if (parent) {
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
      opacity: s.opacity === '1' ? undefined : Number(s.opacity),
    };
    if (text) {
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
function tokeniser(tokens, scheme) {
  const colours = {};
  for (const [name, value] of Object.entries(tokens)) {
    if (!name.startsWith('color-') || typeof value !== 'object') continue;
    const hex = value[scheme];
    if (hex && colours[hex] === undefined) colours[hex] = `@${name}`;
  }
  const numbers = (prefix) =>
    Object.entries(tokens)
      .filter(([name, value]) => name.startsWith(prefix) && typeof value === 'number')
      .reduce((map, [name, value]) => ({ ...map, [value]: `@${name}` }), {});
  const spacing = numbers('spacing-');
  const radius = numbers('radius-');
  return {
    colour: (hex) => (hex && hex !== 'none' ? (colours[hex] ?? hex) : null),
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
    else if ((m = /^gap-(.+)$/.exec(name))) asked.gap = `@spacing-${m[1]}`;
    else if (name === 'flex-row') asked.dir = 'H';
  }
  return asked;
}

/** The measured tree, with every number the token table knows named. */
function tokenise(node, t) {
  const out = { t: node.chars ? 'text' : 'frame' };
  if (node.chars) {
    Object.assign(out, {
      chars: node.chars,
      size: node.size,
      // The FAMILY carries the weight here, not `font-weight`. `theme/fonts.ts`
      // loads one file per cut because Android ignores `fontWeight` on a custom
      // font, so every cut computes as 400 and reading that alone calls the whole
      // app regular.
      font: node.font,
      weight: node.weight,
      color: t.colour(node.color),
      tracking: node.tracking || undefined,
      transform: node.transform,
    });
  } else {
    const asked = fromClasses(node.classes ?? []);
    Object.assign(out, {
      dir: node.dir,
      w: node.w,
      h: node.h,
      gap: node.gap ? (asked.gap ?? t.spacing(node.gap)) : undefined,
      pad: node.pad.some(Boolean) ? node.pad.map((n) => t.spacing(n)) : undefined,
      radius: node.radius ? (asked.radius ?? t.radius(node.radius)) : undefined,
      // The class wins where there is one, because `bg-accent` and `bg-red-500`
      // paint the same pixels and only one of them is what the component means.
      fill: asked.fill !== undefined ? asked.fill : t.colour(node.fill),
      stroke: asked.stroke ?? t.colour(node.stroke),
      opacity: node.opacity,
      classes: node.classes?.length ? node.classes.join(' ') : undefined,
    });
  }
  for (const key of Object.keys(out))
    if (out[key] === undefined || out[key] === null) delete out[key];
  if (node.children) out.children = node.children.map((c) => tokenise(c, t));
  return out;
}

const ids = process.argv.slice(2);
if (ids.length === 0) throw new Error('name at least one component, for example ui/Badge');

const { tokens } = JSON.parse(await readFile(join(HERE, 'spec.json'), 'utf8'));
const t = tokeniser(tokens, 'light');

for (const id of ids) {
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
  // Light, because the board carries one mode: a second variable mode is a paid
  // Figma feature, so the dark values have nowhere to go yet.
  await page.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: 'light' }],
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

  let measured = [];
  for (let tries = 0; tries < 40 && measured.length === 0; tries++) {
    await new Promise((r) => setTimeout(r, 500));
    measured = (await page.evaluate(READER)) ?? [];
  }
  await page.close();

  if (measured.length === 0) {
    console.error(`${id}: nothing drawn — is the app's dev server up, and does that name exist?`);
    continue;
  }

  console.log(`\n### ${id} — ${measured.length} boxes\n`);
  for (const box of measured.filter((b) => b.surface === 'canvas')) {
    console.log(`${box.label || '(no label)'}:`);
    console.log(JSON.stringify(tokenise(box.root, t), null, 1));
  }
}
