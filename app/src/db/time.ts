import { db, type Activity } from './db';
import { dayKey } from '../lib/format';

/** Adds seconds to today's total for an activity (time logged, product spec 4.7). */
export async function addTime(activity: Activity, seconds: number, date: string = dayKey()) {
  if (!(seconds > 0)) return;
  await db.transaction('rw', db.time, async () => {
    const row = await db.time.get([date, activity]);
    await db.time.put({ date, activity, seconds: (row?.seconds ?? 0) + seconds });
  });
}

/** Total seconds logged on a day, all activities together. */
export async function timeOnDay(date: string = dayKey()): Promise<number> {
  const rows = await db.time.where('date').equals(date).toArray();
  return rows.reduce((s, r) => s + r.seconds, 0);
}
