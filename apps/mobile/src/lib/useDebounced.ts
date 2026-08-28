import { useEffect, useState } from 'react';

/**
 * `value` once it has stopped changing for `delayMs`.
 *
 * Keeps the search from firing a request per keystroke. The timer hangs off the
 * effect, so it is cleared on the next character and on unmount — unlike a
 * module-level timer, which would fire once more after leaving the screen.
 */
export function useDebounced<T>(value: T, delayMs: number): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
}
