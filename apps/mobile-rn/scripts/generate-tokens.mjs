#!/usr/bin/env node
/**
 * Token-Brücke: liest die verbindlichen Design-Tokens aus dem Schwester-Repo
 * `wp-design-tokens` (Tailwind v4 CSS) und generiert daraus drei Artefakte für
 * die React-Native-App (NativeWind v4 = Tailwind v3, kein @theme inline):
 *
 *   1. tailwind.tokens.generated.js     – theme-Map für tailwind.config.js (px-Strings)
 *   2. src/lib/theme/tokens.generated.ts – typisierte Konstanten für StyleSheets
 *   3. src/lib/theme/readerCss.generated.ts – theme.css als String für die WebView
 *
 * Werte werden zu px aufgelöst (rem × 16), weil NativeWind rem zur Buildzeit mit
 * Root-Größe 14 inlined — px umgeht das. Einzige Quelle der Wahrheit bleibt das
 * Token-Repo; dieses Skript darf nie von Hand nachbearbeitete Outputs erzeugen.
 *
 * Aufruf:  npm run tokens
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

/**
 * Das Token-Repo ist ein SIBLING-Checkout, keine Abhängigkeit dieses Repos — wo
 * es liegt, hängt also davon ab, wie tief diese App steckt. Ein festes '..'
 * zeigte nach dem Umzug von der Repo-Wurzel nach apps/mobile-rn/ auf
 * apps/wp-design-tokens/ und damit ins Leere.
 *
 * Nach oben suchen statt Ebenen zählen heißt: der nächste Umzug bricht es nicht
 * wieder. (Dieselbe Korrektur steckt in apps/mobile/scripts/sync-tokens.mjs.)
 */
function findTokensCssDir(from) {
  for (let dir = from; ; dir = dirname(dir)) {
    const candidate = resolve(dir, 'wp-design-tokens/css');
    if (existsSync(resolve(candidate, 'theme.css'))) return candidate;
    if (dirname(dir) === dir) return null; // Dateisystem-Wurzel erreicht
  }
}

const TOKENS_REPO = findTokensCssDir(ROOT);
if (!TOKENS_REPO) {
  throw new Error(
    'wp-design-tokens/css/theme.css in keinem übergeordneten Verzeichnis gefunden.\n' +
      'Es ist ein eigenes Repo (github.com/correctiv/wp-design-tokens) und muss als\n' +
      `Geschwister-Checkout vorliegen — siehe README. Gesucht ab:\n  ${ROOT}`,
  );
}
const THEME_CSS_PATH = resolve(TOKENS_REPO, 'theme.css');

const REM_BASE = 16; // wp-design-tokens nimmt 16px-Basis an

// ---------------------------------------------------------------------------
// 1. theme.css einlesen und den ersten (Basis-):root-Block extrahieren
// ---------------------------------------------------------------------------
const themeCss = readFileSync(THEME_CSS_PATH, 'utf8');

function firstRootBlock(css) {
  const start = css.indexOf(':root');
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error('Kein :root-Block in theme.css gefunden');
}

const rootBody = firstRootBlock(themeCss);

// Alle --var-* Deklarationen sammeln (Kommentare ignorieren)
const rawVars = {};
const declRe = /(--var-[a-z0-9-]+)\s*:\s*([^;]+);/gi;
let m;
while ((m = declRe.exec(rootBody)) !== null) {
  rawVars[m[1]] = m[2].trim();
}

// var()-Referenzen auflösen (z. B. --var-font-serif: var(--var-font-merriweather))
function resolveVar(value, seen = new Set()) {
  const ref = value.match(/^var\((--var-[a-z0-9-]+)\)$/i);
  if (!ref) return value;
  const name = ref[1];
  if (seen.has(name)) return value;
  seen.add(name);
  if (rawVars[name] == null) return value;
  return resolveVar(rawVars[name], seen);
}

const vars = {};
for (const [k, v] of Object.entries(rawVars)) vars[k] = resolveVar(v);

// ---------------------------------------------------------------------------
// 2. Wert-Konvertierung
// ---------------------------------------------------------------------------
function toPx(value) {
  const v = value.trim();
  const rem = v.match(/^(-?[\d.]+)rem$/);
  if (rem) return `${round(parseFloat(rem[1]) * REM_BASE)}px`;
  const px = v.match(/^(-?[\d.]+)px$/);
  if (px) return `${round(parseFloat(px[1]))}px`;
  if (v === '0') return '0px';
  return v;
}
function toNumberPx(value) {
  const px = toPx(value);
  const n = parseFloat(px);
  return Number.isNaN(n) ? value : n;
}
function toMs(value) {
  const s = value.match(/^([\d.]+)s$/);
  if (s) return Math.round(parseFloat(s[1]) * 1000);
  return parseFloat(value);
}
function round(n) {
  return Math.round(n * 1000) / 1000;
}

// Tokens nach Gruppe einsammeln
function group(prefix, transform = (x) => x) {
  const out = {};
  for (const [k, v] of Object.entries(vars)) {
    if (k.startsWith(prefix)) out[k.slice(prefix.length)] = transform(v);
  }
  return out;
}

const colors = group('--var-color-'); // emphasis, alternative, grey-100..700
const radius = group('--var-radius-', toPx); // xs, s, md
const durationsMs = group('--var-duration-', toMs); // fast, slow
const leading = group('--var-leading-', (v) => parseFloat(v)); // unitless
const letterSpacingPx = group('--var-letter-spacing-', toNumberPx);
const fontWeights = group('--var-font-weight-'); // normal, semibold, bold

// Spacing (T-Shirt-Skala)
const spacingTokens = {};
for (const [k, v] of Object.entries(vars)) {
  const mm = k.match(/^--var-spacing-([a-z0-9]+)$/);
  if (mm) spacingTokens[mm[1]] = toPx(v);
}

