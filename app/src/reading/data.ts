// Reading (product spec 4.5): texts prepared on the PC by tools/build_reading.py, a daily set of Tatoeba
// sentences for stage 1, and the known-word percentage that sorts them.
import { db, type Gender, type SentenceRow, type WordRow } from '../db/db';
import { contentData } from '../content/load';
import { getMeta, setMeta } from '../db/settings';
import { dayKey } from '../lib/format';
import { BUILD_ID } from '../lib/version';
import { isFunctionWord } from '../review/notes';
import { STATE } from '../review/scheduler';

/** A word popup entry (from Wiktionary, or the Goethe word data when the word is on the Goethe lists). */
export interface Gloss {
  /** Dictionary form. */
  l: string;
  p: string;
  en: string[];
  g?: Gender;
  pl?: string | null;
  po?: 1;
  /** Key verb forms: present, past, perfect. */
  f?: string[];
  /** Goethe word id. */
  w?: string;
  /** Article, pronoun, preposition or conjunction (no word card, product spec 5.5). */
  fw?: 1;
  /** A name: not counted in the known-word percentage. */
  nm?: 1;
}

/** A paragraph: German sentences, with English per sentence, or for the whole paragraph where they don't line up. */
export interface Paragraph { de: string[]; en?: string[]; enPara?: string | null; ref?: number }
export interface Source { source: string; url?: string; license?: string; translator?: string; year?: number }
export interface TextMeta {
  id: string; stage: number; title: string; titleEn?: string; author: string; year?: number; historicalSpelling?: boolean;
  words: number; lemmas: Record<string, number>; aligned?: number;
}
export interface ReadingText extends Omit<TextMeta, 'words' | 'lemmas'> {
  de?: Source; en?: Source;
  paragraphs: Paragraph[];
  gloss: Record<string, Gloss>;
}

export const TOKEN = /[A-Za-zÄÖÜäöüß]+(?:-[A-Za-zÄÖÜäöüß]+)*/g;
export const TATOEBA_SET = 'tatoeba';
export const SUGGEST_AT = 0.9;

const base = () => `${import.meta.env.BASE_URL}data/reading/`;
let indexLoad: Promise<TextMeta[]> | null = null;

