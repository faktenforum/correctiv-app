// AUTO-GENERATED von scripts/generate-tokens.mjs — nicht von Hand editieren.
// Quelle: tokens/theme.css · Regenerieren: npm run tokens

/* eslint-disable */
export const colors = {
  "emphasis": "#ff5064",
  "alternative": "#fde162",
  "grey-100": "#ffffff",
  "grey-200": "#f8f8f8",
  "grey-250": "#f0f0f0",
  "grey-300": "#e6e6e6",
  "grey-400": "#cecece",
  "grey-500": "#b3b3b3",
  "grey-600": "#707070",
  "grey-700": "#333333"
} as const;
export const spacingPx = {
  "4xs": 2,
  "3xs": 4,
  "2xs": 6,
  "xs": 8,
  "s": 12,
  "sm": 16,
  "m": 24,
  "ml": 32,
  "l": 36,
  "xl": 48,
  "2xl": 64,
  "3xl": 96,
  "4xl": 128
} as const;
export const radiusPx = {
  "xs": 1,
  "s": 2,
  "md": 5
} as const;
export const fontSizePx = {
  "text-article": 15.5,
  "text-s": 14,
  "text-m": 15,
  "text-button": 16,
  "text-l": 18.5,
  "headline-xs": 17,
  "headline-s": 17,
  "headline-m": 19,
  "headline-l": 23,
  "headline-xl": 28,
  "headline-xxl": 32
} as const;
export const leading = {
  "tighter": 1.1,
  "tight": 1.2,
  "snug": 1.3,
  "normal": 1.4,
  "relaxed": 1.45,
  "loose": 1.5,
  "looser": 1.8
} as const;
export const letterSpacingPx = {
  "tighter": -0.2,
  "tight": -0.1,
  "normal": 0,
  "wide": 0.1,
  "wider": 0.2
} as const;
export const fontWeights = {
  "normal": "400",
  "semibold": "600",
  "bold": "700"
} as const;
export const durationsMs = {
  "slow": 400,
  "fast": 200
} as const;
export const fontFamily = {
  "serif": "Merriweather_400Regular",
  "sans": "SourceSans3_400Regular"
} as const;

export type ColorToken = keyof typeof colors;
export type SpacingToken = keyof typeof spacingPx;
