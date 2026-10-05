// Making notes and cards from imported content (product spec 5).
import { db, type AudioRef, type CardRow, type NoteRow, type SentenceRow, type WordRow } from '../db/db';
import { newCard } from './scheduler';
import { contentData } from '../content/load';
import { unlockedBlanks, type Blank } from '../grammar/data';
import { blankIn, clozeNote } from './cloze';

const DAY = 86_400_000;

export const tatoebaAudio = (a: { id: number; by: string; lic: string }): AudioRef =>
  ({ url: `https://tatoeba.org/en/audio/download/${a.id}`, kind: 'tatoeba', by: a.by, lic: a.lic });

export function wordNote(w: WordRow, now: number): NoteRow {
  return {
    id: `w:${w.id}`, kind: 'word', de: w.lemma, en: w.en, pos: w.pos, gender: w.gender, gender2: w.gender2,
    plural: w.plural ?? null, pluralOnly: w.pluralOnly, hy: w.hy, hint: w.hint, forms: w.forms, example: w.example,
    audio: w.audio ? { url: w.audio, kind: 'wiktionary' } : undefined,
    source: `Goethe ${w.level} · Wiktionary`, sourceRef: w.id, level: w.level, createdAt: now,
  };
}

export function sentenceNote(s: SentenceRow, now: number): NoteRow {
  return {
    id: `s:${s.id}`, kind: 'sentence', de: s.de, en: [s.en], audio: s.a ? tatoebaAudio(s.a) : undefined,
    source: 'Tatoeba', sourceRef: String(s.id), createdAt: now,
  };
}

/** A transcript pair ticked on the tick screen (product spec 4.2). */
export function lecturePairNote(track: number, index: number, pair: { de: string; en: string }, edited: boolean, original: { de: string; en: string }, now: number): NoteRow {
  return {
    id: `lt:${String(track).padStart(2, '0')}:${index}`, kind: 'sentence', de: pair.de, en: [pair.en],
    source: `Language Transfer transcript · lecture ${String(track).padStart(2, '0')}`, sourceRef: String(track), createdAt: now,
    ...(edited ? { edited: 1 as const, original: { de: original.de, en: [original.en] } } : {}),
  };
}

/**
 * Saves a note with its two cards. The listening ("hear it") card waits until the day after its production
 * ("say it") card is first answered (see queue.ts), so the two sides of an item never meet on the same day.
 */
export async function addNote(note: NoteRow, now: number): Promise<CardRow[]> {
  // A fill-in-the-blank note has only the one card.
  const cards = note.kind === 'cloze' ? [newCard(note.id, 'production', now)] : [newCard(note.id, 'production', now), newCard(note.id, 'listening', now, now + DAY)];
  let added = false;
  await db.transaction('rw', db.notes, db.cards, async () => {
    if (await db.notes.get(note.id)) return;
    await db.notes.put(note);
    await db.cards.bulkPut(cards);
    added = true;
  });
  return added ? cards : [];
}

/**
 * Function words get no word card of their own: articles and other article words, pronouns, prepositions
 * and conjunctions. Language Transfer teaches them, noun cards drill the articles, and they keep appearing
 * in sentence cards (owner decision 2026-10-04, product spec 5.5). "ein" is the indefinite article,
 * which Wiktionary files as a numeral.
 */
const NO_WORD_CARD = new Set(['article', 'determiner', 'pronoun', 'preposition', 'conjunction']);
export function isFunctionWord(w: Pick<WordRow, 'pos' | 'lemma'>): boolean {
  return NO_WORD_CARD.has(w.pos) || (w.pos === 'numeral' && w.lemma === 'ein');
}

/**
 * Makes the next new note, one at a time, when the queue needs a new card: the next word in learning order
 * (Goethe A1 → B1, by frequency, function words left out), and one Tatoeba sentence for every three words
 * once a sentence exists whose words have all been introduced or are function words (product spec 5.5).
 * Once a grammar topic with a blank type is marked practiced, also one fill-in-the-blank card for every
 * three words, from such a sentence (product spec 5.3).
 * Returns the note's "say it" card, or null when there is nothing left to introduce.
 */
export async function introduceNext(now = Date.now()): Promise<CardRow | null> {
  const note = await nextNote(now);
  if (!note) return null;
  const cards = await addNote(note, now);
  return cards.find(c => c.type === 'production') ?? (await db.cards.get(`${note.id}#production`)) ?? null;
}

async function nextNote(now: number): Promise<NoteRow | null> {
  const existing = new Set(await db.notes.toCollection().primaryKeys());
  const data = await contentData();
  const functionWords = new Set(data.words.filter(isFunctionWord).map(w => w.id));
  const introduced = new Set([...existing].filter(id => id.startsWith('w:')).map(id => id.slice(2)));
  const sentenceCount = [...existing].filter(id => id.startsWith('s:')).length;
  const clozeIds = [...existing].filter(id => id.startsWith('c:'));
  const learned = (s: SentenceRow) => s.w.length > 0 && s.w.every(id => introduced.has(id) || functionWords.has(id)) && s.w.some(id => introduced.has(id));

  if (introduced.size >= 5 && sentenceCount * 3 < introduced.size) {
    let best: SentenceRow | null = null;
    for (const s of data.sentences) {
      if (existing.has(`s:${s.id}`) || (best && s.de.length >= best.de.length)) continue;
      if (learned(s)) best = s;
    }
    if (best) return sentenceNote(best, now);
  }

  const blanks = await unlockedBlanks();
  if (blanks.size && introduced.size >= 5 && clozeIds.length * 3 < introduced.size) {
    // The unlocked type with the fewest cards so far, from the shortest sentence of learned words.
    const count = (t: Blank) => clozeIds.filter(id => id.endsWith(`:${t}`)).length;
    const types = [...blanks].sort((a, b) => count(a) - count(b));
    const byId = new Map(data.words.map(w => [w.id, w]));
    for (const type of types) {
      let best: SentenceRow | null = null;
      for (const s of data.sentences) {
        if (existing.has(`c:${s.id}:${type}`) || (best && s.de.length >= best.de.length) || !blankIn(s, type)) continue;
        if (learned(s)) best = s;
      }
      const note = best && clozeNote(best, type, byId, now);
      if (note) return note;
    }
  }
  const word = data.words.find(w => !existing.has(`w:${w.id}`) && !functionWords.has(w.id));
  return word ? wordNote(word, now) : null;
}

let introducing: Promise<CardRow | null> | null = null;
/** introduceNext(), but never twice at the same time (a second caller waits for the first). */
export function introduceOnce(): Promise<CardRow | null> {
  if (!introducing) introducing = introduceNext().finally(() => { introducing = null; });
  return introducing;
}
