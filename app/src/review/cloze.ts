// Fill-in-the-blank cards (product spec 5.3): a real Tatoeba sentence with one word removed. The answer is
// always the original word, so nothing is invented. Which words may be removed was worked out on the PC from
// Wiktionary's grammar tags (tools/build_content.py, field "c" of each sentence).
import type { Blank } from '../grammar/data';
import type { NoteRow, SentenceRow, WordRow } from '../db/db';
import { tatoebaAudio } from './notes';

const TOKEN = /[A-Za-zÄÖÜäöüß]+(?:-[A-Za-zÄÖÜäöüß]+)*/g;
const KEY: Record<Blank, 'a' | 'p' | 'v' | 'j'> = { article: 'a', preposition: 'p', verb: 'v', adjective: 'j' };

export const BLANK_PROMPT: Record<Blank, string> = {
  article: 'An article is missing.',
  preposition: 'A preposition is missing.',
  verb: 'The verb is missing.',
  adjective: 'An adjective is missing.',
};

/** Where the blank is in the sentence (character offsets), and the base word for verbs and adjectives. */
export function blankIn(s: SentenceRow, type: Blank): { start: number; end: number; base?: string } | null {
  const v = s.c?.[KEY[type]];
  if (v == null) return null;
  const [index, base] = Array.isArray(v) ? v : [v, undefined];
  const tokens = [...s.de.matchAll(TOKEN)];
  const t = tokens[index];
  if (!t || t.index == null) return null;
  return { start: t.index, end: t.index + t[0].length, base };
}

export function clozeNote(s: SentenceRow, type: Blank, words: Map<string, WordRow>, now: number): NoteRow | null {
  const b = blankIn(s, type);
  if (!b) return null;
  return {
    id: `c:${s.id}:${type}`, kind: 'cloze', de: s.de, en: [s.en], audio: s.a ? tatoebaAudio(s.a) : undefined,
    blank: { type, start: b.start, end: b.end, base: b.base ? words.get(b.base)?.lemma : undefined },
    source: 'Tatoeba', sourceRef: String(s.id), createdAt: now,
  };
}

/** The sentence split around its blank, and the removed word. */
export function clozeParts(note: NoteRow): { before: string; answer: string; after: string } {
  const b = note.blank!;
  return { before: note.de.slice(0, b.start), answer: note.de.slice(b.start, b.end), after: note.de.slice(b.end) };
}
