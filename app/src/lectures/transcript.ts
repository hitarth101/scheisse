// English → German pairs from the volunteer Language Transfer transcript, extracted on the PC by
// tools/extract-transcript.py into public/data/lt-pairs.json. The transcript has many errors, so a pair
// only becomes a card after the owner ticks it as matching the audio (product spec 4.2).
import { useEffect, useState } from 'react';

export interface Pair { en: string; de: string }
type PairFile = { source: string; tracks: Record<string, Pair[]> };

let cache: PairFile | null = null;
let loading: Promise<PairFile> | null = null;

export function loadPairs(): Promise<PairFile> {
  if (cache) return Promise.resolve(cache);
  if (!loading) {
    loading = fetch(`${import.meta.env.BASE_URL}data/lt-pairs.json`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<PairFile>; })
      .then(d => { cache = d; return d; })
      .finally(() => { loading = null; });
  }
  return loading;
}

export type PairsState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; pairs: Pair[] };

export function usePairs(track: number): PairsState & { retry: () => void } {
  const [s, setS] = useState<PairsState>(() => cache ? { status: 'ready', pairs: cache.tracks[String(track)] ?? [] } : { status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    if (!cache) setS({ status: 'loading' });
    loadPairs()
      .then(d => { if (live) setS({ status: 'ready', pairs: d.tracks[String(track)] ?? [] }); })
      .catch(() => { if (live) setS({ status: 'error' }); });
    return () => { live = false; };
  }, [track, attempt]);
  return { ...s, retry: () => setAttempt(a => a + 1) };
}
