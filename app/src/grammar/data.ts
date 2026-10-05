// Grammar data (product spec 4.4), prepared on the PC by tools/build_grammar.py into /data/grammar.json:
// the Nicos Weg lesson and topic order (names and links only, DW's content is linked, never copied),
// outside links per topic, and reference tables taken from Wiktionary.
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { getMeta, setMeta } from '../db/settings';
import { BUILD_ID } from '../lib/version';

export type Blank = 'article' | 'preposition' | 'verb' | 'adjective';
export interface Link { url: string; title: string }
export interface Lesson { id: string; level: string; chapter: string; n: number; title: string; subtitle?: string; url: string; topics: string[]; test?: boolean }
export interface Topic { id: string; title: string; level: string; lessons: string[]; blank: Blank | null; dw: string | null; grimm: Link | null; schubert: Link | null; table: string | null }

/** One block of a reference table: rows (cases or persons) × columns, every German cell copied from the source. */
export interface RefSection {
  title?: string;
  columns: string[];
  /** Columns are Masc., Fem., Neut., Plural: the first three take the gender colours (design spec 2.3). */
  gender?: boolean;
  /** Language of the row names (English case names unless stated). */
  nameLang?: 'de' | 'en';
  rows: { name: string; cells: (string | null)[] }[];
}
export interface RefTable {
  id: string;
  title: string;
  sub?: string;
  group: 'Articles and pronouns' | 'Prepositions and endings' | 'Verbs';
  sections: RefSection[];
  foot?: string;
  source: string;
}

export interface GrammarData { lessons: Lesson[]; topics: Topic[]; tables: RefTable[]; source: string }

let loading: Promise<GrammarData> | null = null;
export function loadGrammar(): Promise<GrammarData> {
  if (!loading) {
    loading = fetch(`${import.meta.env.BASE_URL}data/grammar.json?v=${BUILD_ID}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<GrammarData>; })
      .catch(e => { loading = null; throw e; });
  }
  return loading;
}

export function useGrammar(): { data: GrammarData | null; error: boolean; retry: () => void } {
  const [data, setData] = useState<GrammarData | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setError(false);
    loadGrammar().then(d => { if (live) setData(d); }, () => { if (live) setError(true); });
    return () => { live = false; };
  }, [attempt]);
  return { data, error, retry: () => setAttempt(a => a + 1) };
}

// ---- Progress, kept in the meta table so it is part of every backup ----
export type TopicStatus = 'none' | 'read' | 'practiced';

export async function topicStatuses(): Promise<Record<string, TopicStatus>> {
  const rows = await db.meta.where('key').startsWith('topic:').toArray();
  return Object.fromEntries(rows.map(r => [r.key.slice(6), r.value as TopicStatus]));
}
export function useTopicStatuses(): Record<string, TopicStatus> {
  return useLiveQuery(topicStatuses, [], {});
}
export function setTopicStatus(id: string, status: TopicStatus) {
  return status === 'none' ? db.meta.delete(`topic:${id}`) : setMeta(`topic:${id}`, status);
}

export async function lessonsDone(): Promise<Set<string>> {
  return new Set((await db.meta.where('key').startsWith('lesson:').primaryKeys()).map(k => String(k).slice(7)));
}
export function useLessonsDone(): Set<string> {
  return useLiveQuery(lessonsDone, [], new Set<string>());
}
export function setLessonDone(id: string, done: boolean) {
  return done ? setMeta(`lesson:${id}`, Date.now()) : db.meta.delete(`lesson:${id}`);
}

/** Fill-in-the-blank types unlocked by marking their grammar topic "practiced" (product spec 5.3). */
export async function unlockedBlanks(): Promise<Set<Blank>> {
  const statuses = await topicStatuses();
  const practiced = Object.entries(statuses).filter(([, s]) => s === 'practiced').map(([id]) => id);
  if (!practiced.length) return new Set();
  const saved = await getMeta<Record<string, Blank>>('blankTopics');
  let map = saved;
  if (!map) {
    try { map = Object.fromEntries((await loadGrammar()).topics.filter(t => t.blank).map(t => [t.id, t.blank!])); }
    catch { return new Set(); }
  }
  return new Set(practiced.map(id => map![id]).filter(Boolean));
}

/** Remembers which topics unlock which blanks, so new cards can be made without the network. */
export async function rememberBlankTopics(d: GrammarData) {
  await setMeta('blankTopics', Object.fromEntries(d.topics.filter(t => t.blank).map(t => [t.id, t.blank!])));
}
