/**
 * Composite typography as React Native TextStyles.
 *
 * The specs come from `tokens/typography.css` through the token bridge — they used
 * to be transcribed into this file by hand, eleven variants of family, weight, size,
 * tracking and leading, with nothing checking them against the source sitting next
 * to the generator that transcribes everything else. A changed line height upstream
 * would have reached the app only if somebody noticed.
 *
 * What stays here is the part that is genuinely React Native's: `lineHeight` is
 * fontSize x leading because RN wants px where CSS takes a unitless factor, and the
 * family name is resolved through `fonts.ts`, which maps one loaded font per cut to
 * work around Android ignoring fontWeight on custom fonts.
 *
 * **The mobile line height is used, not the tablet one.** Three headlines carry a
 * `@media (min-width: 48rem)` override in the source; `typographySpecs` exposes it
 * as `leadingTablet` and this file ignores it. That was always the behaviour — it is
 * simply a decision now rather than something lost in transcription. Acting on it
 * needs a width to react to, which a TextStyle built once at module load has not got.
 */
import type { TextStyle } from 'react-native';

import { fontSizePx, leading, letterSpacingPx } from '@correctiv/design-tokens/tokens.generated';
import { typographySpecs, type TypoVariant } from '@correctiv/design-tokens/typography.generated';

import { fontFamilyFor, type FontFamily, type FontWeightName } from './fonts';

export type { TypoVariant };

type Spec = {
  family: FontFamily;
  weight: FontWeightName;
  size: keyof typeof fontSizePx;
  tracking: keyof typeof letterSpacingPx;
  leading: keyof typeof leading;
};

/**
 * The generated specs carry token NAMES as plain strings; this is where they meet
 * the scales. If the source ever names a token the scales do not have, it fails
 * here, at build time, rather than rendering a `NaN` font size.
 */
const SPECS = typographySpecs as unknown as Record<TypoVariant, Spec>;

function buildStyle(spec: Spec): TextStyle {
  const size = fontSizePx[spec.size];
  return {
    fontFamily: fontFamilyFor(spec.family, spec.weight),
    fontSize: size,
    lineHeight: Math.round(size * leading[spec.leading]),
    letterSpacing: letterSpacingPx[spec.tracking],
  };
}

export const typography: Record<TypoVariant, TextStyle> = Object.fromEntries(
  (Object.keys(SPECS) as TypoVariant[]).map((v) => [v, buildStyle(SPECS[v])]),
) as Record<TypoVariant, TextStyle>;

/**
 * A variant's typeface and its weight, exposed separately so a caller can
 * override one without losing the other. typography.css treats them as separate
 * axes (`ty-text-m font-sans-semibold`), and the design uses that combination in
 * two places no single variant provides: 15 px sans semibold for list titles, and
 * the mission headline in Merriweather at `headline-xxl` metrics.
 */
export const typoFamily: Record<TypoVariant, FontFamily> = Object.fromEntries(
  (Object.keys(SPECS) as TypoVariant[]).map((v) => [v, SPECS[v].family]),
) as Record<TypoVariant, FontFamily>;

export const typoWeight: Record<TypoVariant, FontWeightName> = Object.fromEntries(
  (Object.keys(SPECS) as TypoVariant[]).map((v) => [v, SPECS[v].weight]),
) as Record<TypoVariant, FontWeightName>;
