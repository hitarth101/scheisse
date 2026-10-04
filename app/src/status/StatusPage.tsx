import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { buildBackup, backupToFile, NotABackupError, parseBackup, restoreBackup, shareBackup, type BackupFile } from '../db/backup';
import { getMeta } from '../db/settings';
import { backupLine, dateTime, dayKey, minutes, shortDate } from '../lib/format';
import { navigate } from '../lib/router';
import { BackButton, Group, Key2, LargeTitle, NavRow, Notice, Pad, Row, SectionHeader, Sheet, showToast } from '../ui/kit';

type Problem = 'export' | 'notBackup' | 'restore' | null;

export function StatusPage() {
  const lastBackup = useLiveQuery(() => getMeta<number>('lastBackupAt'), [], undefined);
  const lecturesDone = useLiveQuery(() => db.lectures.filter(r => !!r.done).count(), [], 0);
  const week = useLiveQuery(weekTime, [], null);
  const suspended = useLiveQuery(async () => {
    const s = await db.cards.where('suspended').equals(1).toArray();
    return { leech: s.filter(c => c.suspendReason === 'leech').length, flag: s.filter(c => c.suspendReason === 'flag').length };
  }, [], { leech: 0, flag: 0 });
  const cardCount = useLiveQuery(() => db.cards.count(), [], 0);

  const [problem, setProblem] = useState<Problem>(null);
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  // The backup file is prepared ahead, so tapping Export opens the share sheet straight away
  // (iOS only opens it directly from a tap, not after waiting).
  const prepared = useRef<{ file: File; at: number } | null>(null);

  const prepare = async () => {
    const b = await buildBackup();
    prepared.current = { file: backupToFile(b), at: b.exportedAt };
  };
  useEffect(() => { void prepare(); }, [lecturesDone, cardCount, week]);

  const exportNow = async () => {
    setProblem(null);
    try {
      if (!prepared.current) await prepare();
      const { file, at } = prepared.current!;
      const result = await shareBackup(file, at);
      if (result !== 'cancelled') showToast('Backup exported');
      void prepare();
    } catch {
      setProblem('export');
    }
  };

  const pickFile = async (f: File | undefined) => {
    if (!f) return;
    setProblem(null);
    try {
      setPending(parseBackup(await f.text()));
    } catch (e) {
      setProblem(e instanceof NotABackupError ? 'notBackup' : 'notBackup');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const replace = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await restoreBackup(pending);
      showToast(`Restored backup from ${shortDate(new Date(pending.exportedAt))}`);
      setPending(null);
    } catch {
      setProblem('restore');
      setPending(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <NavRow left={<BackButton label="Today" to={{ name: 'today' }} />} />
      <LargeTitle title="Status" />

      {problem === 'export' && (
        <Pad><Notice kind="err" title="Export didn't finish">Nothing was saved. Try again, or pick another place in the share sheet.</Notice></Pad>
      )}
      {problem === 'notBackup' && (
        <Pad><Notice kind="err" title="This file isn't a Scheiße backup">It may be damaged or from another app. Nothing on this iPhone was changed.</Notice></Pad>
      )}
      {problem === 'restore' && (
        <Pad><Notice kind="err" title="Restore didn't finish">Nothing on this iPhone was changed. Try again.</Notice></Pad>
      )}

      <SectionHeader left="Backup" />
      <Group>
        <Row icon="clock" title="Last backup" sub={lastBackup ? backupLine(new Date(lastBackup)) : 'None yet'} />
        <Row icon="share" title="Export backup" sub="One file, saved where you choose (Files, iCloud Drive)" chevron onClick={exportNow} />
        <Row icon="restore" title="Restore from backup" sub="Replaces everything on this iPhone" chevron onClick={() => fileInput.current?.click()} />
      </Group>
      <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={e => void pickFile(e.currentTarget.files?.[0])} data-testid="restore-input" />

      <SectionHeader left="Needs a decision" />
      <Group>
        <Row icon="suspend" title="Leeches" sub="Failed 8 times, suspended automatically" detail={suspended.leech} chevron to={{ name: 'suspended', reason: 'leech' }} />
        <Row icon="flag" title="Flagged cards" sub="Source data marked as wrong" detail={suspended.flag} chevron to={{ name: 'suspended', reason: 'flag' }} />
      </Group>

      <SectionHeader left="Time logged" right="this week" />
      <Group flush>
        <Row title="Reviews" detail={minutes(week?.review ?? 0)} />
        <Row title="Lectures" detail={minutes(week?.lecture ?? 0)} />
      </Group>

      <SectionHeader left="Progress" />
      <Group flush>
        <Row title="Language Transfer" detail={`${lecturesDone} of 50 tracks`} />
        <Row title="Cards" detail={cardCount} />
      </Group>

      <SectionHeader left="More" />
      <Group>
        <Row icon="grammar" title="Settings" chevron onClick={() => navigate({ name: 'settings' })} />
        <Row icon="info" title="Sources and credits" chevron onClick={() => navigate({ name: 'credits' })} />
      </Group>

      {pending && (
        <Sheet label="Restore from backup" onClose={() => setPending(null)}>
          <h2 className="t-title3">Replace everything with this backup?</h2>
          <div className="win" style={{ marginTop: 12 }}>
            <div className="t-head">Backup from {dateTime(new Date(pending.exportedAt))}</div>
            <div className="t-sub l2 num" style={{ marginTop: 4 }}>
              {pending.summary.cards} cards · {pending.summary.lecturesDone} of 50 lectures done · {minutes(pending.summary.timeSeconds)} logged
            </div>
          </div>
          <p className="t-sub l2" style={{ margin: '12px 0 0' }}>
            Everything on this iPhone since then is lost. Export a backup first if you might want it back.
          </p>
          <div className="acts">
            <Key2 danger onClick={replace} disabled={busy}>{busy ? 'Replacing…' : 'Replace with this backup'}</Key2>
            <Key2 onClick={exportNow} disabled={busy}>Export current data first</Key2>
            <Key2 onClick={() => setPending(null)} disabled={busy}>Cancel</Key2>
          </div>
        </Sheet>
      )}
    </>
  );
}

async function weekTime(): Promise<Record<string, number>> {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  const rows = await db.time.where('date').aboveOrEqual(dayKey(monday)).toArray();
  const out: Record<string, number> = {};
  for (const r of rows) out[r.activity] = (out[r.activity] ?? 0) + r.seconds;
  return out;
}
