// CORRECTIV Wireframes — an interpreter, not a builder.
//
// This file draws whatever `spec.json` describes and knows nothing about the app.
// That split is the point: the screens are DATA, served over 127.0.0.1 by
// `server.mjs`, so changing the board never means changing code and never means
// re-importing the plugin. Start the server, run this once, and every later edit to
// spec.json redraws the board on its own.
//
// Nothing executable crosses the wire. The UI iframe fetches a JSON document and
// hands it here; this file is the only thing that ever touches the Plugin API.
//
// The vocabulary is deliberately small, and covers exactly what the local MCP
// server's write tools cannot: auto-layout with FILL children, ellipses, dash
// patterns, components and instances, and vectors for the pencil outlines.
//
//   t: 'frame'    dir V|H, pad, gap, fill, stroke, radius, w, h, align, cross, clip,
//                 dash, children
//   t: 'text'     chars, size, font sans|serif, weight regular|semibold|bold, color,
//                 w, tracking, align
//   t: 'rect'     w, h, fill, stroke, radius
//   t: 'ellipse'  w, h, fill, stroke
//   t: 'space'    h, w         a fixed gap; `w: 'fill'` to span a plain parent
//   t: 'line'     colour, w    a 1px hairline; `w: 'fill'` to span the parent
//
// `w` and `h` take a number, 'fill' or 'hug'. Any node may carry x/y, which Figma
// honours when the parent is a plain frame and ignores inside auto-layout — the same
// rule the API itself has, so there is nothing to remember.

// Two renderings of one description.
//
// 'replica' answers "what does the app look like": the app's own typefaces, the
// colour tokens, the real copy.
//
// 'wireframe' answers "how is the app built": one neutral typeface, greys only,
// media reduced to a labelled box. The COPY stays real in both, because a wireframe
// full of lorem ipsum is one nobody can argue with.
const MODES = {
  replica: {
    // Only the replica binds Figma variables. The wireframe deliberately ignores the
    // brand, so binding it too would mean a change to the emphasis token repainted a
    // pencil drawing — the one page that exists in order not to be about colour.
    bindVariables: true,
    fonts: {
      sans: {
        regular: { family: 'Source Sans 3', style: 'Regular' },
        semibold: { family: 'Source Sans 3', style: 'SemiBold' },
        bold: { family: 'Source Sans 3', style: 'Bold' },
      },
      serif: {
        regular: { family: 'Merriweather', style: 'Regular' },
        semibold: { family: 'Merriweather', style: 'Bold' },
        bold: { family: 'Merriweather', style: 'Bold' },
      },
    },
  },
  wireframe: {
    // Drawn by hand, on purpose. A pencil sketch invites "the order is wrong";
    // something that looks finished invites "the red is wrong". Only one of those is
    // the question this page asks.
    sketch: true,
    fonts: {
      sans: {
        regular: { family: 'Kalam', style: 'Regular' },
        semibold: { family: 'Kalam', style: 'Bold' },
        bold: { family: 'Kalam', style: 'Bold' },
      },
      // A wireframe has one voice. The serif collapses into it.
      serif: {
        regular: { family: 'Kalam', style: 'Regular' },
        semibold: { family: 'Kalam', style: 'Bold' },
        bold: { family: 'Kalam', style: 'Bold' },
      },
    },
    // Every colour in the spec maps onto this ramp by its ROLE, not its hue, so the
    // brand red and the club yellow both become "this is interactive" grey rather
    // than two different greys that mean nothing.
    // The screen stays paper-white; everything the app fills with colour becomes an
    // empty box that the pencil outlines. Only a genuine surface keeps a tint, so a
    // card still reads as sitting on the page rather than in it.
    greys: {
      '#ffffff': '#ffffff',
      '#f4f4f6': '#f5f5f6',
      '#e2e2e5': null,
      // Brand and accent become nothing but an outline: a wireframe must not be able
      // to start an argument about the red.
      '#ff5064': null,
      '#fde162': null,
      '#e8e8fa': null,
      '#cc2121': null,
      // Media placeholders keep a tint, because "a picture goes here" is structure.
      '#dadadd': '#efeff1',
      '#d9d9db': '#efeff1',
      // Tracks and switches: visible, but quieter than the boxes around them.
      '#e5e5e8': '#eaeaec',
      '#e0e0e3': '#eaeaec',
      // Dark surfaces invert rather than turn into ink blocks.
      '#141417': '#ededf0',
      '#212124': '#ededf0',
      '#333336': '#ededf0',
      '#7a7a82': null,
      '#a8a8b0': null,
    },
    fallback: null,
    // Text follows a ramp of its own. Without this, white-on-brand becomes
    // white-on-light-grey, and every button label disappears.
    textGreys: {
      '#ffffff': '#4a4a52',
      '#212124': '#2a2a30',
      '#7a7a82': '#76767e',
      '#a8a8b0': '#9a9aa2',
      '#ff5064': '#5a5a62',
    },
    textFallback: '#5a5a62',
  },
};

