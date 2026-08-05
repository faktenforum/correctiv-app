import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { Typo } from '@/components/ui';
import { formatDateShortDe, formatTimeHm } from '@correctiv/app-core/lib/format';
import type { Video } from '@correctiv/app-core/types/models';
import { colors } from '@/lib/theme';

/**
 * Video-Kachel in einer Medien-Schiene: 16:9-Vorschaubild mit Play-Marke,
 * darunter Titel und Datum. Die Dauer kommt nur von PeerTube — der YouTube-
 * Atom-Feed liefert sie nicht, deshalb ist sie optional und nicht „0 Min.".
 */
export function MediaCard({ video, onPress }: { video: Video; onPress: (video: Video) => void }) {
  const duration = video.durationSec ? formatTimeHm(video.durationSec) : null;

  return (
    <Pressable
      onPress={() => onPress(video)}
      accessibilityRole="link"
      accessibilityLabel={video.title}
      className="w-64 active:opacity-80"
    >
      <View className="overflow-hidden rounded-md bg-grey-300" style={{ aspectRatio: 16 / 9 }}>
        {video.thumbnailUrl ? (
          <Image
            source={{ uri: video.thumbnailUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={200}
          />
        ) : null}
        <View className="absolute inset-0 items-center justify-center">
          <View
            className="items-center justify-center rounded-full bg-grey-700/70"
            style={{ width: 40, height: 40 }}
          >
            <Ionicons name="play" size={18} color={colors['grey-100']} />
          </View>
        </View>
        {duration && (
          <View className="absolute bottom-2xs right-2xs rounded-s bg-grey-700/80 px-3xs">
            <Typo variant="text-s" color="grey-100" style={{ fontSize: 11 }}>
              {duration}
            </Typo>
          </View>
        )}
      </View>
      <Typo variant="text-s" weight="semibold" numberOfLines={2} className="mt-2xs">
        {video.title}
      </Typo>
      <Typo variant="text-s" color="grey-500">
        {formatDateShortDe(video.publishedAt)}
      </Typo>
    </Pressable>
  );
}
