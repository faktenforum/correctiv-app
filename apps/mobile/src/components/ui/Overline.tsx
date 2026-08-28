import { Typo } from './Typo';
import type { ColorToken } from '@/lib/theme';

export type OverlineProps = {
  label: string;
  color?: ColorToken;
  className?: string;
};

/**
 * A small letter-spaced heading with no fill — the group label in the directory,
 * the kicker above a card. Matches `text-[12px] font-bold tracking-[1.2px]` in the
 * design draft, which uses this mark for section headings throughout.
 *
 * Not the same as `Badge`: that is the same typography ON a fill. The component
 * uppercases the label itself, because the capitals are part of the design and the
 * data arrives in title case ("Junge Formate").
 */
export function Overline({ label, color = 'grey-600', className }: OverlineProps) {
  return (
    <Typo
      variant="text-s"
      weight="bold"
      color={color}
      className={className}
      style={{ fontSize: 12, letterSpacing: 1.2 }}
    >
      {label.toUpperCase()}
    </Typo>
  );
}
