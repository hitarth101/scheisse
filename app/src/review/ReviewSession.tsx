// Review (design spec 5.2): a focus mode. Reviews first, then new cards; after the last block the
// green key leads straight into the lecture.
import { useCallback, useEffect, useRef, useState } from 'react';
import { db, type CardRow, type NoteRow } from '../db/db';
import { setSetting, useSettings } from '../db/settings';
import { contentData, ensureContent, useContent } from '../content/load';
import { tick } from '../lib/device';
import { minutes, trackNo } from '../lib/format';
import { back, navigate } from '../lib/router';
import { openPlayerSheet } from '../lib/ui';
import { open as openLecture, pauseForOtherAudio } from '../lectures/player';
import { dayPlan, todayState } from '../today/plan';
import { Icon } from '../ui/icons';
import { GoKey, Key2, Lamp, Notice, RKey, Seg, Sheet, showToast, Switch } from '../ui/kit';
import { stopCardAudio, unlockCardAudio } from './audio';
import { AllFormsSheet } from './AllFormsSheet';
import { CardView } from './CardView';
import { EditNote } from './EditNote';
import { introduceOnce, introducedToday } from './notes';
import { intervalLabel, previewIntervals, RATING_NAMES, type Rating } from './scheduler';
import { dueReviews, nextReviews, pendingNew, recordGrade, setSuspended, undoGrade } from './session';

type BlockKind = 'reviews' | 'new';
type Phase =
  | { kind: 'loading' }
  | { kind: 'card' }
  | { kind: 'summary'; block: BlockKind; next: NextStep }
  | { kind: 'empty'; next: { day: number; count: number } | null }
  | { kind: 'error'; title: string; text: string };
type NextStep = { kind: 'new'; count: number; secs: number } | { kind: 'lecture'; track: number } | { kind: 'today' };

const LEARN_AHEAD_MS = 20 * 60_000;

function cardLabel(card: CardRow, note: NoteRow): string {
  if (card.type === 'listening') return 'Listening';
  return note.kind === 'word' ? 'Word' : 'Sentence';
}

