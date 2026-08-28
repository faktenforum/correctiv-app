import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Hairline, Typo } from '@/components/ui';
import { formatTimeHm } from '@correctiv/app-core/lib/format';
import { stop, togglePlay } from '@/lib/audio/player';
import { useAudio } from '@/lib/audio/useAudio';
import { sizes, useColors } from '@/lib/theme';

/**
 * The bar above the tab bar, for as long as audio is playing. It lives inside the
 * tab layout (as part of the `tabBar` composition), exactly as in the design draft:
 * a row above the tabs, not an overlay over the content.
 *
 * Subscribes to the whole audio state because it shows the position — two renders a
 * second, but only for this one row.
 */
export function MiniPlayer() {
  const colors = useColors();
  const { track, status, positionSec, durationSec, errorMessage } = useAudio();
  if (!track) return null;

  const live = track.kind === 'radio';
  const playing = status === 'playing';

  const subtitle = () => {
    if (status === 'loading') return 'Lädt …';
    if (status === 'error') return errorMessage ?? 'Fehler';
    if (live) return track.subtitle ?? '● LIVE';
    const total = durationSec > 0 ? ` / ${formatTimeHm(durationSec)}` : '';
    return `${formatTimeHm(positionSec)}${total}`;
  };

  return (
    <View className="bg-grey-100">
      <Hairline />
      <View className="flex-row items-center px-s py-2xs">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Pausieren' : 'Abspielen'}
          onPress={togglePlay}
          className="items-center justify-center rounded-full bg-emphasis active:opacity-80"
          style={{ width: sizes.iconButton, height: sizes.iconButton }}
        >
          {/* On the button's brand surface, so fixed white rather than the page's. */}
          {status === 'loading' ? (
            <ActivityIndicator color={colors['always-light']} />
          ) : (
            <Ionicons name={playing ? 'pause' : 'play'} size={18} color={colors['always-light']} />
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Player öffnen"
          onPress={() => router.push('/player')}
          className="ml-s flex-1 active:opacity-70"
        >
          <Typo variant="text-m" weight="semibold" numberOfLines={1}>
            {track.title}
          </Typo>
          <Typo variant="text-s" color={status === 'error' || live ? 'emphasis' : 'grey-500'}>
            {subtitle()}
          </Typo>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Wiedergabe beenden"
          onPress={stop}
          hitSlop={8}
          className="ml-2xs items-center justify-center active:opacity-70"
          style={{ width: sizes.iconButton, height: sizes.iconButton }}
        >
          <Ionicons name="close" size={20} color={colors['grey-600']} />
        </Pressable>
      </View>
    </View>
  );
}
