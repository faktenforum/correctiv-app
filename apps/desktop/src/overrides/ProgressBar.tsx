// The audio scrubber, as the widget GTK already has for it.
//
// `components/player/ProgressBar.tsx` on the phone draws a full-width fill and
// squeezes it with `transform: [{ scaleX: ratio }]`, for the reason its own comment
// gives: width is a layout property, the position ticks twice a second for as long as
// audio plays, and a transform is something the compositor applies without measuring.
// On a phone that is the right trade. Here a transform is a `Gsk` render node rather
// than a widget property and the style partition refuses the value on sight, so the
// technique is simply unavailable.
//
// THE FIRST VERSION OF THIS FILE SIZED THE FILL IN PIXELS OFF `onLayout`, AND DREW
// NOTHING AT ALL. `onLayout` is refused by the layer — allocation is
// `vfunc_size_allocate`, a subclass override, and only the layer owns those subclasses
// — so `shims/react-native.tsx` drops it, the measured width stayed 0 for the whole
// session, and `width: Math.round(width * ratio)` was permanently 0. Both sweeps
// reported `ok`, because an invisible widget throws nothing. That is the exact failure
// shape this host exists to refuse, and it shipped for an hour. `answered-props.ts` now
// carries `onLayout` so the next component that reaches for a measurement fails in
// `npm run check` instead.
//
// `Gtk.LevelBar` IS THE ANSWER, and it is better than what it replaces on three
// counts. It needs no measurement: `value` between `min-value` and `max-value` is the
// whole API, and the widget draws its own fill. It is themed, so the brand accent the
// application already gives Adwaita is the colour it fills with, rather than a hand-set
// `bg-accent` that would have to be kept in step. And it implements
// `Gtk.AccessibleRange`, so `VALUE_NOW`/`VALUE_MIN`/`VALUE_MAX` reach a screen reader
// from the toolkit — which is the one thing `shims/react-native.tsx` has to drop from
// the phone's `accessibilityValue` and names as a real loss. Here it is not lost.
//
// WHAT IS LOST IS SEEKING, and it is named rather than half-built. The phone reads
// `event.nativeEvent.locationX` off a press to turn a tap into a position; the layer
// does not carry pointer coordinates (`Gtk.GestureClick`, tier P3), so a `Pressable`
// here could only ever seek to a number it had guessed. `Gtk.Scale` is GTK's own answer
// and would seek natively, but it needs a `value-changed` signal routed back out, which
// is a seam in the layer rather than a line in an application. So this shows the
// position and does not accept one, and `onSeek` is accepted and unused.
//
// A MODULE REDIRECT rather than a `.gtk.tsx` sibling, for the reason
// `gjsify.config.mjs` gives about `VideoFrame`: a sibling would have to live inside
// `apps/mobile/src`, where the app's typecheck and two of its recursive test guards
// would each need an exception for it.
import { View } from 'react-native';

export type ProgressBarProps = {
  positionSec: number;
  durationSec: number;
  onSeek: (seconds: number) => void;
};

/** The bar's own height, which is the design's. */
const TRACK_HEIGHT = 4;

export function ProgressBar({ positionSec, durationSec, onSeek }: ProgressBarProps) {
  // Accepted and unused; the header says why there is nothing to call it with.
  void onSeek;

  // `max-value` is never 0: a `Gtk.LevelBar` with an empty interval has nothing to
  // divide by, and a live stream reports `durationSec: 0` for as long as it plays.
  // One second of interval with a value of 0 is an empty bar, which is what "we do
  // not know how long this is" should look like.
  const span = durationSec > 0 ? durationSec : 1;
  const value = Math.min(span, Math.max(0, positionSec));

  return (
    <View className="py-2xs">
      <gtk-level-bar
        mode="continuous"
        min-value={0}
        max-value={span}
        value={value}
        height-request={TRACK_HEIGHT}
      />
    </View>
  );
}
