// `react-native-gesture-handler`, reduced to the one name the app imports.
//
// `GestureHandlerRootView` is used exactly once, in `app/_layout.tsx`, as
// `<GestureHandlerRootView style={{ flex: 1 }}>` around the whole tree. On the phone
// it installs the native gesture arbitration root. There is nothing to install here,
// and what the element does structurally — be a flex-1 container — is a `View`.
//
// The gesture SYSTEM is deliberately not shimmed. ADR 0032 lists `PanResponder` as
// P3 with the reason that GTK's gesture controllers exist but their arbitration
// model is not React Native's, so it is its own project. Anything past this one
// component should fail to import rather than resolve to something that silently
// never fires: a gesture handler that is never called is indistinguishable from a
// user who did not swipe.

import { View, type ViewProps } from 'react-native';

/**
 * A `View`, and deliberately WITHOUT the caller's `style`.
 *
 * The one call site passes `style={{ flex: 1 }}`, which on the phone is what makes
 * the root fill the screen. Here it is both unnecessary and an error: this element is
 * the outermost thing the React root renders, and `flex-1` is resolved against the
 * PARENT's orientation at attach time (ADR 0032 section 6) — at the root there is no
 * parent box to resolve against, so the layer refuses it by name:
 *
 *   <View> expand — carries layout that cannot be resolved at this position ...
 *   this element is the root of its tree
 *
 * That refusal is correct. The window's content box already fills the window, so
 * "fill the available space" is the behaviour with or without the prop. Dropping it
 * here rather than in the app's layout keeps the phone's file and this host's file
 * identical on the line that matters.
 */
export function GestureHandlerRootView({ style: _style, ...rest }: ViewProps) {
  return <View {...rest} />;
}

const refuse = (name: string) => () => {
  throw new Error(
    `[desktop] react-native-gesture-handler: "${name}" is not implemented on the GTK host. ` +
      "GTK has gesture controllers, but their arbitration model is not React Native's " +
      '(ADR 0032, PanResponder, tier P3). Only GestureHandlerRootView is answered here.',
  );
};

export const Gesture = refuse('Gesture');
export const GestureDetector = refuse('GestureDetector');
export const PanGestureHandler = refuse('PanGestureHandler');
export const TapGestureHandler = refuse('TapGestureHandler');
export const Swipeable = refuse('Swipeable');
