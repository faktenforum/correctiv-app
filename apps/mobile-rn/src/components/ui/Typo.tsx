import { Text, type TextProps } from 'react-native';

import {
  typography,
  typoFamily,
  fontFamilyFor,
  type FontWeightName,
  type TypoVariant,
  colors,
  type ColorToken,
} from '@/lib/theme';

export type TypoProps = TextProps & {
  /** Komposit-Variante aus typography.css (Schrift, Größe, Tracking, Zeilenhöhe). */
  variant?: TypoVariant;
  /** Farb-Token; Default grey-700 (Fließtextfarbe der Marke). */
  color?: ColorToken;
  /**
   * Überschreibt nur das Gewicht der Variante, Familie und Metrik bleiben.
   * typography.css behandelt Gewicht als eigene Achse (`ty-text-m
   * font-sans-semibold`) — genau die Kombination, die Listentitel brauchen.
   */
  weight?: FontWeightName;
  /** NativeWind-Klassen für Layout/Abstände (nicht Typografie). */
  className?: string;
};

/**
 * Kanonische Text-Komponente. Variante bestimmt Typeface/Größe/Zeilenhöhe,
 * `color` die Farbe (Token), `className` Layout. So bleibt Typografie token-treu
 * und unabhängig vom Android-fontWeight-Verhalten.
 */
export function Typo({
  variant = 'text-m',
  color = 'grey-700',
  weight,
  style,
  className,
  ...rest
}: TypoProps) {
  return (
    <Text
      className={className}
      style={[
        typography[variant],
        weight ? { fontFamily: fontFamilyFor(typoFamily[variant], weight) } : null,
        { color: colors[color] },
        style,
      ]}
      {...rest}
    />
  );
}
