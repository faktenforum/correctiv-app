// `expo-font`'s `useFonts`, and an honest account of what this host does with fonts.
//
// `app/_layout.tsx` blocks the first render on `useFonts(fontAssets)` and hides the
// splash screen when it resolves, so this has to report loaded or the app never
// renders. It reports loaded immediately, and that is true in the sense that
// matters: there is nothing to wait for.
//
// WHAT IS ACTUALLY DIFFERENT, named because it is visible. The app's chrome asks for
// `SourceSans3_*` and `Merriweather_*` by family name, and a family name only means
// something to a runtime that has loaded that font. This host loads none, so Pango
// falls back to the system UI font — the window is legible and correctly laid out,
// and it is not CORRECTIV's typeface.
//
// The article body is unaffected, which is the part worth knowing: the reader
// document embeds its own base64-subsetted fonts in a <style> block
// (`lib/articles/reader.ts`), because a WebView is a browser context of its own and
// cannot use the fonts React Native loaded. That mechanism works identically inside
// WebKitGTK, so the text of an article is in the right typeface even though the
// chrome around it is not.
//
// Loading the two families properly is a Pango/FontConfig job
// (`Pango.FontMap`/`FcConfigAppFontAddFile`) and it is not done here.

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
