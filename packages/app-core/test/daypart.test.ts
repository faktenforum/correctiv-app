import { describe, expect, it } from 'vitest';

import { DAYPART_HOURS, daypartAt, timedModuleAt } from '../src/lib/daypart';

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
    for (const [from, to] of Object.values(DAYPART_HOURS)) {
      expect(daypartAt(at(from))).not.toBe('off-hours');
      expect(daypartAt(at(from, 59))).not.toBe('off-hours');
      expect(daypartAt(at(to))).toBe('off-hours');
    }
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
