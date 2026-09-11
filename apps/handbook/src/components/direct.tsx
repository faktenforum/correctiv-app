import type { ReactNode } from 'react';

import { Card } from '@/components/ui/Card';
import { Hairline } from '@/components/ui/Hairline';
import { Typo } from '@/components/ui/Typo';

import type { DirectId } from './direct-ids';

/**
 * The app's components, drawn by this site rather than framed.
 *
 * The registry *is* the measurement. An entry that does not build fails
 * `vite build`, so there is no manifest to keep in step with reality and no way
 * for this list to claim something the site cannot do.
 *
 * Every import above names a **file**, never `@/components/ui`. The barrel
 * re-exports `ScreenHeader` and `Thumbnail`, so importing `Typo` through it
 * would drag `@expo/vector-icons` and `expo-image` into the handbook's bundle
 * behind it. That is a finding about `apps/mobile` rather than about this file,
 * and ADR 0027 records it; here it is simply a rule.
 *
 * The specimens are the app's own, copied from `apps/mobile/src/gallery/catalogue.tsx`
 * down to their labels and their filler text. Two drawings of one component that
 * disagree about what they are showing would be worse than one, and the German
 * inside a specimen is the app's own copy rather than anything this site writes.
 */
export interface DirectSpecimen {
  /** What is varied, in the props' own words, as the app's catalogue labels it. */
  label: string;
  node: ReactNode;
}

export interface DirectEntry {
  specimens: DirectSpecimen[];
}

export const DIRECT: Record<DirectId, DirectEntry> = {
  'ui/Card': {
    specimens: (['outline', 'surface'] as const).map((tone) => ({
      label: `tone="${tone}"`,
      node: (
        <Card tone={tone}>
          <Typo variant="text-m">Inhalt der Karte</Typo>
        </Card>
      ),
    })),
  },
  'ui/Hairline': {
    specimens: [{ label: 'default', node: <Hairline /> }],
  },
};
