/**
 * What the reader's overlay header is doing, expressed as a rule rather than as
 * scattered comparisons inside the screen.
 *
 * The header floats over the article instead of pushing it down, which is what the
 * design wants for the hero image. Past the hero it was sitting on the text: a
 * headline rendered as "zeniert" because the back chevron covered "insz". That
 * happened in both colour schemes and at every scroll position, so it was the normal
 * reading state and not an edge case.
 *
 * One value rather than a pair of flags, because two of the three states differ only
 * in whether the header floats, and a `floating` header that is also allowed to hide
 * would put the controls back on the text. Making that combination unrepresentable
 * is cheaper than remembering not to write it.
 *
 * It is a separate module because the alternative is testing this through a WebView,
 * and the two numbers below are exactly the kind that get nudged until the flicker
 * "looks fine" on one device.
 */

/**
 * - `floating`  — over the hero image, transparent, the way the design draws it.
 * - `onSurface` — past the hero, carrying the page surface so text cannot show
 *   through it.
 * - `hidden`    — past the hero and scrolling down, out of the way entirely.
 */
export type HeaderState = 'floating' | 'onSurface' | 'hidden';

/**
 * Below this offset in px the header always floats. That band is the hero image, the
 * thing the header was meant to float over.
 */
export const HERO_BAND = 96;

/**
 * How far the reader must move in one direction before the header reacts, in px. A
 * WebView reports scroll continuously, and with no floor the header flickers on the
 * few pixels a finger lift produces.
 */
export const DIRECTION_THRESHOLD = 12;

/**
 * The header's state after a scroll from `previousY` to `nextY`.
 *
 * Movement too small to read as a direction leaves `current` alone, so a caller can
 * hand in every scroll event the platform produces.
 */
export function nextHeaderState(
  current: HeaderState,
  previousY: number,
  nextY: number,
): HeaderState {
  if (nextY <= HERO_BAND) return 'floating';

  const delta = nextY - previousY;
  if (Math.abs(delta) < DIRECTION_THRESHOLD) {
    // Leaving the hero band without a readable direction still has to stop the
    // header floating, or it keeps sitting on text until the next real scroll.
    return current === 'floating' ? 'onSurface' : current;
  }

  return delta > 0 ? 'hidden' : 'onSurface';
}
