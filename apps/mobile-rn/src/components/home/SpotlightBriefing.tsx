import { View } from 'react-native';

import { Card, Hairline, Typo } from '@/components/ui';
import { getLatestSpotlight } from '@/lib/sample-data';

/** „Das Wichtigste heute" — Kurzmeldungen im Newsletter-Stil mit Uhrzeit-Stempel. */
export function SpotlightBriefing() {
  const issue = getLatestSpotlight();
  return (
    <Card tone="surface">
      <Typo variant="text-s" color="grey-600" className="uppercase">
        Spotlight-Briefing
      </Typo>
      <Typo variant="headline-m" className="mt-3xs">
        Das Wichtigste heute
      </Typo>
      <View className="mt-s">
        {issue.items.map((entry, i) => (
          <View key={entry.headline}>
            {i > 0 && <Hairline className="my-s" />}
            <Typo variant="text-s" color="emphasis">
              {entry.time} Uhr
            </Typo>
            <Typo variant="headline-xs" className="mt-4xs">
              {entry.headline}
            </Typo>
            <Typo variant="text-m" color="grey-600" className="mt-4xs">
              {entry.body}
            </Typo>
          </View>
        ))}
      </View>
    </Card>
  );
}
