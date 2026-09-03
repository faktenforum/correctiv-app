import { Pressable } from 'react-native';

import { Badge, Rail, Typo } from '@/components/ui';
import type { FeedItem } from '@correctiv/app-core/types/models';
import { sizes } from '@/lib/theme';

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
          className="rounded-md border border-stroke bg-canvas p-s active:opacity-80"
          style={{ width: sizes.railCard }}
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
