/**
 * Module declarations for what Metro resolves but TypeScript does not know about.
 *
 * `expo/types` declares `*.css` itself — but the only reference to it lives in
 * `expo-env.d.ts`, which Expo generates and `.gitignore`s. So it is there on a
 * developer's machine and absent on a fresh checkout, which is why `*.css` is
 * declared here too rather than left to it.
 *
 * That gap was invisible until it wasn't: `nativewind-env.d.ts` used to carry
 * `declare module '*.css'` and was tracked. Deleting it with the NativeWind
 * migration left the app typechecking locally, against a file CI never sees, and
 * `npm run check` was green on the machine that made the change while the same
 * command failed on CI.
 *
 * Metro resolves an asset import to a numeric asset id; `expo/types` declares no
 * media, so the bundled sample episode needs the second one regardless.
 */
declare module '*.css';

declare module '*.mp3' {
  const assetId: number;
  export default assetId;
}
