// Word and sentence data, prepared on the PC by tools/build_content.py and published in /data/.
// The phone copies it into its own database once per content version, so Review never waits on the network.
import { useSyncExternalStore } from 'react';
import { db, type SentenceRow, type WordRow } from '../db/db';
import { getMeta, setMeta } from '../db/settings';

export type ContentState =
  | { state: 'checking' }
  | { state: 'loading'; done: number; total: number }
  | { state: 'ready'; version: string }
  | { state: 'error'; message: string };

let status: ContentState = { state: 'checking' };
const listeners = new Set<() => void>();
function set(s: ContentState) { status = s; listeners.forEach(l => l()); }
export function useContent(): ContentState {
  return useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l); }; }, () => status, () => status);
}
export function contentStatus(): ContentState { return status; }

const base = () => `${import.meta.env.BASE_URL}data/`;

async function getJson<T>(name: string, version: string): Promise<T> {
  const res = await fetch(`${base()}${name}?v=${version}`);
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

let running: Promise<void> | null = null;

/** Makes sure this phone has the current word and sentence data. Safe to call more than once. */
export function ensureContent(): Promise<void> {
  if (!running) running = load().finally(() => { running = null; });
  return running;
}

async function load() {
  const have = await getMeta<string>('contentVersion');
  let manifest: { version: string };
  try {
    const res = await fetch(`${base()}manifest.json?ts=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    manifest = await res.json();
  } catch (e) {
    // Offline: whatever is already on the phone keeps working.
    if (have) { set({ state: 'ready', version: have }); return; }
    set({ state: 'error', message: String((e as Error)?.message ?? e) });
    return;
  }
  if (have === manifest.version) { set({ state: 'ready', version: have }); return; }

  try {
    set({ state: 'loading', done: 0, total: 2 });
    const words = await getJson<{ words: WordRow[] }>('words.json', manifest.version);
    set({ state: 'loading', done: 1, total: 2 });
    const sentences = await getJson<{ sentences: SentenceRow[] }>('sentences.json', manifest.version);
    await db.content.bulkPut([
      { key: 'words', value: words.words },
      { key: 'sentences', value: sentences.sentences },
    ]);
    cached = null;
    // Recorded after the import, so an interrupted import simply runs again next time.
    await setMeta('contentVersion', manifest.version);
    set({ state: 'ready', version: manifest.version });
  } catch (e) {
    if (have) { set({ state: 'ready', version: have }); return; }
    set({ state: 'error', message: String((e as Error)?.message ?? e) });
  }
}

// ---- Full forms tables, fetched only when the "All forms" sheet opens ----
export type NounTable = Record<'nominative' | 'accusative' | 'dative' | 'genitive', [string | null, string | null]>;
export type VerbTable = { present: (string | null)[]; past: (string | null)[]; participle: string | null; auxiliary: string | null };
let forms: Promise<Record<string, NounTable | VerbTable>> | null = null;
export function loadForms(): Promise<Record<string, NounTable | VerbTable>> {
  if (!forms) {
    forms = getJson<{ forms: Record<string, NounTable | VerbTable> }>('word-forms.json', String(Date.now() / 3_600_000 | 0))
      .then(d => d.forms)
      .catch(e => { forms = null; throw e; });
  }
  return forms;
}

// ---- The imported lists, read once from the phone's database and kept in memory ----
interface Loaded { words: WordRow[]; byLemma: Map<string, WordRow[]>; sentences: SentenceRow[] }
let cached: Promise<Loaded> | null = null;

/** Drops the in-memory copy, so the next read takes the lists from the database again (after a test resets it). */
export function forgetContent() { cached = null; }

/** Words in learning order, and Tatoeba sentences. Empty until the first import has finished. */
export function contentData(): Promise<Loaded> {
  if (!cached) {
    cached = (async () => {
      const [w, s] = await db.content.bulkGet(['words', 'sentences']);
      const words = ((w?.value as WordRow[] | undefined) ?? []).slice().sort((a, b) => a.order - b.order);
      const byLemma = new Map<string, WordRow[]>();
      for (const x of words) byLemma.set(x.lemma, [...(byLemma.get(x.lemma) ?? []), x]);
      const loaded = { words, byLemma, sentences: (s?.value as SentenceRow[] | undefined) ?? [] };
      if (!words.length) cached = null; // nothing imported yet: look again next time
      return loaded;
    })();
  }
  return cached;
}
