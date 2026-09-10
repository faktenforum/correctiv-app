import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Card, type CardProps } from './Card';
import { Overline, type OverlineProps } from './Overline';

export type SectionCardProps = {
  label: string;
  /** The `Overline`'s colour. Muted unless a screen wants the label to carry weight. */
  labelColor?: OverlineProps['color'];
  /** Passed to the `Card`. */
  tone?: CardProps['tone'];
  /** Space to whatever is above, `mt-l` for the first section on a screen, `mt-m` after. */
  className?: string;
  children?: ReactNode;
};

/**
 * A group label over one card: the section Einstellungen, Profil, Mitmachen and
 * Backstage are each a stack of.
 *
 * The shape had no name for a while, and the reason is worth knowing, because it is
 * not a reason that applies here. A Figma instance takes no children, so a card that
 * carries content cannot be a component on the board (ADR 0021), and the app had
 * copied the label, the gap and the card by hand sixteen times over. React does take
 * children, so only the board's half of that wall is real.
 *
 * Not `SectionHeader`, which is a headline with an optional action link beside it and
 * stands over lists as often as over cards. This is the small capitals label over
 * exactly one card, and it owns the space between the two.
 */
export function SectionCard({ label, labelColor, tone, className, children }: SectionCardProps) {
  return (
    <View className={className}>
      <Overline label={label} color={labelColor} />
      <Card tone={tone} className="mt-2xs">
        {children}
      </Card>
    </View>
  );
}
