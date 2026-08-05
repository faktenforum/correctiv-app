import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { Badge, Typo } from '@/components/ui';
import { FEEDS } from '@correctiv/app-core/data/feeds.config';
import type { FeedItem } from '@correctiv/app-core/types/models';

import { useOgImage } from '@/lib/articles/useOgImage';

/** Große Top-Recherche auf Home: Titelbild (og:image nachgeladen) + Serif-Headline. */
export function ArticleHero({
  item,
  onPress,
}: {
  item: FeedItem;
  onPress: (item: FeedItem) => void;
}) {
  const image = useOgImage(item.url, item.imageUrl ?? undefined);
  const badge = FEEDS[item.feed]?.badge;

  return (
    <Pressable onPress={() => onPress(item)} className="active:opacity-90">
      <View className="overflow-hidden rounded-md bg-grey-200">
        <Image
          source={image ? { uri: image } : undefined}
          style={{ width: '100%', aspectRatio: 16 / 9 }}
          contentFit="cover"
          transition={200}
        />
      </View>
      {badge && <Badge label={badge} tone="emphasis" className="mt-s" />}
      <Typo variant="headline-l" className="mt-2xs">
        {item.title}
      </Typo>
      {item.teaser.length > 0 && (
        <Typo variant="text-m" color="grey-600" className="mt-2xs" numberOfLines={3}>
          {item.teaser}
        </Typo>
      )}
    </Pressable>
  );
}
