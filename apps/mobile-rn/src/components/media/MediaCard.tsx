import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Thumbnail, Typo } from '@/components/ui';
import { formatDateShortDe, formatTimeHm } from '@correctiv/app-core/lib/format';
import type { Video } from '@correctiv/app-core/types/models';
import { colors, sizes } from '@/lib/theme';

/**
 * Video tile in a media rail: 16:9 preview with a play mark, title and date
 * below. The duration only ever comes from PeerTube — the YouTube Atom feed does
 * not carry it, so it is optional rather than a bogus "0 Min.".
 */
export function MediaCard({ video, onPress }: { video: Video; onPress: (video: Video) => void }) {
  const duration = video.durationSec ? formatTimeHm(video.durationSec) : null;

  return (
    <Pressable
      onPress={() => onPress(video)}
      accessibilityRole="link"
      accessibilityLabel={video.title}
      className="active:opacity-80"
      style={{ width: sizes.railCardMedia }}
    >
      <Thumbnail
        uri={video.thumbnailUrl}
        aspectRatio={16 / 9}
        icon="videocam-outline"
        className="rounded-md"
        overlay={
          <>
            <View
              className="items-center justify-center rounded-full bg-grey-700/70"
              style={{ width: sizes.playOverlay, height: sizes.playOverlay }}
            >
              <Ionicons name="play" size={22} color={colors['grey-100']} />
            </View>
            {duration && (
              <View className="absolute bottom-2xs right-2xs rounded-s bg-grey-700/80 px-3xs">
                <Typo variant="text-s" color="grey-100" style={{ fontSize: 11 }}>
                  {duration}
                </Typo>
              </View>
            )}
          </>
        }
      />
      <Typo variant="text-s" weight="semibold" numberOfLines={2} className="mt-2xs">
        {video.title}
      </Typo>
      <Typo variant="text-s" color="grey-500">
        {formatDateShortDe(video.publishedAt)}
      </Typo>
    </Pressable>
  );
}
