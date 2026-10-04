// Spaced repetition with FSRS (product spec 4.3), through ts-fsrs, the FSRS authors' own code.
import { createEmptyCard, fsrs, generatorParameters, type Card, type Grade } from 'ts-fsrs';
import type { CardRow, CardType } from '../db/db';

export type Rating = 1 | 2 | 3 | 4;
export const RATING_NAMES: Record<Rating, string> = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };
export const STATE = { New: 0, Learning: 1, Review: 2, Relearning: 3 } as const;
/** A card failed this many times in total is a leech (product spec 6). */
export const LEECH_FAILS = 8;

export function scheduler(retention: number) {
  return fsrs(generatorParameters({ request_retention: retention, enable_fuzz: true, enable_short_term: true }));
}

export function toFsrs(c: CardRow): Card {
  return {
    due: new Date(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review ? new Date(c.last_review) : undefined,
  };
}

function withFsrs(base: CardRow, card: Card): CardRow {
  return {
    ...base,
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? card.last_review.getTime() : undefined,
  };
}

export function newCard(noteId: string, type: CardType, now: number, due: number = now): CardRow {
  const empty = createEmptyCard(new Date(now));
  return withFsrs({
    id: `${noteId}#${type}`, noteId, type, due, stability: 0, difficulty: 0, elapsed_days: 0, scheduled_days: 0,
    learning_steps: 0, reps: 0, lapses: 0, state: 0, suspended: 0, fails: 0, createdAt: now,
  }, { ...empty, due: new Date(due) });
}

/** The card after a grade, with the leech rule applied. */
export function grade(c: CardRow, rating: Rating, now: number, retention: number): CardRow {
  const next = scheduler(retention).next(toFsrs(c), new Date(now), rating as Grade).card;
  const out = withFsrs(c, next);
  if (rating === 1) {
    out.fails = (c.fails ?? 0) + 1;
    if (out.fails >= LEECH_FAILS && !out.suspended) {
      out.suspended = 1;
      out.suspendReason = 'leech';
    }
  }
  return out;
}

/** When each grade would bring the card back, in milliseconds from now. */
export function previewIntervals(c: CardRow, now: number, retention: number): Record<Rating, number> {
  const p = scheduler(retention).repeat(toFsrs(c), new Date(now));
  return {
    1: p[1].card.due.getTime() - now,
    2: p[2].card.due.getTime() - now,
    3: p[3].card.due.getTime() - now,
    4: p[4].card.due.getTime() - now,
  };
}

/** "<10 min", "10 min", "1 day", "3 days", "2 mo", "1.5 yr": the interval under each grading key. */
export function intervalLabel(ms: number): string {
  const min = ms / 60_000;
  if (min < 10) return '<10 min';
  if (min < 60) return `${Math.round(min)} min`;
  const h = min / 60;
  if (h < 24) return `${Math.round(h)} h`;
  const d = Math.round(h / 24);
  if (d < 31) return d === 1 ? '1 day' : `${d} days`;
  const mo = d / 30.4;
  if (mo < 12) return `${Math.round(mo)} mo`;
  const yr = d / 365;
  return `${yr < 10 ? Math.round(yr * 10) / 10 : Math.round(yr)} yr`;
}
