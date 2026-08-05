import { Pressable, View } from 'react-native';

import { Typo } from '@/components/ui';
import type { FeedItem } from '@/lib/models';
import { formatDate } from '@/lib/format';

/** Kompakte Listenzeile für „Neueste Recherchen" — Titel (Serif) + Meta, ohne Bild. */
export function ArticleRow({
  item,
  onPress,
}: {
  item: FeedItem;
  onPress: (item: FeedItem) => void;
}) {
  return (
    <Pressable onPress={() => onPress(item)} className="py-s active:opacity-70">
      <Typo variant="headline-s" numberOfLines={3}>
        {item.title}
      </Typo>
      <View className="mt-3xs flex-row flex-wrap items-center gap-2xs">
        {item.authors[0] && (
          <Typo variant="text-s" color="grey-600">
            {item.authors[0]}
          </Typo>
        )}
        {item.publishedAt && (
          <Typo variant="text-s" color="grey-500">
            · {formatDate(item.publishedAt)}
          </Typo>
        )}
      </View>
    </Pressable>
  );
}
