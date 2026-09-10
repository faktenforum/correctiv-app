import { describe, expect, it } from 'vitest';

import { framed, opened } from '../src/pages/Components';

/**
 * The three-frame cap on `/components`, as the list underneath it.
 *
 * Each open row draws its component in a frame of the app, and one frame boots
 * the whole bundle, so three is the limit and recency decides which three get
 * one. There is no DOM in this suite, so what can be asserted here is the
 * bookkeeping: the order rows are opened in, and — the part that shipped missing
 * — that a row leaving the page gives its frame back. It leaves without shutting
 * whenever the filter above it stops matching, no `toggle` event follows, and a
 * page that only listens for toggles keeps the id for the rest of the visit:
 * measured, that wedged the one row on screen into asking the reader to close
 * three rows that were not there, and put a frame inside three shut rows.
 */
describe('which rows draw their component', () => {
  const open = (ids: string[]) => ids.reduce((list, id) => opened(list, id, true), [] as string[]);

  it('draws the three most recently opened', () => {
    const rows = open(['a', 'b', 'c', 'd']);

    expect([...framed(rows)]).toEqual(['b', 'c', 'd']);
  });

  it('gives the frame back when a row shuts', () => {
    const rows = opened(open(['a', 'b', 'c', 'd']), 'd', false);

    expect([...framed(rows)]).toEqual(['a', 'b', 'c']);
  });

  it('gives it back when a row is reported gone, which is what an unmount does', () => {
    const rows = opened(open(['a', 'b', 'c', 'd']), 'b', false);

    expect([...framed(rows)]).toEqual(['a', 'c', 'd']);
    expect(rows).not.toContain('b');
  });

  it('counts a row opened twice once, and last', () => {
    // The palette can open a row that is already open, and `useAskedFor` sets
    // `open` on an element the reader may have opened by hand.
    const rows = opened(open(['a', 'b']), 'a', true);

    expect(rows).toEqual(['b', 'a']);
  });
});
