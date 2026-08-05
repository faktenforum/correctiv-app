import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Badge, Card, Screen, Typo } from '@/components/ui';
import { colors } from '@/lib/theme';
import { useRadio } from '@/lib/audio/useRadio';

export default function MediathekScreen() {
  const { playing, toggle } = useRadio();

  return (
    <Screen>
      <Typo variant="headline-xl" className="mb-2xs">
        Mediathek
      </Typo>
      <Typo variant="text-m" color="grey-600" className="mb-m">
        Alles Hörbare und Sehbare an einem Ort.
      </Typo>

      {/* Live-Banner — Salon5 Radio (Icecast). Seed des persistenten Players (M3). */}
      <Card tone="surface" className="mb-m flex-row items-center justify-between">
        <View className="flex-1 pr-s">
          <Badge label="● Live" tone="live" className="mb-2xs" />
          <Typo variant="headline-s">Salon5 Radio</Typo>
          <Typo variant="text-s" color="grey-600">
            24/7 aus Bottrop
          </Typo>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Radio pausieren' : 'Radio abspielen'}
          onPress={toggle}
          className="h-12 w-12 items-center justify-center rounded-full bg-emphasis active:opacity-80">
          <Ionicons name={playing ? 'pause' : 'play'} size={22} color={colors['grey-100']} />
        </Pressable>
      </Card>
    </Screen>
  );
}
