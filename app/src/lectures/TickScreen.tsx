// "Sentences from this track" (product spec 4.2, design spec 5.3): transcript pairs become sentence cards
// only when the owner ticks them as matching the audio. Unticked pairs are discarded.
import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { tick } from '../lib/device';
import { trackNo } from '../lib/format';
import { back } from '../lib/router';
import { addNote, lecturePairNote } from '../review/notes';
import { GermanKeys } from '../ui/GermanKeys';
import { Icon } from '../ui/icons';
import { BackButton, DetailTitle, GoKey, Key2, NavRow, Notice, Pad, showToast, TextButton } from '../ui/kit';
import { updateLecture } from './store';
import { usePairs, type Pair } from './transcript';

export function TickScreen({ track }: { track: number }) {
  const pairs = usePairs(track);
  const added = useLiveQuery(async () => {
    const ids = await db.notes.where('id').startsWith(`lt:${trackNo(track)}:`).primaryKeys();
    return new Set(ids.map(id => Number(id.split(':')[2])));
  }, [track], new Set<number>());
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const [edits, setEdits] = useState<Map<number, string>>(new Map());
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const list: Pair[] = pairs.status === 'ready' ? pairs.pairs : [];
  const toAdd = [...ticked].filter(i => !added.has(i));

  const toggle = (i: number) => {
    if (added.has(i)) return;
    tick();
    setTicked(prev => { const n = new Set(prev); if (n.has(i)) n.delete(i); else n.add(i); return n; });
  };

  const addCards = async () => {
    setBusy(true);
    const now = Date.now();
    for (const i of toAdd) {
      const original = list[i];
      const de = edits.get(i) ?? original.de;
      await addNote(lecturePairNote(track, i, { de, en: original.en }, de !== original.de, original, now), now);
    }
    const total = added.size + toAdd.length;
    await updateLecture(track, { ticksDone: 1, ticked: total });
    showToast(`Added ${toAdd.length} card${toAdd.length === 1 ? '' : 's'}`);
    setBusy(false);
    back({ name: 'track', track });
  };

  return (
    <div className="page focus" style={{ background: 'var(--raised)', minHeight: '100dvh' }}>
      <NavRow left={<BackButton label={`Lecture ${trackNo(track)}`} to={{ name: 'track', track }} />}
        right={<TextButton onClick={() => back({ name: 'track', track })}>Skip for now</TextButton>} />
      <DetailTitle title="Sentences from this track"
        sub="From the volunteer transcript, which has errors. Tick only the pairs that match what you heard; where the student and the teacher differ, go by the teacher. You can correct a pair first." />

      {pairs.status === 'loading' && <Pad top={20}><div className="skel" style={{ height: 120 }} /></Pad>}
      {pairs.status === 'error' && (
        <Pad top={20}>
          <Notice kind="err" title="Couldn't load the transcript">Check your internet connection, then try again.</Notice>
          <div style={{ marginTop: 12 }}><Key2 onClick={pairs.retry}>Try again</Key2></div>
        </Pad>
      )}
      {pairs.status === 'ready' && list.length === 0 && (
        <Pad top={20}><Notice title="No sentence pairs for this track">The volunteer transcript has no English and German pairs that could be read for this track.</Notice></Pad>
      )}

      <div style={{ padding: '14px 0 0' }} role="list">
        {list.map((p, i) => (
          <PairRow key={i} pair={p} index={i} checked={ticked.has(i) || added.has(i)} done={added.has(i)}
            text={edits.get(i) ?? p.de} editing={editing === i}
            onToggle={() => toggle(i)} onEdit={() => setEditing(i)} onCancel={() => setEditing(null)}
            onSave={v => { setEdits(m => new Map(m).set(i, v)); setEditing(null); setTicked(s => new Set(s).add(i)); }} />
        ))}
      </div>

      <div className="spacer" />
      {list.length > 0 && (
        <div style={{ padding: '16px 16px 8px', position: 'sticky', bottom: 0, background: 'linear-gradient(transparent, var(--raised) 14px)' }}>
          <GoKey onClick={addCards} disabled={busy || toAdd.length === 0}>
            {toAdd.length === 0 ? (added.size ? `${added.size} already added` : 'Tick the pairs you heard') : `Add ${toAdd.length} card${toAdd.length === 1 ? '' : 's'}`}
          </GoKey>
        </div>
      )}
    </div>
  );
}

function PairRow(p: {
  pair: Pair; index: number; checked: boolean; done: boolean; text: string; editing: boolean;
  onToggle: () => void; onEdit: () => void; onCancel: () => void; onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(p.text);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (p.editing) { setDraft(p.text); setTimeout(() => ref.current?.focus(), 30); } }, [p.editing, p.text]);

  return (
    <div className={'cl pair' + (p.editing ? ' editing' : '')} role="listitem">
      <button type="button" className="tick" role="checkbox" aria-checked={p.checked} aria-disabled={p.done}
        aria-label={`${p.done ? 'Added' : 'Matches the audio'}: ${p.text}`} onClick={p.onToggle}>
        {p.checked && <Icon name="check" />}
      </button>
      <div className="ct" style={{ padding: 0 }}>
        <div className="en">{p.pair.en}</div>
        {p.editing ? (
          <>
            <textarea ref={ref} className="field" lang="de" rows={2} value={draft} onChange={e => setDraft(e.currentTarget.value)}
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} aria-label="Corrected German"
              style={{ marginTop: 8, minHeight: 46 }} />
            <div style={{ display: 'flex', gap: 14, marginTop: 6 }}>
              <TextButton onClick={() => draft.trim() && p.onSave(draft.trim())}>Save correction</TextButton>
              <TextButton onClick={p.onCancel}>Cancel</TextButton>
            </div>
            <GermanKeys target={ref} />
          </>
        ) : (
          <div className="de" lang="de">{p.text}{p.text !== p.pair.de && <span className="t-foot l2" lang="en"> · corrected</span>}{p.done && <span className="t-foot l2" lang="en"> · added</span>}</div>
        )}
      </div>
      {!p.editing && !p.done && (
        <button type="button" className="rkey-flat" onClick={p.onEdit} aria-label={`Correct: ${p.text}`}><Icon name="edit" /></button>
      )}
    </div>
  );
}