// Set per draw, from the page's `mode`.
let MODE = MODES.replica;
// Which of them, by name. Components are registered per mode, because a screen page
// drawn as a sketch must instance the sketched kit and not the replica's.
let MODE_NAME = 'replica';

/** '#rrggbb' to Figma's 0–1 triple. Everything in the spec is written as hex. */
function rgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: Number.parseInt(h.slice(0, 2), 16) / 255,
    g: Number.parseInt(h.slice(2, 4), 16) / 255,
    b: Number.parseInt(h.slice(4, 6), 16) / 255,
  };
}

// ---------------------------------------------------------------- tokens
//
// The app's design tokens, mirrored into Figma as variables with a Hell and a Dunkel
// mode. A colour in the spec written as "@color-emphasis" is BOUND to its variable
// rather than copied, so changing the value in Figma repaints every screen that uses
// it — which is the whole point of having tokens at all.
//
// The values come from packages/design-tokens/theme.css by way of the spec, so Figma
// never becomes a second source of truth for what the token IS. It is a place to try
// a different value out.

let TOKENS = {};
let VARS = {};

function isToken(value) {
  return typeof value === 'string' && value.charAt(0) === '@';
}

function tokenValue(value) {
  if (!isToken(value)) return value;
  const t = TOKENS[value.slice(1)];
  if (t === undefined) return '#ff00ff'; // loud on purpose: a typo must be visible
  return typeof t === 'object' ? t.light : t;
}

async function syncVariables(tokens) {
  TOKENS = tokens || {};
  VARS = {};
  const names = Object.keys(TOKENS);
  if (names.length === 0) return 0;

  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  let collection = null;
  for (const c of collections) if (c.name === 'CORRECTIV') collection = c;
  if (collection === null) collection = figma.variables.createVariableCollection('CORRECTIV');

  // One mode per appearance — where the plan allows it. A second variable mode is a
  // paid Figma feature, and on Starter `addMode` throws. That must not cost the whole
  // token set: without it the board is light-only, which is what it was anyway.
  const light = collection.modes[0].modeId;
  let dark = null;
  for (const m of collection.modes) if (m.name === 'Dunkel') dark = m.modeId;
  if (dark === null) {
    try {
      dark = collection.addMode('Dunkel');
    } catch {
      dark = null;
    }
  }
  try {
    collection.renameMode(light, 'Hell');
  } catch {
    // A single unnamed mode is fine; the name is a convenience, not a requirement.
  }

  const existing = await figma.variables.getLocalVariablesAsync();
  const byName = {};
  for (const v of existing) if (v.variableCollectionId === collection.id) byName[v.name] = v;

  for (const name of names) {
    const token = TOKENS[name];
    const colour = typeof token === 'object';
    const type = colour ? 'COLOR' : 'FLOAT';
    let v = byName[name];
    if (v === undefined || v.resolvedType !== type) {
      v = figma.variables.createVariable(name, collection, type);
    }
    // Without explicit scopes a variable turns up in every property picker in Figma,
    // which makes the panel useless.
    v.scopes = colour
      ? ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL', 'STROKE_COLOR']
      : ['WIDTH_HEIGHT', 'GAP', 'CORNER_RADIUS', 'FONT_SIZE'];
    if (colour) {
      v.setValueForMode(light, rgb(token.light));
      if (dark !== null) v.setValueForMode(dark, rgb(token.dark));
    } else {
      v.setValueForMode(light, token);
      if (dark !== null) v.setValueForMode(dark, token);
    }
    VARS[name] = v;
  }
  return names.length + (dark === null ? ' (light only, a second mode is a paid feature)' : '');
}

/**
 * In wireframe mode every colour is pulled onto the grey ramp before it is used.
 * A mapping to null means "no fill at all" — that is how a brand-red button becomes
 * an empty box with a pencil outline instead of a grey slab.
 */
