// `expo-font`'s `useFonts`, and an honest account of what this host does with fonts.
//
// `app/_layout.tsx` blocks the first render on `useFonts(fontAssets)` and hides the
// splash screen when it resolves, so this has to report loaded or the app never
// renders. It reports loaded immediately, and that is true in the sense that
// matters: there is nothing to wait for.
//
// WHERE THE FONTS ACTUALLY COME FROM ON THIS HOST, since it is not here. The two
// families are registered on Pango's default font map at startup — `registerFontsOnce()`
// in `entry.tsx`, over faces staged by `scripts/stage-fonts.mjs` — and the loaded-family
// names this map is keyed by are split back into a family and a weight by
// `src/style/fonts.ts`, because Pango has never heard of `Merriweather_700Bold`. So
// there is genuinely nothing to load ASYNCHRONOUSLY: by the time any component renders,
// the faces are on the map or the log says why not.
//
// The article body was never affected either way, which is worth knowing: the reader
// document embeds its own base64-subsetted fonts in a <style> block
// (`lib/articles/reader.ts`), because a WebView is a browser context of its own and
// cannot use the fonts React Native loaded. That mechanism works identically inside
// WebKitGTK and inside the WKWebView shim on macOS.
//
// `npm run font-probe` is the measurement, and it asks the font map rather than this
// file: Pango does not report a missing family, so "loaded" is only ever provable by
// asking what the map hands back for a family AT A WEIGHT.

/** `[loaded, error]`, matching expo-font's tuple. */
export function useFonts(_map: Record<string, unknown>): [boolean, Error | null] {
  return [true, null];
}

export function loadAsync(_map: Record<string, unknown>): Promise<void> {
  return Promise.resolve();
}

export function isLoaded(_font: string): boolean {
  return true;
}
