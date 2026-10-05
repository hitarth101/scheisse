// One card (owner decision 2026-10-04): what it holds, where it comes from, when each side comes back, and
// the decisions the design gives leeches and flagged cards (design spec 5.7): return to reviews, edit, delete.
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useSettings } from '../db/settings';
import { back } from '../lib/router';
import { playNote } from '../review/audio';
import { EditNote } from '../review/EditNote';
import { deleteNote, setSuspended } from '../review/session';
import { NounHead, pluralText } from '../ui/German';
import { BackButton, Chip, DetailTitle, Foot, Group, Key2, NavRow, Pad, RKey, Row, SectionHeader, showToast } from '../ui/kit';
import { cardStatus, kindLabel } from './cards';

const SIDE = { production: { title: 'Say it', sub: 'English → German' }, listening: { title: 'Hear it', sub: 'German audio → English' } };
const GAP = { title: 'Fill the gap', sub: 'the sentence with one word removed' };

export function CardPage({ noteId }: { noteId: string }) {
  const settings = useSettings();
  const data = useLiveQuery(async () => {
    const note = await db.notes.get(noteId);
    const cards = await db.cards.where('noteId').equals(noteId).toArray();
    return { note, cards: cards.sort(a => (a.type === 'production' ? -1 : 1)) };
  }, [noteId], null);
  const [editing, setEditing] = useState(false);

  const nav = <NavRow left={<BackButton label="Flashcards" to={{ name: 'flashcards' }} />}
    right={data?.note ? <RKey icon="speaker" label="Play the German" onClick={() => void playNote(data.note!, { voice: settings.voice, rate: settings.voiceRate }).catch(() => showToast("Couldn't play the recording"))} /> : undefined} />;
  if (!data) return nav;
  const { note, cards } = data;
  if (!note) {
    return <>{nav}<DetailTitle title="Card not found" sub="It may have been deleted." /></>;
  }

  // Deleting keeps a copy for a few seconds so it can be undone.
  const remove = async () => {
    await deleteNote(note.id);
    back({ name: 'flashcards' });
    showToast('Card deleted', {
      label: 'Undo',
      run: () => { void db.transaction('rw', db.notes, db.cards, async () => { await db.notes.put(note); await db.cards.bulkPut(cards); }); },
    });
  };

  const isNoun = note.kind === 'word' && note.pos === 'noun';
  const sayIt = cards.find(c => c.type === 'production');

  return (
    <>
      {nav}
      <DetailTitle lang="de" title={isNoun ? <NounHead note={note} /> : (note.hy ?? note.de)} sub={<span lang="en">{note.en.join('; ')}</span>} />
      {(pluralText(note) || note.forms) && (
        <div style={{ padding: '6px 20px 0' }} lang="de">
          {pluralText(note) && <div className="t-body"><span className="l2" lang="en">plural </span>{pluralText(note)}</div>}
          {note.forms && <div className="t-body">{note.forms.join(' · ')}</div>}
        </div>
      )}
      {note.example && (
        <div className="card" style={{ margin: '16px 16px 0', padding: '14px 20px' }}>
          <div className="t-title3" lang="de">{note.example.de}</div>
          <div className="t-sub l2">{note.example.en}</div>
          <div className="src" style={{ marginTop: 6 }}>Tatoeba {note.example.id}</div>
        </div>
      )}

      <SectionHeader left="Cards" right={kindLabel(note)} style={{ paddingTop: 24 }} />
      <Group flush>
        {cards.map(c => (
          <Row key={c.id} title={(note.kind === 'cloze' ? GAP : SIDE[c.type]).title} sub={`${(note.kind === 'cloze' ? GAP : SIDE[c.type]).sub} · ${cardStatus(c, sayIt)}`}
            trailing={c.suspended
              ? <Chip onClick={() => { void setSuspended(c.id, null); showToast('Returned to reviews'); }}>Return to reviews</Chip>
              : <Chip onClick={() => { void setSuspended(c.id, 'manual'); showToast('Card suspended'); }}>Suspend</Chip>} />
        ))}
      </Group>

      <SectionHeader left="Source" style={{ paddingTop: 24 }} />
      <Group flush>
        <Row title={note.source} sub={note.edited ? 'Edited by you; the source entry is kept' : undefined} />
      </Group>

      <Pad top={24} style={{ display: 'grid', gap: 10 }}>
        {note.kind !== 'cloze' && <Key2 icon="edit" onClick={() => setEditing(true)}>Edit card</Key2>}
        <Key2 danger onClick={() => void remove()}>Delete card</Key2>
      </Pad>
      <Foot>{note.kind === 'cloze' ? 'Fill-in-the-blank cards keep the source sentence exactly, so they can be suspended or deleted but not edited.' : 'Deleting removes both sides of the card.'} Your review history stays.</Foot>

      {editing && <EditNote note={note} onDone={saved => { setEditing(false); if (saved) showToast('Card edited'); }} />}
    </>
  );
}