function toned(hex) {
  if (!hex || MODE.greys === undefined) return hex;
  const key = hex.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(MODE.greys, key)) return MODE.greys[key];
  // Not in the table: fall back to a grey of the SAME lightness rather than to a
  // fixed value. An unlisted colour then degrades instead of silently vanishing,
  // which is what a hardcoded fallback did — and the table stays a list of
  // deliberate exceptions rather than something that must be kept exhaustive.
  return greyOf(hex);
}

/** Rec. 709 luminance, flattened to a grey and lifted so it never reads as ink. */
function greyOf(hex) {
  const c = rgb(hex);
  const y = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  const lifted = Math.round((0.55 + y * 0.4) * 255);
  const h = Math.min(255, Math.max(0, lifted)).toString(16).padStart(2, '0');
  return '#' + h + h + h;
}

/** Binds rather than copies, when the spec names a token and the mode allows it. */
function bind(hex, value) {
  const paintValue = { type: 'SOLID', color: rgb(hex) };
  if (!MODE.bindVariables || !isToken(value)) return paintValue;
  const variable = VARS[value.slice(1)];
  if (variable === undefined) return paintValue;
  // setBoundVariableForPaint returns a NEW paint; the original stays unbound.
  return figma.variables.setBoundVariableForPaint(paintValue, 'color', variable);
}

function paint(value) {
  const c = toned(tokenValue(value));
  return c ? [bind(c, value)] : [];
}

function paintText(value) {
  if (MODE.textGreys === undefined) return paint(value);
  const hex = tokenValue(value);
  const c = MODE.textGreys[(hex || '').toLowerCase()] || MODE.textFallback;
  return [{ type: 'SOLID', color: rgb(c) }];
}

function fontFor(node) {
  const family = MODE.fonts[node.font || 'sans'] || MODE.fonts.sans;
  return family[node.weight || 'regular'] || family.regular;
}

/** Every font the document mentions, so they can be loaded before any text exists. */
function collectFonts(node, out) {
  if (node === null || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const n of node) collectFonts(n, out);
    return out;
  }
  if (node.t === 'text') {
    const f = fontFor(node);
    out[f.family + '|' + f.style] = f;
  }
  for (const n of node.children || []) collectFonts(n, out);
  // A variant set carries its children one level deeper, and a font missing there
  // takes down the whole page just the same.
  for (const n of node.options || []) collectFonts(n, out);
  return out;
}

// ---------------------------------------------------------------- pencil
//
// Sketch mode replaces a node's fill and border with a drawn outline: four edges,
// each bowed off true by a small amount, and a corner that overshoots the way a hand
// does. The wobble is seeded from the node's own name and size, so it is the SAME
// wobble on every redraw — otherwise the whole board shimmers on each save and a real
// change becomes impossible to spot.

const PENCIL = '#6b6b73';
let pending = [];

// ------------------------------------------------------------- the component kit
//
// A component drawn on one page and used on another is the whole point of the kit:
// edit `ui/Button` once and every screen follows. That only works if the screens
// hold INSTANCES rather than copies, so the interpreter keeps a registry.
//
// `COMPONENTS` maps a spec name to the node an instance is made from — the component
// itself, or a variant set's default variant. `PROP_IDS` maps the property names a
// spec writes ('Titel') to the keys `setProperties` wants ('Titel#12:3'), which
// Figma only hands out once the property exists.
//
// Both are keyed 'mode/name'. The kit is drawn once per rendering, so `ui/Button`
// exists twice — once in the app's own colours and once as a pencil drawing — and an
// instance resolves against the mode of the page it lands on. Without that the
// wireframe would fill with replica components and stop being a wireframe.
let COMPONENTS = {};
let PROP_IDS = {};
let TEXT_STYLES = {};

// Filled by `build()` wherever a node carries `bind`, drained by the component that
// encloses it. A binding is what turns a text node into a component property: the
// node keeps its own copy in the main component, and every instance may override it.
let bindings = [];

/** Which slot on a node a property of this type drives. */
const REFERENCE = { TEXT: 'characters', BOOLEAN: 'visible', INSTANCE_SWAP: 'mainComponent' };

/**
 * Turn the `bind` marks collected under a component into component properties.
 *
 * The default of a TEXT property is whatever the bound node already says, so a
 * component drawn with real copy keeps that copy as its default instead of needing
 * it written twice.
 */
