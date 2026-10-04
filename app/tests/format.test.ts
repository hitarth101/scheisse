import { describe, expect, it } from 'vitest';
import { backupLine, clock, daysAgo, longDate, minutes, shortDate, trackNo } from '../src/lib/format';

describe('format (design spec 8)', () => {
  it('clock', () => {
    expect(clock(0)).toBe('0:00');
    expect(clock(221)).toBe('3:41');
    expect(clock(585.04)).toBe('9:45');
    expect(clock(3725)).toBe('1:02:05');
    expect(clock(-5)).toBe('0:00');
  });
  it('minutes', () => {
    expect(minutes(0)).toBe('0 min');
    expect(minutes(780)).toBe('13 min');
    expect(minutes(5520)).toBe('1 h 32 min');
    expect(minutes(3600)).toBe('1 h');
  });
  it('dates', () => {
    const d = new Date(2026, 9, 3, 21, 14);
    expect(longDate(d)).toBe('Saturday 3 October');
    expect(shortDate(d, new Date(2026, 11, 1))).toBe('3 October');
    expect(shortDate(d, new Date(2027, 0, 1))).toBe('3 October 2026');
    expect(daysAgo(d, new Date(2026, 9, 3, 23))).toBe('today');
    expect(daysAgo(d, new Date(2026, 9, 4, 1))).toBe('yesterday');
    expect(backupLine(new Date(2026, 8, 28), new Date(2026, 9, 3))).toBe('28 September 2026, 5 days ago');
  });
  it('track numbers', () => {
    expect(trackNo(9)).toBe('09');
    expect(trackNo(50)).toBe('50');
  });
});
