// Study (design spec 5.2): a focus mode over the one flashcard queue (review/queue.ts). There are no
// sessions: cards keep coming until nothing is left, and closing at any point loses nothing, because every
// grade is saved the moment it is given.
import { useCallback, useEffect, useRef, useState } from 'react';
import { db, type CardRow, type NoteRow } from '../db/db';
import { setSetting, useSettings } from '../db/settings';
import { contentData, ensureContent, useContent } from '../content/load';
import { tick } from '../lib/device';
import { dayWord, minutes, timeOfDay } from '../lib/format';
import { back } from '../lib/router';
import { pauseForOtherAudio } from '../lectures/player';
import { Icon } from '../ui/icons';
import { GoKey, Key2, Lamp, Notice, RKey, Seg, Sheet, showToast, Switch } from '../ui/kit';
import { stopCardAudio, unlockCardAudio } from './audio';
import { AllFormsSheet } from './AllFormsSheet';
import { CardView } from './CardView';
import { EditNote } from './EditNote';
import { introduceOnce } from './notes';
import { cardsLeft, EXTRA_NEW, grantMore, pickNext, queueState, type QueueState } from './queue';
import { intervalLabel, previewIntervals, RATING_NAMES, type Rating } from './scheduler';
import { nextReviews, recordGrade, setSuspended, undoGrade } from './session';

type Phase =
  | { kind: 'loading' }
  | { kind: 'card' }
  | { kind: 'empty'; next: { day: number; count: number } | null }
  | { kind: 'error'; title: string; text: string };

function cardLabel(card: CardRow, note: NoteRow): string {
  if (card.type === 'listening') return 'Listening';
  if (note.kind === 'cloze') return 'Fill the gap';
  return note.kind === 'word' ? 'Word' : 'Sentence';
}

