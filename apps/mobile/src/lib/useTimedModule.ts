import { useEffect, useState } from 'react';

import {
  nextDaypartChange,
  timedModuleAt,
  type TimedModule,
} from '@correctiv/app-core/lib/daypart';

/**
 * The module Home lifts to the top right now, kept in step with the clock.
 *
 * `timedModuleAt` is a pure function of a moment, and the moment has to come from
 * somewhere. Reading `Date.now()` on render was the first version, on the theory that
 * Home re-renders often enough. It does not: a tab screen stays mounted, and it
 * re-renders when a feed lands, on a pull to refresh or on a theme change, none of
 * which happens on the hour. So the block moved on the next cold start rather than at
 * the boundary, and the screen disagreed with the table for as long as nobody touched
 * it.
 *
 * One timer to the next boundary, which React cancels with the screen. Not a slice and
 * not an interval: the core's table knows exactly when its answer changes, so there is
 * one wake-up per boundary and nothing to poll. A device that sleeps through the
 * boundary fires the timer on resume, which is the moment the screen is next seen.
 */
export function useTimedModule(): TimedModule | null {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, nextDaypartChange(now) - now));
    return () => clearTimeout(timer);
  }, [now]);

  return timedModuleAt(now);
}
