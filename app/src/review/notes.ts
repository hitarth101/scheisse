// Making notes and cards from imported content (product spec 5).
import { db, type AudioRef, type CardRow, type NoteRow, type SentenceRow, type WordRow } from '../db/db';
import { getMeta, setMeta } from '../db/settings';
import { dayKey } from '../lib/format';
import { newCard } from './scheduler';
import { contentData } from '../content/load';

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
 * Saves a note with its two cards: the production card is due now; the listening card the next day,
 * so the two sides of the same item never meet in one session.
 */
export async function addNote(note: NoteRow, now: number): Promise<CardRow[]> {
  const cards = [newCard(note.id, 'production', now), newCard(note.id, 'listening', now, now + DAY)];
  let added = false;
  await db.transaction('rw', db.notes, db.cards, async () => {
    if (await db.notes.get(note.id)) return;
    await db.notes.put(note);
    await db.cards.bulkPut(cards);
    added = true;
  });
  return added ? cards : [];
}

/** How many new notes the app introduced today (not counting ticked lecture pairs). */
export async function introducedToday(now = Date.now()): Promise<number> {
  return (await getMeta<number>(`introduced:${dayKey(new Date(now))}`)) ?? 0;
}

/**
 * Introduces up to `count` new notes: the next words in learning order (Goethe A1 → B1, by frequency),
 * with one Tatoeba sentence for every three words once a sentence exists whose words have all been
 * introduced (product spec 5.5).
 */
export async function introduce(count: number, now = Date.now()): Promise<NoteRow[]> {
  if (count <= 0) return [];
  const existing = new Set(await db.notes.toCollection().primaryKeys());
  const introducedWords = new Set([...existing].filter(id => id.startsWith('w:')).map(id => id.slice(2)));

  const wantSentences = Math.floor(count / 3);
  const data = await contentData();
  const words: WordRow[] = [];
  for (const w of data.words) {
    if (words.length >= count) break;
    if (!existing.has(`w:${w.id}`)) words.push(w);
  }

  const picked: NoteRow[] = [];
  const known = new Set(introducedWords);
  const sentencesOut: SentenceRow[] = [];
  if (wantSentences > 0 && known.size >= 5) {
    const all = data.sentences;
    const eligible = all
      .filter(s => !existing.has(`s:${s.id}`) && s.w.length > 0 && s.w.every(id => known.has(id)))
      .sort((a, b) => a.de.length - b.de.length);
    sentencesOut.push(...eligible.slice(0, wantSentences));
  }
  const wordCount = count - sentencesOut.length;
  for (const w of words.slice(0, wordCount)) picked.push(wordNote(w, now));
  for (const s of sentencesOut) picked.push(sentenceNote(s, now));

  const made: NoteRow[] = [];
  for (const n of picked) if ((await addNote(n, now)).length) made.push(n);
  const key = `introduced:${dayKey(new Date(now))}`;
  await setMeta(key, ((await getMeta<number>(key)) ?? 0) + made.length);
  return made;
}

let introducing: Promise<NoteRow[]> | null = null;
/** introduce(), but never twice at the same time (a second caller waits for the first). */
export function introduceOnce(count: number): Promise<NoteRow[]> {
  if (!introducing) introducing = introduce(count).finally(() => { introducing = null; });
  return introducing;
}
