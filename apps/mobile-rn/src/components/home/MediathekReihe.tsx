import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Badge, Thumbnail, Typo } from '@/components/ui';
import { useVideoChannel } from '@/lib/store/core';
import { colors, sizes } from '@/lib/theme';

/**
 * Home media row: video of the day (FunFacts) next to the live radio tile, half
 * and half as in the draft.
 *
 * Both tiles are light here — the dark treatment belongs to the radio banner on
 * the Mediathek screen, which is the place that promises sound. This row had the
 * two inverted, so Home shouted and Mediathek whispered.
 *
 * Via the core's media store, which routes FunFacts to CORRECTIV's PeerTube
 * instance. This app used to pull it from the YouTube Atom feed — the legacy
 * path the core's MEDIA_SOURCE map exists to correct.
 */
export function MediathekReihe({ onOpenMediathek }: { onOpenMediathek: () => void }) {
  const { videos } = useVideoChannel('funfacts');
  const video = videos[0];

  return (
    <View className="flex-row gap-s">
      <Pressable
        onPress={onOpenMediathek}
        accessibilityRole="link"
        accessibilityLabel={video?.title ?? 'Video des Tages'}
        className="flex-1 overflow-hidden rounded-md bg-grey-200 active:opacity-80"
      >
        <Thumbnail
          uri={video?.thumbnailUrl}
          aspectRatio={16 / 9}
          overlay={
            <View
              className="items-center justify-center rounded-full bg-grey-700/70"
              style={{ width: sizes.playOverlay, height: sizes.playOverlay }}
            >
              <Ionicons name="play" size={22} color={colors['grey-100']} />
            </View>
          }
        />
        <View className="p-s">
          <Badge label="FunFacts" tone="emphasis" className="mb-2xs" />
          <Typo variant="text-s" weight="semibold" numberOfLines={2}>
            {video?.title ?? 'Video des Tages'}
          </Typo>
        </View>
      </Pressable>

      <Pressable
        onPress={onOpenMediathek}
        accessibilityRole="link"
        accessibilityLabel="Salon5 Radio läuft"
        className="flex-1 justify-between rounded-md bg-grey-200 p-s active:opacity-80"
      >
        {/* The badge draws the dot itself — a literal ● in the label doubles it. */}
        <Badge label="Live" tone="live" />
        <View>
          <Ionicons name="radio-outline" size={24} color={colors['grey-600']} />
          <Typo variant="text-s" weight="semibold" className="mt-2xs">
            Salon5 Radio läuft
          </Typo>
          <Typo variant="text-s" color="grey-600">
            24/7 aus Bottrop · Tippen zum Hören
          </Typo>
        </View>
      </Pressable>
    </View>
  );
}
