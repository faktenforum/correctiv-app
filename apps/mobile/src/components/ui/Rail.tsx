import type { ReactNode } from 'react';
import { ScrollView } from 'react-native';

import { Bleed } from './Bleed';
import { spacingPx } from '@/lib/theme';

export type RailProps = {
  children: ReactNode;
  /** Gap between items, as a spacing token. Cards use `s`, chips `xs`. */
  gap?: keyof typeof spacingPx;
};

/**
 * A horizontally scrolling row that runs to the screen edge.
 *
 * The scroller is bled out of the text column and the page padding moved inside it
 * — the arrangement the draft uses (`overflow-x-auto` with `px-[16px]`). Kept
 * inside the column instead, the row clips its content 24px early: the next card
 * ends in mid-air short of the edge, which reads as a layout fault rather than as
 * "there is more this way".
 *
 * That padding was copied into three rails as a bare `24` before this component
 * existed; it now comes from the token on both sides, so a change to the screen
 * padding cannot leave the rails behind.
 */
export function Rail({ children, gap = 's' }: RailProps) {
  return (
    <Bleed>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacingPx.m, gap: spacingPx[gap] }}
      >
        {children}
      </ScrollView>
    </Bleed>
  );
}
