// "All forms" (design spec 5.2): Wiktionary's own declension or conjugation table, case names written out.
// Forms are shown exactly as Wiktionary lists them; the app adds nothing.
import { useEffect, useState } from 'react';
import type { NoteRow } from '../db/db';
import { loadForms, type NounTable, type VerbTable } from '../content/load';
import { genderName, NounHead } from '../ui/German';
import { Key2, Notice, Sheet } from '../ui/kit';

const CASES: [keyof NounTable, string][] = [['nominative', 'Nominative'], ['accusative', 'Accusative'], ['dative', 'Dative'], ['genitive', 'Genitive']];
// Person labels as in Wiktionary's conjugation tables.
const PERSONS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'];

export function AllFormsSheet({ note, onClose }: { note: NoteRow; onClose: () => void }) {
  const [table, setTable] = useState<NounTable | VerbTable | null | 'error' | 'none'>(null);
  useEffect(() => {
    loadForms()
      .then(all => setTable(note.sourceRef && all[note.sourceRef] ? all[note.sourceRef] : 'none'))
      .catch(() => setTable('error'));
  }, [note.sourceRef]);

  return (
    <Sheet label="All forms" onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <h2 className="t-title3">{note.pos === 'noun' ? <NounHead note={note} /> : <span lang="de">{note.de}</span>}</h2>
        <span className="src">{note.gender ? `${genderName(note.gender)} · ` : ''}Wiktionary</span>
      </div>
      {table === null && <div className="skel" style={{ marginTop: 16, height: 120 }} />}
      {table === 'error' && <div style={{ marginTop: 12 }}><Notice kind="err" title="Couldn't load the forms">Check your internet connection, then open this again.</Notice></div>}
      {table === 'none' && <p className="t-sub l2" style={{ margin: '12px 0 0' }}>Wiktionary has no full table for this word.</p>}
      {table && typeof table === 'object' && 'nominative' in table && (
        <table className="rtable forms" style={{ marginTop: 10 }}>
          <thead><tr><th /><th>Singular</th><th>Plural</th></tr></thead>
          <tbody lang="de">
            {CASES.map(([k, name]) => (
              <tr key={k}><th scope="row" lang="en">{name}</th><td>{table[k][0] ?? '–'}</td><td>{table[k][1] ?? '–'}</td></tr>
            ))}
          </tbody>
        </table>
      )}
      {table && typeof table === 'object' && 'present' in table && (
        <>
          <table className="rtable forms" style={{ marginTop: 10 }}>
            <thead><tr><th /><th>Present</th><th>Past</th></tr></thead>
            <tbody lang="de">
              {PERSONS.map((p, i) => (
                <tr key={p}><th scope="row">{p}</th><td>{table.present[i] ?? '–'}</td><td>{table.past[i] ?? '–'}</td></tr>
              ))}
            </tbody>
          </table>
          {table.participle && (
            <p className="t-sub" style={{ margin: '10px 8px 0' }}>
              <span className="l2">Past participle </span><span lang="de">{table.participle}</span>
              {table.auxiliary && <><span className="l2"> · with </span><span lang="de">{table.auxiliary}</span></>}
            </p>
          )}
        </>
      )}
      <div className="acts"><Key2 onClick={onClose}>Close</Key2></div>
    </Sheet>
  );
}
