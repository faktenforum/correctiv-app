import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Badge, Typo } from '@/components/ui';
import { playRadio, stop } from '@/lib/audio/player';
import { useRadioState } from '@/lib/audio/useAudio';
import { colors, sizes } from '@/lib/theme';

/**
 * The Salon5 live banner: dark card, big coral play button on the left, as in the
 * draft. It is the one surface on the Mediathek screen that promises sound, so it
 * is the one that gets the dark treatment — the tiles on Home stay light.
 *
 * Dark in BOTH schemes, hence `always-dark` and `always-light` rather than the grey
 * scale: on a surface that does not follow the appearance setting, text that does
 * would turn near-white on near-black in light mode and vanish in dark. Secondary
 * text is the same fixed colour dimmed — the convention for every fixed surface
 * here, so a second grey scale for dark surfaces is not needed.
 *
 * Drives the audio singleton, not a player of its own: otherwise there would be
 * two instances on the same stream, which is exactly what the predecessor
 * (`useRadio`) did.
 */
export function LiveBanner({ subtitle = '24/7 aus Bottrop' }: { subtitle?: string }) {
  const state = useRadioState();
  const busy = state === 'loading';
  const playing = state === 'playing';

  return (
    <View className="flex-row items-center rounded-md bg-always-dark p-s">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playing ? 'Radio pausieren' : 'Radio abspielen'}
        onPress={() => (playing || busy ? stop() : playRadio())}
        className="mr-s items-center justify-center rounded-full bg-emphasis active:opacity-80"
        style={{ width: sizes.playButton, height: sizes.playButton }}
      >
        {busy ? (
          <ActivityIndicator color={colors['always-light']} />
        ) : (
          <Ionicons name={playing ? 'pause' : 'play'} size={24} color={colors['always-light']} />
        )}
      </Pressable>
      <View className="flex-1">
        <Badge label="Live" tone="live" className="mb-4xs" />
        <Typo variant="headline-s" color="always-light">
          Salon5 Radio
        </Typo>
        <Typo variant="text-s" color="always-light" numberOfLines={2} className="opacity-70">
          {state === 'error' ? 'Stream nicht erreichbar' : subtitle}
        </Typo>
      </View>
    </View>
  );
}
