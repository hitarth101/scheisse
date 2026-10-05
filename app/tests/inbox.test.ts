import { describe, expect, it } from 'vitest';
import type { SentenceRow, WordRow } from '../src/db/db';
import { findMatch, normalise } from '../src/inbox/inbox';

// Fixtures only: Tatoeba-style rows; the English is a placeholder and never shown.
const WORDS: WordRow[] = [
  { id: 'gehen', lemma: 'gehen', pos: 'verb', level: 'A1', order: 1, en: ['(go)'] },
  { id: 'Zug|m', lemma: 'Zug', pos: 'noun', level: 'A1', order: 2, en: ['(train)'] },
  { id: 'mit', lemma: 'mit', pos: 'preposition', level: 'A1', order: 3, en: ['(with)'] },
];
const S = (id: number, de: string): SentenceRow => ({ id, de, en: '(en)', enId: id + 1000, w: [] });
const SENTENCES = [S(1, 'Lass dir Zeit!'), S(2, 'Wir fahren mit dem Zug.'), S(3, 'Ich fahre mit dem Zug nach Berlin.'), S(4, 'Ich gehe.')];
const FORMS = { gehen: { present: ['gehe', 'gehst', 'geht', 'gehen', 'geht', 'gehen'], past: ['ging'], participle: 'gegangen', auxiliary: 'sein' } };

describe('Inbox matching (product spec 4.6)', () => {
  it('folds case, punctuation, umlauts and ß', () => {
    expect(normalise('Lass dir  Zeit!')).toBe('lass dir zeit');
    expect(normalise('Grüße')).toBe(normalise('Gruesse'));
  });
  it('finds a whole sentence, also with rough spelling', () => {
    expect(findMatch('lass dir zeit', WORDS, SENTENCES)).toEqual({ kind: 'sentence', id: 1 });
    expect(findMatch('Las dir Zeit', WORDS, SENTENCES)).toEqual({ kind: 'sentence', id: 1 });
  });
  it('finds the shortest sentence containing a phrase', () => {
    expect(findMatch('mit dem Zug', WORDS, SENTENCES)).toEqual({ kind: 'sentence', id: 2 });
  });
  it('matches one word to its Goethe word, through its forms, but never a function word', () => {
    expect(findMatch('Zug', WORDS, SENTENCES)).toEqual({ kind: 'word', id: 'Zug|m' });
    expect(findMatch('ging', WORDS, SENTENCES, FORMS)).toEqual({ kind: 'word', id: 'gehen' });
    expect(findMatch('mit', WORDS, SENTENCES)).toBeNull();
  });
  it('says so when nothing matches', () => {
    expect(findMatch('völlig anderer Satz hier', WORDS, SENTENCES)).toBeNull();
  });
});