function defineProperties(node, spec, bound) {
  const byName = {};
  for (const b of bound) {
    if (byName[b.name] === undefined) byName[b.name] = [];
    byName[b.name].push(b.node);
  }
  for (const name of Object.keys(spec.props || {})) {
    const definition = spec.props[name];
    const targets = byName[name] || [];
    let value = definition.default;
    if (value === undefined && definition.type === 'TEXT' && targets.length > 0) {
      value = targets[0].characters;
    }
    if (value === undefined) value = definition.type === 'BOOLEAN' ? true : '';
    const id = node.addComponentProperty(name, definition.type, value);
    for (const target of targets) {
      // A node may drive several properties, so the existing references are kept.
      const next = {};
      const refs = target.componentPropertyReferences || {};
      for (const k of Object.keys(refs)) next[k] = refs[k];
      next[REFERENCE[definition.type]] = id;
      target.componentPropertyReferences = next;
    }
  }
}

/**
 * Read a component's property keys back out.
 *
 * Not the ids `addComponentProperty` returned: on a variant set the set merges the
 * per-variant properties into one list with keys of its own, and those are the ones
 * `setProperties` accepts. Reading them back is the only way to be right in both
 * cases.
 */
function recordProperties(name, node) {
  const ids = {};
  const defs = node.componentPropertyDefinitions || {};
  for (const key of Object.keys(defs)) {
    const hash = key.indexOf('#');
    ids[hash === -1 ? key : key.slice(0, hash)] = key;
  }
  PROP_IDS[name] = ids;
}

/**
 * A set of variants, from one entry per value.
 *
 * Figma derives the variant property from the component NAMES, which have to read
 * `Property=Value`. So each option is built as an ordinary component under that
 * name, its own properties defined, and only then are they combined — properties
 * cannot be added to a component that is already a variant.
 */
function buildVariantSet(spec, parent) {
  const made = [];
  for (const option of spec.options) {
    const one = { t: 'component', name: spec.prop + '=' + option.value, props: spec.props };
    for (const key of Object.keys(option)) if (key !== 'value') one[key] = option[key];
    made.push(build(one, parent, false));
  }
  const set = figma.combineAsVariants(made, parent);
  set.name = spec.name;
  set.layoutMode = 'VERTICAL';
  set.itemSpacing = 16;
  set.paddingLeft = 16;
  set.paddingRight = 16;
  set.paddingTop = 16;
  set.paddingBottom = 16;
  set.primaryAxisSizingMode = 'AUTO';
  set.counterAxisSizingMode = 'AUTO';
  COMPONENTS[MODE_NAME + '/' + spec.name] = set.defaultVariant;
  recordProperties(MODE_NAME + '/' + spec.name, set);
  return set;
}

