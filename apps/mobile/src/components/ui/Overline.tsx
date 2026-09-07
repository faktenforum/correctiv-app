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
 *
 * ONE LINE, declared rather than implied, and that is what keeps it readable on
 * GTK. MEASURED on GTK 4.22.4: a wrapping label whose text has a space in it
 * reports a natural width that is short of what Pango needs to set the text on one
 * line, by about the letter-spacing itself — 1 px at 0.4 and 1.2, 2 px at 2, 3 px
 * at 3. So the mark is allocated exactly its own natural width, wraps onto a second
 * line there, and the second line is clipped by the height the parent already
 * committed. `letter-spacing: 0` is the only value with no shortfall, and PADDING
 * CANNOT FIX IT: padding raises the natural width and the text's budget by the same
 * pixel. A single-word mark ("RECHERCHE") has no break opportunity and was never
 * affected, which is why this only ever showed on the two-word ones.
 */
export function Overline({ label, color = 'on-canvas-muted', className }: OverlineProps) {
  return (
    <Typo
      variant="text-s"
      weight="bold"
      color={color}
      className={className}
      numberOfLines={1}
      style={{ fontSize: 12, letterSpacing: 1.2, flexShrink: 0 }}
    >
      {label.toUpperCase()}
    </Typo>
  );
}
