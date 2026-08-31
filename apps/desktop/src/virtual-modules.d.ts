/**
 * The route manifest the bundler plugin emits.
 *
 * `rnRouteManifestPlugin` walks `src/app` and generates a module that statically
 * imports every route file it found. It is a virtual module, so it has no file for
 * `tsc` to read and needs declaring — the alternative is `@ts-expect-error` at the
 * import, which suppresses the shape as well as the resolution.
 */
declare module 'virtual:gjsify-rn-routes' {
  import type { RouteManifest } from '@gjsify/react-native/router';
  export const manifest: RouteManifest;
}