function dayWord(day: number): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((day - today.getTime()) / 86_400_000);
  if (diff <= 1) return 'tomorrow';
  return new Date(day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function ReviewSession({ only }: { only?: 'reviews' }) {
  const settings = useSettings();
  const content = useContent();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [block, setBlock] = useState<BlockKind>('reviews');
  const [current, setCurrent] = useState<{ card: CardRow; note: NoteRow; repeat: boolean } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [typed, setTyped] = useState('');
  const [mode, setMode] = useState<'speak' | 'type' | null>(null);
  const [sheet, setSheet] = useState<'more' | 'forms' | 'edit' | null>(null);
  const [, force] = useState(0);

  const queue = useRef<string[]>([]);
  const learning = useRef<{ id: string; due: number }[]>([]);
  const total = useRef(0);
  const graded = useRef(new Map<string, number>());
  const counts = useRef<Record<Rating, number>>({ 1: 0, 2: 0, 3: 0, 4: 0 });
  const blockMs = useRef(0);
  const shownAt = useRef(Date.now());
  const history = useRef<{ logId: number; card: CardRow; rating: Rating; label: string; repeat: boolean }[]>([]);

  const answerMode = mode ?? settings.answerMode;

  // Starting Review pauses a playing lecture (one audio source at a time).
  useEffect(() => { pauseForOtherAudio(); return () => stopCardAudio(); }, []);

  const resetBlock = (kind: BlockKind, ids: string[]) => {
    setBlock(kind);
    queue.current = ids;
    learning.current = [];
    total.current = ids.length;
    graded.current = new Map();
    counts.current = { 1: 0, 2: 0, 3: 0, 4: 0 };
    blockMs.current = 0;
    history.current = [];
  };

  const showNext = useCallback(async (): Promise<boolean> => {
    const now = Date.now();
    learning.current.sort((a, b) => a.due - b.due);
    let id: string | undefined;
    if (learning.current.length && learning.current[0].due <= now) id = learning.current.shift()!.id;
    else if (queue.current.length) id = queue.current.shift();
    else if (learning.current.length && learning.current[0].due - now <= LEARN_AHEAD_MS) id = learning.current.shift()!.id;
    while (id) {
      const card = await db.cards.get(id);
      const note = card ? await db.notes.get(card.noteId) : undefined;
      if (card && note && !card.suspended) {
        setCurrent({ card, note, repeat: graded.current.has(id) });
        setRevealed(false);
        setTyped('');
        shownAt.current = Date.now();
        setPhase({ kind: 'card' });
        return true;
      }
      id = queue.current.shift();
    }
    setCurrent(null);
    return false;
  }, []);

  const loadNewBlock = useCallback(async (): Promise<string[] | 'no-content'> => {
    const plan = await dayPlan();
    const wanted = Math.max(0, plan.newPlanned - (await introducedToday()));
    if (wanted > 0) {
      await ensureContent();
      if ((await contentData()).words.length === 0) return 'no-content';
      await introduceOnce(wanted);
    }
    return (await pendingNew()).map(c => c.id);
  }, []);

  const nextAfter = useCallback(async (kind: BlockKind): Promise<NextStep> => {
    if (only) return { kind: 'today' };
    await dayPlan();
    const s = (await todayState())!;
    if (kind === 'reviews' && s.fresh.remaining > 0) return { kind: 'new', count: s.fresh.remaining, secs: s.fresh.estSecs };
    if (s.lecture.track && !s.lecture.done) return { kind: 'lecture', track: s.lecture.track };
    return { kind: 'today' };
  }, [only]);

  const startBlock = useCallback(async (kind: BlockKind) => {
    setPhase({ kind: 'loading' });
    let ids: string[];
    if (kind === 'reviews') {
      const due = await dueReviews();
      if (!only) await dayPlan();
      const s = only ? null : await todayState();
      ids = (only ? due : due.slice(0, s!.reviews.remaining)).map(c => c.id);
      if (!ids.length && !only) { void startBlock('new'); return; }
    } else {
      const r = await loadNewBlock();
      if (r === 'no-content') {
        setPhase({ kind: 'error', title: "Couldn't load today's word data", text: 'Check your internet connection, then try again. Your progress is safe on this iPhone.' });
        return;
      }
      ids = r;
    }
    if (!ids.length) {
      setPhase({ kind: 'empty', next: await nextReviews() });
      return;
    }
    resetBlock(kind, ids);
    await showNext();
  }, [only, loadNewBlock, showNext]);

  // Start once (React's development mode runs effects twice on purpose).
  const started = useRef(false);
  useEffect(() => { if (!started.current) { started.current = true; void startBlock('reviews'); } }, [startBlock]);

  const finishBlock = useCallback(async () => {
    setPhase({ kind: 'summary', block, next: await nextAfter(block) });
  }, [block, nextAfter]);

  const reveal = () => { unlockCardAudio(); setRevealed(true); };

  const doGrade = async (rating: Rating) => {
    if (!current) return;
    unlockCardAudio();
    tick();
    stopCardAudio();
    const ms = Math.min(Date.now() - shownAt.current, 120_000);
    const { card, note, repeat } = current;
    const { card: after, logId } = await recordGrade(card, rating, ms, answerMode, settings.retention);
    history.current.push({ logId, card, rating, label: note.kind === 'word' ? note.de : note.de.slice(0, 24), repeat });
    graded.current.set(card.id, (graded.current.get(card.id) ?? 0) + 1);
    if (!repeat) counts.current[rating]++; // each card counts once, by its first answer
    blockMs.current += ms;
    if (after.suspended && after.suspendReason === 'leech') {
      showToast('Failed 8 times, suspended automatically');
    } else if (after.due - Date.now() < LEARN_AHEAD_MS) {
      learning.current.push({ id: after.id, due: after.due });
    }
    if (!(await showNext())) await finishBlock();
  };

  const undo = async () => {
    const last = history.current.pop();
    if (!last) return;
    const restored = await undoGrade(last.logId);
    if (!restored) return;
    learning.current = learning.current.filter(l => l.id !== last.card.id);
    if (current && !queue.current.includes(current.card.id) && current.card.id !== last.card.id) queue.current.unshift(current.card.id);
    if (!last.repeat) counts.current[last.rating]--;
    const n = (graded.current.get(last.card.id) ?? 1) - 1;
    if (n <= 0) graded.current.delete(last.card.id); else graded.current.set(last.card.id, n);
    const note = await db.notes.get(restored.noteId);
    if (note) {
      setCurrent({ card: restored, note, repeat: last.repeat });
      setRevealed(false);
      setTyped('');
      shownAt.current = Date.now();
      setPhase({ kind: 'card' });
    }
    setSheet(null);
  };

  const suspend = async (reason: 'manual' | 'flag') => {
    if (!current) return;
    const id = current.card.id;
    await setSuspended(id, reason);
    setSheet(null);
    total.current = Math.max(graded.current.size, total.current - (graded.current.has(id) ? 0 : 1));
    showToast(reason === 'flag' ? 'Flagged and suspended. It is listed in Status.' : 'Card suspended', {
      label: 'Undo',
      run: () => { void setSuspended(id, null).then(() => { queue.current.unshift(id); total.current++; void showNext(); }); },
    });
    if (!(await showNext())) await finishBlock();
  };

  const close = () => { stopCardAudio(); back({ name: 'today' }); };

  // ---- render ----
  const top = (title: React.ReactNode, withMore = true) => (
    <div className="rv-top">
      <RKey icon="close" label="Close review" onClick={close} />
      <span className="t" aria-live="polite">{title}</span>
      {withMore ? <RKey icon="more" label="More" onClick={() => setSheet('more')} /> : <span style={{ width: 42 }} />}
    </div>
  );

  if (phase.kind === 'loading') {
    return (
      <div className="rv">
        {top('Review', false)}
        {content.state === 'loading' && <p className="foot" style={{ paddingTop: 16 }}>Loading word data · {content.done} of {content.total} files</p>}
        <div className="card rv-card"><div className="skel" style={{ width: '50%', height: 28 }} /><div className="skel" style={{ width: '70%', marginTop: 12 }} /></div>
      </div>
    );
  }

  if (phase.kind === 'error') {
    return (
      <div className="rv">
        {top('Review', false)}
        <div style={{ padding: '24px 16px 0' }}><Notice kind="err" title={phase.title}>{phase.text}</Notice></div>
        <div className="spacer" />
        <div className="rv-bottom"><Key2 onClick={() => void startBlock(block)}>Try again</Key2></div>
      </div>
    );
  }

  if (phase.kind === 'empty') {
    return (
      <div className="rv">
        {top('Reviews', false)}
        <div className="card rv-card" style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Lamp state="off" label="nothing due" /><h2 className="t-title3">Nothing due right now</h2></div>
          <p className="t-body l2" style={{ margin: '8px 0 0' }}>
            {phase.next ? `Next reviews: ${dayWord(phase.next.day)}, ${phase.next.count} card${phase.next.count === 1 ? '' : 's'}.` : 'No cards yet.'}
          </p>
        </div>
        <div className="spacer" />
        <div className="rv-bottom"><Key2 onClick={close}>Back to Today</Key2></div>
      </div>
    );
  }

  if (phase.kind === 'summary') {
    const n = counts.current[1] + counts.current[2] + counts.current[3] + counts.current[4];
    const what = phase.block === 'reviews' ? 'review' : 'new card';
    const next = phase.next;
    const goOn = () => {
      if (next.kind === 'new') void startBlock('new');
      else if (next.kind === 'lecture') { navigate({ name: 'today' }, { replace: true }); openLecture(next.track, { autoplay: true }); openPlayerSheet(); }
      else close();
    };
    return (
      <div className="rv">
        {top(phase.block === 'reviews' ? 'Reviews done' : 'New cards done', false)}
        <div className="card rv-card" style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Lamp state="done" />
            <h2 className="t-title3 num">{n} {what}{n === 1 ? '' : 's'} · {minutes(blockMs.current / 1000)}</h2>
          </div>
          <div className="grp flush sum-rows" style={{ margin: '12px -20px 0', background: 'transparent', borderRadius: 0 }}>
            {([1, 2, 3, 4] as Rating[]).map(r => (
              <div className="cl" key={r}><div className="ct"><b>{RATING_NAMES[r]}</b></div><span className="det">{counts.current[r]}</span></div>
            ))}
          </div>
        </div>
        <div className="spacer" />
        <div className="rv-bottom">
          {next.kind === 'new' && <p className="t-sub l2" style={{ textAlign: 'center', margin: '0 0 10px' }}>Next: {next.count} new card{next.count === 1 ? '' : 's'}, about {minutes(next.secs)}</p>}
          {next.kind === 'lecture' && <p className="t-sub l2" style={{ textAlign: 'center', margin: '0 0 10px' }}>Next: Lecture {trackNo(next.track)}</p>}
          {next.kind === 'today'
            ? <Key2 onClick={goOn}>Back to Today</Key2>
            : <GoKey icon="play" onClick={goOn}>{next.kind === 'lecture' ? `Continue: Lecture ${trackNo(next.track)}` : 'Continue'}</GoKey>}
        </div>
      </div>
    );
  }

  if (!current) return null;
  const { card, note, repeat } = current;
  const position = Math.min(total.current, graded.current.size + (repeat ? 0 : 1));
  const pct = total.current ? (graded.current.size / total.current) * 100 : 0;
  const iv = revealed ? previewIntervals(card, Date.now(), settings.retention) : null;
  const lastUndo = history.current[history.current.length - 1];

  return (
    <div className="rv">
      {top(<>{position} of {total.current} <span>· {cardLabel(card, note)}</span></>)}
      <div className="bar rv-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
      <div className="rv-seg">
        <Seg label="Answer mode" value={answerMode} onChange={m => { setMode(m); void setSetting('answerMode', m); }}
          options={[{ value: 'speak', label: 'Speak' }, { value: 'type', label: 'Type' }]} />
      </div>
      <div className="rv-scroll">
        <CardView key={card.id + ':' + (graded.current.get(card.id) ?? 0)} card={card} note={note} settings={settings}
          mode={card.type === 'listening' ? 'speak' : answerMode} revealed={revealed}
          typed={typed} onTyped={setTyped} onCheck={reveal} onAllForms={() => setSheet('forms')} />
        <div className="spacer" style={{ minHeight: 24 }} />
      </div>

      {revealed && iv ? (
        <div className="grades" role="group" aria-label="Grade your answer">
          {([1, 2, 3, 4] as Rating[]).map(r => (
            <button key={r} type="button" className={'gk' + (r === 1 ? ' again' : r === 3 ? ' good' : '')} onClick={() => void doGrade(r)}
              aria-label={`${RATING_NAMES[r]}, next review in ${intervalLabel(iv[r])}`}>
              {RATING_NAMES[r]}<small>{intervalLabel(iv[r])}</small>
            </button>
          ))}
          {([1, 2, 3, 4] as Rating[]).map(r => <span key={'i' + r} className="gi" aria-hidden="true">{intervalLabel(iv[r])}</span>)}
        </div>
      ) : (answerMode === 'speak' || card.type === 'listening') && (
        <div className="rv-bottom"><GoKey onClick={reveal}>Reveal</GoKey></div>
      )}

      {sheet === 'more' && (
        <Sheet label="Card options" onClose={() => setSheet(null)}>
          <div className="actlist">
            <button type="button" className="a" onClick={() => void undo()} disabled={!lastUndo}>
              <Icon name="undo" />Undo last grade{lastUndo && <span className="r" lang="de">{RATING_NAMES[lastUndo.rating]} · {lastUndo.label}</span>}
            </button>
            <button type="button" className="a" onClick={() => setSheet('edit')}><Icon name="edit" />Edit card</button>
            <button type="button" className="a" onClick={() => void suspend('manual')}><Icon name="suspend" />Suspend card</button>
            <button type="button" className="a" onClick={() => void suspend('flag')}><Icon name="flag" />Flag: source data looks wrong</button>
            <div className="a"><Icon name="speaker" />Play audio automatically
              <span style={{ marginLeft: 'auto' }}><Switch label="Play audio automatically" checked={settings.autoplay} onChange={v => void setSetting('autoplay', v)} /></span>
            </div>
          </div>
          <div className="acts"><Key2 onClick={() => setSheet(null)}>Close</Key2></div>
        </Sheet>
      )}
      {sheet === 'forms' && <AllFormsSheet note={note} onClose={() => setSheet(null)} />}
      {sheet === 'edit' && (
        <EditNote note={note} onDone={async saved => {
          setSheet(null);
          if (saved) {
            const fresh = await db.notes.get(note.id);
            if (fresh) setCurrent({ card, note: fresh, repeat });
            showToast('Card edited');
            force(x => x + 1);
          }
        }} />
      )}
    </div>
  );
}
