// The audio scrubber, with the fill sized instead of scaled.
//
// `components/player/ProgressBar.tsx` on the phone draws a full-width fill and
// squeezes it with `transform: [{ scaleX: ratio }]`, and its own comment says why:
// width is a layout property, the position ticks twice a second for as long as audio
// plays, and scaling is a transform the compositor applies without measuring
// anything. On a phone that is the right trade.
//
// IT CANNOT BE TAKEN HERE, and the refusal is not about performance. A transform on
// GTK is a `Gsk` render node rather than a widget property — `@gjsify/react-native`'s
// support table says so by name — and the style partition refuses the value on sight
// besides, because `transform` is an ARRAY and the partition reads numbers and
// strings. There is nothing for the layer to route it to.
//
// So the fill is sized, which is the thing the phone avoided. What that costs here is
// a layout pass per tick on a box four pixels tall inside a window that is not
// competing for frames, against a phone's whole scroll view. Measured on nothing,
// because it is not worth measuring: the alternative is no scrubber.
//
// A MODULE REDIRECT rather than a `.gtk.tsx` sibling, for the reason
// `gjsify.config.mjs` gives about `VideoFrame`: a sibling would have to live inside
// `apps/mobile/src`, where the app's typecheck and two of its recursive test guards
// would each need an exception for it.
//
// Everything else is the phone's, including the hit area and the accessibility props
// — `accessibilityValue` among them, which this host drops and names in
// `shims/react-native.tsx`.
import { useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';

export type ProgressBarProps = {
  positionSec: number;
  durationSec: number;
  onSeek: (seconds: number) => void;
};

/** The bar's own height, which is the design's and is why the fill needs no class. */
const TRACK_HEIGHT = 4;

export function ProgressBar({ positionSec, durationSec, onSeek }: ProgressBarProps) {
  const [width, setWidth] = useState(0);
  const ratio = durationSec > 0 ? Math.min(1, Math.max(0, positionSec / durationSec)) : 0;
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel="Wiedergabeposition"
      onLayout={onLayout}
      onPress={(event) => {
        if (width <= 0 || durationSec <= 0) return;
        const x = event.nativeEvent.locationX;
        onSeek((Math.min(width, Math.max(0, x)) / width) * durationSec);
      }}
      hitSlop={12}
      className="justify-center py-2xs"
    >
      <View className="overflow-hidden rounded-s bg-stroke" style={{ height: TRACK_HEIGHT }}>
        {/*
          A width in PIXELS, not a percentage: GTK has no percentage size, and the
          shim reports and drops one. `width` is 0 until the first `onLayout`, so the
          fill is absent for one frame rather than full width, which is the right way
          round for a bar that starts at zero anyway.
        */}
        <View
          className="bg-accent"
          style={{ height: TRACK_HEIGHT, width: Math.round(width * ratio) }}
        />
      </View>
    </Pressable>
  );
}
