import { Pressable, View } from 'react-native';

import { Typo } from '@/components/ui';
import { formatDateDe } from '@correctiv/app-core/lib/format';
import type { FeedItem } from '@correctiv/app-core/types/models';

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
        {item.author && (
          <Typo variant="text-s" color="grey-600">
            {item.author}
          </Typo>
        )}
        {item.publishedAt && (
          <Typo variant="text-s" color="grey-500">
            · {formatDateDe(item.publishedAt)}
          </Typo>
        )}
      </View>
    </Pressable>
  );
}
