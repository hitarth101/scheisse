// A small address-based router using the part after "#", so GitHub Pages never needs to know about pages.
import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'flashcards' }
  | { name: 'card'; note: string }
  | { name: 'study' }
  | { name: 'inbox' }
  | { name: 'capture' }
  | { name: 'lectures' }
  | { name: 'track'; track: number }
  | { name: 'tick'; track: number }
  | { name: 'reading' }
  | { name: 'text'; id: string }
  | { name: 'grammar' }
  | { name: 'topic'; id: string }
  | { name: 'table'; id: string }
  | { name: 'status' }
  | { name: 'settings' }
  | { name: 'credits' }
  | { name: 'dictionaries' };

export type Tab = 'flashcards' | 'lectures' | 'reading' | 'grammar' | 'status';

export function parse(hash: string): Route {
  const [path] = hash.replace(/^#\/?/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  const n = (s: string | undefined) => { const v = Number(s); return Number.isInteger(v) && v >= 1 && v <= 50 ? v : null; };
  switch (parts[0]) {
    case 'flashcards':
      if (parts[1] === 'inbox') return parts[2] === 'capture' ? { name: 'capture' } : { name: 'inbox' };
      if (parts[1]) { try { return { name: 'card', note: decodeURIComponent(parts[1]) }; } catch { /* bad address */ } }
      return { name: 'flashcards' };
    case 'reading': return parts[1] ? { name: 'text', id: parts[1] } : { name: 'reading' };
    case 'grammar':
      if (parts[1] === 'topics' && parts[2]) return { name: 'topic', id: parts[2] };
      if (parts[1] === 'tables' && parts[2]) return { name: 'table', id: parts[2] };
      return { name: 'grammar' };
    case 'study': case 'review': return { name: 'study' };
    case 'lectures': {
      const t = n(parts[1]);
      if (t == null) return { name: 'lectures' };
      return parts[2] === 'sentences' ? { name: 'tick', track: t } : { name: 'track', track: t };
    }
    case 'status':
      if (parts[1] === 'settings') return { name: 'settings' };
      if (parts[1] === 'credits') return { name: 'credits' };
      if (parts[1] === 'dictionaries') return { name: 'dictionaries' };
      if (parts[1] === 'leeches' || parts[1] === 'flagged') return { name: 'flashcards' };
      return { name: 'status' };
    default: return { name: 'flashcards' };
  }
}

export function pathOf(r: Route): string {
  switch (r.name) {
    case 'flashcards': return '/flashcards';
    case 'card': return `/flashcards/${encodeURIComponent(r.note)}`;
    case 'study': return '/study';
    case 'inbox': return '/flashcards/inbox';
    case 'capture': return '/flashcards/inbox/capture';
    case 'reading': return '/reading';
    case 'text': return `/reading/${r.id}`;
    case 'grammar': return '/grammar';
    case 'topic': return `/grammar/topics/${r.id}`;
    case 'table': return `/grammar/tables/${r.id}`;
    case 'lectures': return '/lectures';
    case 'track': return `/lectures/${String(r.track).padStart(2, '0')}`;
    case 'tick': return `/lectures/${String(r.track).padStart(2, '0')}/sentences`;
    case 'status': return '/status';
    case 'settings': return '/status/settings';
    case 'credits': return '/status/credits';
    case 'dictionaries': return '/status/dictionaries';
  }
}

/** Pages without the tab bar and mini-player (design spec 3). */
export function isFocus(r: Route): boolean {
  return r.name === 'study' || r.name === 'tick' || r.name === 'capture';
}

/** Which tab a page belongs to. */
export function tabOf(r: Route): Tab {
  switch (r.name) {
    case 'lectures': case 'track': case 'tick': return 'lectures';
    case 'reading': case 'text': return 'reading';
    case 'grammar': case 'topic': case 'table': return 'grammar';
    case 'status': case 'settings': case 'credits': case 'dictionaries': return 'status';
    default: return 'flashcards';
  }
}

const listeners = new Set<() => void>();
let current = typeof location !== 'undefined' ? location.hash : '';
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    current = location.hash;
    remember();
    listeners.forEach(l => l());
    window.scrollTo(0, 0);
  });
}

function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
function snapshot() { return current; }

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, snapshot, snapshot);
  return parse(hash);
}

/** Depth of in-app history, so Back never leaves the app. */
function depth(): number { return (history.state && typeof history.state.depth === 'number') ? history.state.depth : 0; }

export function navigate(to: Route | string, opts: { replace?: boolean } = {}) {
  const path = typeof to === 'string' ? to : pathOf(to);
  const hash = '#' + path;
  if (location.hash === hash) return;
  if (opts.replace) {
    history.replaceState({ depth: depth() }, '', hash);
  } else {
    history.pushState({ depth: depth() + 1 }, '', hash);
  }
  current = location.hash;
  remember();
  listeners.forEach(l => l());
  window.scrollTo(0, 0);
}

/** Goes back one page, or to `fallback` when there is no earlier in-app page (e.g. after a relaunch). */
export function back(fallback: Route) {
  if (depth() > 0) history.back();
  else navigate(fallback, { replace: true });
}

// ---- Reopen the last page when relaunched within 10 minutes (design spec 3) ----
const LAST_KEY = 'scheisse.lastPage';
const REOPEN_MS = 10 * 60 * 1000;

function remember() {
  try { localStorage.setItem(LAST_KEY, JSON.stringify({ hash: location.hash, at: Date.now() })); } catch { /* storage unavailable */ }
}

/** At launch: Flashcards, unless the app was last used less than 10 minutes ago. */
export function launchHash(now = Date.now()): string {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    if (raw) {
      const { hash, at } = JSON.parse(raw) as { hash: string; at: number };
      if (typeof hash === 'string' && now - at < REOPEN_MS) return hash || '#/flashcards';
    }
  } catch { /* storage unavailable */ }
  return '#/flashcards';
}

export function initRouter() {
  // A cold start from the home screen opens the bare address; a page address (reload, test) is kept.
  const target = location.hash && location.hash !== '#' ? location.hash : launchHash();
  history.replaceState({ depth: 0 }, '', target);
  current = location.hash;
  remember();
}
