// Edit card (design spec 5.2): the learner may correct a card. The original source entry is kept and
// the card is marked "edited".
import { useRef, useState } from 'react';
import { db, type Gender, type NoteRow } from '../db/db';
import { GermanKeys } from '../ui/GermanKeys';
import { Seg, TextButton } from '../ui/kit';

export function EditNote({ note, onDone }: { note: NoteRow; onDone: (saved: boolean) => void }) {
  const isNoun = note.kind === 'word' && note.pos === 'noun' && !note.pluralOnly;
  const [gender, setGender] = useState<Gender | undefined>(note.gender);
  const [de, setDe] = useState(note.de);
  const [plural, setPlural] = useState(note.plural ?? '');
  const [en, setEn] = useState(note.en.join('; '));
  const [busy, setBusy] = useState(false);
  const deRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const plRef = useRef<HTMLInputElement>(null);
  const valid = de.trim().length > 0 && en.trim().length > 0;

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    const original = note.original ?? { de: note.de, en: note.en, gender: note.gender, plural: note.plural };
    const enList = note.kind === 'word' ? en.split(';').map(s => s.trim()).filter(Boolean) : [en.trim()];
    const changed = de.trim() !== note.de || enList.join('; ') !== note.en.join('; ') || gender !== note.gender || (isNoun && (plural.trim() || null) !== (note.plural ?? null));
    if (changed) {
      await db.notes.update(note.id, {
        de: de.trim(), en: enList, hy: undefined, edited: 1, original,
        ...(isNoun ? { gender, plural: plural.trim() || null } : {}),
      });
    }
    onDone(changed);
  };

  return (
    <div className="rv" style={{ background: 'var(--raised)', position: 'fixed', inset: 0, zIndex: 86, overflowY: 'auto' }} role="dialog" aria-modal="true" aria-label="Edit card">
      <div className="navrow">
        <TextButton onClick={() => onDone(false)}>Cancel</TextButton>
        <div className="ttl">Edit card</div>
        <TextButton onClick={save} disabled={!valid || busy}>Save</TextButton>
      </div>
      <div style={{ padding: '14px 16px 120px' }}>
        {isNoun && (
          <>
            <span className="form-label">Article</span>
            <Seg label="Article" value={gender ?? 'm'} onChange={g => setGender(g)}
              options={[{ value: 'm', label: 'der' }, { value: 'f', label: 'die' }, { value: 'n', label: 'das' }]} />
          </>
        )}
        <label className="form-label" htmlFor="ed-de">{note.kind === 'word' ? 'Word' : 'German'}</label>
        {note.kind === 'word' ? (
          <input id="ed-de" ref={deRef as React.RefObject<HTMLInputElement>} className="field" lang="de" value={de} onChange={e => setDe(e.currentTarget.value)}
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
        ) : (
          <textarea id="ed-de" ref={deRef as React.RefObject<HTMLTextAreaElement>} className="field" lang="de" rows={3} value={de} onChange={e => setDe(e.currentTarget.value)}
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
        )}
        {isNoun && (
          <>
            <label className="form-label" htmlFor="ed-pl">Plural (without “die”)</label>
            <input id="ed-pl" ref={plRef} className="field" lang="de" value={plural} onChange={e => setPlural(e.currentTarget.value)}
              autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder="No plural" />
          </>
        )}
        <label className="form-label" htmlFor="ed-en">{note.kind === 'word' ? 'English meaning' : 'English'}</label>
        <input id="ed-en" className="field" value={en} onChange={e => setEn(e.currentTarget.value)} autoComplete="off" />
        <p className="t-foot l2" style={{ margin: '14px 4px 0' }}>
          The original source entry is kept. Your edit shows on this card only, marked “edited”.
        </p>
      </div>
      <GermanKeys target={deRef} />
      {isNoun && <GermanKeys target={plRef} />}
    </div>
  );
}
