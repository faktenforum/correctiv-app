import { describe, expect, it } from 'vitest';

import { DAYPART_HOURS, daypartAt, nextDaypartChange, timedModuleAt } from '../src/lib/daypart';

/** Local time, because the function reads local hours and so does a reader's day. */
const at = (hour: number, minute = 0) => new Date(2026, 8, 3, hour, minute, 0, 0);

describe('daypartAt', () => {
  it('names the three parts the requirements name', () => {
    expect(daypartAt(at(7))).toBe('morning');
    expect(daypartAt(at(12, 30))).toBe('midday');
    expect(daypartAt(at(19))).toBe('evening');
  });

  it('calls everything else off-hours', () => {
    expect(daypartAt(at(3))).toBe('off-hours');
    expect(daypartAt(at(10, 30))).toBe('off-hours');
    expect(daypartAt(at(15))).toBe('off-hours');
    expect(daypartAt(at(23))).toBe('off-hours');
  });

  /**
   * The boundaries are the only thing here that can be off by one, and they are the
   * thing an editor will want to move. Read from the table so the test moves with it.
   */
  it('includes the opening hour and excludes the closing one', () => {
    for (const [part, [from, to]] of Object.entries(DAYPART_HOURS)) {
      expect(daypartAt(at(from))).toBe(part);
      expect(daypartAt(at(from, 59))).toBe(part);
      // Not "off-hours": the table may let one part begin where another ends, and
      // the overlap check below deliberately allows that. Only the same part is wrong.
      expect(daypartAt(at(to))).not.toBe(part);
    }
  });

  /**
   * The function returns the first match, so an overlap in the table would make the
   * earlier key win and the later one never happen, with nothing to say so. Found by
   * moving the numbers by hand to look at the lifted layout, which quietly stayed in
   * the morning.
   */
  it('has no overlapping ranges', () => {
    const ranges = Object.entries(DAYPART_HOURS);
    const faults: string[] = [];
    for (const [aName, [aFrom, aTo]] of ranges) {
      if (aFrom >= aTo) faults.push(`${aName} does not open before it closes`);
      for (const [bName, [bFrom, bTo]] of ranges) {
        if (aName < bName && aFrom < bTo && bFrom < aTo) {
          faults.push(`${aName} overlaps ${bName}`);
        }
      }
    }
    // Collected rather than asserted one by one, so a failure names every clash.
    expect(faults).toEqual([]);
  });

  it('takes a timestamp as readily as a Date', () => {
    expect(daypartAt(at(12).getTime())).toBe('midday');
  });
});

describe('timedModuleAt', () => {
  it('lifts the participate module at lunchtime', () => {
    expect(timedModuleAt(at(12))).toBe('participate');
  });

  /**
   * The two slots the requirements mark as MVP are the two the app cannot fill: there
   * is no morning podcast in the app, and the evening slot wants "Was zählt", which is
   * not connected. Null rather than a heading over nothing.
   */
  it('lifts nothing in a daypart whose module has no source', () => {
    expect(timedModuleAt(at(7))).toBeNull();
    expect(timedModuleAt(at(19))).toBeNull();
  });

  it('lifts nothing outside the named hours', () => {
    expect(timedModuleAt(at(3))).toBeNull();
    expect(timedModuleAt(at(15))).toBeNull();
  });
});

describe('nextDaypartChange', () => {
  it('names the next boundary, whether it opens a part or closes one', () => {
    expect(nextDaypartChange(at(7))).toBe(at(10).getTime());
    expect(nextDaypartChange(at(10, 30))).toBe(at(11).getTime());
    expect(nextDaypartChange(at(12))).toBe(at(14).getTime());
  });

  it('is strictly after now, so a boundary hour itself points at the next one', () => {
    expect(nextDaypartChange(at(11))).toBe(at(14).getTime());
  });

  it('rolls over to the first boundary of the next day after the last one', () => {
    const tomorrow = new Date(2026, 8, 4, 5, 0, 0, 0).getTime();
    expect(nextDaypartChange(at(22))).toBe(tomorrow);
    expect(nextDaypartChange(at(23, 59))).toBe(tomorrow);
  });

  /**
   * What a timer set to this moment relies on: the answer holds until then and is
   * different from then. Walked over every hour so the table can move without this
   * test needing to.
   */
  it('agrees with daypartAt across the day', () => {
    for (let hour = 0; hour < 24; hour++) {
      const now = at(hour, 17);
      const next = nextDaypartChange(now);
      expect(daypartAt(next - 1)).toBe(daypartAt(now));
      expect(daypartAt(next)).not.toBe(daypartAt(now));
    }
  });
});
