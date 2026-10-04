// The 95% rule (product spec 4.2): a track counts as done when 95% of it has been played through,
// measured in 5-second stretches so that rewinding and re-listening never counts twice.

export const BUCKET_SECONDS = 5;
export const DONE_FRACTION = 0.95;

export function bucketCount(duration: number): number {
  return Math.max(1, Math.ceil(duration / BUCKET_SECONDS));
}

export function emptyCoverage(duration: number): string {
  return '0'.repeat(bucketCount(duration));
}

/** Marks the stretches touched by continuous playback from `from` to `to` seconds. */
export function markCovered(covered: string, duration: number, from: number, to: number): string {
  const n = bucketCount(duration);
  let bits = covered.length === n ? covered : (covered + '0'.repeat(n)).slice(0, n);
  if (!(to > from)) return bits;
  const a = Math.max(0, Math.floor(from / BUCKET_SECONDS));
  const b = Math.min(n - 1, Math.floor(Math.min(to, duration) / BUCKET_SECONDS));
  if (a > b) return bits;
  let changed = false;
  const arr = bits.split('');
  for (let i = a; i <= b; i++) if (arr[i] !== '1') { arr[i] = '1'; changed = true; }
  if (changed) bits = arr.join('');
  return bits;
}

export function coveredFraction(covered: string): number {
  if (!covered.length) return 0;
  let ones = 0;
  for (const c of covered) if (c === '1') ones++;
  return ones / covered.length;
}

export function isListened(covered: string): boolean {
  return coveredFraction(covered) >= DONE_FRACTION;
}
