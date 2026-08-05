import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { Typo } from '@/components/ui';
import type { PodcastSeries } from '@correctiv/app-core/data/podcasts';
import { colors } from '@/lib/theme';

/** Podcast-Kachel in der Serien-Schiene: quadratisches Cover, Titel, Herausgeber. */
export function SeriesTile({
  series,
  onPress,
}: {
  series: PodcastSeries;
  onPress: (series: PodcastSeries) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(series)}
      accessibilityRole="link"
      accessibilityLabel={series.title}
      className="w-32 active:opacity-80"
    >
      <View
        className="items-center justify-center overflow-hidden rounded-md bg-grey-200"
        style={{ aspectRatio: 1 }}
      >
        {series.imageUrl ? (
          <Image
            source={{ uri: series.imageUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <Ionicons name="mic-outline" size={28} color={colors['grey-500']} />
        )}
      </View>
      <Typo variant="text-s" weight="semibold" numberOfLines={2} className="mt-2xs">
        {series.title}
      </Typo>
      <Typo variant="text-s" color="grey-500">
        {series.publisher}
      </Typo>
    </Pressable>
  );
}
