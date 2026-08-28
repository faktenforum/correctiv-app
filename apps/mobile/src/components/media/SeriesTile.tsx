import { Pressable } from 'react-native';

import { Thumbnail, Typo } from '@/components/ui';
import type { PodcastSeries } from '@correctiv/app-core/data/podcasts';
import { sizes } from '@/lib/theme';

/** Podcast tile in the series rail: square cover, title, publisher. */
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
      className="active:opacity-80"
      style={{ width: sizes.railTile }}
    >
      <Thumbnail uri={series.imageUrl} aspectRatio={1} icon="mic-outline" className="rounded-md" />
      <Typo variant="text-s" weight="semibold" numberOfLines={2} className="mt-2xs">
        {series.title}
      </Typo>
      <Typo variant="text-s" color="grey-500">
        {series.publisher}
      </Typo>
    </Pressable>
  );
}
