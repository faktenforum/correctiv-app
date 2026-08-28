import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * Guards the web target against the one failure mode that does not announce
 * itself.
 *
 * react-native-webview has no web implementation. On web it renders the text
 * "React Native WebView does not support this platform." — and crucially,
 * `expo export --platform web` still succeeds, so a CI job that only checks the
 * export stays green while the route is broken. That is why this is a test and
 * not a comment.
 *
 * The rule: react-native-webview may only be imported from a file Metro
 * resolves exclusively on native. Anything else must go through
 * components/reader/ReaderView, which has a .web.tsx sibling.
 */
const SRC = resolve(__dirname, '../src');

/** Files Metro only ever picks on native — safe places for a native-only import. */
const NATIVE_ONLY = [/\.native\.[jt]sx?$/, /\.(android|ios)\.[jt]sx?$/];

/**
 * ReaderView.tsx is the native branch of a platform pair: Metro prefers
 * ReaderView.web.tsx on web, so the bare .tsx never reaches a browser. Verified
 * below by asserting the .web.tsx sibling exists.
 */
const PLATFORM_PAIRED = [
  'components/reader/ReaderView.tsx',
  // Fremd-Einbettung (YouTube). Same deal: .web.tsx renders a real <iframe>.
  'components/media/VideoFrame.tsx',
  // Not a native SDK this time but half a megabyte of base64: the bundled covers
  // are for an offline phone, and .web.ts keeps them out of the page.
  'lib/articles/covers.ts',
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.[jt]sx?$/.test(entry) ? [full] : [];
  });
}

describe('web target', () => {
  const files = sourceFiles(SRC);

  it('finds source files to check', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('imports react-native-webview only from native-only or platform-paired files', () => {
    const offenders = files.filter((file) => {
      const rel = relative(SRC, file).replaceAll('\\', '/');
      if (NATIVE_ONLY.some((p) => p.test(rel)) || PLATFORM_PAIRED.includes(rel)) return false;
      return /from\s+['"]react-native-webview['"]/.test(readFileSync(file, 'utf8'));
    });

    expect(offenders.map((f) => relative(SRC, f))).toEqual([]);
  });

  it('gives every platform-paired file a .web counterpart', () => {
    for (const rel of PLATFORM_PAIRED) {
      const web = resolve(SRC, rel.replace(/\.(tsx?)$/, '.web.$1'));
      expect(statSync(web).isFile()).toBe(true);
    }
  });

  it('reaches the bundled covers only through the platform-paired module', () => {
    // Importing the generated module directly would put every data URI back into
    // the web export, and nothing about the page would look wrong — it would just
    // be half a megabyte heavier. Exactly the failure this file exists to catch.
    const offenders = files.filter((file) => {
      const rel = relative(SRC, file).replaceAll('\\', '/');
      if (rel === 'lib/articles/covers.ts') return false;
      return /from\s+'[^']*offlineCovers\.generated'/.test(readFileSync(file, 'utf8'));
    });

    expect(offenders.map((f) => relative(SRC, f))).toEqual([]);
  });

  it('routes both reader implementations through one shared props type', () => {
    // If these drift apart the platforms can diverge silently, so both must
    // import the contract rather than declare their own props inline.
    for (const variant of ['ReaderView.tsx', 'ReaderView.web.tsx']) {
      const source = readFileSync(resolve(SRC, 'components/reader', variant), 'utf8');
      expect(source).toMatch(/ReaderViewProps.*from\s+'\.\/types'/s);
    }
  });
});