function seedOf(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32: small, fast, and identical across runs for a given seed. */
function random(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One edge as three points, bowed sideways by up to `wobble`. */
function edge(from, to, rnd, wobble, out) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  for (const at of [0.35, 0.7, 1]) {
    const off = at === 1 ? 0 : (rnd() - 0.5) * 2 * wobble;
    out.push([from[0] + dx * at + nx * off, from[1] + dy * at + ny * off]);
  }
}

function sketchRect(w, h, seed) {
  const rnd = random(seed);
  const wobble = Math.min(1.4, Math.max(0.5, Math.min(w, h) / 60));
  // Start a little inside, so the overshoot at the end reads as a pen lifted late.
  const p0 = [rnd() * 1.2, rnd() * 1.2];
  const pts = [p0];
  edge(p0, [w - rnd() * 1.2, rnd() * 1.2], rnd, wobble, pts);
  edge(pts[pts.length - 1], [w - rnd() * 1.2, h - rnd() * 1.2], rnd, wobble, pts);
  edge(pts[pts.length - 1], [rnd() * 1.2, h - rnd() * 1.2], rnd, wobble, pts);
  edge(pts[pts.length - 1], [p0[0] - 1 - rnd() * 2, p0[1] + rnd() * 1.5], rnd, wobble, pts);
  return pts
    .map((p, i) => (i === 0 ? 'M ' : ' L ') + p[0].toFixed(2) + ' ' + p[1].toFixed(2))
    .join('');
}

function sketchLine(w, seed) {
  const rnd = random(seed);
  const pts = [[rnd(), 0.5]];
  edge(pts[0], [w - rnd(), 0.5], rnd, 0.6, pts);
  return pts
    .map((p, i) => (i === 0 ? 'M ' : ' L ') + p[0].toFixed(2) + ' ' + p[1].toFixed(2))
    .join('');
}

/** A box only earns an outline if the spec gave it a visible edge or body. */
function wantsOutline(spec) {
  if (spec.t === 'line') return true;
  if (spec.t === 'text' || spec.t === 'space') return false;
  // A row separated from the next by a single rule is not a box, and tracing it as
  // one turns a list into a stack of crates. Its own 1px stroke, greyed by the mode,
  // is already the right drawing.
  if (spec.strokeSides) return false;
  if (spec.stroke) return true;
  // Any fill earns an edge. This used to exempt `#ffffff`, on the reasoning that a
  // page-coloured surface needs no outline — but `sync-tokens.mjs` rewrote every
  // white to `@color-grey-100`, so the exemption stopped firing and nobody noticed
  // for two commits. Restoring it would be the wrong repair: among the shapes it
  // covered are eleven white ellipses — the onboarding progress dots, one switch knob
  // and the reader's floating buttons — and the outline is the only reason any of
  // them is visible on a white page.
  return Boolean(spec.fill);
}

function addOutline(node, spec) {
  const w = node.width;
  const h = node.height;
  if (w < 2 || h < 1) return;

  // A rectangle or an ellipse cannot hold children, so the wobble has nowhere to
  // live. These are the small parts anyway — tab dots, toggle knobs, a progress bar
  // — and at that size a drawn edge would read as noise. They get a plain stroke.
  if (typeof node.appendChild !== 'function') {
    node.strokes = [{ type: 'SOLID', color: rgb(PENCIL) }];
    node.strokeWeight = 1;
    return;
  }
  const seed = seedOf((spec.name || spec.t || 'x') + ':' + Math.round(w) + 'x' + Math.round(h));
  const v = figma.createVector();
  v.name = 'Skizze';
  v.vectorPaths = [
    { windingRule: 'NONE', data: spec.t === 'line' ? sketchLine(w, seed) : sketchRect(w, h, seed) },
  ];
  v.strokes = [{ type: 'SOLID', color: rgb(PENCIL) }];
  v.strokeWeight = spec.t === 'line' ? 0.9 : 1.1;
  v.fills = [];
  node.appendChild(v);
  // ABSOLUTE first, or an auto-layout parent counts the outline as a child and grows.
  if (node.layoutMode && node.layoutMode !== 'NONE') v.layoutPositioning = 'ABSOLUTE';
  v.x = 0;
  v.y = 0;
}

function applySizing(node, spec, parentIsAutoLayout) {
  // resize() resets both axes to FIXED, so any fill/hug has to be re-asserted after.
  const w = spec.w;
  const h = spec.h;
  const numW = typeof w === 'number';
  const numH = typeof h === 'number';
  if (numW || numH) {
    node.resize(numW ? w : node.width, numH ? h : node.height);
  }
  if (!parentIsAutoLayout) return;
  if (w === 'fill') node.layoutSizingHorizontal = 'FILL';
  if (h === 'fill') node.layoutSizingVertical = 'FILL';
  if (w === 'hug') node.layoutSizingHorizontal = 'HUG';
  if (h === 'hug') node.layoutSizingVertical = 'HUG';
  if (numW) node.layoutSizingHorizontal = 'FIXED';
  if (numH) node.layoutSizingVertical = 'FIXED';
}

function build(spec, parent, parentIsAutoLayout) {
  let node = null;
  let missingComponent = false;

  if (spec.t === 'text') {
    node = figma.createText();
    node.fontName = fontFor(spec);
    node.characters = spec.chars;
    node.fontSize = spec.size || 12;
    node.fills = paintText(spec.color || '#212124');
    node.lineHeight = { unit: 'PERCENT', value: spec.leading || 140 };
    if (spec.tracking !== undefined) {
      node.letterSpacing = { unit: 'PERCENT', value: spec.tracking };
    }
    if (spec.align) node.textAlignHorizontal = spec.align.toUpperCase();
    // The style AFTER the literal values, so it wins where it applies and the raw
    // numbers stay as the wireframe's fallback. Colour is not part of it.
    const style = MODE.bindVariables && spec.style ? TEXT_STYLES[spec.style] : undefined;
    if (style !== undefined) node.textStyleId = style.id;
    if (typeof spec.w === 'number') {
      // A wrapping block needs HEIGHT auto-resize AND an explicit width; the default
      // mode ignores the width and collapses the node to a thread.
      node.textAutoResize = 'HEIGHT';
      node.resize(spec.w, node.height);
    } else if (spec.w === 'fill') {
      // Same reason, other direction: a text node left on WIDTH_AND_HEIGHT grows
      // sideways for ever and FILL cannot take hold, so a long label runs straight
      // through whatever sits beside it instead of wrapping above it.
      node.textAutoResize = 'HEIGHT';
    }
  } else if (spec.t === 'rect') {
    node = figma.createRectangle();
    node.fills = paint(spec.fill);
    if (spec.radius) node.cornerRadius = spec.radius;
  } else if (spec.t === 'ellipse') {
    node = figma.createEllipse();
    node.fills = paint(spec.fill);
  } else if (spec.t === 'instance') {
    const main = COMPONENTS[MODE_NAME + '/' + spec.of];
    if (main === undefined) {
      // Magenta, not nothing. An instance of a component that does not exist is a
      // typo in the spec, and a silently missing row is far harder to find than a
      // box shouting its own name.
      node = figma.createFrame();
      node.resize(typeof spec.w === 'number' ? spec.w : 160, spec.h || 24);
      node.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 1 } }];
      missingComponent = true;
    } else {
      node = main.createInstance();
      const ids = PROP_IDS[MODE_NAME + '/' + spec.of] || {};
      const set = {};
      for (const key of Object.keys(spec.set || {})) {
        if (ids[key] !== undefined) set[ids[key]] = spec.set[key];
      }
      if (Object.keys(set).length > 0) node.setProperties(set);
    }
  } else if (spec.t === 'variants') {
    // Already parented and already registered; the tail below only names and places
    // it, and re-appending to the same parent is a move to the end, not a copy.
    node = buildVariantSet(spec, parent);
  } else if (spec.t === 'line' || spec.t === 'space') {
    node = figma.createFrame();
    node.name = spec.t === 'line' ? 'Hairline' : 'Abstand';
    node.resize(10, spec.t === 'line' ? 1 : spec.h || 8);
    node.fills = spec.t === 'line' ? paint(spec.color || '#e2e2e5') : [];
    // A frame is born 10px wide and `applySizing` only fixes that inside auto-layout.
    // In a plain frame FILL means nothing to Figma, so the width is taken from the
    // parent by hand — otherwise a hairline that says it spans the screen draws 10px
    // of it, which is what `beitreten` did.
    if (spec.w === 'fill' && !parentIsAutoLayout && typeof parent.width === 'number') {
      node.resize(parent.width, node.height);
    }
  } else {
    // A component is a frame that other frames can point at. Everything below it —
    // auto-layout, sizing, fills — behaves identically, so the only difference is
    // which constructor runs.
    node = spec.t === 'component' ? figma.createComponent() : figma.createFrame();
    node.fills = paint(spec.fill);
    node.clipsContent = spec.clip === true;
    if (spec.dir) {
      node.layoutMode = spec.dir === 'H' ? 'HORIZONTAL' : 'VERTICAL';
      node.primaryAxisSizingMode = 'AUTO';
      node.counterAxisSizingMode = 'AUTO';
      node.itemSpacing = spec.gap || 0;
      const p = spec.pad || [0, 0, 0, 0];
      node.paddingLeft = p[0];
      node.paddingRight = p[1];
      node.paddingTop = p[2];
      node.paddingBottom = p[3];
      if (spec.align) node.primaryAxisAlignItems = spec.align;
      if (spec.cross) node.counterAxisAlignItems = spec.cross;
      if (spec.wrap) {
        node.layoutWrap = 'WRAP';
        node.counterAxisSpacing = spec.crossGap || spec.gap || 0;
      }
    }
    if (spec.radius) node.cornerRadius = spec.radius;
  }

  // The placeholder's name wins over the spec's. `use-kit.mjs` puts a `name` on every
  // instance, so the generic line below used to rename the magenta box back to
  // "Button, Anmelden" and the box stopped shouting anything.
  if (missingComponent) node.name = 'MISSING: ' + spec.of;
  else if (spec.name) node.name = spec.name;
  if (spec.stroke) {
    node.strokes = paint(spec.stroke);
    if (spec.dash) node.dashPattern = spec.dash;
    if (spec.strokeSides === 'top' || spec.strokeSides === 'bottom') {
      const only = spec.strokeSides === 'top';
      node.strokeTopWeight = only ? 1 : 0;
      node.strokeBottomWeight = only ? 0 : 1;
      node.strokeLeftWeight = 0;
      node.strokeRightWeight = 0;
    }
  }
  if (spec.opacity !== undefined) node.opacity = spec.opacity;

  // Parent BEFORE sizing: FILL and HUG are rejected on a node with no auto-layout
  // parent, and appendChild resets fills to the parent default.
  parent.appendChild(node);
  applySizing(node, spec, parentIsAutoLayout);
  if (spec.fill && spec.t !== 'text') node.fills = paint(spec.fill);
  if (spec.x !== undefined) node.x = spec.x;
  if (spec.y !== undefined) node.y = spec.y;

  const isAuto = spec.dir !== undefined;
  // Everything bound below this node belongs to THIS component, so the mark is taken
  // before the children and the slice drained after: a component nested inside
  // another keeps its own properties instead of handing them upwards.
  const bindMark = bindings.length;
  for (const child of spec.children || []) build(child, node, isAuto);
  if (spec.t === 'component') {
    defineProperties(node, spec, bindings.splice(bindMark));
    // A variant registers under its set's name, not its own `Variante=club`.
    if (spec.name && spec.name.indexOf('=') === -1) {
      COMPONENTS[MODE_NAME + '/' + spec.name] = node;
      recordProperties(MODE_NAME + '/' + spec.name, node);
    }
  }
  if (spec.bind) bindings.push({ node: node, name: spec.bind });

  // Re-assert after children, because a hugging parent resizes as they arrive.
  if (parentIsAutoLayout && spec.w === 'fill') node.layoutSizingHorizontal = 'FILL';

  // Outlines are drawn in a second pass: a node's final size is only known once its
  // parents have finished laying out, and the pencil has to trace that size.
  if (MODE.sketch && wantsOutline(spec)) pending.push({ node: node, spec: spec });
  return node;
}

