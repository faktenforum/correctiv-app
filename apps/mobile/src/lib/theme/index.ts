// Token barrel: one import path for colors, spacing, typography, fonts and sizes.
//
// The token values themselves are not generated here any more — they come from
// @correctiv/design-tokens, which a second consumer (the CORRECTIV WordPress CMS)
// can import as well. This barrel re-exports them so that every `@/lib/theme`
// import in the app keeps working, and so that the app-only parts (the appearance
// hook, the loaded font families, the typography scale) stay reachable from the
// same path.
export * from '@correctiv/design-tokens/tokens.generated';
export * from './useColors';
export * from './appearance';
export * from './fonts';
export * from './sizes';
export * from './typography';
export { THEME_CSS } from '@correctiv/design-tokens/reader.generated';
