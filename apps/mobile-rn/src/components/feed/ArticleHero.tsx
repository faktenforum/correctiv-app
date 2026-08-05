import { Pressable } from 'react-native';

import { Bleed, Overline, Thumbnail, Typo } from '@/components/ui';
import { FEEDS } from '@correctiv/app-core/data/feeds.config';
import { formatDateShortDe } from '@correctiv/app-core/lib/format';
import type { FeedItem } from '@correctiv/app-core/types/models';

import { useOgImage } from '@/lib/articles/useOgImage';

/**
 * The lead research item on Home: edge-to-edge image, kicker, serif headline,
 * teaser, byline.
 *
 * Three details come from the draft and the NativeScript build, which both read
 * as an article opening where this one read as a card: the image runs to the
 * screen edge, the kicker is set type rather than a filled badge (the coral
 * surface competed with the headline), and the byline says who did the work.
 */
export function ArticleHero({
  item,
  onPress,
}: {
  item: FeedItem;
  onPress: (item: FeedItem) => void;
}) {
  const image = useOgImage(item.url, item.imageUrl ?? undefined);
  const kicker = FEEDS[item.feed]?.badge;
  const byline = [item.author, formatDateShortDe(item.publishedAt)].filter(Boolean).join(' · ');

  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="link"
      accessibilityLabel={item.title}
      className="active:opacity-90"
    >
      <Bleed>
        <Thumbnail uri={image} aspectRatio={16 / 9} icon="image-outline" />
      </Bleed>
      {kicker && <Overline label={kicker} color="emphasis" className="mt-s" />}
      <Typo variant="headline-l" className="mt-2xs">
        {item.title}
      </Typo>
      {item.teaser.length > 0 && (
        <Typo variant="text-m" color="grey-600" className="mt-2xs" numberOfLines={3}>
          {item.teaser}
        </Typo>
      )}
      {byline && (
        <Typo variant="text-s" color="grey-500" className="mt-2xs">
          {byline}
        </Typo>
      )}
    </Pressable>
  );
}
