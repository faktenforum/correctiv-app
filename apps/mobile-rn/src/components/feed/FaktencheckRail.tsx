import { Pressable, ScrollView } from 'react-native';

import { Badge, Typo } from '@/components/ui';
import type { FeedItem } from '@correctiv/app-core/types/models';

/** Horizontal scrollbare Faktencheck-Karten (Home-Rail). */
export function FaktencheckRail({
  items,
  onPress,
}: {
  items: FeedItem[];
  onPress: (item: FeedItem) => void;
}) {
  if (items.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: 24, gap: 12 }}
    >
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => onPress(item)}
          className="w-64 rounded-md bg-grey-200 p-s active:opacity-80"
        >
          <Badge label="Faktencheck" tone="emphasis" className="mb-2xs" />
          <Typo variant="headline-xs" numberOfLines={4}>
            {item.title}
          </Typo>
        </Pressable>
      ))}
    </ScrollView>
  );
}
