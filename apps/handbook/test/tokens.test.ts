import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ROOT } from '../plugin/collect';
import { tokenCss } from '../plugin/tokens';

const source = readFileSync(join(ROOT, 'packages/design-tokens/theme.css'), 'utf8');
const css = tokenCss(source);

const ROLES = [
  'canvas',
  'surface',
  'on-canvas',
  'on-canvas-muted',
  'stroke',
  'stroke-strong',
  'accent',
  'accent-alt',
];

/** The declarations inside the first block whose selector contains `selector`. */
function block(selector: string): Record<string, string> {
  const at = css.indexOf(selector);
  if (at === -1) throw new Error(`the generated palette has no ${selector} block`);
  const open = css.indexOf('{', at);
  const close = css.indexOf('}', open);
  const out: Record<string, string> = {};
  for (const [, name, value] of css.slice(open, close).matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    out[name] = value.trim();
  }
  return out;
}

describe('the palette, generated from the token package', () => {
  it('defines every role on bare :root, so none is only inside a media query', () => {
    // A role whose only definition sits in `@media (prefers-color-scheme: dark)`
    // is undefined for every light reader, and the page inherits whatever the
    // browser felt like. The site would look broken in exactly one scheme.
    const root = block(':root {');
    const undefined_ = ROLES.filter((role) => !/^#[0-9a-f]{6}$/.test(root[role] ?? ''));
    expect(undefined_).toEqual([]);
  });

  it('redefines every role for dark under both the media query and the attribute', () => {
    // Both, or the toggle only works in one direction: the media block alone
    // cannot be overridden back to dark on a light device, and the attribute
    // block alone leaves the default "system" setting painting light on a dark
    // phone, which is this project's already-shipped-broken combination.
    const missing: string[] = [];
    for (const selector of [":root:not([data-theme='light'])", ":root[data-theme='dark']"]) {
      const dark = block(selector);
      for (const role of ROLES) {
        if (!/^#[0-9a-f]{6}$/.test(dark[role] ?? '')) missing.push(`${selector} ${role}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("carries the dark scheme's own brand red rather than the light one", () => {
    /**
     * The assertion this file exists for.
     *
     * A hand-written copy of these values had `--accent` identical in both
     * schemes, because "the brand colour does not change" is the obvious
     * assumption and it is wrong here: the generated theme lightens the red for
     * contrast on a dark ground. Reading the values instead of copying them is
     * what makes that impossible to get wrong, and this pins the difference so a
     * future refactor back to a literal fails.
     */
    const light = block(':root {');
    const dark = block(":root[data-theme='dark']");
    expect(dark.accent).not.toBe(light.accent);

    // And both really are the package's, not this test's idea of them.
    expect(source).toContain(`--color-accent: ${light.accent};`);
    expect(source).toContain(`--color-accent: ${dark.accent};`);
  });

  it('fails loudly when the package stops defining a role', () => {
    // Silence is the danger: a renamed upstream token would otherwise emit
    // `--canvas: undefined` and every surface on the site would go transparent.
    const without = source.replace(/--color-canvas\s*:\s*[^;]+;/g, '');
    expect(() => tokenCss(without)).toThrow(/--color-canvas/);
  });

  it('reads the whole variant block, not just up to its first nested rule', () => {
    // Brace counting rather than a non-greedy regex. `stroke-strong` is declared
    // after the nested at-rules in the generated file, so a regex that stopped at
    // the first `}` would drop it and this is what would catch that.
    expect(block(":root[data-theme='dark']")['stroke-strong']).toBe('#7c7c7c');
  });
});
