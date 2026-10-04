// Today's session (product spec 4.1): due reviews, then new cards, then the main block (the next lecture).
// The plan is fixed once per day, the first time it is computed, so it doesn't shift while the owner works.
import { db } from '../db/db';
import { getMeta, getSettings, setMeta } from '../db/settings';
import { timeOnDay } from '../db/time';
import { dayKey } from '../lib/format';
import { lectureNow, nextTrack } from '../lectures/store';
import { trackSeconds, TRACK_COUNT } from '../lectures/tracks';
import { introducedToday } from '../review/notes';
import { dueReviews, nextReviews, pace, pendingNew, reviewedToday } from '../review/session';

export interface DayPlan {
  date: string;
  /** Reviews included today (all due ones, or fewer on a heavy day). */
  reviewsCap: number;
  /** Reviews due when the plan was made. */
  reviewsDueAtStart: number;
  /** New notes the app introduces today. */
  newPlanned: number;
  /** True when reviews left no room for new cards. */
  newSqueezed: boolean;
  mainTrack: number | null;
  firstRun: boolean;
}

export type Block = 'reviews' | 'new' | 'lecture' | 'done';

export interface TodayState {
  plan: DayPlan;
  reviews: { remaining: number; done: number; carry: number; estSecs: number; spentSecs: number };
  fresh: { remaining: number; done: number; estSecs: number; spentSecs: number };
  lecture: { track: number | null; done: boolean; position: number; remainingSecs: number };
  next: Block;
  timeToday: number;
  nextReviews: { day: number; count: number } | null;
  paceMeasured: boolean;
}

/** Lecture rows read from the database, so live views update when a lecture changes. */
async function lectureRows() {
  const stored = new Map((await db.lectures.toArray()).map(r => [r.track, r]));
  return Array.from({ length: TRACK_COUNT }, (_, i) => stored.get(i + 1) ?? lectureNow(i + 1));
}

/** Today's plan, made (and saved) the first time it is asked for each day. */
export async function dayPlan(now = Date.now()): Promise<DayPlan> {
  const date = dayKey(new Date(now));
  const saved = await getMeta<DayPlan>(`plan:${date}`);
  if (saved) return saved;

  const settings = await getSettings();
  const [due, pend, p, rows, cardCount] = await Promise.all([dueReviews(now), pendingNew(now), pace(), lectureRows(), db.cards.count()]);
  const mainTrack = nextTrack(rows);
  const mainSecs = mainTrack ? Math.max(0, trackSeconds(mainTrack) - rows[mainTrack - 1].position) : 0;
  const budget = settings.dailyMinutes * 60;

  let reviewsCap = due.length;
  let newPlanned: number;
  let newSqueezed = false;
  if (due.length * p.review + mainSecs > budget) {
    // Heavy day: reviews fill the time left after the main block; the rest move to tomorrow.
    reviewsCap = Math.min(due.length, Math.max(1, Math.floor((budget - mainSecs) / p.review)));
    newPlanned = 0;
    newSqueezed = true;
  } else {
    // Waiting new cards: ticked lecture pairs count toward the daily limit; the listening side of
    // yesterday's new items doesn't (it is the same item heard instead of said), but takes time.
    const pendProd = pend.filter(c => c.type === 'production').length;
    const pendListen = pend.length - pendProd;
    const room = budget - due.length * p.review - mainSecs - pendListen * p.fresh;
    const fit = Math.max(0, Math.floor(room / p.fresh));
    newPlanned = Math.max(0, Math.min(settings.newPerDay, fit) - pendProd);
    newSqueezed = fit < settings.newPerDay;
  }
  const plan: DayPlan = { date, reviewsCap, reviewsDueAtStart: due.length, newPlanned, newSqueezed, mainTrack, firstRun: cardCount === 0 };
  await setMeta(`plan:${date}`, plan);
  return plan;
}

/** Changes today's main block (Swap). */
export async function setMainTrack(track: number | null, now = Date.now()) {
  const plan = await dayPlan(now);
  await setMeta(`plan:${plan.date}`, { ...plan, mainTrack: track });
}

/** Live view of today's session. Reads only (so it can run inside a live query); the plan must exist. */
export async function todayState(now = Date.now()): Promise<TodayState | null> {
  const plan = await getMeta<DayPlan>(`plan:${dayKey(new Date(now))}`);
  if (!plan) return null;
  const [due, pend, done, intro, p, timeToday, nr, rows] = await Promise.all([
    dueReviews(now), pendingNew(now), reviewedToday(now), introducedToday(now), pace(), timeOnDay(dayKey(new Date(now))), nextReviews(now), lectureRows(),
  ]);
  const reviewsRemaining = Math.max(0, Math.min(due.length, plan.reviewsCap - done.count));
  // Introduced notes today already have their cards waiting (pend); only the rest are still to be made.
  const freshRemaining = pend.length + Math.max(0, plan.newPlanned - intro);
  const row = plan.mainTrack ? rows[plan.mainTrack - 1] : null;
  const lectureDone = !plan.mainTrack || !!row?.done;
  const next: Block = reviewsRemaining > 0 ? 'reviews' : freshRemaining > 0 ? 'new' : !lectureDone ? 'lecture' : 'done';
  return {
    plan,
    reviews: {
      remaining: reviewsRemaining, done: done.count,
      carry: Math.max(0, plan.reviewsDueAtStart - plan.reviewsCap),
      estSecs: reviewsRemaining * p.review, spentSecs: done.ms / 1000,
    },
    fresh: { remaining: freshRemaining, done: done.newCount, estSecs: freshRemaining * p.fresh, spentSecs: done.newMs / 1000 },
    lecture: {
      track: plan.mainTrack, done: lectureDone, position: row?.position ?? 0,
      remainingSecs: plan.mainTrack ? Math.max(0, trackSeconds(plan.mainTrack) - (row?.position ?? 0)) : 0,
    },
    next,
    timeToday,
    nextReviews: nr,
    paceMeasured: p.measured,
  };
}
