// The app's one icon set: 24-unit grid, 1.8 stroke, round caps and joins (copied from design/mockups/f.js).
import type { ReactNode } from 'react';

type Def = { d: ReactNode; fill?: boolean; sw?: number };

const tenLabel = (x: number) => (
  <text x={x} y="15.6" fontSize="7.4" fontWeight="700" textAnchor="middle" fill="currentColor" stroke="none" fontFamily="-apple-system,BlinkMacSystemFont,sans-serif">10</text>
);

const ICONS = {
  cards: { d: <><rect x="3.5" y="7.5" width="13.5" height="13" rx="2.2" /><path d="M7.5 4.5h10.5a2.5 2.5 0 0 1 2.5 2.5v10" /></> },
  today: { d: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></> },
  lectures: { d: <><path d="M4 15.5V12a8 8 0 0 1 16 0v3.5" /><path d="M4 14.5h3.2v6H5.6A1.6 1.6 0 0 1 4 18.9zM20 14.5h-3.2v6h1.6a1.6 1.6 0 0 0 1.6-1.6z" /></> },
  reading: { d: <path d="M12 7c-2.2-1.6-5.2-2.1-8.5-1.6v13c3.3-.5 6.3 0 8.5 1.6 2.2-1.6 5.2-2.1 8.5-1.6v-13C17.2 4.9 14.2 5.4 12 7zM12 7v13" /> },
  grammar: { d: <><rect x="3.5" y="4.5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17M3.5 14.5h17M9.5 4.5v15" /></> },
  inbox: { d: <><path d="M3.5 13.5l2.4-7A2 2 0 0 1 7.8 5h8.4a2 2 0 0 1 1.9 1.5l2.4 7V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" /><path d="M3.5 13.5h4.6l1.4 2.4h5l1.4-2.4h4.6" /></> },
  stats: { d: <path d="M5 20v-7M10 20V5M15 20v-9M20 20V9" />, sw: 1.9 },
  close: { d: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />, sw: 2.2 },
  more: { d: <><circle cx="5.5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="18.5" cy="12" r="1.7" /></>, fill: true },
  chev: { d: <path d="M9 5.5l6.5 6.5L9 18.5" />, sw: 2.6 },
  back: { d: <path d="M15 5.5L8.5 12l6.5 6.5" />, sw: 2.4 },
  down: { d: <path d="M5.5 9l6.5 6.5L18.5 9" />, sw: 2.4 },
  play: { d: <path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5A.8.8 0 0 0 8 5.2z" />, fill: true },
  pause: { d: <><rect x="6.5" y="5" width="4" height="14" rx="1.2" /><rect x="13.5" y="5" width="4" height="14" rx="1.2" /></>, fill: true },
  rew10: { d: <><path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5" /><path d="M4.5 4v4h4" />{tenLabel(12.2)}</> },
  fwd10: { d: <><path d="M19.5 12a7.5 7.5 0 1 1-2.4-5.5" /><path d="M19.5 4v4h-4" />{tenLabel(11.8)}</> },
  speaker: { d: <><path d="M4 9.5h3.4L12 5.6v12.8l-4.6-3.9H4z" /><path d="M15.6 9.2a4 4 0 0 1 0 5.6M18.2 6.6a7.6 7.6 0 0 1 0 10.8" /></> },
  mic: { d: <><rect x="9" y="3" width="6" height="11.5" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></> },
  keyboard: { d: <><rect x="2.5" y="6" width="19" height="12" rx="2.2" /><path d="M6.5 10h.5M10 10h.5M13.5 10h.5M17 10h.5M8 14h8" /></> },
  check: { d: <path d="M5 12.5l4.5 4.5L19 7.5" />, sw: 2.4 },
  plus: { d: <path d="M12 5v14M5 12h14" />, sw: 2.2 },
  edit: { d: <><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></> },
  flag: { d: <path d="M5 21V4.5M5 4.5h11l-2 4 2 4H5" /> },
  suspend: { d: <><circle cx="12" cy="12" r="8.5" /><path d="M10 9v6M14 9v6" /></> },
  undo: { d: <><path d="M9 7L4.5 11.5 9 16" /><path d="M4.5 11.5H14a5.5 5.5 0 0 1 0 11h-2" /></> },
  trash: { d: <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" /> },
  ext: { d: <path d="M14 4.5h5.5V10M19.5 4.5L11 13M17 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 4 18.5v-10A1.5 1.5 0 0 1 5.5 7H10" /> },
  info: { d: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5M12 7.8v.2" /></>, sw: 2 },
  warn: { d: <><path d="M12 4l9 15.5H3z" /><path d="M12 10v4.5M12 17.3v.2" /></>, sw: 2 },
  share: { d: <><path d="M12 15V3.5M7.5 8L12 3.5 16.5 8" /><path d="M6 11H5a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 5 20h14a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 19 11h-1" /></> },
  restore: { d: <><path d="M12 3.5V15M7.5 10.5L12 15l4.5-4.5" /><path d="M6 11H5a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 5 20h14a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 19 11h-1" /></> },
  clock: { d: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></> },
  note: { d: <><path d="M6 3.5h8.5L19 8v12.5H6z" /><path d="M14 3.5V8h5M9 12h7M9 15.5h7" /></> },
  swap: { d: <path d="M7 7h12.5M16 3.5L19.5 7 16 10.5M17 17H4.5M8 13.5L4.5 17 8 20.5" /> },
  turtle: { d: <path d="M3.5 15.5h17M6 15.5a6 6 0 0 1 12 0M18 15.5l1.5-3h1.5M7 15.5V18M15 15.5V18" /> },
  book2: { d: <><rect x="5" y="3.5" width="14" height="17" rx="1.8" /><path d="M9 3.5v17" /></> },
  type: { d: <path d="M5 7V5h14v2M12 5v14M9 19h6" /> },
} satisfies Record<string, Def>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const def: Def = ICONS[name];
  const cls = 'ico' + (className ? ' ' + className : '');
  if (def.fill) {
    return <svg className={cls} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">{def.d}</svg>;
  }
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={def.sw ?? 1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{def.d}</svg>
  );
}
