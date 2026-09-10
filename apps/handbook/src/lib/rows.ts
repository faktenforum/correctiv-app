/**
 * Which rows of `/components` draw their component, as a list of ids.
 *
 * Here rather than in `pages/Components.tsx`, and that is not tidiness. The page
 * imports `virtual:api`, which is generated, so a test that imports the page
 * fails wherever `content/api.generated.json` has not been built — green on a
 * developer's machine, where the file has been lying around since the last build,
 * and red in CI, where it has not. `test/routes.test.ts` avoids the same trap by
 * reading the page as text.
 *
 * The rules are two lines and the page holds the state; what is worth having out
 * here is that they can be asserted at all.
 */

/**
 * How many app frames `/components` may hold at once.
 *
 * Each one boots the whole app bundle. Three is enough to compare two components
 * with a third open by accident, and few enough that a reader working down the
 * page with the keyboard does not end up with a dozen running apps in a tab.
 */
export const FRAME_LIMIT = 3;

/**
 * The open rows, in the order they were opened.
 *
 * A list and not a set, because which three rows get a frame is decided by
 * recency. Opening a row that is already open moves it to the end rather than
 * duplicating it: the search palette can open one the reader already opened.
 */
export function opened(prev: string[], id: string, isOpen: boolean): string[] {
  const without = prev.filter((other) => other !== id);
  return isOpen ? [...without, id] : without;
}

/** The three most recently opened of them, which are the ones drawn. */
export function framed(open: string[]): Set<string> {
  return new Set(open.slice(-FRAME_LIMIT));
}
