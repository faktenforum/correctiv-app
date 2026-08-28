import { describe, expect, it } from 'vitest';
import {
  formatDateDe,
  formatDateShortDe,
  formatDateWeekdayDe,
  formatMinutesDe,
  formatNumberDe,
  formatTimeHm,
} from '../src/lib/format';

/**
 * These formatters exist because a JS runtime on a device may ship no German ICU
 * data, and `toLocaleDateString('de-DE')` then silently falls back to English. That
 * failure is invisible in a browser, which is exactly why it needs tests.
 */
describe('date formatting', () => {
  // Constructed in local time so the assertions do not depend on the TZ the
  // suite runs in (CI is UTC, Pascal's machine is CEST).
  const d = new Date(2026, 5, 12, 17, 20, 6); // 12 June 2026, a Friday

  it('formats a full German date', () => {
    expect(formatDateDe(d)).toBe('12. Juni 2026');
  });

  it('formats a German date with weekday', () => {
    expect(formatDateWeekdayDe(d)).toBe('Freitag, 12. Juni 2026');
  });

  it('formats a short German date', () => {
    expect(formatDateShortDe(d)).toBe('12. Juni');
  });

  it('accepts ISO strings', () => {
    expect(formatDateDe('2026-01-01T00:00:00')).toBe('1. Januar 2026');
    expect(formatDateShortDe('2026-12-31T12:00:00')).toBe('31. Dezember');
  });

  it('returns an empty string for unparseable input instead of "Invalid Date"', () => {
    expect(formatDateDe('nope')).toBe('');
    expect(formatDateWeekdayDe('')).toBe('');
    expect(formatDateShortDe('nope')).toBe('');
  });
});

describe('formatTimeHm', () => {
  it('renders player positions as m:ss', () => {
    expect(formatTimeHm(0)).toBe('0:00');
    expect(formatTimeHm(9)).toBe('0:09');
    expect(formatTimeHm(65)).toBe('1:05');
    expect(formatTimeHm(3600)).toBe('60:00');
  });

  it('truncates fractional seconds', () => {
    expect(formatTimeHm(59.9)).toBe('0:59');
  });
});

describe('formatMinutesDe', () => {
  it('rounds to whole minutes', () => {
    expect(formatMinutesDe(1500)).toBe('25 Min.');
    expect(formatMinutesDe(1530)).toBe('26 Min.');
  });

  it('never shows "0 Min." for a short clip', () => {
    expect(formatMinutesDe(0)).toBe('1 Min.');
    expect(formatMinutesDe(5)).toBe('1 Min.');
  });
});

describe('formatNumberDe', () => {
  it('groups thousands with a dot', () => {
    expect(formatNumberDe(1000)).toBe('1.000');
    expect(formatNumberDe(1234567)).toBe('1.234.567');
  });

  it('leaves small numbers alone', () => {
    expect(formatNumberDe(0)).toBe('0');
    expect(formatNumberDe(999)).toBe('999');
  });
});
