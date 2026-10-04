// Lecture progress rows, with an in-memory copy so the player can start audio synchronously inside a tap
// (iOS only allows audio to start directly from a user gesture, not after waiting for the database).
import { liveQuery } from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type LectureRow } from '../db/db';
import { emptyCoverage } from './progress';
import { trackSeconds, TRACK_COUNT } from './tracks';

const cache = new Map<number, LectureRow>();

export function blankLecture(track: number): LectureRow {
  return { track, position: 0, covered: emptyCoverage(trackSeconds(track)), done: 0, notes: '' };
}

export function lectureNow(track: number): LectureRow {
  return cache.get(track) ?? blankLecture(track);
}

let started = false;
/** Loads all rows once and keeps the copy current (also after a restore from backup). */
export async function startLectureCache() {
  if (started) return;
  started = true;
  for (const r of await db.lectures.toArray()) cache.set(r.track, r);
  liveQuery(() => db.lectures.toArray()).subscribe({
    next: rows => { cache.clear(); for (const r of rows) cache.set(r.track, r); },
  });
}

/** Merges changes into a track's row and saves it. */
export async function updateLecture(track: number, changes: Partial<LectureRow>) {
  const merged = { ...lectureNow(track), ...changes, track };
  cache.set(track, merged);
  await db.transaction('rw', db.lectures, async () => {
    const current = (await db.lectures.get(track)) ?? blankLecture(track);
    await db.lectures.put({ ...current, ...changes, track });
  });
}

export async function setDone(track: number, done: boolean) {
  await updateLecture(track, done
    ? { done: 1, doneAt: Date.now(), doneBy: 'manual' }
    : { done: 0, doneAt: undefined, doneBy: undefined });
}

/** All 50 rows, filled with blanks where nothing is stored yet. */
export function useLectures(): LectureRow[] {
  return useLiveQuery(async () => {
    const rows = await db.lectures.toArray();
    const byTrack = new Map(rows.map(r => [r.track, r]));
    return Array.from({ length: TRACK_COUNT }, (_, i) => byTrack.get(i + 1) ?? blankLecture(i + 1));
  }, [], Array.from({ length: TRACK_COUNT }, (_, i) => lectureNow(i + 1)));
}

/** The next track that is not done (null when all 50 are done). */
export function nextTrack(rows: LectureRow[]): number | null {
  const r = rows.find(x => !x.done);
  return r ? r.track : null;
}
