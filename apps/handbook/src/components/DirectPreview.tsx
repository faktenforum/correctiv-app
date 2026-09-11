import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from 'react';
import { Uniwind } from 'uniwind';

// The app's own stylesheet, in this document.
//
// Not a convenience: `bg-canvas` on a drawn component is resolved by the CSS
// Uniwind generates from THIS file, and the handbook's `styles/app.css` carries
// the same palette through Tailwind's standalone build for the site around it.
// Two stylesheets, one generator, and `apps/handbook/test/styles.test.ts` is what
// keeps this package from writing a third colour of its own.
import '@/global.css';

import { storedAppearance, type Appearance } from '../theme';
import type { DirectSpecimen } from './direct';

/**
 * The three things a component from `apps/mobile` needs before it will draw here.
 *
 * 1. The app's CSS, imported above.
 * 2. Uniwind's runtime theme, set below — and this is the part that has already
 *    broken once. A `.dark` class on `<html>` flips the CSS variables and leaves
 *    `useUniwind().theme` at `light`, so a component that reads a colour in
 *    TypeScript keeps the light value on a dark page. Measured on 2026-09-11:
 *    `canvas` went to `#1a1a1a` while `Typo`'s colour stayed at `#333`, which is
 *    very nearly invisible. Uniwind reads the class exactly once, in its own
 *    module constructor, and the site's appearance setting changes afterwards.
 *    ADR 0027 records it; ADR 0008 records the same failure in the NativeWind era.
 *    Where the setting is read from is the other half of this, and it is not
 *    obvious; the hook below says why.
 * 3. Nothing else. Not a Redux store, not a router, not a `Provider`: those are
 *    runtime preconditions for the components that read them, and neither of the
 *    two drawn here does.
 */
export function DirectPreview({
  specimens,
  ground,
}: {
  specimens: readonly DirectSpecimen[];
  /** Which of the app's two grounds to stand the specimens on. */
  ground: 'canvas' | 'surface';
}) {
  useUniwindFollowsTheSite();

  return (
    <div
      className={`rounded-md border border-stroke ${ground === 'surface' ? 'bg-surface' : 'bg-canvas'}`}
    >
      {specimens.map((specimen) => (
        <div className="border-b border-stroke p-s last:border-b-0" key={specimen.label}>
          <p className="mb-2xs font-mono text-s text-on-canvas-muted">{specimen.label}</p>
          <SpecimenBoundary label={specimen.label}>{specimen.node}</SpecimenBoundary>
        </div>
      ))}
    </div>
  );
}

/**
 * The site's appearance, handed to Uniwind rather than merely painted as a class.
 *
 * Not read off `<html>`, and that is measured rather than stylistic. Uniwind
 * writes that class itself: `setTheme('system')` resolves the device scheme once
 * and stamps the answer back on the root as an explicit `light` or `dark`. A
 * reader of the class therefore reads Uniwind's own output, calls it the reader's
 * choice, and pins the site to whichever scheme the device had when the page
 * loaded. Measured on the built site on 2026-09-11, setting on System, device
 * light, then the device switched to dark: `/components` stayed white while `/`
 * and `/architecture` went dark. The class says what is on screen; the setting
 * says what was asked for, and "system" is the one value where those differ.
 *
 * So `storedAppearance()` is the value and the class change is only the signal
 * that it moved — `theme.ts` writes both, in that order, and nothing else writes
 * the stored one. Taken from there rather than as a prop because `useAppearance`
 * is `useState` held in `App.tsx`, and a second call to it would be a second,
 * independent setting.
 *
 * "System" is then re-applied whenever the device scheme moves, because Uniwind
 * resolves it once. That is the fourth combination in TROUBLESHOOTING.md, and the
 * one that has shipped broken before.
 */
function useUniwindFollowsTheSite(): void {
  const [theme, setTheme] = useState<Appearance>(storedAppearance);

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(storedAppearance()));
    observer.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    Uniwind.setTheme(theme);
    if (theme !== 'system') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const resolveAgain = () => Uniwind.setTheme('system');
    query.addEventListener('change', resolveAgain);
    return () => query.removeEventListener('change', resolveAgain);
  }, [theme]);
}

/**
 * One specimen's failure is one specimen's failure.
 *
 * `ui/Boundary.tsx` is keyed by route and replaces the whole view; a component
 * that throws while being drawn must not take the page it is being explained on
 * with it.
 */
class SpecimenBoundary extends Component<
  { children: ReactNode; label: string },
  { message: string | null }
> {
  state = { message: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[handbook] specimen failed', this.props.label, error, info.componentStack);
  }

  render() {
    if (this.state.message === null) return this.props.children;
    return <p className="text-s text-on-canvas-muted">Did not render: {this.state.message}</p>;
  }
}
