/**
 * Konvertiert ../wp-design-tokens/css/theme.css in NativeScript-taugliches SCSS.
 *
 * NativeScript-CSS kennt kein rem, kein :root und keine unitless line-height —
 * deshalb ist dieses Skript der einzige zulässige Weg, Tokens in die App zu
 * bringen. theme.css niemals direkt importieren.
 *
 * Regeln:
 *   rem            → dip (×16, unitless)
 *   px             → unitless dip
 *   s (Dauer)      → ms (Zahl, für Animation-APIs)
 *   :root          → .ns-root (Klasse auf der Root-View)
 *   @media-Blöcke  → ignoriert (App ist phone-only, kein Dark Mode im Prototyp)
 *
 * Aufruf: npm run tokens
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../../wp-design-tokens/css/theme.css');
const OUT = resolve(__dirname, '../src/styles/tokens.generated.scss');

const css = readFileSync(SRC, 'utf8');

// Ersten :root-Block extrahieren (Mobile-Werte; @media-Overrides ignorieren).
const rootMatch = css.match(/:root\s*\{([\s\S]*?)\}/);
if (!rootMatch) throw new Error('Kein :root-Block in theme.css gefunden');

const declarations = [];
for (const line of rootMatch[1].split('\n')) {
  const m = line.match(/^\s*(--var-[\w-]+)\s*:\s*([^;]+);/);
  if (m) declarations.push({ name: m[1], value: m[2].trim() });
}

const remToDip = (v) => Math.round(parseFloat(v) * 16 * 100) / 100;

function convert(name, value) {
  // Font-Stacks und Verweise auf andere Variablen unverändert übernehmen.
  if (value.startsWith('var(')) return null; // Aliasse (font-serif/font-sans) separat behandelt
  if (value.includes('"')) return { value, kind: 'string' };
  const rem = value.match(/^(-?[\d.]+)rem$/);
  if (rem) return { value: remToDip(rem[1]), kind: 'number' };
  const px = value.match(/^(-?[\d.]+)px$/);
  if (px) return { value: parseFloat(px[1]), kind: 'number' };
  const sec = value.match(/^(-?[\d.]+)s$/);
  if (sec) return { value: parseFloat(sec[1]) * 1000, kind: 'number' };
  return { value, kind: 'raw' }; // Farben, unitless Zahlen (Leading, Font-Weights)
}

const scssVars = [];
const cssVars = [];
for (const { name, value } of declarations) {
  const conv = convert(name, value);
  if (!conv) continue;
  const scssName = name.replace(/^--var-/, '$');
  scssVars.push(`${scssName}: ${conv.value};`);
  if (conv.kind !== 'string') {
    cssVars.push(`  ${name.replace(/^--var-/, '--')}: ${conv.value};`);
  }
}

// Utility-Klassen — bewusst nur die kleine Teilmenge, die NS-CSS kann.
const colors = declarations.filter((d) => d.name.startsWith('--var-color-'));
const spacings = declarations.filter(
  (d) => d.name.startsWith('--var-spacing-') && d.name !== '--var-spacing',
);
const radii = declarations.filter((d) => d.name.startsWith('--var-radius-'));

const util = [];
for (const c of colors) {
  const key = c.name.replace('--var-color-', '');
  util.push(`.bg-${key} { background-color: ${c.value}; }`);
  util.push(`.text-${key} { color: ${c.value}; }`);
}
for (const s of spacings) {
  const key = s.name.replace('--var-spacing-', '');
  const dip = remToDip(s.value);
  util.push(`.p-${key} { padding: ${dip}; }`);
  util.push(`.px-${key} { padding-left: ${dip}; padding-right: ${dip}; }`);
  util.push(`.py-${key} { padding-top: ${dip}; padding-bottom: ${dip}; }`);
  util.push(`.m-${key} { margin: ${dip}; }`);
  util.push(`.mx-${key} { margin-left: ${dip}; margin-right: ${dip}; }`);
  util.push(`.my-${key} { margin-top: ${dip}; margin-bottom: ${dip}; }`);
  util.push(`.mt-${key} { margin-top: ${dip}; }`);
  util.push(`.mb-${key} { margin-bottom: ${dip}; }`);
}
for (const r of radii) {
  const key = r.name.replace('--var-radius-', '');
  util.push(`.rounded-${key} { border-radius: ${remToDip(r.value)}; }`);
}

const banner = `// GENERIERT von scripts/sync-tokens.mjs aus wp-design-tokens/css/theme.css
// NICHT von Hand editieren — Änderungen mit \`npm run tokens\` neu erzeugen.
`;

const out = `${banner}
// ── SCSS-Variablen (Build-Zeit) ─────────────────────────────────
${scssVars.join('\n')}

// ── CSS-Variablen (Laufzeit, var() in Komponenten-Styles) ──────
.ns-root {
${cssVars.join('\n')}
}

// ── Utilities ───────────────────────────────────────────────────
${util.join('\n')}
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, out);
console.log(`tokens.generated.scss geschrieben (${scssVars.length} Variablen, ${util.length} Utilities)`);