/**
 * The app's typography variants as Figma text styles.
 *
 * A variant set was the wrong shape for this. `<Typo variant="headline-l">` is not a
 * component the app instantiates, it is a style it applies — and Figma has exactly
 * that object. A text style changes every text node that carries it, across every
 * page, which is the behaviour the variant asks for and the one a component cannot
 * give a node it does not contain.
 *
 * Colour is deliberately NOT part of a style here: the app picks a variant and a
 * colour token separately, so the style carries the typography and a bound variable
 * carries the fill. Putting both in the style would make every coloured headline its
 * own style.
 *
 * Built from the replica's typefaces whatever the current mode is. A style is
 * file-global while a mode is per page, and the wireframe exists in order not to be
 * about the brand — so it draws from the numbers in the spec and ignores these.
 */
async function syncTextStyles(list) {
  TEXT_STYLES = {};
  if (!list || list.length === 0) return 0;

  const fonts = MODES.replica.fonts;
  const wanted = {};
  for (const entry of list) {
    const f = fonts[entry.font || 'sans'][entry.weight || 'regular'];
    wanted[f.family + '|' + f.style] = f;
  }
  for (const key of Object.keys(wanted)) await figma.loadFontAsync(wanted[key]);

  const existing = {};
  for (const style of figma.getLocalTextStyles()) existing[style.name] = style;

  for (const entry of list) {
    // Reuse rather than recreate: a style that is deleted and remade loses every
    // node that pointed at it, and the board would silently fall back to defaults.
    let style = existing[entry.name];
    if (style === undefined) style = figma.createTextStyle();
    style.name = entry.name;
    style.fontName = fonts[entry.font || 'sans'][entry.weight || 'regular'];
    style.fontSize = entry.size;
    style.lineHeight = { unit: 'PERCENT', value: entry.leading };
    style.letterSpacing = { unit: 'PERCENT', value: entry.tracking };
    TEXT_STYLES[entry.name] = style;
  }
  return list.length;
}

