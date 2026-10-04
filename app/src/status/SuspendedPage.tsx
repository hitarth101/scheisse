// Leeches and flagged cards (design spec 5.7): suspended until the owner decides. Stated neutrally.
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type CardRow, type NoteRow } from '../db/db';
import { EditNote } from '../review/EditNote';
import { deleteNote, setSuspended } from '../review/session';
import { NounHead } from '../ui/German';
import { BackButton, Chip, DetailTitle, Group, NavRow, showToast } from '../ui/kit';

export function SuspendedPage({ reason }: { reason: 'leech' | 'flag' }) {
  const rows = useLiveQuery(async () => {
    const cards = (await db.cards.where('suspended').equals(1).toArray()).filter(c => c.suspendReason === reason);
    const notes = await db.notes.bulkGet(cards.map(c => c.noteId));
    return cards.map((c, i) => ({ card: c, note: notes[i] })).filter((x): x is { card: CardRow; note: NoteRow } => !!x.note);
  }, [reason], null);
  const [editing, setEditing] = useState<NoteRow | null>(null);

  // Deleting keeps a copy for a few seconds so it can be undone.
  const remove = async (note: NoteRow) => {
    const cards = await db.cards.where('noteId').equals(note.id).toArray();
    await deleteNote(note.id);
    showToast('Card deleted', {
      label: 'Undo',
      run: () => { void db.transaction('rw', db.notes, db.cards, async () => { await db.notes.put(note); await db.cards.bulkPut(cards); }); },
    });
  };

  const title = reason === 'leech' ? 'Leeches' : 'Flagged cards';
  const sub = reason === 'leech' ? 'Cards failed 8 times are suspended until you decide' : 'Cards marked as having wrong source data, suspended until you decide';

  return (
    <>
      <NavRow left={<BackButton label="Status" to={{ name: 'status' }} />} />
      <DetailTitle title={title} sub={sub} />
      <div style={{ height: 16 }} />
      {rows && rows.length === 0 && <p className="foot" style={{ paddingTop: 0 }}>None right now.</p>}
      {rows && rows.length > 0 && (
        <Group flush>
          {rows.map(({ card, note }) => (
            <div className="cl" key={card.id} style={{ alignItems: 'flex-start', paddingTop: 12, paddingBottom: 12 }}>
              <div className="ct" style={{ padding: 0 }}>
                <b lang="de">{note.kind === 'word' && note.pos === 'noun' ? <NounHead note={note} /> : note.de}</b>
                <span>
                  {note.kind === 'word' ? 'Word' : 'Sentence'}{card.type === 'listening' ? ' (listening)' : ''} · {note.en[0]}
                  {reason === 'leech' ? ` · failed ${card.fails} times` : ` · ${note.source}`}
                </span>
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <Chip onClick={() => { void setSuspended(card.id, null); showToast('Returned to reviews'); }}>Return to reviews</Chip>
                  <Chip icon="edit" onClick={() => setEditing(note)}>Edit</Chip>
                  <Chip onClick={() => void remove(note)}>Delete</Chip>
                </div>
              </div>
            </div>
          ))}
        </Group>
      )}
      {editing && <EditNote note={editing} onDone={saved => { setEditing(null); if (saved) showToast('Card edited'); }} />}
    </>
  );
}
