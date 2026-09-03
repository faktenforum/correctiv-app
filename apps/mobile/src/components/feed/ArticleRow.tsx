import { Pressable, View } from 'react-native';

import { Typo } from '@/components/ui';
import { formatDateDe } from '@correctiv/app-core/lib/format';
import type { FeedItem } from '@correctiv/app-core/types/models';

/** Compact list row for "Neueste Recherchen": title plus meta, no image. */
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
      {/* Two colours, so this cannot be one string like the other meta lines
          (`[a, b].join(' · ')`). The separator therefore has to carry its own
          spacing: a flex `gap` sits only BEFORE it, which left 6px on one side of the
          middot and the 4px of a space character on the other — visibly off-centre.
          Row gap only, and a space either side inside the text. */}
      <View className="mt-3xs flex-row flex-wrap items-center gap-y-2xs">
        {item.author ? (
          <Typo variant="text-s" color="grey-600">
            {item.author}
          </Typo>
        ) : null}
        {item.publishedAt ? (
          <Typo variant="text-s" color="grey-500">
            {item.author ? ' · ' : ''}
            {formatDateDe(item.publishedAt)}
          </Typo>
        ) : null}
      </View>
    </Pressable>
  );
}
