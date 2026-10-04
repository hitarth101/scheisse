// German text with gender marking on the article only (design spec 2.3).
import type { Gender, NoteRow } from '../db/db';

export const ARTICLE: Record<Gender, 'der' | 'die' | 'das'> = { m: 'der', f: 'die', n: 'das' };
const CLS: Record<Gender, string> = { m: 'g-der', f: 'g-die', n: 'g-das' };
const GENDER_WORD: Record<Gender, string> = { m: 'masculine', f: 'feminine', n: 'neuter' };

export function genderName(g: Gender) { return GENDER_WORD[g]; }

/** "der Tisch" with the article in its gender colour; "der/die Bekannte" for two genders. */
export function NounHead({ note }: { note: Pick<NoteRow, 'de' | 'hy' | 'gender' | 'gender2' | 'pluralOnly'> }) {
  const word = note.hy ?? note.de;
  if (note.pluralOnly || !note.gender) {
    return <span lang="de">{note.pluralOnly ? <span className="art">die</span> : null}{note.pluralOnly ? ' ' : ''}{word}</span>;
  }
  return (
    <span lang="de">
      <span className={`art ${CLS[note.gender]}`}>{ARTICLE[note.gender]}</span>
      {note.gender2 && <>/<span className={`art ${CLS[note.gender2]}`}>{ARTICLE[note.gender2]}</span></>}
      {' '}{word}
    </span>
  );
}

/** Plural with its article uncoloured, so it never looks like feminine "die". */
export function pluralText(note: Pick<NoteRow, 'plural' | 'pluralOnly'>): string | null {
  if (note.pluralOnly) return null;
  return note.plural ? `die ${note.plural}` : null;
}

/** The full answer for a word card, as text (used for typed answers): "der Tisch, die Tische". */
export function wordAnswer(note: NoteRow): string {
  if (note.pos !== 'noun') return note.de;
  if (note.pluralOnly) return `die ${note.de}`;
  const art = note.gender ? ARTICLE[note.gender] + (note.gender2 ? '/' + ARTICLE[note.gender2] : '') + ' ' : '';
  const pl = note.plural ? `, die ${note.plural}` : '';
  return `${art}${note.de}${pl}`;
}

/** What the prompt asks for, by word type (design spec 5.2). */
export function askFor(note: NoteRow): string {
  switch (note.pos) {
    case 'noun':
      if (note.pluralOnly) return 'noun, plural only · say it with the article';
      return note.plural ? 'noun · say it with article and plural' : 'noun · say it with the article';
    case 'verb': return 'verb · say the infinitive';
    default: return note.pos ?? 'word';
  }
}
