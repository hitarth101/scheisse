import { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Activity } from '../db/db';
import { buildBackup, backupToFile, NotABackupError, parseBackup, restoreBackup, shareBackup, type BackupFile } from '../db/backup';
import { getMeta } from '../db/settings';
import { addTime } from '../db/time';
import { backupLine, dateTime, dayKey, minutes, shortDate } from '../lib/format';
import { navigate } from '../lib/router';
import { useGrammar, useLessonsDone, useTopicStatuses } from '../grammar/data';
import { Foot, GoKey, Group, Key2, LargeTitle, NavRow, Notice, Pad, RKey, Row, Seg, SectionHeader, Sheet, showToast, TextButton } from '../ui/kit';
import { cardsByState, forecast, monthStart, timeSince, weekStart, wordsKnown } from './stats';

type Problem = 'export' | 'notBackup' | 'restore' | null;

export function StatusPage() {
  const lastBackup = useLiveQuery(() => getMeta<number>('lastBackupAt'), [], undefined);
  const lecturesDone = useLiveQuery(() => db.lectures.filter(r => !!r.done).count(), [], 0);
  const week = useLiveQuery(() => timeSince(weekStart()), [], null);
  const month = useLiveQuery(() => timeSince(monthStart()), [], null);
  const total = useLiveQuery(() => timeSince(), [], null);
  const days = useLiveQuery(() => forecast(), [], null);
  const states = useLiveQuery(cardsByState, [], null);
  const known = useLiveQuery(wordsKnown, [], null);
  const grammar = useGrammar().data;
  const topics = useTopicStatuses();
  const lessons = useLessonsDone();
  const [outside, setOutside] = useState(false);
  const cardCount = states?.total ?? 0;

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
      <NavRow />
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

      <SectionHeader left="Reviews" right="next 7 days" />
      <Group style={{ paddingTop: 14 }}>
        <Forecast days={days} />
      </Group>

      <SectionHeader left="Cards" right={states ? `${states.total} in total` : undefined} />
      <Group flush>
        <Row title="New, not yet seen" detail={states?.fresh ?? ''} />
        <Row title="Learning" detail={states?.learning ?? ''} />
        <Row title="In review" detail={states?.review ?? ''} />
        <Row title="Suspended" sub={states ? `${states.leech} leech${states.leech === 1 ? '' : 'es'}, ${states.flag} flagged` : undefined} detail={states?.suspended ?? ''} chevron
          onClick={() => navigate({ name: 'flashcards' })} />
      </Group>

      <SectionHeader left="Words known" />
      <Group flush>
        <Row title="From reviews" sub="review gap of 21 days or more" detail={known?.fromReviews ?? ''} />
        <Row title="Marked known in Reading" detail={known?.marked ?? ''} />
      </Group>

      <SectionHeader left="Time logged" right="this week" />
      <Group flush>
        <Row title="Reviews" detail={minutes(week?.review ?? 0)} />
        <Row title="Lectures" detail={minutes(week?.lecture ?? 0)} />
        <Row title="Reading" detail={minutes(week?.reading ?? 0)} />
        <Row title="Outside the app" sub="TV, Nicos Weg, lessons" detail={minutes(week?.outside ?? 0)} />
        <div className="inline" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="t-head num">{minutes(week?.total ?? 0)}</span>
          <TextButton icon="plus" onClick={() => setOutside(true)}>Add outside time</TextButton>
        </div>
      </Group>
      <Foot>This month {minutes(month?.total ?? 0)} · total {minutes(total?.total ?? 0)}</Foot>

      <SectionHeader left="Progress" />
      <Group flush>
        <Row title="Language Transfer" detail={`${lecturesDone} of 50 tracks`} />
        <Row title="Nicos Weg" detail={grammar ? `${grammar.lessons.filter(l => lessons.has(l.id)).length} of ${grammar.lessons.length} lessons` : `${lessons.size} lessons`} />
        <Row title="Grammar topics" detail={`${Object.values(topics).filter(v => v === 'read').length} read · ${Object.values(topics).filter(v => v === 'practiced').length} practiced`} />
      </Group>

      <SectionHeader left="Backup" />
      <Group>
        <Row icon="clock" title="Last backup" sub={lastBackup ? backupLine(new Date(lastBackup)) : 'None yet'} />
        <Row icon="share" title="Export backup" sub="One file, saved where you choose (Files, iCloud Drive)" chevron onClick={exportNow} />
        <Row icon="restore" title="Restore from backup" sub="Replaces everything on this iPhone" chevron onClick={() => fileInput.current?.click()} />
      </Group>
      <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={e => void pickFile(e.currentTarget.files?.[0])} data-testid="restore-input" />

      <SectionHeader left="More" />
      <Group>
        <Row icon="grammar" title="Settings" chevron onClick={() => navigate({ name: 'settings' })} />
        <Row icon="book2" title="Dictionaries" sub="dict.cc · Leo · DWDS · Wiktionary" chevron onClick={() => navigate({ name: 'dictionaries' })} />
        <Row icon="info" title="Sources and credits" chevron onClick={() => navigate({ name: 'credits' })} />
      </Group>

      {outside && <OutsideTimeSheet onClose={() => setOutside(false)} />}
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

function Forecast({ days }: { days: number[] | null }) {
  const max = Math.max(1, ...(days ?? [0]));
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date().getDay();
  return (
    <>
      <div className="fc" aria-label="Reviews due on each of the next 7 days" role="img">
        {(days ?? Array(7).fill(0)).map((n, i) => (
          <div key={i}><b>{days ? n : ''}</b><i className={i === 0 ? 'now' : undefined} style={{ height: `${Math.round((n / max) * 66)}%` }} /></div>
        ))}
      </div>
      <div className="fcl" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <span key={i}>{i === 0 ? 'Today' : names[(today + i) % 7]}</span>)}</div>
    </>
  );
}

