// The plain numbers on Status (product spec 4.7, design spec 5.7). Counts and durations only.
import { db, type Activity } from '../db/db';
import { dayKey } from '../lib/format';
import { STATE } from '../review/scheduler';
import { endOfDay } from '../review/session';

const DAY = 86_400_000;

/** Learned cards due on each of the next 7 days; day 0 also holds everything overdue. */
export async function forecast(now = Date.now()): Promise<number[]> {
  const ends = Array.from({ length: 7 }, (_, i) => endOfDay(now + i * DAY));
  const rows = await db.cards.where('due').belowOrEqual(ends[6]).toArray();
  const out = Array(7).fill(0) as number[];
  for (const c of rows) {
    if (c.suspended || c.state === STATE.New) continue;
    out[ends.findIndex(e => c.due <= e)]++;
  }
  return out;
}

export async function cardsByState() {
  const cards = await db.cards.toArray();
  const s = { total: cards.length, fresh: 0, learning: 0, review: 0, suspended: 0, leech: 0, flag: 0 };
  for (const c of cards) {
    if (c.suspended) { s.suspended++; if (c.suspendReason === 'leech') s.leech++; if (c.suspendReason === 'flag') s.flag++; }
    else if (c.state === STATE.New) s.fresh++;
    else if (c.state === STATE.Review) s.review++;
    else s.learning++;
  }
  return s;
}

/** Known words (product spec 6): a word card with a review gap of 21 days or more, or marked known in Reading. */
export async function wordsKnown() {
  const cards = await db.cards.where('state').equals(STATE.Review).toArray();
  const fromReviews = new Set(cards.filter(c => c.type === 'production' && c.noteId.startsWith('w:') && c.scheduled_days >= 21).map(c => c.noteId)).size;
  const marked = await db.meta.where('key').startsWith('known:').count();
  return { fromReviews, marked };
}

export const OUTSIDE: Activity[] = ['tv', 'nicos', 'lesson', 'other'];

/** Seconds by activity since a date (YYYY-MM-DD), or for all time. */
export async function timeSince(from?: string): Promise<Record<Activity | 'total' | 'outside', number>> {
  const rows = from ? await db.time.where('date').aboveOrEqual(from).toArray() : await db.time.toArray();
  const out = { review: 0, lecture: 0, reading: 0, tv: 0, nicos: 0, lesson: 0, other: 0, total: 0, outside: 0 };
  for (const r of rows) {
    out[r.activity] += r.seconds;
    out.total += r.seconds;
    if (OUTSIDE.includes(r.activity)) out.outside += r.seconds;
  }
  return out;
}

export function weekStart(now = new Date()): string {
  return dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7)));
}
export function monthStart(now = new Date()): string {
  return dayKey(new Date(now.getFullYear(), now.getMonth(), 1));
}
