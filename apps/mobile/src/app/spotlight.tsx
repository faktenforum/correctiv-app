import { Pressable, ScrollView, View } from 'react-native';

import { spotlightIssues } from '@correctiv/app-core/data/spotlight';
import { formatDateWeekdayDe } from '@correctiv/app-core/lib/format';

import { Hairline, Overline, ScreenHeader, Typo } from '@/components/ui';
import { openArticle } from '@/lib/openArticle';

/**
 * The Spotlight archive. This is what "Spotlight →" on Home opens, and the reason
 * that action existed in the design draft but not here.
 *
 * Home shows today's issue as an agenda of headlines; this is where the teasers
 * live, one block per issue. No new data was needed: the core already carries
 * several issues, only the first of which Home ever showed.
 */
export default function SpotlightScreen() {
  return (
    <View className="flex-1 bg-grey-100">
      <ScreenHeader />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-m pt-m pb-2xl"
        showsVerticalScrollIndicator={false}
      >
        <Typo variant="headline-l">Spotlight</Typo>
        <Typo variant="text-m" color="grey-600" className="mt-2xs">
          Das Wichtigste des Tages, jeden Morgen im Newsletter.
        </Typo>
        {/* Said plainly rather than implied: the newsletter archive is not public
            so these issues are modeled, not fetched. */}
        <Typo variant="text-s" color="grey-500" className="mt-2xs">
          Beispielausgaben. Die verlinkten Recherchen sind echt.
        </Typo>

        {spotlightIssues.map((issue) => (
          <View key={issue.id} className="mt-l">
            <Overline label={formatDateWeekdayDe(issue.date)} />
            <Typo variant="headline-m" className="mt-3xs">
              {issue.subject}
            </Typo>
            {issue.items.map((entry) => (
              <View key={entry.title}>
                <Hairline className="mt-s" />
                <Pressable
                  disabled={!entry.articleUrl}
                  onPress={() =>
                    entry.articleUrl && openArticle({ url: entry.articleUrl, title: entry.title })
                  }
                  accessibilityRole="link"
                  accessibilityLabel={entry.title}
                  className="pt-s active:opacity-70"
                >
                  <Typo variant="text-s" weight="bold" color="emphasis">
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
        ))}
      </ScrollView>
    </View>
  );
}
