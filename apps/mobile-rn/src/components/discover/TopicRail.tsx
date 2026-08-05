import { Chip, Rail } from '@/components/ui';
import { interests } from '@correctiv/app-core/data/interests';

/**
 * Topics with a feed only: a chip without one would have no page to open. Module
 * constant, so the list is not rebuilt on every render. `resolveProject` in the
 * core mirrors the same condition — pinned by a test there.
 */
const TOPICS = interests.filter((topic) => topic.feed);

/**
 * The topic rail below the search entry. These chips are navigation, not selection,
 * hence no `selected` state. Selecting the same interests happens in onboarding,
 * where it drives the ranking on Home.
 */
export function TopicRail({ onOpenTopic }: { onOpenTopic: (id: string) => void }) {
  return (
    <Rail gap="xs">
      {TOPICS.map((topic) => (
        <Chip key={topic.id} label={topic.label} onPress={() => onOpenTopic(topic.id)} />
      ))}
    </Rail>
  );
}
