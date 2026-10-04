import { describe, expect, it } from 'vitest';
import { bucketCount, coveredFraction, emptyCoverage, isListened, markCovered } from '../src/lectures/progress';

describe('95% rule (product spec 4.2)', () => {
  it('starts empty', () => {
    expect(emptyCoverage(445.03)).toHaveLength(bucketCount(445.03));
    expect(coveredFraction(emptyCoverage(100))).toBe(0);
  });
  it('counts continuous playback once, however often it is replayed', () => {
    let c = emptyCoverage(100);
    for (let t = 0; t < 50; t += 0.25) c = markCovered(c, 100, t, t + 0.25);
    expect(coveredFraction(c)).toBeCloseTo(0.55, 2); // stretches 0..10 of 20 touched
    for (let t = 0; t < 50; t += 0.25) c = markCovered(c, 100, t, t + 0.25);
    expect(coveredFraction(c)).toBeCloseTo(0.55, 2);
  });
  it('is done at 95% and not before', () => {
    let c = emptyCoverage(100); // 20 stretches of 5 s
    c = markCovered(c, 100, 0, 89); // stretches 0..17 = 90%
    expect(isListened(c)).toBe(false);
    c = markCovered(c, 100, 89, 94.9); // up to stretch 18 = 95%
    expect(isListened(c)).toBe(true);
  });
  it('ignores backwards or empty ranges', () => {
    const c = emptyCoverage(100);
    expect(markCovered(c, 100, 50, 40)).toBe(c);
    expect(markCovered(c, 100, 50, 50)).toBe(c);
  });
  it('repairs a stored string of the wrong length', () => {
    expect(markCovered('1', 100, 0, 1)).toHaveLength(20);
  });
});
