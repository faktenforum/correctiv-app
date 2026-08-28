import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The architectural guard.
 *
 * `@correctiv/app-core` only has value if it stays platform-free: it is what a
 * web target, a future native rewrite and this test suite all share. That
 * property is one careless import away from being lost, and nothing else in the
 * toolchain enforces it — so it is enforced here, in the same `npm run check`
 * that runs on every PR.
 *
 * If this test fails, the fix is never to widen the allow-list: move the code
 * that needs the SDK into a host (apps/mobile/src/lib/platform/…) and declare what
 * the core needs as a port in src/ports/index.ts.
 */
const SRC = fileURLToPath(new URL('../src', import.meta.url));

const FORBIDDEN = [
  { pattern: /@nativescript\//, why: 'NativeScript SDK' },
  { pattern: /@nativescript-community\//, why: 'NativeScript community plugin' },
  { pattern: /@nstudio\//, why: 'NativeScript plugin' },
  { pattern: /^nativescript-vue$/, why: 'NativeScript Vue renderer' },
  { pattern: /^react-native/, why: 'React Native' },
  { pattern: /^expo(-|$)/, why: 'Expo' },
  { pattern: /^node:/, why: 'Node built-in (the core runs on device and in a browser too)' },
  // The core was Pinia-based until the React Native pivot; these keep it from
  // drifting back. A UI framework in here would re-tie the core to one host, which
  // is exactly what moving the stores into the core avoided.
  //
  // State itself lives in Redux Toolkit (stores/store.ts), which is deliberately
  // NOT on this list: it is a state container, not a view layer, and it holds the
  // same property the hand-written store had — no UI framework, no platform SDK.
  // The binding stays the host's (react-redux in apps/mobile).
  { pattern: /^vue$|^@vue\//, why: 'Vue (hosts bind the store themselves)' },
  { pattern: /^pinia$/, why: 'Pinia (replaced by Redux Toolkit — see ADR 0004)' },
  { pattern: /^zustand/, why: 'zustand (the core is on Redux Toolkit)' },
  { pattern: /^react$|^react-dom$/, why: 'React (hosts bind the stores themselves)' },
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|mts|mjs|js)$/.test(entry) && !entry.endsWith('.d.mts') ? [full] : [];
  });
}

const IMPORT_RE =
  /(?:^|\s)(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

describe('core stays platform-free', () => {
  const files = sourceFiles(SRC);

  it('finds source files to check (guards against a silently empty scan)', () => {
    expect(files.length).toBeGreaterThan(25);
  });

  it.each(files.map((f) => [f.slice(SRC.length + 1), f]))(
    '%s imports no platform SDK',
    (_name, full) => {
      const source = readFileSync(full, 'utf8');
      const offenders: string[] = [];

      for (const match of source.matchAll(IMPORT_RE)) {
        const spec = match[1] ?? match[2];
        if (!spec || spec.startsWith('.')) continue;
        const hit = FORBIDDEN.find((f) => f.pattern.test(spec));
        if (hit) offenders.push(`${spec} (${hit.why})`);
      }

      expect(offenders).toEqual([]);
    },
  );

  it('routes every platform capability through a declared port', () => {
    // Anything the core needs from its host must appear in ports/index.ts — one
    // file to read to know what implementing a new host costs.
    const ports = readFileSync(join(SRC, 'ports/index.ts'), 'utf8');
    for (const port of ['KeyValueStore', 'BlobStore', 'ContentBundle', 'AudioBackend']) {
      expect(ports).toMatch(new RegExp(`export interface ${port}`));
    }
    expect(ports).toMatch(/export interface CorePlatform/);
  });

  /**
   * The DOM extraction backend is the one place in the core that has runtime
   * dependencies, and it exists so a host without an HTML parser does not need one.
   * Nothing outside it may import it. An accidental import somewhere central would
   * pull htmlparser2 into a bundle whose resolver cannot handle it, and that failure
   * shows up on a device, not here.
   */
  it('keeps the HTML parser inside the DOM extraction backend', () => {
    const parserImports = files.filter((full) => {
      if (full.endsWith(join('articles', 'extract', 'dom.ts'))) return false;
      return /from '(?:htmlparser2|css-select|domutils|dom-serializer|domhandler)'/.test(
        readFileSync(full, 'utf8'),
      );
    });
    expect(parserImports.map((f) => f.slice(SRC.length + 1))).toEqual([]);
  });
});
