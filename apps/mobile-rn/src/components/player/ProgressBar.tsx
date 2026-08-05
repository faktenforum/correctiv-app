import { useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';

/**
 * Fortschritt mit Tippen zum Springen.
 *
 * Bewusst kein Slider: React Native hat keinen mehr, `@react-native-community/slider`
 * wäre eine neue Abhängigkeit ohne Web-Implementierung, und der Slider aus `@expo/ui`
 * ist nativ (SwiftUI/Compose) und fällt auf Web weg. Tippen an eine Position trägt
 * auf allen drei Targets und ist für einen Demo-Player genug — Ziehen fehlt, das ist
 * der bewusste Preis.
 */
export function ProgressBar({
  positionSec,
  durationSec,
  onSeek,
}: {
  positionSec: number;
  durationSec: number;
  onSeek: (seconds: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const ratio = durationSec > 0 ? Math.min(1, Math.max(0, positionSec / durationSec)) : 0;

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel="Wiedergabeposition"
      accessibilityValue={{ min: 0, max: Math.round(durationSec), now: Math.round(positionSec) }}
      onLayout={onLayout}
      onPress={(event) => {
        if (width <= 0 || durationSec <= 0) return;
        const x = event.nativeEvent.locationX;
        onSeek((Math.min(width, Math.max(0, x)) / width) * durationSec);
      }}
      // Große Trefferfläche um einen dünnen Balken.
      hitSlop={12}
      className="justify-center py-2xs"
    >
      <View className="overflow-hidden rounded-s bg-grey-300" style={{ height: 4 }}>
        <View className="h-full bg-emphasis" style={{ width: `${ratio * 100}%` }} />
      </View>
    </Pressable>
  );
}
