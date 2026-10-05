// The flashcard queue (owner decision 2026-10-04): there are no sessions. Whenever the owner studies, cards
// come in this order: missed cards whose few-minute step is up, due reviews (most likely forgotten first),
// "hear it" cards of items started on an earlier day, then new "say it" cards up to today's allowance:
// cards the owner picked (lecture sentences, reading, inbox) first, oldest first, then the next words.
import { db, type CardRow } from '../db/db';
import { getMeta, getSettings, setMeta } from '../db/settings';
import { dayKey } from '../lib/format';
import { scheduler, STATE, toFsrs } from './scheduler';
import { endOfDay, pace, reviewedToday, startOfDay } from './session';

/** A missed card may be shown this early when nothing else is left. */
export const LEARN_AHEAD_MS = 20 * 60_000;
/** "Add 5 more new cards today". */
export const EXTRA_NEW = 5;

export interface QueueState {
  /** Learned cards to answer now, in the order they are shown. */
  reviews: CardRow[];
  /** "Hear it" cards whose "say it" card was first answered on an earlier day. */
  listening: CardRow[];
  /** New "say it" cards already made and waiting, oldest first. */
  waiting: CardRow[];
  /** Missed cards coming back within a few minutes, earliest first. */
  soon: CardRow[];
  /** The earliest missed card coming back later today, if any. */
  laterAt: number | null;
  /** New "say it" cards answered for the first time today. */
  newDone: number;
  /** How many more new "say it" cards today. */
  newLeft: number;
  /** New cards are paused for today: today's reviews take longer than the daily time. */
  paused: boolean;
  /** Today's reviews (answered and still due) and their estimated time, for the pause line. */
  dayReviews: number;
  daySecs: number;
  /** Estimated seconds: due cards (reviews and "hear it" cards), and today's new cards still to come. */
  dueSecs: number;
  newSecs: number;
  measured: boolean;
}

const isProduction = (id: string) => id.endsWith('#production');

/** New "say it" cards answered for the first time today. */
async function newDoneToday(now: number): Promise<number> {
  const logs = await db.revlog.where('at').aboveOrEqual(startOfDay(now)).toArray();
  return new Set(logs.filter(l => l.before.state === STATE.New && isProduction(l.cardId)).map(l => l.cardId)).size;
}

/** "Hear it" cards are ready the day after their "say it" card was first answered. */
async function readyListening(cards: CardRow[], now: number): Promise<CardRow[]> {
  const sod = startOfDay(now);
  const out: CardRow[] = [];
  for (const c of cards) {
    const first = await db.revlog.where('cardId').equals(`${c.noteId}#production`).first();
    if (first && first.at < sod) out.push(c);
  }
  return out;
}

export async function queueState(now = Date.now()): Promise<QueueState> {
  const settings = await getSettings();
  const eod = endOfDay(now);
  const [dueRows, newRows, p, today, newDone, grant] = await Promise.all([
    db.cards.where('due').belowOrEqual(eod).toArray(),
    db.cards.where('state').equals(STATE.New).toArray(),
    pace(),
    reviewedToday(now),
    newDoneToday(now),
    getMeta<number>(`newGrant:${dayKey(new Date(now))}`),
  ]);

  const f = scheduler(settings.retention);
  const steps: CardRow[] = [], due: { c: CardRow; r: number }[] = [], soon: CardRow[] = [];
  let laterAt: number | null = null;
  for (const c of dueRows) {
    if (c.suspended || c.state === STATE.New) continue;
    if (c.state === STATE.Review) due.push({ c, r: f.get_retrievability(toFsrs(c), new Date(now), false) });
    else if (c.due <= now) steps.push(c);
    else if (c.due - now <= LEARN_AHEAD_MS) soon.push(c);
    else laterAt = Math.min(laterAt ?? Infinity, c.due);
  }
  steps.sort((a, b) => a.due - b.due);
  soon.sort((a, b) => a.due - b.due);
  due.sort((a, b) => a.r - b.r);
  const reviews = [...steps, ...due.map(x => x.c)];

  const fresh = newRows.filter(c => !c.suspended);
  const listening = await readyListening(fresh.filter(c => c.type === 'listening'), now);
  const waiting = fresh.filter(c => c.type === 'production')
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id, undefined, { numeric: true }));

  // Pause: when today's reviews (answered plus still due) take longer than the daily time, no new cards
  // today, so tomorrow doesn't grow too. Cards granted with "Add 5 more" still come.
  const dayReviews = today.count + reviews.length;
  const daySecs = dayReviews * p.review;
  const paused = daySecs > settings.dailyMinutes * 60;
  const base = paused ? Math.min(newDone, settings.newPerDay) : settings.newPerDay;
  const newLeft = Math.max(0, base + (grant ?? 0) - newDone);

  return {
    reviews, listening, waiting, soon, laterAt, newDone, newLeft, paused, dayReviews, daySecs,
    dueSecs: reviews.length * p.review + listening.length * p.fresh,
    newSecs: newLeft * p.fresh,
    measured: p.measured,
  };
}

/** What to show next: a card, "make the next new card", or nothing. */
export function pickNext(q: QueueState): CardRow | 'introduce' | null {
  if (q.reviews.length) return q.reviews[0];
  if (q.listening.length) return q.listening[0];
  if (q.newLeft > 0) return q.waiting[0] ?? 'introduce';
  if (q.soon.length) return q.soon[0];
  return null;
}

/** Cards left right now (missed cards coming back in a few minutes are not counted until they are back). */
export function cardsLeft(q: QueueState): number {
  return q.reviews.length + q.listening.length + q.newLeft;
}

/** "Add 5 more new cards today": raises today's allowance, also when new cards are paused. */
export async function grantMore(n = EXTRA_NEW, now = Date.now()) {
  const key = `newGrant:${dayKey(new Date(now))}`;
  await setMeta(key, ((await getMeta<number>(key)) ?? 0) + n);
}
