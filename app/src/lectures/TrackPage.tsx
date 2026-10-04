import { useEffect, useRef, useState } from 'react';
import { clock, shortDate, trackNo } from '../lib/format';
import { navigate } from '../lib/router';
import { openPlayerSheet } from '../lib/ui';
import { BackButton, DetailTitle, Foot, Group, Key2, NavRow, SectionHeader } from '../ui/kit';
import { open, usePlayer } from './player';
import { updateLecture, useLectures } from './store';
import { trackSeconds } from './tracks';
import { usePairs } from './transcript';

/** Track page (design spec 5.3): status, play, sentences, and notes saved as you type. */
export function TrackPage({ track }: { track: number }) {
  const rows = useLectures();
  const row = rows[track - 1];
  const p = usePlayer();
  const pairs = usePairs(track);
  const dur = trackSeconds(track);
  const pos = p.track === track ? p.position : row.position;

  const status = row.done
    ? `Done · ${clock(dur)}${row.doneAt ? ` · listened ${shortDate(new Date(row.doneAt))}` : ''}`
    : pos > 0 ? `In progress · ${clock(pos)} of ${clock(dur)}` : `Not started · ${clock(dur)}`;

  const play = () => { open(track, { autoplay: true }); openPlayerSheet(); };
  const playLabel = row.done ? 'Play again' : pos > 0 ? 'Resume' : 'Play';

  return (
    <>
      <NavRow left={<BackButton label="Lectures" to={{ name: 'lectures' }} />} />
      <DetailTitle title={`Lecture ${trackNo(track)}`} sub={status} />
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: 10 }}>
        <Key2 icon="play" onClick={play} style={{ flex: 1 }}>{playLabel}</Key2>
        <Key2 onClick={() => navigate({ name: 'tick', track })} style={{ flex: 1 }} disabled={pairs.status === 'ready' && pairs.pairs.length === 0}>
          {pairs.status === 'ready' ? `Sentences (${pairs.pairs.length})` : 'Sentences'}
        </Key2>
      </div>
      <SectionHeader left="Notes" right="written after listening" style={{ paddingTop: 22 }} />
      <Group>
        <NotesField track={track} initial={row.notes} />
      </Group>
      <Foot>The course suggests not taking notes while listening, so notes open after the track or from here.</Foot>
    </>
  );
}

function NotesField({ track, initial }: { track: number; initial: string }) {
  const [text, setText] = useState(initial);
  const timer = useRef<number | undefined>(undefined);
  const ref = useRef<HTMLTextAreaElement>(null);
  const dirty = useRef(false);

  // Take the stored text when it arrives (or after a restore), unless the owner is typing.
  useEffect(() => { if (!dirty.current) setText(initial); }, [initial]);

  useEffect(() => {
    const el = ref.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${Math.max(150, el.scrollHeight)}px`; }
  }, [text]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const change = (v: string) => {
    setText(v);
    dirty.current = true;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void updateLecture(track, { notes: v, notesAt: Date.now() }).then(() => { dirty.current = false; });
    }, 400);
  };

  return (
    <textarea ref={ref} className="notes-field" value={text} placeholder="Notes for this track"
      aria-label={`Notes for lecture ${trackNo(track)}`} onChange={e => change(e.currentTarget.value)}
      onBlur={() => { window.clearTimeout(timer.current); void updateLecture(track, { notes: text, notesAt: Date.now() }).then(() => { dirty.current = false; }); }} />
  );
}
