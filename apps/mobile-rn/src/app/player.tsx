import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProgressBar } from '@/components/player/ProgressBar';
import { Typo } from '@/components/ui';
import { formatTimeHm } from '@correctiv/app-core/lib/format';
import { seekTo, setSpeed, togglePlay } from '@/lib/audio/player';
import { useAudio } from '@/lib/audio/useAudio';
import { colors } from '@/lib/theme';

const SPEEDS = [1, 1.2, 1.5];

/**
 * Vollplayer (Modal). Zeigt denselben Singleton wie die Mini-Leiste — es gibt keinen
 * zweiten Zustand und keine zweite Instanz, das Modal ist nur eine größere Ansicht.
 */
export default function PlayerScreen() {
  const { track, status, positionSec, durationSec, speed, errorMessage } = useAudio();
  const live = track?.kind === 'radio';

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-grey-100">
      <View className="flex-row px-s py-2xs">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Player schließen"
          onPress={() => router.back()}
          hitSlop={8}
          className="h-10 w-10 items-center justify-center active:opacity-70"
        >
          <Ionicons name="close" size={24} color={colors['grey-700']} />
        </Pressable>
      </View>

      {!track ? (
        <View className="flex-1 items-center justify-center px-m">
          <Typo variant="text-m" color="grey-600">
            Es läuft gerade nichts.
          </Typo>
        </View>
      ) : (
        <>
          <View className="flex-1 justify-center px-m">
            <View
              className="items-center justify-center self-center rounded-md bg-grey-200"
              style={{ width: 180, height: 180 }}
            >
              <Ionicons
                name={live ? 'radio' : 'headset'}
                size={56}
                color={live ? colors.emphasis : colors['grey-500']}
              />
            </View>
            <Typo variant="headline-l" className="mt-m">
              {track.title}
            </Typo>
            <Typo variant="text-s" color={live ? 'emphasis' : 'grey-600'} className="mt-2xs">
              {live ? '● LIVE — 24/7 aus Bottrop' : (track.subtitle ?? '')}
            </Typo>
            {status === 'error' && (
              <Typo variant="text-s" color="emphasis" className="mt-s">
                {errorMessage}
              </Typo>
            )}
          </View>

          <View className="px-m pb-m">
            {live ? (
              <Typo variant="text-s" color="grey-600" className="mb-s">
                Livestream — Salon5 sendet rund um die Uhr.
              </Typo>
            ) : (
              <>
                <ProgressBar
                  positionSec={positionSec}
                  durationSec={durationSec}
                  onSeek={(seconds) => void seekTo(seconds)}
                />
                <View className="flex-row justify-between">
                  <Typo variant="text-s" color="grey-500">
                    {formatTimeHm(positionSec)}
                  </Typo>
                  <Typo variant="text-s" color="grey-500">
                    {formatTimeHm(durationSec)}
                  </Typo>
                </View>
              </>
            )}

            <View className="mt-s flex-row items-center justify-center">
              {!live && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Geschwindigkeit wechseln"
                  onPress={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}
                  hitSlop={8}
                  className="absolute left-0 active:opacity-70"
                >
                  <Typo variant="text-m" weight="semibold" color="grey-600">
                    {speed}×
                  </Typo>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={status === 'playing' ? 'Pausieren' : 'Abspielen'}
                onPress={togglePlay}
                className="h-16 w-16 items-center justify-center rounded-full bg-emphasis active:opacity-80"
              >
                {status === 'loading' ? (
                  <ActivityIndicator color={colors['grey-100']} />
                ) : (
                  <Ionicons
                    name={status === 'playing' ? 'pause' : 'play'}
                    size={28}
                    color={colors['grey-100']}
                  />
                )}
              </Pressable>
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
