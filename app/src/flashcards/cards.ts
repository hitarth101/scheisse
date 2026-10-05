// Every card the owner has, for the Flashcards list and the card page (owner decision 2026-10-04).
import { db, type CardRow, type NoteRow } from '../db/db';
import { daysBetween, shortDate } from '../lib/format';
import { STATE } from '../review/scheduler';

export type Filter = 'all' | 'words' | 'sentences' | 'lectures' | 'suspended';
export const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All cards' },
  { value: 'words', label: 'Words' },
  { value: 'sentences', label: 'Sentences' },
  { value: 'lectures', label: 'From lectures' },
  { value: 'suspended', label: 'Suspended' },
];

export interface Item { note: NoteRow; cards: CardRow[] }

/** Notes with their cards, newest first. */
export async function allItems(): Promise<Item[]> {
  const [notes, cards] = await Promise.all([db.notes.toArray(), db.cards.toArray()]);
  const byNote = new Map<string, CardRow[]>();
  for (const c of cards) byNote.set(c.noteId, [...(byNote.get(c.noteId) ?? []), c]);
  return notes
    .map(note => ({ note, cards: (byNote.get(note.id) ?? []).sort((a, b) => (a.type === 'production' ? -1 : b.type === 'production' ? 1 : 0)) }))
    .sort((a, b) => b.note.createdAt - a.note.createdAt || b.note.id.localeCompare(a.note.id, undefined, { numeric: true }));
}

/** ä → a, ß → ss, lower case: so "uber" finds "über". */
export function fold(s: string): string {
  return s.toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function matches(item: Item, filter: Filter, query: string): boolean {
  const { note, cards } = item;
  switch (filter) {
    case 'words': if (note.kind !== 'word') return false; break;
    case 'sentences': if (note.kind === 'word') return false; break;
    case 'lectures': if (!note.id.startsWith('lt:')) return false; break;
    case 'suspended': if (!cards.some(c => c.suspended)) return false; break;
  }
  if (!query.trim()) return true;
  const q = fold(query.trim());
  return fold(note.de).includes(q) || note.en.some(e => fold(e).includes(q));
}

const REASON: Record<NonNullable<CardRow['suspendReason']>, string> = {
  manual: 'Suspended', leech: 'Suspended · failed 8 times', flag: 'Suspended · source data flagged',
};

/** One card's state as a plain fact: "New", "Due today", "Next review 12 October", "Suspended · failed 8 times". */
export function cardStatus(c: CardRow, sayIt?: CardRow, now = new Date()): string {
  if (c.suspended) return REASON[c.suspendReason ?? 'manual'];
  if (c.state === STATE.New) return c.type === 'listening' && (!sayIt || sayIt.state === STATE.New) ? 'Starts the day after “say it”' : 'New';
  const days = daysBetween(now, new Date(c.due));
  if (days <= 0) return 'Due today';
  if (days === 1) return 'Next review tomorrow';
  return `Next review ${shortDate(new Date(c.due), now)}`;
}

/** Short status for a list row, from the "say it" card. */
export function rowDetail(item: Item, now = new Date()): string {
  const c = item.cards[0];
  if (!c) return '';
  if (item.cards.some(x => x.suspended)) return 'Suspended';
  if (c.state === STATE.New) return 'New';
  const days = daysBetween(now, new Date(c.due));
  if (days <= 0) return 'Today';
  return days === 1 ? '1 day' : `${days} days`;
}

export function kindLabel(note: NoteRow): string {
  if (note.kind === 'word') return note.pos ? `Word · ${note.pos}` : 'Word';
  return note.kind === 'cloze' ? 'Fill-in-the-blank' : 'Sentence';
}
