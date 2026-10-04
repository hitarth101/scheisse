import { useLiveQuery } from 'dexie-react-hooks';
import { getMeta } from '../db/settings';
import { timeOnDay } from '../db/time';
import { clock, daysAgo, longDate, minutes, trackNo } from '../lib/format';
import { navigate } from '../lib/router';
import { openPlayerSheet } from '../lib/ui';
import { open, usePlayer } from '../lectures/player';
import { nextTrack, useLectures } from '../lectures/store';
import { trackSeconds } from '../lectures/tracks';
import { Foot, GoKey, Group, LargeTitle, NavRow, Notice, Pad, RKey, Row, SectionHeader } from '../ui/kit';

export function TodayPage() {
  const rows = useLectures();
  const p = usePlayer();
  const today = useLiveQuery(() => timeOnDay(), [], 0);
  const lastBackup = useLiveQuery(() => getMeta<number>('lastBackupAt'), [], undefined);
  const next = nextTrack(rows);

  const pos = next == null ? 0 : p.track === next ? p.position : rows[next - 1].position;
  const start = () => { if (next == null) return; open(next, { autoplay: true }); openPlayerSheet(); };

  return (
    <>
      <NavRow right={<RKey icon="stats" label="Status and data" onClick={() => navigate({ name: 'status' })} />} />
      <LargeTitle title="Today" sub={longDate()} />
      <SectionHeader left="Session" />
      <Group>
        {next != null ? (
          <Row lamp="on" title={`Lecture ${trackNo(next)}`}
            sub={pos > 0 ? `Resume at ${clock(pos)} of ${clock(trackSeconds(next))}` : `Language Transfer · ${clock(trackSeconds(next))}`}
            detail={`~${Math.max(1, Math.round((trackSeconds(next) - pos) / 60))} min`} />
        ) : (
          <Row lamp="done" done title="Language Transfer" sub="All 50 lectures finished" />
        )}
      </Group>
      {next != null && <Pad><GoKey icon="play" onClick={start}>{pos > 0 ? `Resume lecture ${trackNo(next)}` : `Play lecture ${trackNo(next)}`}</GoKey></Pad>}
      {lastBackup == null && (
        <Pad top={20}>
          <Notice title="Your progress lives on this iPhone">
            Export a backup from Status now and then.{' '}
            <button type="button" className="link" onClick={() => navigate({ name: 'status' })}>Restore from backup</button>
          </Notice>
        </Pad>
      )}
      <Foot>Time today: {minutes(today)}.{lastBackup ? ` Last backup ${daysAgo(new Date(lastBackup))}.` : ''}</Foot>
    </>
  );
}
