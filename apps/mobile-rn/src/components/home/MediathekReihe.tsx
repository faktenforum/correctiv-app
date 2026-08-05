import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { Badge, Typo } from '@/components/ui';
import { useVideos } from '@/lib/feeds/useFeed';
import { colors } from '@/lib/theme';

/** Home-Mediathek-Reihe: Video des Tages (FunFacts, LIVE) + Live-Radio-Kachel. */
export function MediathekReihe({ onOpenMediathek }: { onOpenMediathek: () => void }) {
  const { data } = useVideos('funfacts');
  const video = data?.[0];

  return (
    <View className="flex-row gap-s">
      <Pressable
        onPress={onOpenMediathek}
        className="flex-1 overflow-hidden rounded-md bg-grey-200 active:opacity-80"
      >
        <View className="bg-grey-300" style={{ aspectRatio: 16 / 9 }}>
          {video?.thumbnailUrl ? (
            <Image
              source={{ uri: video.thumbnailUrl }}
              style={{ flex: 1 }}
              contentFit="cover"
              transition={200}
            />
          ) : null}
        </View>
        <View className="p-s">
          <Badge label="FunFacts" tone="emphasis" className="mb-2xs" />
          <Typo variant="text-s" numberOfLines={2}>
            {video?.title ?? 'Video des Tages'}
          </Typo>
        </View>
      </Pressable>

      <Pressable
        onPress={onOpenMediathek}
        className="w-36 justify-between rounded-md bg-grey-700 p-s active:opacity-80"
      >
        <Badge label="● Live" tone="live" />
        <View>
          <Ionicons name="radio-outline" size={24} color={colors['grey-100']} />
          <Typo variant="text-s" color="grey-100" className="mt-2xs">
            Salon5 Radio läuft
          </Typo>
        </View>
      </Pressable>
    </View>
  );
}
