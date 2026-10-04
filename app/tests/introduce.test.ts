import { beforeAll, describe, expect, it } from 'vitest';
import { db, type SentenceRow, type WordRow } from '../src/db/db';
import { introduce, isFunctionWord } from '../src/review/notes';

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

describe('introducing new cards (product spec 5.5)', () => {
  beforeAll(async () => {
    await Promise.all(db.tables.map(t => t.clear()));
    await db.content.bulkPut([{ key: 'words', value: WORDS }, { key: 'sentences', value: SENTENCES }]);
  });

  it('knows which words are function words', () => {
    expect(['der', 'in', 'und', 'ich', 'mein', 'ein'].every(l => isFunctionWord(WORDS.find(x => x.lemma === l)!))).toBe(true);
    expect(['sein', 'nicht', 'Tisch', 'gut'].some(l => isFunctionWord(WORDS.find(x => x.lemma === l)!))).toBe(false);
  });

  it('gives word cards to content words only, in learning order', async () => {
    const made = await introduce(6, Date.UTC(2026, 9, 4, 9));
    expect(made.map(n => n.de)).toEqual(['sein', 'nicht', 'haben', 'Tisch', 'gut', 'Haus']);
    expect(await db.cards.count()).toBe(12); // say it + hear it
  });

  it('adds sentences whose words are all learned or function words', async () => {
    const made = await introduce(3, Date.UTC(2026, 9, 5, 9));
    expect(made.map(n => n.id)).toEqual(['w:gehen', 'w:neu', 's:1']);
  });
});
