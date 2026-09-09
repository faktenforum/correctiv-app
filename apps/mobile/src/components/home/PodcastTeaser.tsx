import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { formatTimeHm } from '@correctiv/app-core/lib/format';

import { Card, Overline, Typo } from '@/components/ui';
import { sizes, useColors } from '@/lib/theme';

/**
 * The morning podcast on Home (DEMO data).
 *
 * This is the morning-podcast slot the requirements name and SOURCES.md records as
 * „in konzeption": no feed URL is known and no episode file exists, so the title and
 * the length are placeholders. The button therefore toggles its own state instead of
 * driving the audio singleton, and giving it sound is a matter of finding a source,
 * not of changing this component.
 *
 * Light, not the dark treatment `LiveBanner` gets: the prominence asked for here is
 * the button's, and it is carried by the accent fill and the size, not by the card.
 */
const DEMO_EPISODE = {
  title: 'Spotlight am Morgen',
  durationSec: 5 * 60 + 3,
} as const;

export function PodcastTeaser() {
  const colors = useColors();
  const [playing, setPlaying] = useState(false);

  return (
    <Card tone="surface">
      <Overline label="Podcast" />
      <Typo variant="headline-m" className="mt-2xs">
        {DEMO_EPISODE.title}
      </Typo>

      <View className="mt-m flex-row items-center gap-s">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            playing ? `${DEMO_EPISODE.title} pausieren` : `${DEMO_EPISODE.title} abspielen`
          }
          onPress={() => setPlaying((on) => !on)}
          className="items-center justify-center rounded-full bg-accent active:opacity-80"
          style={{ width: sizes.playButton, height: sizes.playButton }}
        >
          {/* On the button's brand surface, so fixed light rather than the page's. */}
          <Ionicons name={playing ? 'pause' : 'play'} size={24} color={colors['always-light']} />
        </Pressable>

        <Typo variant="text-s" color="on-canvas-muted">
          {formatTimeHm(DEMO_EPISODE.durationSec)} Min.
        </Typo>
      </View>
    </Card>
  );
}
