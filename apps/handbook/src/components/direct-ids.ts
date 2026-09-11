/**
 * Which of the app's components this site draws in its own React tree.
 *
 * The ids and nothing else, so `test/direct.test.ts` can hold them against
 * `content/api.generated.json` without React, React Native or a Vite build in
 * the way. `direct.tsx` beside this file types its registry as
 * `Record<DirectId, …>`, so an id here with no specimen and a specimen with no
 * id here are both type errors rather than a drift nobody notices.
 *
 * Short on purpose. `scripts/measure-direct.mjs` reports that all 47 components
 * *bundle*; bundling is not the same as having a specimen worth showing, and
 * the rest arrive with the page that is built for them (ADR 0027, "What is still
 * open").
 *
 * `group/name` is the app's own address for a component — `gallery/catalogue.tsx`'s
 * `componentId`, and the string `?c=` carries in both directions.
 */
export const DIRECT_IDS = ['ui/Card', 'ui/Hairline'] as const;

export type DirectId = (typeof DIRECT_IDS)[number];

/** Whether `group/name` is drawn here. */
export function isDirect(id: string): id is DirectId {
  return (DIRECT_IDS as readonly string[]).includes(id);
}
