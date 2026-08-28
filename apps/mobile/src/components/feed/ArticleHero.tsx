import { Pressable } from 'react-native';

import { Bleed, Overline, Thumbnail, Typo } from '@/components/ui';
import { FEEDS } from '@correctiv/app-core/data/feeds.config';
import { formatDateShortDe } from '@correctiv/app-core/lib/format';
import type { FeedItem } from '@correctiv/app-core/types/models';

import { useArticleMeta } from '@/lib/articles/useArticleMeta';

/**
 * The lead research item on Home: edge-to-edge image, kicker, serif headline,
 * teaser, byline.
 *
 * Three details come from the design draft, which reads as an article opening
 * where this one read as a card. The image runs to the screen edge, the kicker is
 * set type rather than a filled badge (the coral surface competed with the
 * headline), and the byline says who did the work.
 *
 * Both references give the hero a kicker unconditionally, so a feed without a
 * badge of its own falls back to "Recherche" — and the main feed deliberately has
 * none, which is the common case and left the hero bare. The byline carries
 * CORRECTIV's own reading time when the page states one; see pageMeta.ts for why
 * it is read rather than computed.
 */
export function ArticleHero({
  item,
  onPress,
}: {
  item: FeedItem;
  onPress: (item: FeedItem) => void;
}) {
  const { heroImageUrl: imageUrl, readingMinutes } = useArticleMeta(
    item.url,
    item.imageUrl ?? undefined,
  );
  const kicker = FEEDS[item.feed]?.badge ?? 'Recherche';
  const byline = [
    item.author,
    formatDateShortDe(item.publishedAt),
    readingMinutes ? `${readingMinutes} Min. Lesezeit` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={() => onPress(item)}
      accessibilityRole="link"
      accessibilityLabel={item.title}
      className="active:opacity-90"
    >
      <Bleed>
        <Thumbnail uri={imageUrl} aspectRatio={16 / 9} icon="image-outline" />
      </Bleed>
      <Overline label={kicker} color="emphasis" className="mt-s" />
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
