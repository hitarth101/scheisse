import { clock, minutes, trackNo } from '../lib/format';
import { navigate } from '../lib/router';
import { openPlayerSheet } from '../lib/ui';
import { Group, LargeTitle, NavRow, Row, SectionHeader, type LampState } from '../ui/kit';
import { open, usePlayer } from './player';
import { useLectures } from './store';
import { TOTAL_SECONDS, trackSeconds } from './tracks';
import type { LectureRow } from '../db/db';
import { coveredFraction } from './progress';

export function lectureLamp(r: LectureRow, current: boolean): LampState {
  if (r.done) return 'done';
  if (current || r.position > 0) return 'part';
  return 'off';
}

export function LecturesPage() {
  const rows = useLectures();
  const p = usePlayer();
  const done = rows.filter(r => r.done).length;

  const tap = (r: LectureRow) => {
    if (r.done) { navigate({ name: 'track', track: r.track }); return; }
    open(r.track);
    openPlayerSheet();
  };

  return (
    <>
      <NavRow />
      <LargeTitle title="Lectures" sub={`Language Transfer · Complete German · ${done} of 50 done`} />
      <SectionHeader left="Tracks" right={`about ${minutes(TOTAL_SECONDS)} in total`} />
      <Group className="trk">
        {rows.map(r => {
          const current = p.track === r.track;
          const dur = trackSeconds(r.track);
          let sub: string | undefined;
          if (current && (p.status === 'playing' || p.status === 'loading')) sub = `Playing · ${clock(p.position)} of ${clock(dur)}`;
          else if (!r.done && (current ? p.position : r.position) >= dur - 3) sub = `Reached the end · ${Math.round(coveredFraction(r.covered) * 100)}% listened`;
          else if (!r.done && (current ? p.position : r.position) > 0) sub = `Resume at ${clock(current ? p.position : r.position)}`;
          else if (r.done && r.ticked) sub = `${r.ticked} sentence${r.ticked === 1 ? '' : 's'} ticked`;
          return (
            <Row key={r.track} lamp={lectureLamp(r, current)} done={!!r.done}
              lead={<span className="no">{trackNo(r.track)}</span>}
              title={`Lecture ${trackNo(r.track)}`} sub={sub} detail={clock(dur)}
              onClick={() => tap(r)} label={`Lecture ${trackNo(r.track)}${r.done ? ', done' : ''}`} />
          );
        })}
      </Group>
    </>
  );
}
