import { ScrollView } from 'react-native';

import { Chip } from '@/components/ui';
import { interests } from '@correctiv/app-core/data/interests';

/**
 * Nur Themen mit Feed: ein Chip ohne Feed hätte keine Seite zu zeigen. Modul-
 * konstant, damit die Liste nicht pro Render neu entsteht.
 * `resolveProject` im Core spiegelt dieselbe Bedingung — dort als Test gepinnt.
 */
const TOPICS = interests.filter((topic) => topic.feed);

/**
 * Themenschiene unter dem Sucheinstieg. Die Chips sind Navigation, keine
 * Auswahl — deshalb ohne `selected`. Die Auswahl derselben Interessen passiert
 * im Onboarding (Phase 4e) und steuert dort das Home-Ranking.
 */
export function TopicRail({ onOpenTopic }: { onOpenTopic: (id: string) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: 24, gap: 8 }}
    >
      {TOPICS.map((topic) => (
        <Chip key={topic.id} label={topic.label} onPress={() => onOpenTopic(topic.id)} />
      ))}
    </ScrollView>
  );
}
