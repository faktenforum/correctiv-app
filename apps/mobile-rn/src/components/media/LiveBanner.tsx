import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Badge, Card, Typo } from '@/components/ui';
import { playRadio, stop } from '@/lib/audio/player';
import { useRadioState } from '@/lib/audio/useAudio';
import { colors } from '@/lib/theme';

/**
 * Salon5-Live-Banner. Steuert den Audio-Singleton, keinen eigenen Player — sonst
 * gäbe es zwei Instanzen für denselben Stream, und der Vorgänger (`useRadio`) tat
 * genau das.
 */
export function LiveBanner({ subtitle = '24/7 aus Bottrop' }: { subtitle?: string }) {
  const state = useRadioState();
  const busy = state === 'loading';
  const playing = state === 'playing';

  return (
    <Card tone="surface" className="flex-row items-center justify-between">
      <View className="flex-1 pr-s">
        <Badge label="● Live" tone="live" className="mb-2xs" />
        <Typo variant="headline-s">Salon5 Radio</Typo>
        <Typo variant="text-s" color="grey-600">
          {state === 'error' ? 'Stream nicht erreichbar' : subtitle}
        </Typo>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Radio pausieren' : 'Radio abspielen'}
        onPress={() => (playing || busy ? stop() : playRadio())}
        className="h-12 w-12 items-center justify-center rounded-full bg-emphasis active:opacity-80"
      >
        {busy ? (
          <ActivityIndicator color={colors['grey-100']} />
        ) : (
          <Ionicons name={playing ? 'pause' : 'play'} size={22} color={colors['grey-100']} />
        )}
      </Pressable>
    </Card>
  );
}
