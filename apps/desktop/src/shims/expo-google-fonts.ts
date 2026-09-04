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
// WHAT IS NOT LOST, any more. The faces themselves ship: `scripts/stage-fonts.mjs`
// copies the five cuts out of these very packages into `data/fonts/`, declared to
// `gjsify ship` as `gjsify.ship.fonts`, and `entry.tsx` puts them on Pango's font map
// at startup. The path they take is the file system rather than the JavaScript bundle,
// which is the whole reason this shim can stay a list of nulls.
//
// The names still need translating: `Merriweather_700Bold` is an asset id, and Pango
// knows `Merriweather` at weight 700 — `src/style/fonts.ts` holds that split and
// `src/shims/react-native.tsx` applies it to every `fontFamily` that goes past.
//
// `null` rather than a fake asset id: nothing reads these values on this host, and a
// plausible-looking number would invite someone to believe a font had been loaded.

export const Merriweather_400Regular = null;
export const Merriweather_700Bold = null;
export const SourceSans3_400Regular = null;
export const SourceSans3_600SemiBold = null;
export const SourceSans3_700Bold = null;
