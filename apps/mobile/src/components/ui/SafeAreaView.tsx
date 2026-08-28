import { SafeAreaView as Upstream } from 'react-native-safe-area-context';
import { withUniwind } from 'uniwind';

/**
 * `SafeAreaView` with `className` support.
 *
 * Uniwind rewrites imports of `react-native` to its own components, so the core
 * primitives take a `className` without anyone doing anything. A third-party
 * component is not rewritten, and this one is not a `View` underneath — it renders
 * a native `RNCSafeAreaView` — so a `className` on it would simply be dropped, and
 * dropped silently: the screen would render, unstyled, with a green build.
 *
 * `withUniwind` maps `className` to `style`, which this component does accept.
 *
 * Import it from here rather than from the package, and `onboarding.tsx` shows why
 * that matters even where no class is passed today: the two are interchangeable
 * until the moment someone adds one.
 */
export const SafeAreaView = withUniwind(Upstream);
