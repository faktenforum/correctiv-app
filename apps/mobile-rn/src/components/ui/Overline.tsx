import { Typo } from './Typo';
import type { ColorToken } from '@/lib/theme';

export type OverlineProps = {
  label: string;
  color?: ColorToken;
  className?: string;
};

/**
 * Kleine gesperrte Überschrift ohne Fläche — Gruppenlabel im Verzeichnis,
 * Kicker über Karten. Entspricht `text-[12px] font-bold tracking-[1.2px]` im
 * Designentwurf, der diese Marke durchgehend für Rubriken benutzt.
 *
 * Nicht dasselbe wie `Badge`: das ist dieselbe Typografie AUF einer Fläche.
 * Großschreibung macht die Komponente selbst, weil sie zur Designvorgabe
 * gehört und die Daten Titel-Case liefern („Junge Formate").
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
