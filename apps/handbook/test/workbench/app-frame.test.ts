import { describe, expect, it } from 'vitest';

import { loadedTheAddress, tookTheRoute } from '../../src/workbench/AppFrame';

/**
 * The two readings of a frame's address, and both of them shipped wrong once.
 *
 * A frame on `/components` is pointed at an address and then handed its route
 * through the app's own router, because in a development build the address alone
 * lands on the app's 404. Which of those has happened cannot be asked of the
 * address in the obvious way, and the obvious way is what failed:
 *
 * - "the path is the one I asked for" is true from the instant the frame is
 *   pointed at it, while the document on screen is still the empty one it started
 *   with. `document.URL` is the document's own address and cannot lie about that.
 * - "the app took the route" is not a path being right but the base path being
 *   *gone*, because a development bundle does not put it back on a navigation.
 *
 * Fake windows rather than a browser, because both functions are one line about a
 * pair of strings, and the strings are what was wrong.
 */
function win(document: { URL: string; readyState?: string }, location?: Partial<Location>) {
  return {
    document,
    location: {
      protocol: 'http:',
      pathname: new URL(document.URL, 'http://x').pathname,
      ...location,
    },
  } as unknown as Window;
}

describe('reading a frame’s address', () => {
  it('says the route was taken once the base path has gone', () => {
    expect(tookTheRoute(win({ URL: 'http://x/gallery?c=ui/Button' }))).toBe(true);
  });

  it('says it was not while the address still carries the base', () => {
    expect(tookTheRoute(win({ URL: 'http://x/app/gallery?c=ui/Button' }))).toBe(false);
  });

  it('says nothing about a frame that has not been anywhere', () => {
    const blank = {
      document: { URL: 'about:blank' },
      location: { protocol: 'about:', pathname: 'blank' },
    };
    expect(tookTheRoute(blank as unknown as Window)).toBe(false);
    expect(tookTheRoute(null)).toBe(false);
  });

  it('waits for the document, not for the address', () => {
    // The frame reports the new path immediately; the empty document it is still
    // showing reports "complete". Together they used to mean "done".
    const midFlight = {
      document: { URL: 'about:blank', readyState: 'complete' },
      location: { protocol: 'http:', pathname: '/app/gallery' },
    };
    expect(loadedTheAddress(midFlight as unknown as Window)).toBe(false);
  });

  it('is loaded when the document at the address is', () => {
    expect(
      loadedTheAddress(win({ URL: 'http://x/app/gallery?c=ui/Button', readyState: 'complete' })),
    ).toBe(true);
    expect(
      loadedTheAddress(win({ URL: 'http://x/app/gallery?c=ui/Button', readyState: 'loading' })),
    ).toBe(false);
  });
});
