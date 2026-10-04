// Formatting rules from design spec section 8: "13 min", "1 h 32 min", "3:41 of 9:45", "3 October", "Sat 3 Oct".

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** 221 → "3:41"; 3725 → "1:02:05". */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const ss = String(r).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Duration in whole minutes: 780 → "13 min"; 5520 → "1 h 32 min"; 3600 → "1 h". */
export function minutes(seconds: number): string {
  const total = Math.round(Math.max(0, seconds) / 60);
  const h = Math.floor(total / 60), m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "Saturday 3 October". */
export function longDate(d: Date = new Date()): string {
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "3 October", with the year when it isn't this year. */
export function shortDate(d: Date, now: Date = new Date()): string {
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return d.getFullYear() === now.getFullYear() ? base : `${base} ${d.getFullYear()}`;
}

/** Whole local days between two dates (calendar days, not 24-hour periods). */
export function daysBetween(a: Date, b: Date): number {
  const x = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const y = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((y - x) / 86_400_000);
}

/** "today", "yesterday", "5 days ago". */
export function daysAgo(d: Date, now: Date = new Date()): string {
  const n = daysBetween(d, now);
  if (n <= 0) return 'today';
  if (n === 1) return 'yesterday';
  return `${n} days ago`;
}

/** "28 September 2026, 21:14". */
export function dateTime(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "28 September 2026, 5 days ago" (design spec: backup line). */
export function backupLine(d: Date, now: Date = new Date()): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${daysAgo(d, now)}`;
}

/** Two-digit track number: 9 → "09". */
export function trackNo(n: number): string {
  return String(n).padStart(2, '0');
}
