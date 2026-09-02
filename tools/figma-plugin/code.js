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
// server's write tools cannot: auto-layout with FILL children, vectors with
// arrowheads, ellipses, dash patterns.
//
//   t: 'frame'    dir V|H, pad, gap, fill, stroke, radius, w, h, align, cross, clip,
//                 dash, children
//   t: 'text'     chars, size, font sans|serif, weight regular|semibold|bold, color,
//                 w, tracking, align
//   t: 'rect'     w, h, fill, stroke, radius
//   t: 'ellipse'  w, h, fill, stroke
//   t: 'space'    h            a fixed gap inside a column
//   t: 'line'     colour       a 1px hairline that fills its parent
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
      '#ff5064': null,
      '#fde162': null,
      '#141417': '#ededf0',
      '#212124': null,
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

/** '#rrggbb' to Figma's 0–1 triple. Everything in the spec is written as hex. */
function rgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: Number.parseInt(h.slice(0, 2), 16) / 255,
    g: Number.parseInt(h.slice(2, 4), 16) / 255,
    b: Number.parseInt(h.slice(4, 6), 16) / 255,
  };
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

function paint(hex) {
  const c = toned(hex);
  return c ? [{ type: 'SOLID', color: rgb(c) }] : [];
}

function paintText(hex) {
  if (MODE.textGreys === undefined) return paint(hex);
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
  if (spec.stroke) return true;
  return Boolean(spec.fill) && spec.fill.toLowerCase() !== '#ffffff';
}

