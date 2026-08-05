import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Hairline, Typo } from '@/components/ui';
import { formatTimeHm } from '@correctiv/app-core/lib/format';
import { stop, togglePlay } from '@/lib/audio/player';
import { useAudio } from '@/lib/audio/useAudio';
import { colors } from '@/lib/theme';

/**
 * Die Leiste über der Tab-Bar, solange Audio läuft. Sitzt im Tab-Layout (als Teil
 * des `tabBar`-Aufbaus), genau wie im Designentwurf: eine Zeile über den Tabs, kein
 * Overlay über dem Inhalt.
 *
 * Abonniert den vollen Zustand, weil sie die Position zeigt — das sind zwei Renders
 * pro Sekunde, aber nur für diese eine Zeile.
 */
export function MiniPlayer() {
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
          className="h-10 w-10 items-center justify-center rounded-full bg-emphasis active:opacity-80"
        >
          {status === 'loading' ? (
            <ActivityIndicator color={colors['grey-100']} />
          ) : (
            <Ionicons name={playing ? 'pause' : 'play'} size={18} color={colors['grey-100']} />
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
          className="ml-2xs h-10 w-10 items-center justify-center active:opacity-70"
        >
          <Ionicons name="close" size={20} color={colors['grey-600']} />
        </Pressable>
      </View>
    </View>
  );
}
