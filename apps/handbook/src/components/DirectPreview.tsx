import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from 'react';
// `react-native`, which this build aliases to `react-native-web` (vite.app.mjs).
// The stage boxes are views rather than divs because a specimen's own outermost
// element is laid out by its parent, and the app's parent is always a view: a
// view is a flex column that stretches its children, a `<div>` is a block box
// that does neither. Measured on 2026-09-11, with divs: `ui/Badge` and
// `participate/ClaimStatusTag` ran the full width of the column although both
// say `self-start`, because `align-self` means nothing to a child of a block
// box, and `ui/Chip` hugged its label where the app stretches it.
import { View } from 'react-native';

// THE APP'S OWN ENVIRONMENT, imported rather than reproduced.
//
// `apps/mobile/src/lib/env/AppEnvironment.tsx` is what `app/_layout.tsx` wraps
// the router in, and it is what this file wraps every specimen in: the app's
// stylesheet, its five font files, the store, the safe area, the gesture root and
// the appearance handed to Uniwind. One definition, two hosts (ADR 0006).
//
// This file used to hold its own list — a `Provider` and a `SafeAreaProvider` and
// an `import '@/global.css'` — and the list was short by exactly the things
// nobody had thought of. Measured on 2026-09-11: no font file was loaded at all,
// so every drawn component read in the browser's standard face, which is a serif,
// and every bold string drew at regular weight. `test/environment.test.ts` fails
// if a second list starts here.
import { AppEnvironment } from '@/lib/env/AppEnvironment';
import type { ThemeSetting } from '@/lib/theme';

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
 * One or more of the app's specimens, drawn in this site's React tree.
 *
 * What this file decides is the STAGE — which ground the specimen stands on, how
 * wide the column is, whether the label is shown, and that one specimen's fault
 * is one specimen's fault. What the app decides is everything inside
 * `AppEnvironment`, and the split is the point: a stage is this site's business
 * and an environment is the app's.
 *
 * Two things the environment does not supply, and both are deliberate:
 *
 * - **The ports, which are nobody's here.** `packages/app-core`'s default
 *   platform is `createMemoryPlatform()`, so a thunk that reaches for storage or
 *   the bundle gets an empty answer instead of throwing. Nothing in a specimen
 *   dispatches one, and a component that started a fetch on mount degrades rather
 *   than fails.
 * - **The store's persisted state.** `coreStore` is the app's own instance and
 *   the components' bound actions are bound to it, but nothing hydrates it here,
 *   so every slice is at its default. That is what a specimen wants: the props in
 *   the catalogue decide what is drawn, not whatever the last visit left on disk.
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
  const appearance = useSiteAppearance();

  return (
    <AppEnvironment appearance={appearance} insets={NO_INSETS}>
      <View
        style={width === undefined ? undefined : { maxWidth: width }}
        className={ground === 'surface' ? 'bg-surface' : 'bg-canvas'}
      >
        {specimens.map((specimen) => (
          <View className="p-s" key={specimen.label}>
            {labels && (
              <p className="mb-2xs font-mono text-s text-on-canvas-muted">{specimen.label}</p>
            )}
            {/*
              A component that fills a screen has no height of its own inside a
              block box and collapses to nothing. The app's own gallery boxes the
              same specimens to the same `height`, which is why the number is the
              catalogue's rather than this file's.
            */}
            <View style={specimen.height === undefined ? undefined : { height: specimen.height }}>
              <SpecimenBoundary label={specimen.label}>{specimen.node}</SpecimenBoundary>
            </View>
          </View>
        ))}
      </View>
    </AppEnvironment>
  );
}

/**
 * The site's appearance, read off `<html>` and handed to the app to apply.
 *
 * Read off the class rather than taken as a prop, because `theme.ts`'s
 * `useAppearance` is `useState` held in `App.tsx` and a second call to it would
 * be a second, independent setting. The class is the one thing both halves can
 * see: `dark` or `light` when the reader chose one, neither when the setting is
 * "System" — which is the app's `'system'`, Uniwind's own adaptive mode following
 * `prefers-color-scheme`. That is the fourth combination in TROUBLESHOOTING.md,
 * and the one that has shipped broken before.
 *
 * **Read here and applied there.** A `.dark` class on `<html>` flips the CSS
 * variables and leaves `useUniwind().theme` at `light`, so a component that reads
 * a colour in TypeScript keeps the light value on a dark page. Measured on
 * 2026-09-11: `canvas` went to `#1a1a1a` while `Typo`'s colour stayed at `#333`,
 * which is very nearly invisible. Uniwind reads the class exactly once, in its
 * own module constructor, and the site's appearance setting changes afterwards.
 * ADR 0027 records it; ADR 0008 records the same failure in the NativeWind era.
 * The call that fixes it is `lib/theme/appearance.ts`'s, in the app, where the
 * app's own setting reaches Uniwind through the same line.
 */
function useSiteAppearance(): ThemeSetting {
  const [appearance, setAppearance] = useState(siteTheme);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setAppearance(siteTheme()));
    observer.observe(root, { attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return appearance;
}

function siteTheme(): ThemeSetting {
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
