/**
 * `/gallery` — every component in `src/components`, on one page.
 *
 * A page for developers and designers rather than for readers, and it is
 * published like any other route. That was measured rather than assumed: the
 * components it draws are already in the bundle, because real screens use them,
 * so the page costs its catalogue and its fixtures and nothing else. ADR 0025
 * carries the figure, and is the only place it is written down, because a
 * measurement typed twice is a measurement that goes wrong in one of them.
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
import { useLocalSearchParams } from 'expo-router';

import { Gallery } from '@/gallery/Gallery';

/**
 * `?c=ui/SectionCard` narrows the page to one component.
 *
 * That parameter is what lets the handbook's reference link here, and what the way
 * back is addressed with. `componentId` in `gallery/catalogue.tsx` is the shape of
 * it, and the reference resolves the same two parts to its own rows.
 *
 * Sending a *frame* to one component is the step this is meant for and not one that
 * works yet: the workbench carries the app's route in its own hash and cuts that
 * hash at the first `?`, so the parameter does not survive the round trip
 * (faktenforum/correctiv-app#109).
 */
export default function GalleryRoute() {
  const { c } = useLocalSearchParams<{ c?: string }>();
  return <Gallery only={typeof c === 'string' && c ? c : undefined} />;
}
