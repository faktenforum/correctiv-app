import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Badge, Typo } from '@/components/ui';
import { useEpisodeStatus } from '@/lib/audio/useAudio';
import { colors, sizes } from '@/lib/theme';

/**
 * Eine Folge in einer Liste: Play/Pause links, Titel und Meta, Club-Marke rechts.
 *
 * Der Zustand kommt über `useEpisodeStatus(id)` — ein primitiver Wert, damit nicht
 * jede Zeile der Liste zweimal pro Sekunde neu rendert, wenn die Position tickt.
 */
export function EpisodeRow({
  episodeId,
  title,
  meta,
  club = false,
  /** Extra line under the title, e.g. a club note. */
  metaSuffix,
  onPress,
}: {
  episodeId: string;
  title: string;
  meta: string;
  club?: boolean;
  metaSuffix?: string;
  onPress: () => void;
}) {
  const status = useEpisodeStatus(episodeId);
  const playing = status === 'playing';
  const loading = status === 'loading';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={playing ? `${title} pausieren` : `${title} abspielen`}
      className="flex-row items-center border-b border-grey-300 py-s active:opacity-70"
    >
      <View
        className="mr-s items-center justify-center rounded-full bg-grey-200"
        style={{ width: sizes.iconButtonSmall, height: sizes.iconButtonSmall }}
      >
        {loading ? (
          <ActivityIndicator color={colors.emphasis} />
        ) : (
          <Ionicons
            name={playing ? 'pause' : 'play'}
            size={16}
            color={status === 'off' ? colors['grey-700'] : colors.emphasis}
          />
        )}
      </View>
      <View className="flex-1 pr-s">
        <Typo variant="text-m" weight="semibold" numberOfLines={2}>
          {title}
        </Typo>
        <Typo variant="text-s" color="grey-500" className="mt-4xs">
          {metaSuffix ? `${meta} · ${metaSuffix}` : meta}
        </Typo>
      </View>
      {club && <Badge label="Club" tone="club" />}
    </Pressable>
  );
}
