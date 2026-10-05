// Swipe from the left edge goes back on detail pages (design spec 6). Only in the home-screen app:
// in a Safari tab, Safari's own swipe already does this and the two would both fire.
import { useEffect } from 'react';
import { isStandalone } from './device';
import { back, type Route } from './router';

const PARENT: Partial<Record<Route['name'], Route>> = {
  track: { name: 'lectures' },
  card: { name: 'flashcards' },
  settings: { name: 'status' },
  credits: { name: 'status' },
};

export function useEdgeSwipeBack(route: Route) {
  useEffect(() => {
    const parent = PARENT[route.name];
    if (!parent || !isStandalone()) return;
    let start: { x: number; y: number } | null = null;
    const down = (e: TouchEvent) => {
      const t = e.touches[0];
      start = t.clientX <= 20 ? { x: t.clientX, y: t.clientY } : null;
    };
    const up = (e: TouchEvent) => {
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x, dy = Math.abs(t.clientY - start.y);
      start = null;
      if (dx > 70 && dy < 50 && !document.querySelector('.sheet, .player')) back(parent);
    };
    document.addEventListener('touchstart', down, { passive: true });
    document.addEventListener('touchend', up, { passive: true });
    return () => { document.removeEventListener('touchstart', down); document.removeEventListener('touchend', up); };
  }, [route.name]);
}