const ACTIVITIES: { value: Activity; label: string }[] = [
  { value: 'tv', label: 'TV' }, { value: 'nicos', label: 'Nicos Weg' }, { value: 'lesson', label: 'Lesson' }, { value: 'other', label: 'Other' },
];

/** Add outside time (design spec 5.7): activity, 5-minute steps, date. */
function OutsideTimeSheet({ onClose }: { onClose: () => void }) {
  const [activity, setActivity] = useState<Activity>('tv');
  const [mins, setMins] = useState(30);
  const [date, setDate] = useState(dayKey());
  const add = async () => {
    await addTime(activity, mins * 60, date);
    showToast(`Added ${minutes(mins * 60)}`);
    onClose();
  };
  return (
    <Sheet label="Add outside time" onClose={onClose}>
      <h2 className="t-title3">Add outside time</h2>
      <div style={{ marginTop: 14 }}><Seg label="Activity" value={activity} onChange={setActivity} options={ACTIVITIES} /></div>
      <div className="stepper" style={{ marginTop: 20 }}>
        <RKey icon="minus" label="5 minutes less" onClick={() => setMins(m => Math.max(5, m - 5))} disabled={mins <= 5} />
        <span className="v" aria-live="polite">{minutes(mins * 60)}</span>
        <RKey icon="plus" label="5 minutes more" onClick={() => setMins(m => Math.min(600, m + 5))} />
      </div>
      <label className="t-sub l2" style={{ display: 'block', marginTop: 18 }}>Date
        <input className="field" type="date" value={date} max={dayKey()} onChange={e => setDate(e.currentTarget.value || dayKey())} style={{ marginTop: 6 }} />
      </label>
      <div className="acts">
        <GoKey center onClick={() => void add()}>Add {minutes(mins * 60)}</GoKey>
        <Key2 onClick={onClose}>Cancel</Key2>
      </div>
    </Sheet>
  );
}
