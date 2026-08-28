import {
  DIRECTION_THRESHOLD,
  HEADER_ALWAYS_VISIBLE_UNTIL,
  nextHeaderHidden,
} from '../src/lib/articles/readerChrome';

/**
 * The reader's overlay header used to sit on the article text at every scroll
 * position past the hero image, in both colour schemes. A headline read "zeniert"
 * because the back chevron covered "insz".
 *
 * These assertions are the rule that replaced it. They exist because the failure
 * they guard against is invisible to a typecheck and to any screenshot of the first
 * viewport, which is where the controls sit over the hero and look correct.
 */
describe('nextHeaderHidden', () => {
  it('keeps the header over the hero, however the reader is scrolled there', () => {
    expect(nextHeaderHidden(false, 0, 40)).toBe(false);
    expect(nextHeaderHidden(true, 400, 40)).toBe(false);
    expect(nextHeaderHidden(true, 0, HEADER_ALWAYS_VISIBLE_UNTIL)).toBe(false);
  });

  it('hides on the way down and shows on the way up, past the hero', () => {
    const past = HEADER_ALWAYS_VISIBLE_UNTIL + 100;
    expect(nextHeaderHidden(false, past, past + 200)).toBe(true);
    expect(nextHeaderHidden(true, past + 200, past)).toBe(false);
  });

  it('ignores movement too small to be a direction, so the header cannot flicker', () => {
    const past = HEADER_ALWAYS_VISIBLE_UNTIL + 100;
    const nudge = DIRECTION_THRESHOLD - 1;

    // The state is carried through unchanged rather than recomputed, which is what
    // lets the screen hand in every scroll event the WebView produces.
    expect(nextHeaderHidden(true, past, past + nudge)).toBe(true);
    expect(nextHeaderHidden(false, past, past + nudge)).toBe(false);
    expect(nextHeaderHidden(true, past, past - nudge)).toBe(true);
    expect(nextHeaderHidden(false, past, past - nudge)).toBe(false);
  });

  it('reacts once the movement reaches the threshold exactly', () => {
    const past = HEADER_ALWAYS_VISIBLE_UNTIL + 100;
    expect(nextHeaderHidden(false, past, past + DIRECTION_THRESHOLD)).toBe(true);
    expect(nextHeaderHidden(true, past + DIRECTION_THRESHOLD, past)).toBe(false);
  });
});
