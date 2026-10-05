// What is due, how long it takes, and recording a grade (with Undo).
import { db, type CardRow, type ReviewLogRow } from '../db/db';
import { addTime } from '../db/time';
import { dayKey } from '../lib/format';
import { grade, STATE, type Rating } from './scheduler';

export function endOfDay(now = Date.now()): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - 1;
}
export function startOfDay(now = Date.now()): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Cards answered today, counted once each. A card belongs to the block where it was first answered
 * today: a new card's second showing (its learning step) still counts as a new card, not a review.
 */
export async function reviewedToday(now = Date.now()): Promise<{ count: number; ms: number; newCount: number; newMs: number }> {
  const logs = (await db.revlog.where('at').aboveOrEqual(startOfDay(now)).toArray()).sort((a, b) => a.at - b.at);
  const firstWasNew = new Map<string, boolean>();
  for (const l of logs) if (!firstWasNew.has(l.cardId)) firstWasNew.set(l.cardId, l.before.state === STATE.New);
  let count = 0, newCount = 0, ms = 0, newMs = 0;
  for (const isNew of firstWasNew.values()) { if (isNew) newCount++; else count++; }
  for (const l of logs) { if (firstWasNew.get(l.cardId)) newMs += l.ms; else ms += l.ms; }
  return { count, ms, newCount, newMs };
}

/**
 * The owner's measured seconds per card (product spec 4.1), from the last reviews. Until there are
 * enough reviews to measure, a starting estimate is used and labelled as such by the caller.
 */
export async function pace(): Promise<{ review: number; fresh: number; measured: boolean }> {
  const logs = await db.revlog.orderBy('at').reverse().limit(400).toArray();
  const avg = (xs: ReviewLogRow[]) => xs.reduce((s, l) => s + Math.min(l.ms, 120_000), 0) / xs.length / 1000;
  const rev = logs.filter(l => l.before.state !== STATE.New);
  const fresh = logs.filter(l => l.before.state === STATE.New);
  return {
    review: rev.length >= 10 ? avg(rev) : 15,
    fresh: fresh.length >= 10 ? avg(fresh) : 35,
    measured: rev.length >= 10 || fresh.length >= 10,
  };
}

/** The earliest future due date and how many learned cards fall on that day ("Next reviews: tomorrow, 37 cards."). */
export async function nextReviews(now = Date.now()): Promise<{ day: number; count: number } | null> {
  const after = await db.cards.where('due').above(endOfDay(now)).toArray();
  const live = after.filter(c => !c.suspended && c.state !== STATE.New);
  if (!live.length) return null;
  const first = Math.min(...live.map(c => c.due));
  const day = startOfDay(first);
  return { day, count: live.filter(c => c.due >= day && c.due <= endOfDay(first)).length };
}

/** Saves a grade: the card's new schedule, a log entry (for Undo and pace) and review time. */
export async function recordGrade(card: CardRow, rating: Rating, ms: number, mode: 'speak' | 'type', retention: number, now = Date.now()): Promise<{ card: CardRow; logId: number }> {
  const after = grade(card, rating, now, retention);
  let logId = 0;
  await db.transaction('rw', db.cards, db.revlog, async () => {
    await db.cards.put(after);
    logId = (await db.revlog.add({ cardId: card.id, rating, at: now, ms, mode, before: card })) as number;
  });
  await addTime('review', Math.min(ms, 120_000) / 1000, dayKey(new Date(now)));
  return { card: after, logId };
}

/** Undo: puts the card back exactly as it was and removes the log entry and its time. */
export async function undoGrade(logId: number): Promise<CardRow | null> {
  const log = await db.revlog.get(logId);
  if (!log) return null;
  await db.transaction('rw', db.cards, db.revlog, async () => {
    await db.cards.put(log.before);
    await db.revlog.delete(logId);
  });
  await addTime('review', -Math.min(log.ms, 120_000) / 1000, dayKey(new Date(log.at)));
  return log.before;
}

export async function setSuspended(cardId: string, reason: CardRow['suspendReason'] | null) {
  await db.cards.update(cardId, reason ? { suspended: 1, suspendReason: reason } : { suspended: 0, suspendReason: undefined, fails: 0 });
}

/** Deletes a note and all its cards. Review history stays for the pace. */
export async function deleteNote(noteId: string) {
  await db.transaction('rw', db.notes, db.cards, async () => {
    await db.cards.where('noteId').equals(noteId).delete();
    await db.notes.delete(noteId);
  });
}
