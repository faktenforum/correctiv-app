/**
 * Komposit-Typografie als RN-TextStyles — 1:1-Übersetzung der `ty-*`-Utilities
 * aus wp-design-tokens/css/typography.css. lineHeight = fontSize × leading (RN
 * braucht px, nicht den unitless CSS-Faktor). Werte stammen aus der Token-Brücke.
 */
import type { TextStyle } from 'react-native';

import { fontSizePx, leading, letterSpacingPx } from './tokens.generated';
import { fontFamilyFor, type FontFamily, type FontWeightName } from './fonts';

export type TypoVariant =
  | 'text-article'
  | 'text-s'
  | 'text-m'
  | 'text-l'
  | 'headline-xs'
  | 'headline-s'
  | 'headline-m'
  | 'headline-l'
  | 'headline-xl'
  | 'headline-xxl'
  | 'button';

type Spec = {
  family: FontFamily;
  weight: FontWeightName;
  size: keyof typeof fontSizePx;
  tracking: keyof typeof letterSpacingPx;
  leadingToken: keyof typeof leading;
};

// Spiegelt typography.css (mobile Werte).
const SPECS: Record<TypoVariant, Spec> = {
  'text-article': {
    family: 'serif',
    weight: 'normal',
    size: 'text-article',
    tracking: 'wider',
    leadingToken: 'looser',
  },
  'text-s': {
    family: 'sans',
    weight: 'normal',
    size: 'text-s',
    tracking: 'wider',
    leadingToken: 'loose',
  },
  'text-m': {
    family: 'sans',
    weight: 'normal',
    size: 'text-m',
    tracking: 'wide',
    leadingToken: 'loose',
  },
  'text-l': {
    family: 'sans',
    weight: 'normal',
    size: 'text-l',
    tracking: 'wide',
    leadingToken: 'relaxed',
  },
  'headline-xs': {
    family: 'sans',
    weight: 'bold',
    size: 'headline-xs',
    tracking: 'wider',
    leadingToken: 'loose',
  },
  'headline-s': {
    family: 'sans',
    weight: 'bold',
    size: 'headline-s',
    tracking: 'wider',
    leadingToken: 'loose',
  },
  'headline-m': {
    family: 'sans',
    weight: 'bold',
    size: 'headline-m',
    tracking: 'normal',
    leadingToken: 'snug',
  },
  'headline-l': {
    family: 'sans',
    weight: 'bold',
    size: 'headline-l',
    tracking: 'tight',
    leadingToken: 'tight',
  },
  'headline-xl': {
    family: 'sans',
    weight: 'bold',
    size: 'headline-xl',
    tracking: 'tighter',
    leadingToken: 'tight',
  },
  'headline-xxl': {
    family: 'sans',
    weight: 'bold',
    size: 'headline-xxl',
    tracking: 'tighter',
    leadingToken: 'tight',
  },
  button: {
    family: 'sans',
    weight: 'bold',
    size: 'text-button',
    tracking: 'wider',
    leadingToken: 'loose',
  },
};

function buildStyle(spec: Spec): TextStyle {
  const size = fontSizePx[spec.size];
  return {
    fontFamily: fontFamilyFor(spec.family, spec.weight),
    fontSize: size,
    lineHeight: Math.round(size * leading[spec.leadingToken]),
    letterSpacing: letterSpacingPx[spec.tracking],
  };
}

export const typography: Record<TypoVariant, TextStyle> = Object.fromEntries(
  (Object.keys(SPECS) as TypoVariant[]).map((v) => [v, buildStyle(SPECS[v])]),
) as Record<TypoVariant, TextStyle>;
