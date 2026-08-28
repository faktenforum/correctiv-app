/**
 * `theme.standalone.css` compiles for a consumer that has no Uniwind.
 *
 * That file exists for exactly one reason: the CORRECTIV CMS should be able to
 * import this repo's design tokens — including the dark palette, which its own
 * copy of wp-design-tokens does not carry. Nothing imports it yet, so without this
 * test the claim rests on one manual check made the day it was written.
 *
 * It has already been wrong twice, and neither failure was loud:
 *
 *  - the first version was a single file, and it aborted under plain Tailwind v4
 *    with `Cannot use @variant with unknown variant: light`, because Uniwind
 *    defines that variant and nothing else does;
 *  - patched by hand it then compiled *successfully and emitted no colour utility
 *    at all*, because the `@theme` registration that creates them is synthesised by
 *    Uniwind into its own node_modules.
 *
 * A green build and a colourless stylesheet. So this compiles the real file with
 * the real Tailwind, no Uniwind anywhere, and looks at what comes out.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { compile } = require('tailwindcss') as {
  compile: (
    css: string,
    options: {
      base: string;
      loadStylesheet: (
        id: string,
        base: string,
      ) => Promise<{ path: string; base: string; content: string }>;
    },
  ) => Promise<{ build: (candidates: string[]) => string }>;
};

const TOKENS_PKG = resolve(__dirname, '../../../packages/design-tokens');
const TAILWIND = dirname(require.resolve('tailwindcss/package.json'));

/** The classes a consumer would most plausibly reach for first. */
const CANDIDATES = ['bg-grey-100', 'text-grey-700', 'p-s', 'gap-2xs', 'rounded-md'];

async function buildAsAnOutsideConsumerWould(): Promise<string> {
  const compiler = await compile("@import 'tailwindcss';\n@import './theme.standalone.css';\n", {
    base: TOKENS_PKG,
    loadStylesheet: async (id, base) => {
      // The only two things a consumer imports: Tailwind itself and this package.
      const path = id === 'tailwindcss' ? resolve(TAILWIND, 'index.css') : resolve(base, id);
      return { path, base: dirname(path), content: readFileSync(path, 'utf8') };
    },
  });
  return compiler.build(CANDIDATES);
}

describe('the standalone theme, as a consumer outside this repo sees it', () => {
  let css: string;

  beforeAll(async () => {
    css = await buildAsAnOutsideConsumerWould();
  });

  it('compiles at all', () => {
    // The first failure mode: an unknown `light` variant aborted the build.
    expect(css.length).toBeGreaterThan(0);
  });

  it('emits colour utilities, not just the scales', () => {
    // The second, quieter failure mode: spacing and radius came through while
    // every colour was silently absent.
    expect(css).toMatch(/\.bg-grey-100\s*\{/);
    expect(css).toMatch(/\.text-grey-700\s*\{/);
  });

  it('carries the dark palette on both paths', () => {
    // A class on the root for an app that overrides the device, and the media
    // query for one that follows it. Losing either leaves half a dark mode.
    expect(css).toMatch(/where\(\.dark/);
    expect(css).toMatch(/prefers-color-scheme:\s*dark/);
    // #1a1a1a is grey-100's dark value — present means the palette, not just the
    // selectors, made it through.
    expect(css).toContain('#1a1a1a');
  });

  /**
   * There is deliberately no `rounded-s` collision check here.
   *
   * One was written and then removed: it passed whether or not `--radius: initial`
   * was in the theme, because `build()` emits only the candidates it is handed and
   * the duplicate side utility never arises on this path. A green assertion that
   * cannot fail is worse than none — the real guard is in tokens.test.ts, and that
   * one was confirmed red against a generator that stops emitting the line.
   */
});
