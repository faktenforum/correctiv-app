import { PodcastTeaser } from '@/components/home/PodcastTeaser';
import { Screen } from '@/components/ui';

/**
 * Home, being redesigned from an empty page. Its first element is the morning
 * podcast teaser, on demo data.
 *
 * The previous composition — masthead, lead research, briefing, early access, feed
 * sections, callout, media row, backstage, footer — is off the screen. Those
 * components are still in `components/home/` and in `components/feed/`, unreferenced
 * from here, so a block can come back without being written again.
 */
export default function HomeScreen() {
  return (
    <Screen>
      <PodcastTeaser />
    </Screen>
  );
}
