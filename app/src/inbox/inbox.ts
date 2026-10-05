// Capture and the Inbox (product spec 4.6): phrases heard on TV are saved first and checked later against
// the app's own sources. A match with real English becomes a card only after the owner confirms it; no match
// stays for the tutor. Nothing is ever translated by machine.
import { db, type SentenceRow, type WordRow } from '../db/db';
import { contentData, loadForms, type NounTable, type VerbTable } from '../content/load';
import { getMeta, setMeta } from '../db/settings';
import { addNote, isFunctionWord, sentenceNote, wordNote } from '../review/notes';

export type InboxMatch = { kind: 'sentence'; id: number } | { kind: 'word'; id: string };
export interface InboxItem {
  /** Key in the meta table: "inbox:<saved at>". */
  key: string;
  at: number;
  text: string;
  show?: string;
  /** pending: not checked yet (no word data on the phone); match: found with English; none: ask the tutor; done: card made. */
  state: 'pending' | 'match' | 'none' | 'done';
  match?: InboxMatch;
  /** The owner said the match was wrong. */
  wrong?: boolean;
}

const PREFIX = 'inbox:';

export async function inboxItems(): Promise<InboxItem[]> {
  const rows = await db.meta.where('key').startsWith(PREFIX).toArray();
  return rows.map(r => ({ ...(r.value as Omit<InboxItem, 'key'>), key: r.key })).sort((a, b) => b.at - a.at);
}

function put(item: InboxItem) {
  const { key, ...value } = item;
  return setMeta(key, value);
}

export async function lastShow(): Promise<string> {
  return (await getMeta<string>('captureLastShow')) ?? '';
}

/** Saving never needs a connection; the check runs straight after, against data already on the phone. */
export async function capture(text: string, show: string, now = Date.now()): Promise<InboxItem> {
  const item: InboxItem = { key: `${PREFIX}${now}`, at: now, text: text.trim(), show: show.trim() || undefined, state: 'pending' };
  await put(item);
  if (show.trim()) await setMeta('captureLastShow', show.trim());
  void check(item);
  return item;
}

export async function check(item: InboxItem): Promise<InboxItem> {
  const data = await contentData();
  if (!data.words.length) return item; // word data not on the phone yet: stays pending, checked again later
  let forms: Record<string, NounTable | VerbTable> = {};
  try { forms = await loadForms(); } catch { /* without the form tables only base forms are matched */ }
  const match = findMatch(item.text, data.words, data.sentences, forms);
  const next: InboxItem = { ...item, state: match ? 'match' : 'none', match: match ?? undefined };
  await put(next);
  return next;
}

/** Checks every phrase that couldn't be checked before (called when the Inbox opens). */
export async function checkPending() {
  for (const item of await inboxItems()) if (item.state === 'pending') await check(item);
}

export async function makeCard(item: InboxItem, now = Date.now()) {
  if (!item.match) return;
  const data = await contentData();
  const note = item.match.kind === 'sentence'
    ? sentenceNote(data.sentences.find(s => s.id === (item.match as { id: number }).id)!, now)
    : wordNote(data.words.find(w => w.id === (item.match as { id: string }).id)!, now);
  await addNote(note, now);
  await put({ ...item, state: 'done' });
}

export function wrongMatch(item: InboxItem) {
  return put({ ...item, state: 'none', match: undefined, wrong: true });
}

export function deleteItem(item: InboxItem) {
  return db.meta.delete(item.key);
}

// ---- Matching ----

/** Lower case, no punctuation; umlauts, "ae/oe/ue" and ß folded, so rough spelling still matches. */
export function normalise(s: string): string {
  return s.toLowerCase()
    .replace(/ß/g, 'ss').replace(/ä|ae/g, 'a').replace(/ö|oe/g, 'o').replace(/ü|ue/g, 'u')
    .replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function distance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const up = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = up;
    }
  }
  return prev[b.length];
}

/**
 * The source item that matches a phrase, if any:
 * one word → the Goethe word it is (or a form of), unless it is a function word (they get no word card);
 * otherwise → a Tatoeba sentence that is the phrase, contains it, or differs from it by a few letters.
 */
export function findMatch(text: string, words: WordRow[], sentences: SentenceRow[], forms: Record<string, NounTable | VerbTable> = {}): InboxMatch | null {
  const phrase = normalise(text);
  if (!phrase) return null;
  const tokens = phrase.split(' ');

  if (tokens.length === 1) {
    const byForm = new Map<string, WordRow>();
    for (const w of words) {
      if (isFunctionWord(w)) continue;
      if (!byForm.has(normalise(w.lemma))) byForm.set(normalise(w.lemma), w);
    }
    for (const w of words) {
      const t = forms[w.id];
      if (!t || isFunctionWord(w)) continue;
      const all = 'present' in t ? [...t.present, ...t.past, t.participle] : Object.values(t).flat();
      for (const f of all) if (f && !f.includes(' ') && !byForm.has(normalise(f))) byForm.set(normalise(f), w);
    }
    const w = byForm.get(tokens[0]);
    if (w) return { kind: 'word', id: w.id };
  }

  let contains: SentenceRow | null = null, near: { s: SentenceRow; d: number } | null = null;
  const padded = ` ${phrase} `;
  const limit = Math.max(1, Math.floor(phrase.length * 0.15));
  for (const s of sentences) {
    const n = normalise(s.de);
    if (n === phrase) return { kind: 'sentence', id: s.id };
    if (tokens.length > 1 && ` ${n} `.includes(padded) && (!contains || s.de.length < contains.de.length)) contains = s;
    if (Math.abs(n.length - phrase.length) <= limit) {
      const d = distance(n, phrase);
      if (d <= limit && (!near || d < near.d)) near = { s, d };
    }
  }
  const best = near?.s ?? contains;
  return best ? { kind: 'sentence', id: best.id } : null;
}