async function drawPage(entry, screens) {
  MODE_NAME = MODES[entry.mode] === undefined ? 'replica' : entry.mode;
  MODE = MODES[MODE_NAME];

  // Fonts resolve through MODE, so they can only be collected once it is set.
  //
  // A family the environment lacks stops the whole run, deliberately. Carrying on
  // would only move the failure: `createText` throws the moment it is handed a font
  // that was never loaded, and it would throw somewhere in the middle of a page with
  // nothing naming the family. Collecting the misses first buys one clear message
  // instead of an obscure one, not a partial board.
  const wanted = collectFonts(screens, {});
  const missing = [];
  for (const key of Object.keys(wanted)) {
    try {
      await figma.loadFontAsync(wanted[key]);
    } catch {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    throw new Error('missing font: ' + missing.join(', '));
  }

  let page = null;
  for (const p of figma.root.children) if (p.name === entry.name) page = p;
  if (page === null) {
    page = figma.createPage();
    page.name = entry.name;
  }
  figma.currentPage = page;

  // Converge instead of stacking: drop what this document owns, then rebuild it.
  // Anything else on the page is left alone.
  //
  // `owned: "*"` claims the WHOLE page. A generated page needs that: a name list only
  // removes what the document still mentions, so a component that has been renamed
  // or dropped stays behind forever, and the board slowly fills with things no
  // description explains. Pages that share space with hand-drawn work keep the list.
  if (entry.owned === '*') {
    for (const n of page.children.slice()) n.remove();
  } else {
    const owned = {};
    for (const n of entry.owned || []) owned[n] = true;
    for (const n of page.children.slice()) if (owned[n.name]) n.remove();
  }

  pending = [];
  for (const screen of screens) build(screen, page, false);
  for (const item of pending) addOutline(item.node, item.spec);
  pending = [];

  return { name: entry.name, screens: screens.length };
}

/** How many components the kit has, counted once however many modes drew them. */
function distinctComponents() {
  const seen = {};
  for (const key of Object.keys(COMPONENTS)) seen[key.slice(key.indexOf('/') + 1)] = true;
  return Object.keys(seen).length;
}

function definesComponents(node) {
  if (node === null || typeof node !== 'object') return false;
  if (Array.isArray(node)) {
    for (const n of node) if (definesComponents(n)) return true;
    return false;
  }
  if (node.t === 'component' || node.t === 'variants') return true;
  for (const n of node.children || []) if (definesComponents(n)) return true;
  return false;
}

async function draw(spec) {
  // One description, rendered once per page. `screens` may live on the page entry or,
  // when both pages show the same thing, once at the top for all of them.
  const pages = spec.pages || [{ name: spec.page, mode: spec.mode, owned: spec.owned }];

  // Variables first: a fill can only bind to a variable that already exists.
  const tokenCount = await syncVariables(spec.tokens);
  const styleCount = await syncTextStyles(spec.textStyles);

  // The kit before its users, for the same reason: an instance can only point at a
  // component that has already been drawn. A page is a kit page if anything on it
  // defines a component, so the order follows from the document rather than from a
  // flag somebody has to remember to set.
  COMPONENTS = {};
  PROP_IDS = {};
  bindings = [];
  const ordered = [];
  for (const entry of pages)
    if (definesComponents(entry.screens || spec.screens || [])) ordered.push(entry);
  for (const entry of pages) if (ordered.indexOf(entry) === -1) ordered.push(entry);

  const done = [];
  for (const entry of ordered) {
    const screens = entry.screens || spec.screens || [];
    done.push(await drawPage(entry, screens));
  }

  // Which page the file opens on. Without this it is whichever was drawn last, and
  // the kit has to be drawn first — so the landing page would be decided by a
  // dependency order that has nothing to do with what anyone wants to look at.
  if (spec.focus) {
    for (const p of figma.root.children) if (p.name === spec.focus) figma.currentPage = p;
  }

  return (
    done.map((d) => d.name + ': ' + d.screens + ' screens').join(' · ') +
    ' · ' +
    tokenCount +
    ' tokens · ' +
    styleCount +
    ' text styles · ' +
    distinctComponents() +
    ' components'
  );
}

figma.showUI(__html__, { width: 300, height: 110, title: 'CORRECTIV Wireframes' });

figma.ui.onmessage = async (msg) => {
  if (msg === null || msg === undefined || msg.type !== 'spec') return;
  try {
    const summary = await draw(msg.spec);
    figma.ui.postMessage({ type: 'done', summary: summary, error: null });
  } catch (err) {
    // The stack, not just the message: "not a function" on its own says nothing
    // about WHICH node of several thousand was being drawn.
    figma.ui.postMessage({
      type: 'done',
      summary: null,
      error: String((err && err.message) || err) + ' | ' + String((err && err.stack) || ''),
    });
  }
};
