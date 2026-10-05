import { beforeEach, describe, expect, it } from 'vitest';
import { db, type SentenceRow, type WordRow } from '../src/db/db';
import { setSetting } from '../src/db/settings';
import { introduceNext, isFunctionWord, lecturePairNote, addNote } from '../src/review/notes';
import { grantMore, pickNext, queueState } from '../src/review/queue';
import { recordGrade } from '../src/review/session';

// Word ids and lemmas mimic words.json; meanings are placeholders, not shown anywhere.
const w = (lemma: string, pos: string, order: number): WordRow =>
  ({ id: lemma, lemma, pos, level: 'A1', order, en: [`(${lemma})`] });

const WORDS: WordRow[] = [
  w('der', 'article', 0), w('in', 'preposition', 1), w('und', 'conjunction', 2), w('ich', 'pronoun', 3),
  w('sein', 'verb', 4), w('mein', 'determiner', 5), w('ein', 'numeral', 6), w('nicht', 'adverb', 7),
  w('haben', 'verb', 8), w('Tisch', 'noun', 9), w('gut', 'adjective', 10), w('Haus', 'noun', 11),
  w('gehen', 'verb', 12), w('neu', 'adjective', 13), w('Zug', 'noun', 14),
];
const SENTENCES: SentenceRow[] = [
  { id: 1, de: '(a)', en: '(a)', enId: 11, w: ['der', 'Tisch', 'sein', 'gut'] },      // all learned or function words
  { id: 2, de: '(bb)', en: '(b)', enId: 12, w: ['ich', 'und', 'in'] },              // only function words: never
  { id: 3, de: '(ccc)', en: '(c)', enId: 13, w: ['Zug', 'Haus'] },                   // words not yet learned
];
const DAY1 = new Date(2026, 9, 4, 9).getTime();
const HOUR = 3_600_000;

async function reset() {
  await Promise.all(db.tables.map(t => t.clear()));
  await db.content.bulkPut([{ key: 'words', value: WORDS }, { key: 'sentences', value: SENTENCES }]);
}

describe('introducing new cards (product spec 5.5)', () => {
  beforeEach(reset);

  it('knows which words are function words', () => {
    expect(['der', 'in', 'und', 'ich', 'mein', 'ein'].every(l => isFunctionWord(WORDS.find(x => x.lemma === l)!))).toBe(true);
    expect(['sein', 'nicht', 'Tisch', 'gut'].some(l => isFunctionWord(WORDS.find(x => x.lemma === l)!))).toBe(false);
  });

  it('makes one card at a time: content words in learning order, then a sentence per three words', async () => {
    const made: string[] = [];
    for (let i = 0; i < 9; i++) made.push((await introduceNext(DAY1 + i))!.noteId);
    expect(made).toEqual(['w:sein', 'w:nicht', 'w:haben', 'w:Tisch', 'w:gut', 's:1', 'w:Haus', 'w:gehen', 'w:neu']);
    expect(await db.cards.count()).toBe(18); // say it + hear it
  });
});

describe('the flashcard queue (owner decision 2026-10-04)', () => {
  beforeEach(reset);

  it('serves new cards up to the daily allowance, then "Add 5 more" raises it', async () => {
    await setSetting('newPerDay', 3);
    let now = DAY1;
    for (let i = 0; i < 3; i++) {
      const q = await queueState(now);
      expect(pickNext(q)).toBe('introduce');
      const card = (await introduceNext(now))!;
      await recordGrade(card, 4, 5000, 'speak', 0.9, now); // Easy: graduates, due in days
      now += 60_000;
    }
    let q = await queueState(now);
    expect(q.newDone).toBe(3);
    expect(q.newLeft).toBe(0);
    expect(pickNext(q)).toBeNull();
    await grantMore(5, now);
    q = await queueState(now);
    expect(q.newLeft).toBe(5);
  });

  it('puts picked lecture sentences first, and they use the allowance', async () => {
    await setSetting('newPerDay', 2);
    for (const i of [0, 1, 2]) await addNote(lecturePairNote(3, i, { de: `(de${i})`, en: `(en${i})` }, false, { de: `(de${i})`, en: `(en${i})` }, DAY1), DAY1);
    const q = await queueState(DAY1 + 1000);
    expect(q.waiting.map(c => c.noteId)).toEqual(['lt:03:0', 'lt:03:1', 'lt:03:2']);
    expect(q.newLeft).toBe(2);
    expect(pickNext(q)).toMatchObject({ noteId: 'lt:03:0', type: 'production' });
  });

  it('shows "hear it" only from the day after "say it" was first answered', async () => {
    const card = (await introduceNext(DAY1))!;
    await recordGrade(card, 4, 5000, 'speak', 0.9, DAY1);
    expect((await queueState(DAY1 + HOUR)).listening).toHaveLength(0);
    const nextDay = await queueState(DAY1 + 24 * HOUR);
    expect(nextDay.listening.map(c => c.id)).toEqual([`${card.noteId}#listening`]);
    // A "hear it" card whose "say it" was never answered stays back, even on later days.
    await introduceNext(DAY1);
    expect((await queueState(DAY1 + 72 * HOUR)).listening).toHaveLength(1);
  });

  it('pauses new cards on a day whose reviews take longer than the daily time', async () => {
    await setSetting('dailyMinutes', 1); // 60 s; a review is estimated at 15 s until the pace is measured
    for (let i = 0; i < 5; i++) {
      const c = (await introduceNext(DAY1))!;
      await db.cards.update(c.id, { state: 2, due: DAY1 + 24 * HOUR, stability: 3, difficulty: 5, last_review: DAY1 - 48 * HOUR, reps: 2 });
    }
    const q = await queueState(DAY1 + 24 * HOUR);
    expect(q.reviews).toHaveLength(5);
    expect(q.paused).toBe(true);
    expect(q.newLeft).toBe(0);
    await grantMore(5, DAY1 + 24 * HOUR);
    expect((await queueState(DAY1 + 24 * HOUR)).newLeft).toBe(5);
  });
});
