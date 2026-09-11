import { useCallback, useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

const KEY = 'handbook:appearance';

/**
 * Three states, not two, and "system" is the default.
 *
 * `TROUBLESHOOTING.md` numbers four appearance combinations and says the fourth,
 * the system setting against a dark device, is the app's default and the one that
 * has already shipped broken. A two-state toggle cannot express it, so this site
 * offers the same three the app does and puts no class on the root for "system",
 * which is what lets `prefers-color-scheme` decide.
 */
export function useAppearance(): [Appearance, (next: Appearance) => void] {
  const [appearance, setAppearance] = useState<Appearance>(storedAppearance);

  useEffect(() => {
    // A class, not an attribute, because that is what the token package's `light`
    // and `dark` variants key off, and the app sets the same one. Two mechanisms
    // for one setting is how the site and the app it frames end up disagreeing
    // about which scheme is on screen.
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (appearance !== 'system') root.classList.add(appearance);
    try {
      if (appearance === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, appearance);
    } catch {
      // A private window, or site data switched off. The setting simply does not
      // survive the tab, which is better than the page failing to render.
    }
  }, [appearance]);

  return [appearance, useCallback((next: Appearance) => setAppearance(next), [])];
}

/**
 * The setting as the reader last left it, which is the only reading of it that
 * cannot have been written by something else.
 *
 * Exported because `components/DirectPreview.tsx` needs the same answer and must
 * not get it from the class on `<html>`: Uniwind writes that class itself, and a
 * reader of it would mistake Uniwind's output for the reader's choice. The class
 * says which scheme is on screen; this says which of the three the reader asked
 * for, and only for "system" are those two different questions.
 */
export function storedAppearance(): Appearance {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // See above. Falling through to the default is the correct answer here.
  }
  return 'system';
}