export function loadIndex(): Promise<TextMeta[]> {
  if (!indexLoad) {
    indexLoad = fetch(`${base()}index.json?v=${BUILD_ID}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: { texts: TextMeta[] }) => d.texts)
      .catch(e => { indexLoad = null; throw e; });
  }
  return indexLoad;
}

export async function loadText(id: string): Promise<ReadingText> {
  if (id === TATOEBA_SET) return tatoebaSet();
  const r = await fetch(`${base()}${id}.json?v=${BUILD_ID}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// ---- Known words (product spec 6) ----

/** Words known: a word card with a review gap of 21 days or more, or marked known in Reading. */
export async function knownLemmas(): Promise<Set<string>> {
  const cards = await db.cards.where('state').equals(STATE.Review).toArray();
  const ids = cards.filter(c => c.type === 'production' && /^[we]:/.test(c.noteId) && c.scheduled_days >= 21).map(c => c.noteId);
  const notes = await db.notes.bulkGet(ids);
  const out = new Set(notes.flatMap(n => (n ? [n.de] : [])));
  for (const k of await db.meta.where('key').startsWith('known:').primaryKeys()) out.add(String(k).slice(6));
  return out;
}

/** Function words count as known: they get no word card (product spec 5.5), and the course teaches them first. */
export async function functionLemmas(): Promise<Set<string>> {
  return new Set((await contentData()).words.filter(isFunctionWord).map(w => w.lemma));
}

export function coverage(meta: Pick<TextMeta, 'words' | 'lemmas'>, known: Set<string>, fw: Set<string>): number {
  if (!meta.words) return 0;
  let k = 0;
  for (const [lemma, n] of Object.entries(meta.lemmas)) if (known.has(lemma) || fw.has(lemma)) k += n;
  return k / meta.words;
}

export function markKnown(lemma: string, known: boolean) {
  return known ? setMeta(`known:${lemma}`, Date.now()) : db.meta.delete(`known:${lemma}`);
}

// ---- Stage 1: Tatoeba sentences for you ----

/** Words studied at least once (any card answered), which stage 1 uses to pick sentences. */
async function studiedWordIds(): Promise<Set<string>> {
  const cards = await db.cards.where('state').notEqual(STATE.New).toArray();
  return new Set(cards.filter(c => c.noteId.startsWith('w:')).map(c => c.noteId.slice(2)));
}

const hash = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; };

/**
 * Today's set (stage 1): up to 20 Tatoeba sentences in which you have studied every word but at most one,
 * function words aside. It changes once a day.
 */
export async function tatoebaSentences(day = dayKey()): Promise<{ sentences: SentenceRow[]; byId: Map<string, WordRow> }> {
  const data = await contentData();
  const byId = new Map(data.words.map(w => [w.id, w]));
  const fw = new Set(data.words.filter(isFunctionWord).map(w => w.id));
  const studied = await studiedWordIds();
  if (studied.size < 5) return { sentences: [], byId };
  const fit = data.sentences.filter(s => {
    let unknown = 0;
    for (const id of s.w) if (!studied.has(id) && !fw.has(id) && ++unknown > 1) return false;
    return s.w.some(id => studied.has(id));
  });
  fit.sort((a, b) => hash(day + a.id) - hash(day + b.id));
  return { sentences: fit.slice(0, 20), byId };
}

export async function tatoebaSet(): Promise<ReadingText> {
  const { sentences, byId } = await tatoebaSentences();
  const gloss: Record<string, Gloss> = {};
  for (const s of sentences) {
    const toks = s.de.match(TOKEN) ?? [];
    toks.forEach((t, i) => {
      const w = s.k ? byId.get(s.w[s.k[i]]) : undefined;
      if (w && !gloss[t]) gloss[t] = glossOf(w);
    });
  }
  return {
    id: TATOEBA_SET, stage: 1, title: 'Sentences for you', titleEn: "Today's Tatoeba sentences", author: 'Tatoeba',
    de: { source: 'Tatoeba', license: 'CC BY 2.0 FR' }, en: { source: 'Tatoeba', license: 'CC BY 2.0 FR' },
    paragraphs: sentences.map(s => ({ de: [s.de], en: [s.en], ref: s.id })),
    gloss,
  };
}

export function glossOf(w: WordRow): Gloss {
  const g: Gloss = { l: w.lemma, p: w.pos, en: w.en.slice(0, 4), w: w.id };
  if (w.gender) g.g = w.gender;
  if (w.plural) g.pl = w.plural;
  if (w.pluralOnly) g.po = 1;
  if (w.forms) g.f = w.forms;
  if (isFunctionWord(w)) g.fw = 1;
  return g;
}

/** Stage 1's row for the library: its word counts, computed from today's sentences. */
export async function tatoebaMeta(): Promise<TextMeta | null> {
  const { sentences, byId } = await tatoebaSentences();
  if (!sentences.length) return null;
  const lemmas: Record<string, number> = {};
  let words = 0;
  for (const s of sentences) for (const k of s.k ?? []) { const w = byId.get(s.w[k]); if (w) { lemmas[w.lemma] = (lemmas[w.lemma] ?? 0) + 1; words++; } }
  return { id: TATOEBA_SET, stage: 1, title: 'Sentences for you', author: 'Tatoeba', words, lemmas };
}

// ---- Reading position (per text) ----
export interface Position { p: number; at: number; done?: boolean }
export function getPosition(id: string) { return getMeta<Position>(`read:${id}`); }
export function savePosition(id: string, p: number, done: boolean) {
  return setMeta(`read:${id}`, { p, at: Date.now(), done } satisfies Position);
}
export async function positions(): Promise<Record<string, Position>> {
  const rows = await db.meta.where('key').startsWith('read:').toArray();
  return Object.fromEntries(rows.map(r => [r.key.slice(5), r.value as Position]));
}
