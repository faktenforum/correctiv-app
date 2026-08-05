import { Pressable } from 'react-native';

import { Badge, Rail, Typo } from '@/components/ui';
import type { FeedItem } from '@correctiv/app-core/types/models';

/** The horizontally scrolling fact-check cards on Home. */
export function FaktencheckRail({
  items,
  onPress,
}: {
  items: FeedItem[];
  onPress: (item: FeedItem) => void;
}) {
  if (items.length === 0) return null;
  return (
    <Rail>
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => onPress(item)}
          accessibilityRole="link"
          accessibilityLabel={item.title}
          className="w-64 rounded-md bg-grey-200 p-s active:opacity-80"
        >
          <Badge label="Faktencheck" tone="emphasis" className="mb-2xs" />
          <Typo variant="headline-xs" numberOfLines={4}>
            {item.title}
          </Typo>
        </Pressable>
      ))}
    </Rail>
  );
}
