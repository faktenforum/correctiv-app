import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { Uniwind } from 'uniwind';

// The app's own stylesheet, in this document.
//
// Not a convenience: `bg-canvas` on a drawn component is resolved by the CSS
// Uniwind generates from THIS file, and the handbook's `styles/app.css` carries
// the same palette through Tailwind's standalone build for the site around it.
// Two stylesheets, one generator, and `apps/handbook/test/styles.test.ts` is what
// keeps this package from writing a third colour of its own.
import '@/global.css';
import { coreStore } from '@/lib/store/core';

import type { DirectSpecimen } from './direct';

/**
 * A device with no notch, stated rather than measured.
 *
 * `SafeAreaProvider` measures its own box and renders nothing until it has an
 * answer, which inside a card is a component that never appears. Handing it
 * metrics skips the measurement, and zero insets is the truth here: this is a
 * page, not a phone, and `SafeAreaView` on a page has nothing to avoid. Without
 * the provider at all, five components throw — `LoginGate`, `RecoveryScreen`,
 * `Screen`, `ScreenHeader` and `SafeAreaView` all reach `useSafeAreaInsets`,
 * which refuses rather than defaulting. Measured on 2026-09-11: those five, and
 * nothing else in the catalogue.
 */
const NO_INSETS = {
  frame: { x: 0, y: 0, width: 393, height: 852 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/**
 * The five things a component from `apps/mobile` needs before it will draw here.
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
 * 3. The store, under a `Provider`. ADR 0027 measured that no store is needed to
 *    *bundle* a component and that `useColors()` reads Uniwind rather than Redux,
 *    which is why two components shipped without one. It is needed to *mount* the
 *    thirty-odd that select from a slice — `MiniPlayer` reads `audio`, `ClubCard`
 *    reads `session` — and react-redux throws rather than degrading when there is
 *    no Provider above them. This is `apps/mobile`'s own instance, not a second
 *    one: the components' bound actions (`useCoreActions`) are bound to it.
 * 4. A safe-area provider, above.
 * 5. The ports, which are nobody's here. `packages/app-core`'s default platform is
 *    `createMemoryPlatform()`, so a thunk that reaches for storage or the bundle
 *    gets an empty answer instead of throwing. Nothing in a specimen dispatches
 *    one, and a component that started a fetch on mount would degrade rather than
 *    fail.
 */
export function DirectPreview({
  specimens,
  ground,
  width,
  labels = true,
}: {
  specimens: readonly DirectSpecimen[];
  /** Which of the app's two grounds to stand the specimens on. */
  ground: 'canvas' | 'surface';
  /** A CSS pixel cap on the drawing's column: a device width, or a card's own. */
  width?: number;
  /** Off on a card, where the component is the whole of what there is room for. */
  labels?: boolean;
}) {
  useUniwindFollowsTheSite();

  return (
    <Provider store={coreStore}>
      <SafeAreaProvider initialMetrics={NO_INSETS}>
        <div
          style={width === undefined ? undefined : { maxWidth: width }}
          className={ground === 'surface' ? 'bg-surface' : 'bg-canvas'}
        >
          {specimens.map((specimen) => (
            <div className="p-s" key={specimen.label}>
              {labels && (
                <p className="mb-2xs font-mono text-s text-on-canvas-muted">{specimen.label}</p>
              )}
              {/*
                A component that fills a screen has no height of its own inside a
                block box and collapses to nothing. The app's own gallery boxes the
                same specimens to the same `height`, which is why the number is the
                catalogue's rather than this file's.
              */}
              <div style={specimen.height === undefined ? undefined : { height: specimen.height }}>
                <SpecimenBoundary label={specimen.label}>{specimen.node}</SpecimenBoundary>
              </div>
            </div>
          ))}
        </div>
      </SafeAreaProvider>
    </Provider>
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
 * with it. It is also how `NOT_DRAWN` is measured: a component that lands here
 * is one this site cannot draw, and the message says why.
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
