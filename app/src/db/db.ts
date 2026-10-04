// Everything the app remembers lives here, in the phone's own database (IndexedDB), through Dexie.
import Dexie, { type EntityTable } from 'dexie';

/** One row per Language Transfer track (1–50). */
export interface LectureRow {
  track: number;
  /** Resume position in seconds. */
  position: number;
  /** Which 5-second stretches have been played through, as a string of '0' and '1'. Used for the 95% rule. */
  covered: string;
  done: 0 | 1;
  doneAt?: number;
  doneBy?: 'listened' | 'manual';
  lastPlayedAt?: number;
  notes: string;
  notesAt?: number;
  /** Tick screen answered (cards added or skipped for good). */
  ticksDone?: 0 | 1;
  /** Number of transcript pairs turned into cards. */
  ticked?: number;
}

export interface KeyValueRow { key: string; value: unknown }

export type Activity = 'review' | 'lecture' | 'reading' | 'tv' | 'nicos' | 'lesson' | 'other';
/** Seconds per day per activity. Primary key [date+activity]; date is local YYYY-MM-DD. */
export interface TimeRow { date: string; activity: Activity; seconds: number }

export type Gender = 'm' | 'f' | 'n';

/** A word or sentence the learner studies. Content is copied from the source and never written by the app. */
export interface NoteRow {
  id: string;
  kind: 'word' | 'sentence';
  /** German: the lemma for words, the sentence for sentences. */
  de: string;
  /** English: meanings joined for words, the translation for sentences. */
  en: string;
  pos?: string;
  gender?: Gender;
  plural?: string | null;
  /** Short hint shown when another card has the same English (words). */
  hint?: string;
  /** Example sentence (words): Tatoeba id, German, English. */
  example?: { id: number; de: string; en: string };
  /** Key forms shown on the card back. */
  forms?: string[];
  audio?: string;
  source: string;
  sourceRef?: string;
  createdAt: number;
  edited?: 0 | 1;
  original?: { de: string; en: string; gender?: Gender; plural?: string | null };
}

export type CardType = 'production' | 'listening';

/** One reviewable card. Scheduling fields are the FSRS card fields; dates are stored as milliseconds. */
export interface CardRow {
  id: string;
  noteId: string;
  type: CardType;
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: number;
  suspended: 0 | 1;
  suspendReason?: 'manual' | 'leech' | 'flag';
  /** Times graded Again in total (leech rule: 8). */
  fails: number;
  createdAt: number;
}

export interface ReviewLogRow {
  id?: number;
  cardId: string;
  rating: 1 | 2 | 3 | 4;
  at: number;
  /** Time spent on the card, in milliseconds (for the measured pace). */
  ms: number;
  mode: 'speak' | 'type';
  /** The card as it was before this grade, so Undo can put it back. */
  before: CardRow;
}

/** Imported word data (Goethe list + Wiktionary + DeReWo order). Replaced on every content update. */
export interface WordRow {
  id: string;
  lemma: string;
  pos: string;
  gender?: Gender;
  plural?: string | null;
  level: 'A1' | 'A2' | 'B1';
  order: number;
  en: string[];
  hint?: string;
  forms?: string[];
  example?: { id: number; de: string; en: string };
}

/** Imported Tatoeba sentence pairs. */
export interface SentenceRow {
  id: number;
  de: string;
  en: string;
  enId: number;
  audio?: string;
  words: string[];
}

export class ScheisseDB extends Dexie {
  lectures!: EntityTable<LectureRow, 'track'>;
  settings!: EntityTable<KeyValueRow, 'key'>;
  meta!: EntityTable<KeyValueRow, 'key'>;
  time!: Dexie.Table<TimeRow, [string, Activity]>;
  notes!: EntityTable<NoteRow, 'id'>;
  cards!: EntityTable<CardRow, 'id'>;
  revlog!: EntityTable<ReviewLogRow, 'id'>;
  words!: EntityTable<WordRow, 'id'>;
  sentences!: EntityTable<SentenceRow, 'id'>;

  constructor(name = 'scheisse') {
    super(name);
    this.version(1).stores({
      lectures: 'track',
      settings: 'key',
      meta: 'key',
      time: '[date+activity], date',
      notes: 'id, kind, createdAt',
      cards: 'id, noteId, due, state, suspended, createdAt',
      revlog: '++id, cardId, at',
      words: 'id, order, lemma',
      sentences: 'id',
    });
  }
}

export const db = new ScheisseDB();

/** Tables that hold the learner's own progress. These go into a backup; imported content does not. */
export const PROGRESS_TABLES = ['lectures', 'settings', 'meta', 'time', 'notes', 'cards', 'revlog'] as const;
export type ProgressTable = (typeof PROGRESS_TABLES)[number];
