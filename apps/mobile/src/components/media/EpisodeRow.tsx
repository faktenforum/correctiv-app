import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Badge, Typo } from '@/components/ui';
import { useEpisodeStatus } from '@/lib/audio/useAudio';
import { sizes, useColors } from '@/lib/theme';

/**
 * One episode in a list: play/pause on the left, title and meta, club mark on the
 * right.
 *
 * The state arrives through `useEpisodeStatus(id)` — a primitive value, so that a
 * ticking position does not re-render every row in the list twice a second.
 */
export function EpisodeRow({
  episodeId,
  title,
  meta,
  club = false,
  onPress,
}: {
  episodeId: string;
  title: string;
  meta: string;
  club?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const status = useEpisodeStatus(episodeId);
  const playing = status === 'playing';
  const loading = status === 'loading';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={playing ? `${title} pausieren` : `${title} abspielen`}
      className="flex-row items-center border-b border-stroke py-s active:opacity-70"
    >
      <View
        className="mr-s items-center justify-center rounded-full bg-surface"
        style={{ width: sizes.iconButtonSmall, height: sizes.iconButtonSmall }}
      >
        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <Ionicons
            name={playing ? 'pause' : 'play'}
            size={16}
            color={status === 'off' ? colors['on-canvas'] : colors.accent}
          />
        )}
      </View>
      <View className="flex-1 pr-s">
        <Typo variant="text-m" weight="semibold" numberOfLines={2}>
          {title}
        </Typo>
        <Typo variant="text-s" color="grey-500" className="mt-4xs">
          {meta}
        </Typo>
      </View>
      {club && <Badge label="Club" tone="club" />}
    </Pressable>
  );
}
