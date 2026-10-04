// App-wide view state that isn't a page: whether the full lecture player sheet is open.
import { useSyncExternalStore } from 'react';

let playerOpen = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(l => l());

export function openPlayerSheet() { playerOpen = true; emit(); }
export function closePlayerSheet() { playerOpen = false; emit(); }
export function usePlayerSheet(): boolean {
  return useSyncExternalStore(l => { listeners.add(l); return () => { listeners.delete(l); }; }, () => playerOpen, () => playerOpen);
}
