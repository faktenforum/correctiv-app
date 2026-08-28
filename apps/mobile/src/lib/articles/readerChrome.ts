/**
 * When the reader's overlay header shows, expressed as a rule rather than as
 * scattered comparisons inside the screen.
 *
 * The header floats over the article instead of pushing it down, which is what the
 * design wants for the hero image. Past the hero it was sitting on the text: a
 * headline rendered as "zeniert" because the back chevron covered "insz". That
 * happened in both colour schemes and at every scroll position, so it was the normal
 * reading state and not an edge case.
 *
 * It is a separate function because the alternative is testing it through a WebView,
 * and the two numbers below are exactly the kind that get nudged until the flicker
 * "looks fine" on one device.
 */

/**
 * Below this offset in px the header always shows. That band is the hero image, the
 * thing the header was meant to float over.
 */
export const HEADER_ALWAYS_VISIBLE_UNTIL = 96;

/**
 * How far the reader must move in one direction before the header reacts, in px. A
 * WebView reports scroll continuously, and with no floor the header flickers on the
 * few pixels a finger lift produces.
 */
export const DIRECTION_THRESHOLD = 12;

/**
 * Whether the header should be hidden after a scroll from `previousY` to `nextY`.
 *
 * Returns `hidden` unchanged when the movement is too small to read as a direction,
 * so a caller can hand every scroll event straight in.
 */
export function nextHeaderHidden(hidden: boolean, previousY: number, nextY: number): boolean {
  if (nextY <= HEADER_ALWAYS_VISIBLE_UNTIL) return false;

  const delta = nextY - previousY;
  if (Math.abs(delta) < DIRECTION_THRESHOLD) return hidden;

  return delta > 0;
}
