/**
 * `/gallery` — every component in `src/components`, on one page.
 *
 * A page for developers and designers rather than for readers, and it is
 * published like any other route. That was measured rather than assumed: the
 * components it draws are already in the bundle, because real screens use them,
 * so the page costs the catalogue and its fixtures and nothing else. 21,673
 * bytes on 2026-09-10, on a 4.4 MB bundle.
 *
 * **In the workbench frame it renders only from the published build.** A
 * development bundle does not apply `experiments.baseUrl` when it matches
 * routes, so `/app/gallery` on the dev server renders the app's own 404 — as
 * does `/app/` itself
 * ([ADR 0025](../../../../adr/0025-the-published-app-is-a-production-bundle.md)).
 * To look at a component while changing it, run `npm run web:root`, which starts
 * the dev server without the base path so that route matching works, and open
 * `/gallery` there.
 */
import { Gallery } from '@/gallery/Gallery';

export default function GalleryRoute() {
  return <Gallery />;
}
