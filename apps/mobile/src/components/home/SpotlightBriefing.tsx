import { Pressable, View } from 'react-native';

import { spotlightIssues } from '@correctiv/app-core/data/spotlight';

import { Card, Hairline, Overline, Typo } from '@/components/ui';
import { openArticle } from '@/lib/openArticle';

/**
 * „Das Wichtigste heute" — the morning newsletter as an agenda.
 *
 * Time and headline per line, no teaser: the draft treats this card as an index
 * into the day, and three scannable lines say more in the same space than one item
 * quoted in full. The teasers are not lost, they are what /spotlight shows.
 *
 * The sample data comes from the core, which is a strict upgrade on the copy this
 * app carried: every item has an `articleUrl` pointing at an article that is in
 * the offline bundle, so the briefing is tappable even with no network. The old
 * local spotlight.json had no links at all.
 */
export function SpotlightBriefing({ onOpenArchive }: { onOpenArchive: () => void }) {
  const issue = spotlightIssues[0];
  return (
    <Card tone="surface">
      <View className="flex-row items-center justify-between">
        <Overline label={issue.subject} color="grey-700" />
        <Pressable
          onPress={onOpenArchive}
          hitSlop={8}
          accessibilityRole="link"
          accessibilityLabel="Alle Spotlight-Ausgaben"
          className="active:opacity-60"
        >
          <Typo variant="text-s" weight="bold" color="emphasis">
            Spotlight →
          </Typo>
        </Pressable>
      </View>

      {issue.items.map((entry) => (
        <View key={entry.title}>
          {/* A hairline above every row, including the first — it separates the
              agenda from its own header, as in the draft. */}
          <Hairline className="mt-s" />
          <Pressable
            disabled={!entry.articleUrl}
            onPress={() =>
              entry.articleUrl && openArticle({ url: entry.articleUrl, title: entry.title })
            }
            accessibilityRole="link"
            accessibilityLabel={entry.title}
            className="flex-row gap-s pt-s active:opacity-70"
          >
            <Typo variant="text-s" weight="bold" color="grey-600">
              {entry.time}
            </Typo>
            <Typo variant="text-m" className="flex-1">
              {entry.title}
            </Typo>
          </Pressable>
        </View>
      ))}
    </Card>
  );
}
