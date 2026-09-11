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

import type { DirectEntry } from './direct';

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
 * 3. Nothing else. Not a Redux store, not a router, not a `Provider`: those are
 *    runtime preconditions for the components that read them, and neither of the
 *    two drawn here does.
 */
export function DirectPreview({
  entry,
  ground = 'canvas',
}: {
  entry: DirectEntry;
  /** Which of the app's two grounds to stand the specimen on. */
  ground?: 'canvas' | 'surface';
}) {
  useUniwindFollowsTheSite();

  return (
    <div
      className={`rounded-md border border-stroke ${ground === 'surface' ? 'bg-surface' : 'bg-canvas'}`}
    >
      {entry.specimens.map((specimen) => (
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
 * Read off `<html>` rather than taken as a prop, because `theme.ts`'s
 * `useAppearance` is `useState` held in `App.tsx` and a second call to it would
 * be a second, independent setting. The class is the one thing both halves can
 * see: `dark` or `light` when the reader chose one, neither when the setting is
 * "System" — which is `setTheme('system')` here, and is Uniwind's own adaptive
 * mode following `prefers-color-scheme`. That is the fourth combination in
 * TROUBLESHOOTING.md, and the one that has shipped broken before.
 */
function useUniwindFollowsTheSite(): void {
  const [theme, setTheme] = useState(siteTheme);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setTheme(siteTheme()));
    observer.observe(root, { attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    Uniwind.setTheme(theme);
  }, [theme]);
}

function siteTheme(): 'light' | 'dark' | 'system' {
  const classes = document.documentElement.classList;
  if (classes.contains('dark')) return 'dark';
  if (classes.contains('light')) return 'light';
  return 'system';
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
