#!/usr/bin/env node
/**
 * Produces src/lib/theme/readerFonts.generated.ts. The article reader's WebView is
 * a browser context of its own and cannot use the fonts React Native loaded. The
 * full TTFs (~1.1 MB) are too large to embed, so pyftsubset cuts them down to Latin
 * plus German and they go in as base64 WOFF via @font-face — which keeps the reader
 * on-brand AND usable offline.
 *
 * Voraussetzung: pyftsubset (fonttools) im PATH. Aufruf: npm run fonts
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GF = resolve(ROOT, 'node_modules', '@expo-google-fonts');

// Latein-Grundbereich + Latin-1/Extended (ä ö ü ß …), Satzzeichen, €, „" – —.
const UNICODES = 'U+0020-024F,U+2010-2030,U+20AC,U+2122';

const FONTS = [
  {
    file: `${GF}/merriweather/400Regular/Merriweather_400Regular.ttf`,
    family: 'Merriweather',
    weight: 400,
    style: 'normal',
  },
  {
    file: `${GF}/merriweather/700Bold/Merriweather_700Bold.ttf`,
    family: 'Merriweather',
    weight: 700,
    style: 'normal',
  },
  {
    file: `${GF}/merriweather/400Regular_Italic/Merriweather_400Regular_Italic.ttf`,
    family: 'Merriweather',
    weight: 400,
    style: 'italic',
  },
  {
    file: `${GF}/source-sans-3/600SemiBold/SourceSans3_600SemiBold.ttf`,
    family: 'SourceSans3',
    weight: 600,
    style: 'normal',
  },
];

const tmp = mkdtempSync(resolve(tmpdir(), 'correctiv-fonts-'));
const faces = [];

try {
  for (const font of FONTS) {
    const out = resolve(tmp, `${font.family}-${font.weight}-${font.style}.woff`);
    execFileSync(
      'pyftsubset',
      [
        font.file,
        `--unicodes=${UNICODES}`,
        '--layout-features=kern,liga',
        '--flavor=woff',
        `--output-file=${out}`,
      ],
      { stdio: 'pipe' },
    );
    const b64 = readFileSync(out).toString('base64');
    faces.push(
      `@font-face{font-family:'${font.family}';font-weight:${font.weight};font-style:${font.style};` +
        `font-display:swap;src:url(data:font/woff;base64,${b64}) format('woff');}`,
    );
    console.log(
      `  ${font.family} ${font.weight} ${font.style}: ${(b64.length / 1024).toFixed(0)} KB base64`,
    );
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

const header =
  '// AUTO-GENERATED von scripts/embed-fonts.mjs — nicht von Hand editieren.\n' +
  '// Subsetted (Latein+Deutsch) base64-Fonts für die Reader-WebView. Regenerieren: npm run fonts\n';
writeFileSync(
  resolve(ROOT, 'src', 'lib', 'theme', 'readerFonts.generated.ts'),
  `${header}\n/* eslint-disable */\nexport const READER_FONTS_CSS = ${JSON.stringify(faces.join(''))};\n`,
);
console.log('readerFonts.generated.ts geschrieben.');