// Font sizes: text-* und headline-*
const fontSizePx = {};
for (const [k, v] of Object.entries(vars)) {
  const t = k.match(/^--var-font-size-(text|headline)-([a-z]+)$/);
  if (t) fontSizePx[`${t[1]}-${t[2]}`] = toNumberPx(v);
}

const containers = {
  container: toPx(vars['--var-container']),
  'container-content': toPx(vars['--var-container-content']),
};

// Font-Familien: die in der App geladenen Familiennamen (@expo-google-fonts).
// Die CSS-Stacks ("Merriweather", sans-serif) sind in RN nicht direkt nutzbar.
// Pro Schnitt eine eigene Familie (umgeht den Android-fontWeight-Bug); hier die
// Regular-Familien als NativeWind-Default für `font-serif`/`font-sans`. Gewichtete
// Schnitte laufen über src/lib/theme/fonts.ts + die <Typo>-Komponente.
const FONT_FAMILY = { serif: 'Merriweather_400Regular', sans: 'SourceSans3_400Regular' };

// ---------------------------------------------------------------------------
// 3a. tailwind.tokens.generated.js
// ---------------------------------------------------------------------------
const twColors = { transparent: 'transparent', current: 'currentColor', ...colors };
const twFontSize = Object.fromEntries(Object.entries(fontSizePx).map(([k, v]) => [k, `${v}px`]));
const twSpacing = { px: '1px', 0: '0px', ...spacingTokens };
// Numerische Linear-Skala (2px-Schritt, wie die Fallback-Skala der Quelle)
for (let i = 1; i <= 48; i++) twSpacing[i] = `${i * 2}px`;
const twLetterSpacing = Object.fromEntries(
  Object.entries(letterSpacingPx).map(([k, v]) => [k, `${v}px`]),
);
const twLineHeight = Object.fromEntries(Object.entries(leading).map(([k, v]) => [k, String(v)]));

const HEADER =
  '// AUTO-GENERATED von scripts/generate-tokens.mjs — nicht von Hand editieren.\n// Quelle: ../wp-design-tokens/css/theme.css · Regenerieren: npm run tokens\n';

const tailwindOut = `${HEADER}
/* eslint-disable */
module.exports = {
  colors: ${JSON.stringify(twColors, null, 2)},
  spacing: ${JSON.stringify(twSpacing, null, 2)},
  borderRadius: ${JSON.stringify({ none: '0px', ...radius, full: '9999px' }, null, 2)},
  fontSize: ${JSON.stringify(twFontSize, null, 2)},
  fontWeight: ${JSON.stringify(fontWeights, null, 2)},
  letterSpacing: ${JSON.stringify(twLetterSpacing, null, 2)},
  lineHeight: ${JSON.stringify(twLineHeight, null, 2)},
  fontFamily: ${JSON.stringify({ serif: [FONT_FAMILY.serif], sans: [FONT_FAMILY.sans] }, null, 2)},
  maxWidth: ${JSON.stringify(containers, null, 2)},
};
`;
writeFileSync(resolve(ROOT, 'tailwind.tokens.generated.js'), tailwindOut);

// ---------------------------------------------------------------------------
// 3b. src/lib/theme/tokens.generated.ts
// ---------------------------------------------------------------------------
const spacingPx = Object.fromEntries(
  Object.entries(spacingTokens).map(([k, v]) => [k, parseFloat(v)]),
);
const radiusPx = Object.fromEntries(Object.entries(radius).map(([k, v]) => [k, parseFloat(v)]));

const tsOut = `${HEADER}
/* eslint-disable */
export const colors = ${JSON.stringify(colors, null, 2)} as const;
export const spacingPx = ${JSON.stringify(spacingPx, null, 2)} as const;
export const radiusPx = ${JSON.stringify(radiusPx, null, 2)} as const;
export const fontSizePx = ${JSON.stringify(fontSizePx, null, 2)} as const;
export const leading = ${JSON.stringify(leading, null, 2)} as const;
export const letterSpacingPx = ${JSON.stringify(letterSpacingPx, null, 2)} as const;
export const fontWeights = ${JSON.stringify(fontWeights, null, 2)} as const;
export const durationsMs = ${JSON.stringify(durationsMs, null, 2)} as const;
export const fontFamily = ${JSON.stringify(FONT_FAMILY, null, 2)} as const;

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacingPx;
`;
const themeDir = resolve(ROOT, 'src', 'lib', 'theme');
mkdirSync(themeDir, { recursive: true });
writeFileSync(resolve(themeDir, 'tokens.generated.ts'), tsOut);

// ---------------------------------------------------------------------------
// 3c. src/lib/theme/readerCss.generated.ts
//     theme.css (nur Basis-:root + Media-Queries; @theme inline ignoriert die WebView)
// ---------------------------------------------------------------------------
const themeCssForReader = themeCss.split('@theme inline')[0].trim();
const readerOut = `${HEADER}
/* eslint-disable */
// theme.css verbatim (CSS Custom Properties) — die WebView nutzt die --var-* direkt.
export const THEME_CSS = ${JSON.stringify(themeCssForReader)};
`;
writeFileSync(resolve(themeDir, 'readerCss.generated.ts'), readerOut);

// ---------------------------------------------------------------------------
console.log('Token-Brücke generiert:');
console.log('  • tailwind.tokens.generated.js');
console.log('  • src/lib/theme/tokens.generated.ts');
console.log('  • src/lib/theme/readerCss.generated.ts');
console.log(
  `  (${Object.keys(colors).length} Farben, ${Object.keys(spacingTokens).length} Spacing-Tokens, ${Object.keys(fontSizePx).length} Schriftgrößen)`,
);
