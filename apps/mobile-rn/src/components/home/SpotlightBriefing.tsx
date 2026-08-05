import { Pressable, View } from 'react-native';

import { spotlightIssues } from '@correctiv/app-core/data/spotlight';

import { Card, Hairline, Typo } from '@/components/ui';
import { openArticle } from '@/lib/openArticle';

/**
 * „Das Wichtigste heute" — newsletter-style briefs with a timestamp.
 *
 * The sample data comes from the core, which is a strict upgrade on the copy this
 * app carried: every item has an `articleUrl` pointing at an article that is in
 * the offline bundle, so the briefing is tappable even with no network. The old
 * local spotlight.json had no links at all.
 */
export function SpotlightBriefing() {
  const issue = spotlightIssues[0];
  return (
    <Card tone="surface">
      <Typo variant="text-s" color="grey-600" className="uppercase">
        Spotlight-Briefing
      </Typo>
      <Typo variant="headline-m" className="mt-3xs">
        {issue.subject}
      </Typo>
      <View className="mt-s">
        {issue.items.map((entry, i) => (
          <View key={entry.title}>
            {i > 0 && <Hairline className="my-s" />}
            <Pressable
              disabled={!entry.articleUrl}
              onPress={() =>
                entry.articleUrl && openArticle({ url: entry.articleUrl, title: entry.title })
              }
              className="active:opacity-70"
            >
              <Typo variant="text-s" color="emphasis">
                {entry.time} Uhr
              </Typo>
              <Typo variant="headline-xs" className="mt-4xs">
                {entry.title}
              </Typo>
              <Typo variant="text-m" color="grey-600" className="mt-4xs">
                {entry.text}
              </Typo>
            </Pressable>
          </View>
        ))}
      </View>
    </Card>
  );
}
