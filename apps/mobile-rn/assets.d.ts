/**
 * Metro resolves an asset import to a numeric asset id. `expo/types` declares
 * the CSS-ish ones (`*.css`, `*.scss`) but no media, so the bundled sample
 * episode needs this to typecheck.
 */
declare module '*.mp3' {
  const assetId: number;
  export default assetId;
}
