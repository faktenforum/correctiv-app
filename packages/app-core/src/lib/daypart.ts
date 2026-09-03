/**
 * Which module Home lifts to the top right now, as a function of the clock.
 *
 * The requirements ask for this and call it the app's own idea: "Time-based features,
 * pushed to the top of the home screen between certain hours, after they drop into the
 * chronological feed." Three are named. A morning podcast, the evening Spotlight with
 * "Was zählt", and Mitmachen around lunchtime, which "has its own section the rest of
 * the time" — that last clause is the whole mechanism in one line. A module does not
 * appear and disappear; it moves.
 *
 * ## Why this is a pure function and not a store
 *
 * There is no state here, only the clock, and the clock is a parameter. A slice would
 * have to be told the time by something, and that something would be a timer nobody
 * cancels. A host asks on render and gets an answer, and `nextDaypartChange` tells it
 * when to ask again; a test hands it 07:30 and gets the morning without waiting for
 * one.
 *
 * Local hours on purpose. The reader's morning is the morning where the reader is, and
 * `Date.prototype.getHours` is the only thing in the platform that knows that.
 */

/** The named parts of a day, plus everything the requirements do not name. */
export type Daypart = 'morning' | 'midday' | 'evening' | 'off-hours';

/**
 * The boundaries, inclusive of the first hour and exclusive of the last.
 *
 * Editorial numbers, not measured ones: nobody has said when the morning podcast drops
 * or when Spotlight is sent. They are here as one table rather than as conditions
 * inside the function, so moving them is an edit and not a rewrite, and so a reviewer
 * can argue with the numbers without reading the code.
 */
export const DAYPART_HOURS: Record<Exclude<Daypart, 'off-hours'>, readonly [number, number]> = {
  morning: [5, 10],
  midday: [11, 14],
  evening: [17, 22],
};

/**
 * Which part of the day a moment falls in.
 *
 * The ranges above must not overlap. This returns the FIRST match, so an overlap makes
 * the earlier key win silently and the later one simply never happen. Nothing in the
 * types prevents it and nothing at runtime complains, which is why there is a test
 * (`daypart.test.ts`) that reads the table and fails on an overlap: an editor moving
 * these numbers should be told, not left to find out from a screenshot.
 */
export function daypartAt(now: number | Date): Daypart {
  const hour = new Date(now).getHours();
  for (const [part, [from, to]] of Object.entries(DAYPART_HOURS)) {
    if (hour >= from && hour < to) return part as Daypart;
  }
  return 'off-hours';
}

/**
 * The modules the requirements want lifted, one per daypart.
 *
 * `morning-podcast` and `evening-briefing` are the two the requirements mark as MVP,
 * and the app can render neither: there is no morning podcast in the app, and the
 * evening slot wants Spotlight together with "Was zählt", which is a real podcast since
 * 22 June 2026 and is not connected. Both are named here rather than left out, because
 * the gap is the point: the mechanism is ready and the sources are the open question.
 *
 * `participate` is the one slot the app can fill today, from `data/callouts`. It is
 * also the one the requirements do NOT mark as MVP, which is worth knowing before
 * anyone reads a working lunchtime module as the feature being delivered.
 */
export type TimedModule = 'morning-podcast' | 'participate' | 'evening-briefing';

const WANTED: Record<Daypart, TimedModule | null> = {
  morning: 'morning-podcast',
  midday: 'participate',
  evening: 'evening-briefing',
  'off-hours': null,
};

/** The modules a host can actually render. The rest resolve to nothing. */
const AVAILABLE: ReadonlySet<TimedModule> = new Set(['participate']);

/**
 * The module to lift right now, or null to leave Home in its ordinary order.
 *
 * Returns null for a daypart whose module has no source yet, rather than lifting an
 * empty slot: a heading over nothing is worse than no heading.
 */
export function timedModuleAt(now: number | Date): TimedModule | null {
  const wanted = WANTED[daypartAt(now)];
  return wanted !== null && AVAILABLE.has(wanted) ? wanted : null;
}

/**
 * The next moment at which `daypartAt` changes its answer, as a timestamp.
 *
 * For a host that reads the clock on render. Home computes `timedModuleAt` when it
 * renders, and nothing re-renders a mounted tab on the hour, so without this the
 * block moved on the next feed load or cold start rather than at the boundary. One
 * timer to this moment, cancelled with the screen, is what makes the screen agree
 * with the table. Local hours, like everything else here: `Date`'s local constructor
 * absorbs a daylight-saving shift on the day it happens.
 */
export function nextDaypartChange(now: number | Date): number {
  const at = new Date(now);
  const boundaries = [...new Set(Object.values(DAYPART_HOURS).flat())].sort((a, b) => a - b);
  for (const hour of boundaries) {
    const candidate = new Date(at.getFullYear(), at.getMonth(), at.getDate(), hour).getTime();
    if (candidate > at.getTime()) return candidate;
  }
  // Past today's last boundary: the first one tomorrow.
  return new Date(at.getFullYear(), at.getMonth(), at.getDate() + 1, boundaries[0]!).getTime();
}
