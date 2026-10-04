import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/db/db';
import { buildBackup, NotABackupError, parseBackup, restoreBackup } from '../src/db/backup';

async function seed() {
  await db.lectures.put({ track: 3, position: 22.9, covered: '1111', done: 0, notes: 'Pause before answering.' });
  await db.lectures.put({ track: 1, position: 440, covered: '1', done: 1, doneAt: 1, notes: '' });
  await db.settings.put({ key: 'newPerDay', value: 5 });
  await db.time.put({ date: '2026-10-03', activity: 'lecture', seconds: 600 });
  await db.meta.put({ key: 'contentVersion', value: 'abc' });
  await db.cards.put({ id: 'c1', noteId: 'n1', type: 'production', due: 5, stability: 1, difficulty: 5, elapsed_days: 0, scheduled_days: 1,
    learning_steps: 0, reps: 1, lapses: 0, state: 2, suspended: 0, fails: 0, createdAt: 1 });
}

describe('backup and restore (product spec 4.7)', () => {
  beforeEach(async () => { await Promise.all(db.tables.map(t => t.clear())); });

  it('round-trips all progress', async () => {
    await seed();
    const b = await buildBackup(1234);
    const text = JSON.stringify(b);
    expect(b.summary).toEqual({ exportedAt: 1234, cards: 1, lecturesDone: 1, timeSeconds: 600 });

    await Promise.all(db.tables.map(t => t.clear()));
    await db.lectures.put({ track: 7, position: 1, covered: '', done: 0, notes: 'will be replaced' });
    await restoreBackup(parseBackup(text));

    expect(await db.lectures.get(3)).toMatchObject({ position: 22.9, notes: 'Pause before answering.' });
    expect(await db.lectures.get(7)).toBeUndefined();
    expect((await db.settings.get('newPerDay'))?.value).toBe(5);
    expect(await db.cards.count()).toBe(1);
    expect((await db.meta.get('lastBackupAt'))?.value).toBe(1234);
  });

  it('never carries imported-content markers between installs', async () => {
    await seed();
    const b = await buildBackup();
    expect((b.tables.meta as { key: string }[]).some(r => r.key === 'contentVersion')).toBe(false);
    await db.meta.put({ key: 'contentVersion', value: 'this-phone' });
    await restoreBackup(b);
    expect((await db.meta.get('contentVersion'))?.value).toBe('this-phone');
  });

  it('rejects files that are not backups, before touching anything', async () => {
    await seed();
    const bad = [
      'not json',
      '{}',
      JSON.stringify({ app: 'Other', kind: 'backup' }),
      JSON.stringify({ app: 'Scheiße', kind: 'backup', format: 1, exportedAt: 1, tables: {} }),
      JSON.stringify({ app: 'Scheiße', kind: 'backup', format: 99, exportedAt: 1, tables: {} }),
    ];
    for (const text of bad) expect(() => parseBackup(text)).toThrow(NotABackupError);
    const b = await buildBackup();
    (b.tables.lectures as unknown[]).push({ track: 99 });
    expect(() => parseBackup(JSON.stringify(b))).toThrow(NotABackupError);
    expect(await db.lectures.count()).toBe(2);
  });
});
