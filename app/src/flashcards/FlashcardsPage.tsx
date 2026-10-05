// Flashcards (owner decision 2026-10-04): what the queue holds right now as plain facts, one Study key,
// and a list of every card. There are no sessions; Study can be opened and closed at any time.
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useContent } from '../content/load';
import { getMeta, useSettings } from '../db/settings';
import { timeOnDay } from '../db/time';
import { dayWord, daysAgo, minutes, timeOfDay } from '../lib/format';
import { navigate } from '../lib/router';
import { cardsLeft, EXTRA_NEW, grantMore, queueState } from '../review/queue';
import { nextReviews } from '../review/session';
import { NounHead } from '../ui/German';
import { Icon } from '../ui/icons';
import { Foot, GoKey, Group, Key2, Lamp, LargeTitle, NavRow, Notice, Pad, Row, SectionHeader, Sheet, showToast } from '../ui/kit';
import { allItems, FILTERS, matches, rowDetail, type Filter } from './cards';

const PAGE = 50;
const approx = (secs: number) => `~${Math.max(1, Math.round(secs / 60))} min`;

// Kept while the app is open, so coming back from a card keeps the search and filter.
let remembered: { filter: Filter; query: string; shown: number } = { filter: 'all', query: '', shown: PAGE };

export function FlashcardsPage() {
  const settings = useSettings();
  const content = useContent();
  // Missed cards come back after a few minutes, so the facts are refreshed every minute.
  const [minute, setMinute] = useState(0);
  useEffect(() => { const t = window.setInterval(() => setMinute(m => m + 1), 60_000); return () => window.clearInterval(t); }, []);
  const q = useLiveQuery(() => queueState(), [minute], null);
  const next = useLiveQuery(() => nextReviews(), [minute], null);
  const timeToday = useLiveQuery(() => timeOnDay(), [minute], 0);
  const lastBackup = useLiveQuery(() => getMeta<number>('lastBackupAt'), [], undefined);

  if (!q) {
    return (
      <>
        <NavRow />
        <LargeTitle title="Flashcards" />
        <SectionHeader left="Now" />
        <Group>
          {[40, 48].map(w => (
            <div className="cl" key={w}><Lamp state="off" label="loading" /><div className="ct"><div className="skel" style={{ width: `${w}%` }} /><div className="skel" style={{ width: `${w + 18}%`, height: 11, marginTop: 8 }} /></div></div>
          ))}
        </Group>
        <Pad><GoKey icon="play" disabled>Study</GoKey></Pad>
      </>
    );
  }

  const due = q.reviews.length + q.listening.length;
  const left = cardsLeft(q);
  const firstRun = !q.newDone && !due && !next && !q.waiting.length && !q.laterAt && timeToday < 1;

  const reviewsSub = due ? `${due} due` : q.laterAt ? `Missed cards come back at ${timeOfDay(q.laterAt)}` : firstRun ? 'None yet' : 'None due';
  const picked = Math.min(q.waiting.length, q.newLeft);
  const newSub = q.newLeft > 0
    ? `${q.newLeft} left today${picked ? ` · ${picked} you picked come first` : firstRun ? ' · first Goethe A1 words' : ''}`
    : q.paused && q.newDone < settings.newPerDay ? `Paused today · reviews take about ${minutes(q.daySecs)}`
    : `Today's ${q.newDone} done${q.waiting.length ? ` · ${q.waiting.length} you picked wait for tomorrow` : ''}`;

  const more = async () => {
    await grantMore();
    showToast(`${EXTRA_NEW} more new cards today`);
  };

  return (
    <>
      <NavRow />
      <LargeTitle title="Flashcards" />

      <SectionHeader left="Now" right={left ? approx(q.dueSecs + q.newSecs) : undefined} />
      <Group>
        <Row lamp={due ? 'on' : 'off'} lampLabel={due ? 'next' : 'nothing due'} title="Reviews" sub={reviewsSub} detail={due ? approx(q.dueSecs) : undefined} />
        <Row lamp={!due && q.newLeft ? 'on' : 'off'} lampLabel={!due && q.newLeft ? 'next' : 'waiting'} title="New cards" sub={newSub} detail={q.newLeft ? approx(q.newSecs) : undefined} />
      </Group>
      {left > 0 || q.soon.length > 0 ? (
        <Pad><GoKey icon="play" onClick={() => navigate({ name: 'study' })}>Study</GoKey></Pad>
      ) : (
        <Pad top={16}>
          <div className="card" style={{ margin: 0, padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Lamp state="done" /><h2 className="t-title3">Nothing due right now</h2></div>
            <p className="t-body l2" style={{ margin: '8px 0 0' }}>
              {next ? `Next reviews: ${dayWord(next.day)}, ${next.count} card${next.count === 1 ? '' : 's'}.` : 'No reviews scheduled yet.'}
            </p>
          </div>
        </Pad>
      )}
      <Group style={{ marginTop: 16 }}>
        <Row icon="plus" title={`Add ${EXTRA_NEW} more new cards today`}
          sub={q.paused ? 'New cards are paused today because reviews take longer than the daily time' : undefined} onClick={() => void more()} />
      </Group>

      {firstRun && !lastBackup && (
        <Pad top={20}>
          <Notice title="Your progress lives on this iPhone">
            Export a backup from Status now and then. Moving from another install?{' '}
            <button type="button" className="link" onClick={() => navigate({ name: 'status' })}>Restore from backup</button>
          </Notice>
        </Pad>
      )}

      <CardList />

      <Foot>
        {content.state === 'loading' ? `Loading word data · ${content.done} of ${content.total} files. ` : ''}
        Time today: {minutes(timeToday)}.{lastBackup ? ` Last backup ${daysAgo(new Date(lastBackup))}.` : ''}
        {!q.measured && left > 0 ? ' Times are first estimates until you have answered a few cards.' : ''}
      </Foot>
    </>
  );
}

function CardList() {
  const items = useLiveQuery(allItems, [], null);
  const [filter, setFilter] = useState<Filter>(remembered.filter);
  const [query, setQuery] = useState(remembered.query);
  const [shown, setShown] = useState(remembered.shown);
  const [picker, setPicker] = useState(false);
  useEffect(() => { remembered = { filter, query, shown }; }, [filter, query, shown]);

  const found = items ? items.filter(i => matches(i, filter, query)) : [];
  const label = FILTERS.find(f => f.value === filter)!.label;
  const suspended = items ? items.filter(i => i.cards.some(c => c.suspended)).length : 0;

  return (
    <>
      <SectionHeader left="All cards" right={items ? `${items.length}` : undefined} style={{ paddingTop: 28 }} />
      <div style={{ padding: '0 16px' }}>
        <input className="field" type="search" lang="de" value={query} placeholder="Search German or English"
          aria-label="Search cards" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
          onChange={e => { setQuery(e.currentTarget.value); setShown(PAGE); }} />
      </div>
      <Group style={{ marginTop: 12 }}>
        <Row title="Show" detail={label} chevron onClick={() => setPicker(true)} />
        {suspended > 0 && filter !== 'suspended' && (
          <Row icon="suspend" title="Suspended" sub="Leeches, flagged and suspended cards wait for your decision" detail={suspended} chevron
            onClick={() => { setFilter('suspended'); setShown(PAGE); }} />
        )}
      </Group>

      {items && found.length === 0 && (
        <Foot>{items.length === 0 ? 'No cards yet. Study adds the first words; lectures, reading and the inbox add the ones you pick.' : 'No cards match.'}</Foot>
      )}
      {found.length > 0 && (
        <Group flush style={{ marginTop: 12 }} className="cardlist">
          {found.slice(0, shown).map(({ note, cards }) => (
            <Row key={note.id} lang="de" onClick={() => navigate({ name: 'card', note: note.id })}
              title={note.kind === 'word' && note.pos === 'noun' ? <NounHead note={note} /> : note.de}
              sub={<span lang="en">{note.en[0]}</span>} detail={rowDetail({ note, cards })} chevron
              label={`${note.de}, ${note.en[0]}`} />
          ))}
        </Group>
      )}
      {found.length > shown && (
        <Pad top={12}><Key2 onClick={() => setShown(s => s + PAGE)}>Show {Math.min(PAGE, found.length - shown)} more</Key2></Pad>
      )}

      {picker && (
        <Sheet label="Show" onClose={() => setPicker(false)}>
          <h2 className="t-title3">Show</h2>
          <Group flush className="on-bg" style={{ margin: '14px 0 0' }}>
            {FILTERS.map(f => (
              <Row key={f.value} selected={f.value === filter} title={f.label}
                lead={<span style={{ width: 22, height: 22, display: 'grid', placeItems: 'center', color: 'var(--label)' }}>{f.value === filter && <Icon name="check" />}</span>}
                onClick={() => { setFilter(f.value); setShown(PAGE); setPicker(false); }} />
            ))}
          </Group>
          <div className="acts"><Key2 onClick={() => setPicker(false)}>Done</Key2></div>
        </Sheet>
      )}
    </>
  );
}
