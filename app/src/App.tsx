import { useEffect } from 'react';
import { useSettings } from './db/settings';
import { isFocus, tabOf, useRoute, type Route, type Tab } from './lib/router';
import { usePlayerSheet } from './lib/ui';
import { onTrackEnded, usePlayer } from './lectures/player';
import { loadPairs } from './lectures/transcript';
import { db } from './db/db';
import { navigate } from './lib/router';
import { closePlayerSheet } from './lib/ui';
import { MiniPlayer } from './lectures/MiniPlayer';
import { PlayerSheet } from './lectures/PlayerSheet';
import { LecturesPage } from './lectures/LecturesPage';
import { TrackPage } from './lectures/TrackPage';
import { TickScreen } from './lectures/TickScreen';
import { FlashcardsPage } from './flashcards/FlashcardsPage';
import { CardPage } from './flashcards/CardPage';
import { Study } from './review/ReviewSession';
import { InboxPage } from './inbox/InboxPage';
import { CapturePage } from './inbox/CapturePage';
import { DictionariesPage } from './status/DictionariesPage';
import { GrammarPage } from './grammar/GrammarPage';
import { TopicPage } from './grammar/TopicPage';
import { TablePage } from './grammar/TablePage';
import { StatusPage } from './status/StatusPage';
import { SettingsPage } from './status/SettingsPage';
import { CreditsPage } from './status/CreditsPage';
import { Icon, type IconName } from './ui/icons';
import { ToastHost } from './ui/kit';
import { useEdgeSwipeBack } from './lib/gestures';

// Tabs (owner decision 2026-10-04: no sessions, so Today is replaced by Flashcards and Status becomes a tab).
const TABS: { key: Tab; label: string; icon: IconName; route: string }[] = [
  { key: 'flashcards', label: 'Flashcards', icon: 'cards', route: '#/flashcards' },
  { key: 'lectures', label: 'Lectures', icon: 'lectures', route: '#/lectures' },
  { key: 'grammar', label: 'Grammar', icon: 'grammar', route: '#/grammar' },
  { key: 'status', label: 'Status', icon: 'stats', route: '#/status' },
];

function TabBar({ route }: { route: Route }) {
  const active = tabOf(route);
  return (
    <nav className="tabbar" aria-label="Tabs">
      {TABS.map(t => (
        <a key={t.key} href={t.route} aria-current={active === t.key ? 'page' : undefined}
          onClick={e => { e.preventDefault(); location.hash = t.route; }}>
          <Icon name={t.icon} />{t.label}
        </a>
      ))}
    </nav>
  );
}

function Page({ route }: { route: Route }) {
  switch (route.name) {
    case 'flashcards': return <FlashcardsPage />;
    case 'card': return <CardPage key={route.note} noteId={route.note} />;
    case 'lectures': return <LecturesPage />;
    case 'track': return <TrackPage key={route.track} track={route.track} />;
    case 'tick': return <TickScreen key={route.track} track={route.track} />;
    case 'study': return <Study />;
    case 'inbox': return <InboxPage />;
    case 'capture': return <CapturePage />;
    case 'dictionaries': return <DictionariesPage />;
    case 'grammar': return <GrammarPage />;
    case 'topic': return <TopicPage key={route.id} id={route.id} />;
    case 'table': return <TablePage key={route.id} id={route.id} />;
    case 'status': return <StatusPage />;
    case 'settings': return <SettingsPage />;
    case 'credits': return <CreditsPage />;
  }
}

export function App() {
  const route = useRoute();
  const player = usePlayer();
  const sheetOpen = usePlayerSheet();
  const settings = useSettings();
  const focus = isFocus(route);
  const showMini = !focus && player.track != null;

  useEdgeSwipeBack(route);

  // When a track ends, the sentences from it are offered for ticking (product spec 4.2).
  useEffect(() => onTrackEnded(async track => {
    const row = await db.lectures.get(track);
    if (row?.ticksDone) return;
    try {
      const d = await loadPairs();
      if (!d.tracks[String(track)]?.length) return;
    } catch { return; }
    closePlayerSheet();
    navigate({ name: 'tick', track });
  }), []);

  useEffect(() => {
    document.body.classList.toggle('raised-bg', route.name === 'tick');
  }, [route.name]);

  // Accessibility text sizes (body 28 pt and up) switch some layouts, e.g. the grading keys (design spec 2.1).
  useEffect(() => {
    const check = () => document.body.classList.toggle('ax', parseFloat(getComputedStyle(document.documentElement).fontSize) >= 28);
    check();
    window.addEventListener('resize', check);
    document.addEventListener('visibilitychange', check);
    return () => { window.removeEventListener('resize', check); document.removeEventListener('visibilitychange', check); };
  }, []);

  return (
    <div className={settings.genderColours ? undefined : 'no-gender'}>
      <div className="statusbar-backdrop" aria-hidden="true" />
      <main className={'page' + (focus ? ' focus' : showMini ? ' with-mini' : '')}>
        <Page route={route} />
      </main>
      {showMini && !sheetOpen && <MiniPlayer />}
      {!focus && !sheetOpen && <TabBar route={route} />}
      {sheetOpen && player.track != null && <PlayerSheet />}
      <ToastHost position={focus ? 'focus' : showMini ? 'mini' : 'tabs'} />
    </div>
  );
}
