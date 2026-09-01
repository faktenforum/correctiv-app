/**
 * No bundled covers in a browser — deliberately, and it is not a gap.
 *
 * The bundle exists because an offline phone cannot fetch a cover. A browser can:
 * images are not subject to the CORS rule that blocks the RSS feeds, so every remote
 * cover loads exactly as it does on correctiv.org. Serving the inlined copies here
 * would replace working URLs with half a megabyte of base64 in the JS bundle — paid
 * on every page load, for no visible difference.
 *
 * Metro resolves this file on web, so `offlineCovers.generated.ts` is unreachable
 * from the web entry graph and never reaches the export.
 * `__tests__/web-target.test.ts` pins the pair.
 */
export const OFFLINE_COVERS: Record<string, string> = {};
