import { Text, type TextProps } from 'react-native';

import {
  typography,
  typoFamily,
  typoWeight,
  fontFamilyFor,
  useColors,
  type FontFamily,
  type FontWeightName,
  type TypoVariant,
  type ColorToken,
} from '@/lib/theme';

export type TypoProps = TextProps & {
  /** Composite variant from typography.css: typeface, size, tracking, line height. */
  variant?: TypoVariant;
  /**
   * Colour token; defaults to `on-canvas`, the brand's body-text colour — which is
   * near-white in dark mode, because `on-canvas` names the role and not the value.
   *
   * On a surface whose colour does NOT follow the scheme — the brand red, club
   * yellow, a photograph — that flip is wrong, and a primitive is the answer:
   * `white` and `neutral-700` are the same colour in both schemes, because a
   * primitive names a value. (`always-light` and `always-dark` are the older names
   * for those two and still resolve; ADR 0022 retires them.)
   */
  color?: ColorToken;
  /**
   * Overrides the weight only; the family and the metrics stay. typography.css
   * treats weight as its own axis (`ty-text-m font-sans-semibold`) — exactly the
   * combination list titles need.
   */
  weight?: FontWeightName;
  /**
   * Overrides the family only; the metrics stay. The same separate axis as
   * `weight`: the mission screen and the reader set a headline in Merriweather,
   * which no single variant provides — and inventing a `display` variant would
   * break this file's 1:1 mirroring of typography.css.
   */
  family?: FontFamily;
  /** Utility classes for layout and spacing, not for typography. */
  className?: string;
};

/**
 * The canonical text component. The variant decides typeface, size and line
 * height, `color` the colour token, `className` the layout. That keeps typography
 * true to the tokens and independent of Android's fontWeight behaviour.
 */
export function Typo({
  variant = 'text-m',
  color = 'on-canvas',
  weight,
  family,
  style,
  className,
  ...rest
}: TypoProps) {
  const colors = useColors();
  // Either axis alone falls back to the variant's own value for the other one.
  const override =
    weight || family
      ? {
          fontFamily: fontFamilyFor(family ?? typoFamily[variant], weight ?? typoWeight[variant]),
        }
      : null;
  return (
    <Text
      className={className}
      style={[typography[variant], override, { color: colors[color] }, style]}
      {...rest}
    />
  );
}
