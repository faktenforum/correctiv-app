import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';

import { spacingPx } from '@/lib/theme';

export type RailProps = {
  children: ReactNode;
  /** Gap between items, as a spacing token. Cards use `s`, chips `xs`. */
  gap?: keyof typeof spacingPx;
};

/**
 * A horizontally scrolling row.
 *
 * The trailing padding is the screen's own horizontal padding (`px-m`): without it
 * the last card ends flush with the text column and the row looks cut off rather
 * than scrollable. That number was copied into three rails with a bare `24` before
 * this component existed — it now comes from the token, so a change to the screen
 * padding cannot leave the rails behind.
 */
export function Rail({ children, gap = 's' }: RailProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingRight: spacingPx.m, gap: spacingPx[gap] }}
    >
      {children}
    </ScrollView>
  );
}
