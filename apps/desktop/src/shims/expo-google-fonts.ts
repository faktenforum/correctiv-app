// `@expo-google-fonts/*`, without the font files.
//
// Those packages export one `require()`d `.ttf` per cut, and a `.ttf` is not
// something this bundler can put in a JavaScript bundle — the build reported 31 of
// them as "stream did not contain valid UTF-8", which is a byte-level truth rather
// than a configuration mistake.
//
// WHAT IS PRESERVED, and it is the half that matters. `lib/theme/fonts.ts` uses these
// imports for exactly one thing: assembling `fontAssets`, the map handed to
// `useFonts()`. Every FAMILY NAME in that file is a string literal
// (`'Merriweather_400Regular'`), so `fontFamilyFor()` and the whole typography scale
// keep working untouched — and `src/shims/expo-font.ts` ignores the map it is handed,
// because there is nothing to load.
//
// WHAT IS LOST: the two typefaces, in the window chrome. Pango falls back to the
// system UI font. The article body is NOT affected — the reader document embeds its
// own base64-subsetted fonts in a `<style>` block, which works identically inside
// WebKitGTK. `src/shims/expo-font.ts` carries the full account and the name of the
// API that would fix it.
//
// `null` rather than a fake asset id: nothing reads these values on this host, and a
// plausible-looking number would invite someone to believe a font had been loaded.

export const Merriweather_400Regular = null;
export const Merriweather_700Bold = null;
export const SourceSans3_400Regular = null;
export const SourceSans3_600SemiBold = null;
export const SourceSans3_700Bold = null;
