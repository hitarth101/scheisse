import { describe, expect, it } from 'vitest';
import { compareAnswer } from '../src/review/compare';
import { grade, intervalLabel, LEECH_FAILS, newCard, previewIntervals, STATE } from '../src/review/scheduler';

const marked = (typed: string, expected: string) =>
  compareAnswer(typed, expected).segments.map(s => (s.kind === 'ok' ? s.text : `[${s.kind}:${s.text}]`)).join('');

describe('typed answer comparison (product spec 4.3)', () => {
  it('an exact answer has no marks', () => {
    const c = compareAnswer('Ich mag Züge!', 'Ich mag Züge!');
    expect(c.exact).toBe(true);
    expect(c.notes).toEqual([]);
  });
  it('ignores punctuation and extra spaces', () => {
    expect(compareAnswer(' ich mag  Züge ', 'Ich mag Züge!').exact).toBe(false); // capital I differs
    expect(compareAnswer('Ich mag Züge', 'Ich mag Züge!').exact).toBe(true);
    expect(compareAnswer('der Tisch die Tische', 'der Tisch, die Tische').exact).toBe(true);
  });
  it('treats "ue" for ü and "ss" for ß as notes, not mistakes', () => {
    const c = compareAnswer('Ich mag Zuege', 'Ich mag Züge');
    expect(c.exact).toBe(true);
    expect(c.notes.map(n => n.kind)).toEqual(['umlaut']);
    expect(marked('Ich mag Zuege', 'Ich mag Züge')).toBe('Ich mag Z[nt:ue]ge');
    expect(compareAnswer('die Strasse', 'die Straße').notes.map(n => n.kind)).toEqual(['eszett']);
  });
  it('marks a lower-case noun as a difference with a note (design spec example)', () => {
    const c = compareAnswer('Ich mag zuege!', 'Ich mag Züge!');
    expect(c.exact).toBe(false);
    expect(marked('Ich mag zuege!', 'Ich mag Züge!')).toBe('Ich mag [x:z][nt:ue]ge!');
    expect(c.notes.map(n => n.kind).sort()).toEqual(['case', 'umlaut']);
  });
  it('marks wrong and missing letters', () => {
    expect(marked('der Tich', 'der Tisch')).toBe('der Ti[miss:s]ch');
    expect(marked('das Tisch', 'der Tisch')).toBe('d[x:as] Tisch');
  });
});

describe('scheduling (FSRS)', () => {
  const now = Date.UTC(2026, 9, 3, 9);
  it('a new card graded Good comes back within the day; Easy much later', () => {
    const c = newCard('w:Tisch|m', 'production', now);
    expect(c.state).toBe(STATE.New);
    const iv = previewIntervals(c, now, 0.9);
    expect(iv[1]).toBeLessThan(iv[3]);
    expect(iv[3]).toBeLessThan(iv[4]);
    expect(iv[4]).toBeGreaterThanOrEqual(24 * 3600_000);
    const g = grade(c, 3, now, 0.9);
    expect(g.reps).toBe(1);
    expect(g.due).toBeGreaterThan(now);
  });
  it('suspends a card the 8th time it is failed (leech)', () => {
    let c = newCard('w:Tisch|m', 'production', now);
    let t = now;
    for (let k = 0; k < LEECH_FAILS - 1; k++) { c = grade(c, 1, t, 0.9); t += 60_000; }
    expect(c.suspended).toBe(0);
    c = grade(c, 1, t, 0.9);
    expect(c.fails).toBe(LEECH_FAILS);
    expect(c.suspended).toBe(1);
    expect(c.suspendReason).toBe('leech');
  });
  it('interval labels', () => {
    expect(intervalLabel(60_000)).toBe('<10 min');
    expect(intervalLabel(10 * 60_000)).toBe('10 min');
    expect(intervalLabel(86_400_000)).toBe('1 day');
    expect(intervalLabel(3 * 86_400_000)).toBe('3 days');
    expect(intervalLabel(62 * 86_400_000)).toBe('2 mo');
  });
});
