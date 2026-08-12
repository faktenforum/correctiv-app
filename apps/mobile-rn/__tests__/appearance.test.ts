import { resolveAppearance } from '../src/lib/theme/appearance';

/**
 * The one rule the colour system cannot survive without: `'system'` must be resolved
 * to a concrete scheme before it reaches NativeWind.
 *
 * This is a regression test for a defect that shipped. Handing `'system'` through
 * left the app's JavaScript following the device while `darkMode: 'class'` waited
 * for a class nothing added, so `useColors()` returned the dark palette and
 * `bg-grey-100` stayed white — near-white text on a white page, on a build where
 * typecheck, lint, 141 tests, the Android build and the web export were all green.
 *
 * It also survived a browser walk, which is the part worth remembering: the walk
 * flipped the setting to `'dark'` explicitly and pinned the emulated
 * `prefers-color-scheme` to light, so it exercised both paths that work and neither
 * that breaks. The default — setting `'system'`, device dark — was never run.
 */
describe('appearance resolution', () => {
  it('never passes "system" on', () => {
    for (const device of ['light', 'dark', null, undefined, 'unspecified'] as const) {
      expect(resolveAppearance('system', device)).toMatch(/^(light|dark)$/);
    }
  });

  it('follows the device when the setting is "system"', () => {
    expect(resolveAppearance('system', 'dark')).toBe('dark');
    expect(resolveAppearance('system', 'light')).toBe('light');
  });

  it('lets an explicit setting override the device', () => {
    // A user who picks light on a dark phone means it — the reason the colour
    // system is `darkMode: 'class'` and not `darkMode: 'media'`.
    expect(resolveAppearance('light', 'dark')).toBe('light');
    expect(resolveAppearance('dark', 'light')).toBe('dark');
  });

  it('falls back to light while the device scheme is unknown', () => {
    // Null before React Native has resolved it, "unspecified" on a platform that
    // declines to answer. Neither is dark, and light is the app's default.
    expect(resolveAppearance('system', null)).toBe('light');
    expect(resolveAppearance('system', undefined)).toBe('light');
    expect(resolveAppearance('system', 'unspecified' as never)).toBe('light');
  });
});