function addOutline(node, spec) {
  const w = node.width;
  const h = node.height;
  if (w < 2 || h < 1) return;
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
    if (typeof spec.w === 'number') {
      // A wrapping block needs HEIGHT auto-resize AND an explicit width; the default
      // mode ignores the width and collapses the node to a thread.
      node.textAutoResize = 'HEIGHT';
      node.resize(spec.w, node.height);
    }
  } else if (spec.t === 'rect') {
    node = figma.createRectangle();
    node.fills = paint(spec.fill);
    if (spec.radius) node.cornerRadius = spec.radius;
  } else if (spec.t === 'ellipse') {
    node = figma.createEllipse();
    node.fills = paint(spec.fill);
  } else if (spec.t === 'line' || spec.t === 'space') {
    node = figma.createFrame();
    node.name = spec.t === 'line' ? 'Hairline' : 'Abstand';
    node.resize(10, spec.t === 'line' ? 1 : spec.h || 8);
    node.fills = spec.t === 'line' ? paint(spec.color || '#e2e2e5') : [];
  } else {
    node = figma.createFrame();
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

  if (spec.name) node.name = spec.name;
  if (spec.stroke) {
    node.strokes = paint(spec.stroke);
    if (spec.dash) node.dashPattern = spec.dash;
    if (spec.strokeSides === 'top') {
      node.strokeTopWeight = 1;
      node.strokeBottomWeight = 0;
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
  for (const child of spec.children || []) build(child, node, isAuto);

  // Re-assert after children, because a hugging parent resizes as they arrive.
  if (parentIsAutoLayout && spec.w === 'fill') node.layoutSizingHorizontal = 'FILL';

  // Outlines are drawn in a second pass: a node's final size is only known once its
  // parents have finished laying out, and the pencil has to trace that size.
  if (MODE.sketch && wantsOutline(spec)) pending.push({ node: node, spec: spec });
  return node;
}

/**
 * Navigation, drawn rather than connected.
 *
 * Figma design files have no Connector node. Figma also normalises `vectorPaths`
 * against the geometry's own bounding box and then places the node by x/y, so the
 * path is written RELATIVE to that box and the box's corner becomes the position.
 * Writing absolute coordinates and forcing x/y to 0 puts every arrow in the corner.
 */
function drawArrows(page, arrows) {
  if (!arrows) return 0;
  const byName = {};
  for (const n of page.children) byName[n.name] = n;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of page.children) {
    if (n.name === arrows.overlay) continue;
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
  }
  if (minX === Infinity) return 0;

  const overlay = figma.createFrame();
  overlay.name = arrows.overlay;
  overlay.x = minX - 60;
  overlay.y = minY - 60;
  overlay.resize(maxX - minX + 120, maxY - minY + 120);
  overlay.fills = [];
  overlay.clipsContent = false;
  page.appendChild(overlay);

  let drawn = 0;
  for (const [from, to] of arrows.edges) {
    const a = byName[from];
    const b = byName[to];
    if (!a || !b) continue;

    let pts;
    if (Math.abs(a.y - b.y) < 10) {
      const yy = a.y + 140;
      pts = [
        [a.x + a.width, yy],
        [b.x, yy],
      ];
    } else {
      const sy = a.y + a.height;
      const mid = sy + 30;
      pts = [
        [a.x + a.width / 2, sy],
        [a.x + a.width / 2, mid],
        [b.x + b.width / 2, mid],
        [b.x + b.width / 2, b.y],
      ];
    }

    let lx = Infinity;
    let ly = Infinity;
    for (const p of pts) {
      lx = Math.min(lx, p[0] - overlay.x);
      ly = Math.min(ly, p[1] - overlay.y);
    }
    let d = '';
    pts.forEach(function (p, i) {
      d += (i === 0 ? 'M ' : ' L ') + (p[0] - overlay.x - lx) + ' ' + (p[1] - overlay.y - ly);
    });

    const v = figma.createVector();
    v.name = from + ' → ' + to;
    v.vectorPaths = [{ windingRule: 'NONE', data: d }];
    v.strokes = paint(arrows.color || '#9e9ea8');
    v.strokeWeight = arrows.weight || 1.5;
    v.strokeCap = 'ARROW_LINES';
    v.fills = [];
    overlay.appendChild(v);
    v.x = lx;
    v.y = ly;
    drawn++;
  }

  overlay.locked = true;
  return drawn;
}

async function drawPage(entry, screens) {
  MODE = MODES[entry.mode] || MODES.replica;

  // Fonts resolve through MODE, so they can only be collected once it is set. A
  // family the environment lacks must not take the whole page down with it.
  const wanted = collectFonts(screens, {});
  const missing = [];
  for (const key of Object.keys(wanted)) {
    try {
      await figma.loadFontAsync(wanted[key]);
    } catch (err) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    throw new Error('Schrift fehlt: ' + missing.join(', '));
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
  const owned = {};
  for (const n of entry.owned || []) owned[n] = true;
  if (entry.arrows) owned[entry.arrows.overlay] = true;
  for (const n of page.children.slice()) if (owned[n.name]) n.remove();

  pending = [];
  for (const screen of screens) build(screen, page, false);
  for (const item of pending) addOutline(item.node, item.spec);
  const sketched = pending.length;
  pending = [];

  const arrows = drawArrows(page, entry.arrows);
  return { name: entry.name, screens: screens.length, arrows: arrows, sketched: sketched };
}

async function draw(spec) {
  // One description, rendered once per page. `screens` may live on the page entry or,
  // when both pages show the same thing, once at the top for all of them.
  const pages = spec.pages || [
    { name: spec.page, mode: spec.mode, owned: spec.owned, arrows: spec.arrows },
  ];

  const done = [];
  for (const entry of pages) {
    const screens = entry.screens || spec.screens || [];
    done.push(await drawPage(entry, screens));
  }

  return done
    .map((d) => d.name + ': ' + d.screens + ' Screens, ' + d.arrows + ' Pfeile')
    .join(' · ');
}

figma.showUI(__html__, { width: 300, height: 110, title: 'CORRECTIV Wireframes' });

figma.ui.onmessage = async (msg) => {
  if (msg === null || msg === undefined || msg.type !== 'spec') return;
  try {
    const summary = await draw(msg.spec);
    figma.ui.postMessage({ type: 'done', summary: summary, error: null });
  } catch (err) {
    figma.ui.postMessage({
      type: 'done',
      summary: null,
      error: String((err && err.message) || err),
    });
  }
};
