import { describe, expect, it } from 'vitest';
import { launchHash, parse, pathOf } from '../src/lib/router';

describe('router', () => {
  it('parses and prints every page', () => {
    for (const h of ['#/flashcards', '#/flashcards/w%3ATisch%7Cm', '#/study', '#/lectures', '#/lectures/09', '#/lectures/50/sentences',
      '#/status', '#/status/settings', '#/status/credits']) {
      expect('#' + pathOf(parse(h))).toBe(h);
    }
  });
  it('falls back to Flashcards or the list for unknown and old addresses', () => {
    expect(parse('')).toEqual({ name: 'flashcards' });
    expect(parse('#/nonsense')).toEqual({ name: 'flashcards' });
    expect(parse('#/today')).toEqual({ name: 'flashcards' });
    expect(parse('#/review?only=reviews')).toEqual({ name: 'study' });
    expect(parse('#/flashcards/w%3ATisch%7Cm')).toEqual({ name: 'card', note: 'w:Tisch|m' });
    expect(parse('#/lectures/51')).toEqual({ name: 'lectures' });
    expect(parse('#/lectures/0')).toEqual({ name: 'lectures' });
  });
  it('reopens the last page only within 10 minutes', () => {
    localStorage.setItem('scheisse.lastPage', JSON.stringify({ hash: '#/lectures/09', at: 1_000_000 }));
    expect(launchHash(1_000_000 + 9 * 60_000)).toBe('#/lectures/09');
    expect(launchHash(1_000_000 + 11 * 60_000)).toBe('#/flashcards');
  });
});