export function Study() {
  const settings = useSettings();
  const content = useContent();
  const [phase, setPhase] = useState<Phase>({ kind: 'loading' });
  const [q, setQ] = useState<QueueState | null>(null);
  const [current, setCurrent] = useState<{ card: CardRow; note: NoteRow } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [typed, setTyped] = useState('');
  const [mode, setMode] = useState<'speak' | 'type' | null>(null);
  const [sheet, setSheet] = useState<'more' | 'forms' | 'edit' | null>(null);
  const [, force] = useState(0);

  const graded = useRef(new Map<string, number>());
  const visitMs = useRef(0);
  const shownAt = useRef(Date.now());
  const history = useRef<{ logId: number; card: CardRow; rating: Rating; label: string }[]>([]);

  const answerMode = mode ?? settings.answerMode;

  // Studying pauses a playing lecture (one audio source at a time).
  useEffect(() => { pauseForOtherAudio(); return () => stopCardAudio(); }, []);

  const show = (card: CardRow, note: NoteRow) => {
    setCurrent({ card, note });
    setRevealed(false);
    setTyped('');
    shownAt.current = Date.now();
    setPhase({ kind: 'card' });
  };

  const showNext = useCallback(async (): Promise<void> => {
    for (let guard = 0; guard < 20; guard++) {
      const state = await queueState();
      setQ(state);
      let next = pickNext(state);
      if (next === 'introduce') {
        await ensureContent();
        if ((await contentData()).words.length === 0) {
          setPhase({ kind: 'error', title: "Couldn't load the word data", text: 'Check your internet connection, then try again. Your progress is safe on this iPhone.' });
          return;
        }
        next = (await introduceOnce()) ?? state.soon[0] ?? null;
      }
      if (!next) {
        setCurrent(null);
        setPhase({ kind: 'empty', next: await nextReviews() });
        return;
      }
      const note = await db.notes.get(next.noteId);
      if (note) { show(next, note); return; }
      await db.cards.delete(next.id); // a card without its note can never be shown
    }
  }, []);

  // Start once (React's development mode runs effects twice on purpose).
  const started = useRef(false);
  useEffect(() => { if (!started.current) { started.current = true; void showNext(); } }, [showNext]);

  const reveal = () => { unlockCardAudio(); setRevealed(true); };

  const doGrade = async (rating: Rating) => {
    if (!current) return;
    unlockCardAudio();
    tick();
    stopCardAudio();
    const ms = Math.min(Date.now() - shownAt.current, 120_000);
    const { card, note } = current;
    const { card: after, logId } = await recordGrade(card, rating, ms, answerMode, settings.retention);
    history.current.push({ logId, card, rating, label: note.kind === 'word' ? note.de : note.de.slice(0, 24) });
    graded.current.set(card.id, (graded.current.get(card.id) ?? 0) + 1);
    visitMs.current += ms;
    if (after.suspended && after.suspendReason === 'leech') showToast('Failed 8 times, suspended automatically');
    await showNext();
  };

  const undo = async () => {
    const last = history.current.pop();
    if (!last) return;
    const restored = await undoGrade(last.logId);
    if (!restored) return;
    const n = (graded.current.get(last.card.id) ?? 1) - 1;
    if (n <= 0) graded.current.delete(last.card.id); else graded.current.set(last.card.id, n);
    const note = await db.notes.get(restored.noteId);
    setSheet(null);
    if (note) { setQ(await queueState()); show(restored, note); }
  };

  const suspend = async (reason: 'manual' | 'flag') => {
    if (!current) return;
    const id = current.card.id;
    await setSuspended(id, reason);
    setSheet(null);
    showToast(reason === 'flag' ? 'Flagged and suspended. It is listed under Suspended.' : 'Card suspended', {
      label: 'Undo',
      run: () => { void setSuspended(id, null).then(showNext); },
    });
    await showNext();
  };

  const more = async () => {
    await grantMore();
    setPhase({ kind: 'loading' });
    await showNext();
  };

  const close = () => { stopCardAudio(); back({ name: 'flashcards' }); };

  // ---- render ----
  const top = (title: React.ReactNode, withMore = true) => (
    <div className="rv-top">
      <RKey icon="close" label="Close flashcards" onClick={close} />
      <span className="t" aria-live="polite">{title}</span>
      {withMore ? <RKey icon="more" label="More" onClick={() => setSheet('more')} /> : <span style={{ width: 42 }} />}
    </div>
  );

  if (phase.kind === 'loading') {
    return (
      <div className="rv">
        {top('Flashcards', false)}
        {content.state === 'loading' && <p className="foot" style={{ paddingTop: 16 }}>Loading word data · {content.done} of {content.total} files</p>}
        <div className="card rv-card"><div className="skel" style={{ width: '50%', height: 28 }} /><div className="skel" style={{ width: '70%', marginTop: 12 }} /></div>
      </div>
    );
  }

  if (phase.kind === 'error') {
    return (
      <div className="rv">
        {top('Flashcards', false)}
        <div style={{ padding: '24px 16px 0' }}><Notice kind="err" title={phase.title}>{phase.text}</Notice></div>
        <div className="spacer" />
        <div className="rv-bottom"><Key2 onClick={() => { setPhase({ kind: 'loading' }); void showNext(); }}>Try again</Key2></div>
      </div>
    );
  }

  if (phase.kind === 'empty') {
    const n = graded.current.size;
    const lines: string[] = [];
    if (phase.next) lines.push(`Next reviews: ${dayWord(phase.next.day)}, ${phase.next.count} card${phase.next.count === 1 ? '' : 's'}.`);
    if (q?.laterAt) lines.push(`Missed cards come back at ${timeOfDay(q.laterAt)}.`);
    if (q && q.newLeft === 0 && (q.newDone > 0 || q.paused)) {
      lines.push(q.paused && q.newDone < settings.newPerDay
        ? `New cards are paused today: today's reviews take about ${minutes(q.daySecs)}.`
        : "Today's new cards are done.");
    }
    return (
      <div className="rv">
        {top('Flashcards', false)}
        <div className="card rv-card" style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Lamp state={n ? 'done' : 'off'} label={n ? 'done' : 'nothing due'} />
            <h2 className="t-title3">Nothing due right now</h2>
          </div>
          {lines.map(l => <p key={l} className="t-body l2" style={{ margin: '8px 0 0' }}>{l}</p>)}
          {n > 0 && <p className="t-sub l2 num" style={{ margin: '12px 0 0' }}>This visit: {n} card{n === 1 ? '' : 's'} · {minutes(visitMs.current / 1000)}</p>}
        </div>
        <div className="spacer" />
        <div className="rv-bottom" style={{ display: 'grid', gap: 10 }}>
          <Key2 icon="plus" onClick={() => void more()}>Add {EXTRA_NEW} more new cards</Key2>
          <Key2 onClick={close}>Close</Key2>
        </div>
      </div>
    );
  }

  if (!current) return null;
  const { card, note } = current;
  const left = q ? Math.max(1, cardsLeft(q)) : 1;
  const pct = (graded.current.size / (graded.current.size + left)) * 100;
  const iv = revealed ? previewIntervals(card, Date.now(), settings.retention) : null;
  const lastUndo = history.current[history.current.length - 1];

  return (
    <div className="rv">
      {top(<>{left} left <span>· {cardLabel(card, note)}</span></>)}
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
            {note.kind !== 'cloze' && <button type="button" className="a" onClick={() => setSheet('edit')}><Icon name="edit" />Edit card</button>}
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
            if (fresh) setCurrent({ card, note: fresh });
            showToast('Card edited');
            force(x => x + 1);
          }
        }} />
      )}
    </div>
  );
}
