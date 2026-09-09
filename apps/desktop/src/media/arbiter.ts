// Who owns the one MPRIS bus name, with no D-Bus anywhere in it.
//
// ## Why this is a file and not four lines inside `mpris.ts`
//
// It was four lines inside `mpris.ts`, and they were wrong. `release` put the service
// back to silence unconditionally, so this sequence ended with a shell showing nothing
// over a playing radio:
//
//   radio starts        -> audio claims
//   a video opens       -> video claims, audio's `changed()` calls become no-ops
//   the video closes    -> video releases -> SILENCE, for ever
//
// For ever, because the audio binding claims once and then only reports changes: its
// own record said it still held the name. Nothing about that is visible in a
// screenshot and it needs two players to reproduce, which is exactly the kind of thing
// that should be a vector instead. Lifted out, it is a stack with no `gi://` import,
// so `test/mpris-arbiter.test.ts` can drive it.
//
// A STACK rather than one slot, because the question "who had it before" has a real
// answer and callers arrive and leave in any order. `release` on a source that is not
// on top removes it from the middle and changes nothing visible, which is what should
// happen when a background video screen tears down while the radio is in front.

/** Answers whether the current owner changed, so a caller knows when to publish. */
export interface Arbiter<T> {
  /** Whoever owns the name now, or null when nobody does. */
  readonly current: T | null;
  /** Take the name. Answers true when the owner changed. */
  claim(source: T): boolean;
  /** Give it up, wherever in the order it sits. Answers true when the owner changed. */
  release(source: T): boolean;
}

export function createArbiter<T>(): Arbiter<T> {
  /** Oldest first; the last entry owns the name. */
  const stack: T[] = [];

  const drop = (source: T): void => {
    const at = stack.indexOf(source);
    if (at !== -1) stack.splice(at, 1);
  };

  return {
    get current(): T | null {
      return stack.length === 0 ? null : (stack[stack.length - 1] as T);
    },
    claim(source: T): boolean {
      const before = stack[stack.length - 1];
      // Re-claiming what is already on top is a no-op rather than a duplicate entry:
      // a source that claimed twice would then need two releases to let go.
      drop(source);
      stack.push(source);
      return before !== source;
    },
    release(source: T): boolean {
      const before = stack[stack.length - 1];
      drop(source);
      return before !== stack[stack.length - 1];
    },
  };
}
