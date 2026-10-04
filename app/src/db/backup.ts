// Backup and restore (product spec 4.7): one file holding all progress, saved through the iPhone share sheet.
import { db, PROGRESS_TABLES, type ProgressTable } from './db';
import { setMeta } from './settings';
import { dayKey } from '../lib/format';
import { BUILD_ID } from '../lib/version';

export const BACKUP_FORMAT = 1;

export interface BackupSummary {
  exportedAt: number;
  cards: number;
  lecturesDone: number;
  timeSeconds: number;
}

export interface BackupFile {
  app: 'Scheiße';
  kind: 'backup';
  format: number;
  exportedAt: number;
  build: string;
  summary: BackupSummary;
  tables: Record<ProgressTable, unknown[]>;
}

/** Meta keys that describe imported content on this phone; they are never carried between installs. */
const LOCAL_META = /^content/;

export async function buildBackup(now = Date.now()): Promise<BackupFile> {
  return db.transaction('r', PROGRESS_TABLES.map(t => db.table(t)), async () => {
    const tables = {} as Record<ProgressTable, unknown[]>;
    for (const t of PROGRESS_TABLES) {
      let rows = await db.table(t).toArray();
      if (t === 'meta') rows = rows.filter(r => !LOCAL_META.test(r.key));
      tables[t] = rows;
    }
    const summary: BackupSummary = {
      exportedAt: now,
      cards: tables.cards.length,
      lecturesDone: (tables.lectures as { done?: number }[]).filter(r => r.done).length,
      timeSeconds: (tables.time as { seconds?: number }[]).reduce((s, r) => s + (r.seconds ?? 0), 0),
    };
    return { app: 'Scheiße', kind: 'backup', format: BACKUP_FORMAT, exportedAt: now, build: BUILD_ID, summary, tables };
  });
}

export function backupFileName(d = new Date()): string {
  return `Scheisse-backup-${dayKey(d)}.json`;
}

export function backupToFile(b: BackupFile): File {
  return new File([JSON.stringify(b)], backupFileName(new Date(b.exportedAt)), { type: 'application/json' });
}

export class NotABackupError extends Error {
  constructor(reason: string) { super(reason); this.name = 'NotABackupError'; }
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Checks a file's text before anything on the phone is touched. */
export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try { data = JSON.parse(text); } catch { throw new NotABackupError('not JSON'); }
  if (!isObj(data) || data.app !== 'Scheiße' || data.kind !== 'backup') throw new NotABackupError('not a Scheiße backup');
  if (typeof data.format !== 'number' || data.format > BACKUP_FORMAT) throw new NotABackupError('made by a newer version of the app');
  if (typeof data.exportedAt !== 'number' || !isObj(data.tables)) throw new NotABackupError('incomplete');
  const tables = data.tables as Record<string, unknown>;
  for (const t of PROGRESS_TABLES) {
    if (!Array.isArray(tables[t])) throw new NotABackupError(`missing ${t}`);
    if (!(tables[t] as unknown[]).every(isObj)) throw new NotABackupError(`damaged ${t}`);
  }
  for (const r of tables.lectures as Record<string, unknown>[]) {
    if (!Number.isInteger(r.track) || (r.track as number) < 1 || (r.track as number) > 50) throw new NotABackupError('damaged lectures');
  }
  for (const r of tables.cards as Record<string, unknown>[]) {
    if (typeof r.id !== 'string' || typeof r.noteId !== 'string' || typeof r.due !== 'number') throw new NotABackupError('damaged cards');
  }
  for (const r of tables.time as Record<string, unknown>[]) {
    if (typeof r.date !== 'string' || typeof r.activity !== 'string' || typeof r.seconds !== 'number') throw new NotABackupError('damaged time log');
  }
  return data as unknown as BackupFile;
}

/** Replaces all progress on this phone with the backup's contents, in one step (all or nothing). */
export async function restoreBackup(b: BackupFile): Promise<void> {
  await db.transaction('rw', PROGRESS_TABLES.map(t => db.table(t)), async () => {
    const keepMeta = (await db.meta.toArray()).filter(r => LOCAL_META.test(r.key));
    for (const t of PROGRESS_TABLES) {
      await db.table(t).clear();
      const rows = t === 'meta' ? (b.tables.meta as { key: string }[]).filter(r => !LOCAL_META.test(r.key)) : b.tables[t];
      if (rows.length) await db.table(t).bulkPut(rows);
    }
    if (keepMeta.length) await db.meta.bulkPut(keepMeta);
    await db.meta.put({ key: 'lastBackupAt', value: b.exportedAt });
  });
}

/**
 * Opens the iPhone share sheet with the backup file. Returns 'shared' when the owner picked a destination,
 * 'cancelled' when they closed the sheet, or 'downloaded' where sharing files isn't available.
 */
export async function shareBackup(file: File, exportedAt: number): Promise<'shared' | 'cancelled' | 'downloaded'> {
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: file.name });
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'cancelled';
      throw e;
    }
    await setMeta('lastBackupAt', exportedAt);
    return 'shared';
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  await setMeta('lastBackupAt', exportedAt);
  return 'downloaded';
}
