import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

/** Settings with their defaults (product spec 4.7, design spec 5.7). */
export const DEFAULTS = {
  dailyMinutes: 30,
  newPerDay: 10,
  /** FSRS desired retention ("target memory rate"). */
  retention: 0.9,
  answerMode: 'speak' as 'speak' | 'type',
  autoplay: true,
  /** voiceURI of the chosen iPhone voice; null = best available German voice. */
  voice: null as string | null,
  voiceRate: 1,
  genderColours: true,
  /** The engineering deck (product spec 5.4), off until turned on. */
  engineering: false,
  haptics: true,
  lectureRate: 1,
};
export type Settings = typeof DEFAULTS;
export type SettingKey = keyof Settings;

export async function getSettings(): Promise<Settings> {
  const rows = await db.settings.toArray();
  const out: Record<string, unknown> = { ...DEFAULTS };
  for (const r of rows) if (r.key in DEFAULTS) out[r.key] = r.value;
  return out as Settings;
}

export async function getSetting<K extends SettingKey>(key: K): Promise<Settings[K]> {
  const row = await db.settings.get(key);
  return row ? (row.value as Settings[K]) : DEFAULTS[key];
}

export function setSetting<K extends SettingKey>(key: K, value: Settings[K]) {
  return db.settings.put({ key, value });
}

/** Live settings for React components; defaults until the database answers. */
export function useSettings(): Settings {
  return useLiveQuery(getSettings, [], DEFAULTS);
}

// ---- meta: small facts the app keeps about itself ----
export async function getMeta<T>(key: string): Promise<T | undefined> {
  const row = await db.meta.get(key);
  return row?.value as T | undefined;
}
export function setMeta(key: string, value: unknown) {
  return db.meta.put({ key, value });
}
