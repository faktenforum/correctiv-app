/**
 * The bundled article covers, as the platform port sees them.
 *
 * Native branch: hand the generated data URIs through. An APK carries them once and
 * an offline Home shows pictures instead of grey rectangles — the whole point of
 * `adoptBundledImages` in the core's feed store.
 *
 * `covers.web.ts` is the other branch, and the reason this indirection exists at
 * all: see the note there.
 */
export { OFFLINE_COVERS } from './offlineCovers.generated';
