// Today (design spec 5.1): today's work as plain facts, and one green key that starts or continues it.
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ensureContent, useContent } from '../content/load';
import { getMeta, useSettings } from '../db/settings';
import { clock, dayKey, daysAgo, longDate, minutes, trackNo } from '../lib/format';
import { navigate } from '../lib/router';
import { openPlayerSheet } from '../lib/ui';
import { open as openLecture } from '../lectures/player';
import { trackSeconds } from '../lectures/tracks';
import { Foot, GoKey, Group, Key2, LargeTitle, Lamp, NavRow, Notice, Pad, RKey, Row, SectionHeader, type LampState } from '../ui/kit';
import { dayPlan, todayState, type TodayState } from './plan';

const approx = (secs: number) => `~${Math.max(1, Math.round(secs / 60))} min`;

function dayWord(day: number): string {
  const t = new Date(); t.setHours(0, 0, 0, 0);
  const diff = Math.round((day - t.getTime()) / 86_400_000);
  if (diff <= 1) return 'tomorrow';
  return new Date(day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function TodayPage() {
  const settings = useSettings();
  const content = useContent();
  const [date, setDate] = useState(dayKey());
  const [planReady, setPlanReady] = useState(false);
  const lastBackup = useLiveQuery(() => getMeta<number>('lastBackupAt'), [], undefined);

  // Make today's plan (once per day), and notice when the day changes while the app stays open.
  useEffect(() => {
    let live = true;
    void dayPlan().then(() => { if (live) setPlanReady(true); });
    const t = window.setInterval(() => { if (dayKey() !== date) setDate(dayKey()); }, 60_000);
    return () => { live = false; window.clearInterval(t); };
  }, [date]);

  const s = useLiveQuery(() => (planReady ? todayState() : Promise.resolve(null)), [planReady, date], null);

  const status = <RKey icon="stats" label="Status and data" onClick={() => navigate({ name: 'status' })} />;
  const header = (
    <>
      <NavRow right={status} />
      <LargeTitle title="Today" sub={longDate()} />
    </>
  );

  if (content.state === 'error' && (!s || s.plan.firstRun)) {
    return (
      <>
        {header}
        <Pad top={22}><Notice kind="err" title="Couldn't load today's word data">Check your internet connection, then try again. Your progress is safe on this iPhone.</Notice></Pad>
        <Pad><Key2 onClick={() => void ensureContent()}>Try again</Key2></Pad>
      </>
    );
  }

  if (!s) {
    return (
      <>
        {header}
        <SectionHeader left={`Session · about ${settings.dailyMinutes} min`} />
        <Group>
          {[40, 48, 36].map(w => (
            <div className="cl" key={w}><Lamp state="off" label="loading" /><div className="ct"><div className="skel" style={{ width: `${w}%` }} /><div className="skel" style={{ width: `${w + 18}%`, height: 11, marginTop: 8 }} /></div></div>
          ))}
        </Group>
        <Pad><GoKey icon="play" disabled>Start session</GoKey></Pad>
        {content.state === 'loading' && <Foot>Loading word data · {content.done} of {content.total} files</Foot>}
      </>
    );
  }

  return <TodayView s={s} header={header} budget={settings.dailyMinutes} lastBackup={lastBackup} loadingContent={content.state === 'loading' ? content : null} />;
}

function TodayView({ s, header, budget, lastBackup, loadingContent }: {
  s: TodayState; header: React.ReactNode; budget: number; lastBackup: number | undefined;
  loadingContent: { done: number; total: number } | null;
}) {
  const { plan, reviews, fresh, lecture, next } = s;
  const startedToday = s.timeToday > 30 || reviews.done > 0 || fresh.done > 0;

  const lampFor = (block: 'reviews' | 'new' | 'lecture', done: boolean): LampState => (next === block ? 'on' : done ? 'done' : 'off');

  // ---- Reviews row
  const reviewsDone = reviews.remaining === 0 && reviews.done > 0;
  const reviewsSub = plan.firstRun && reviews.done === 0 ? 'None yet'
    : reviews.remaining > 0 ? (reviews.carry > 0 ? `${reviews.remaining} of ${plan.reviewsDueAtStart} due · ${reviews.carry} move to tomorrow` : `${reviews.remaining} due`)
    : reviews.done > 0 ? `${reviews.done} done` : 'None due';
  const reviewsDet = reviews.remaining > 0 ? approx(reviews.estSecs) : reviews.done > 0 ? minutes(reviews.spentSecs) : '0';

  // ---- New cards row
  const freshDone = fresh.remaining === 0 && fresh.done > 0;
  const freshSub = fresh.remaining > 0
    ? (plan.firstRun && fresh.done === 0 ? `${fresh.remaining} · first Goethe A1 words` : next === 'new' && startedToday ? `Next · ${fresh.remaining} cards` : `${fresh.remaining}`)
    : fresh.done > 0 ? `${fresh.done} done`
    : plan.newSqueezed && plan.newPlanned === 0 ? 'None today · reviews fill the budget' : 'None today';
  const freshDet = fresh.remaining > 0 ? approx(fresh.estSecs) : fresh.done > 0 ? minutes(fresh.spentSecs) : '0';

  // ---- Main block: the lecture
  const t = lecture.track;
  const lectureSub = !t ? 'All 50 lectures finished'
    : lecture.done ? 'Finished'
    : lecture.position > 0 ? `Resume at ${clock(lecture.position)} of ${clock(trackSeconds(t))}`
    : `Language Transfer · ${clock(trackSeconds(t))}`;

  const start = () => {
    if (next === 'reviews' || next === 'new') navigate({ name: 'review' });
    else if (next === 'lecture' && t) { openLecture(t, { autoplay: true }); openPlayerSheet(); }
  };
  const keyLabel = !startedToday ? 'Start session'
    : next === 'reviews' ? 'Continue: reviews' : next === 'new' ? 'Continue: new cards' : `Continue: Lecture ${t ? trackNo(t) : ''}`;

  const timeLeft = Math.max(0, budget * 60 - s.timeToday);
  const footBackup = lastBackup ? ` Last backup ${daysAgo(new Date(lastBackup))}.` : '';

  if (next === 'done') {
    return (
      <>
        {header}
        <Pad top={22}>
          <div className="card" style={{ margin: 0, padding: '22px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Lamp state="done" /><h2 className="t-title3">Done for today</h2></div>
            <p className="t-body l2" style={{ margin: '8px 0 0' }}>
              {s.nextReviews ? `Next reviews: ${dayWord(s.nextReviews.day)}, ${s.nextReviews.count} card${s.nextReviews.count === 1 ? '' : 's'}.` : 'No reviews scheduled yet.'}
            </p>
          </div>
        </Pad>
        <SectionHeader left="Today's session" right={minutes(s.timeToday)} />
        <Group>
          <Row lamp={reviews.done ? 'done' : 'off'} done title="Reviews" sub={reviews.done ? `${reviews.done} done` : 'None due'} detail={reviews.done ? minutes(reviews.spentSecs) : '0'} />
          <Row lamp={fresh.done ? 'done' : 'off'} done title="New cards" sub={fresh.done ? `${fresh.done} done` : 'None today'} detail={fresh.done ? minutes(fresh.spentSecs) : '0'} />
          {t && <Row lamp="done" done title={`Lecture ${trackNo(t)}`} sub="Finished" />}
        </Group>
        <SectionHeader left="Also" style={{ paddingTop: 24 }} />
        <Group><Row icon="note" title="Reviews only" chevron onClick={() => navigate({ name: 'review', only: 'reviews' })} /></Group>
        <Foot>Time today: {minutes(s.timeToday)}.{footBackup}</Foot>
      </>
    );
  }

  return (
    <>
      {header}
      <SectionHeader left={`${plan.firstRun && !startedToday ? 'First session' : 'Session'} · about ${budget} min`} right={startedToday ? `${minutes(timeLeft)} left` : undefined} />
      <Group>
        <Row lamp={lampFor('reviews', reviewsDone)} done={reviewsDone || (plan.firstRun && reviews.done === 0 && next !== 'reviews')} title="Reviews" sub={reviewsSub} detail={reviewsDet} />
        <Row lamp={lampFor('new', freshDone)} done={freshDone} title="New cards" sub={freshSub} detail={freshDet} />
        {t ? (
          <Row lamp={lampFor('lecture', lecture.done)} done={lecture.done} title={`Lecture ${trackNo(t)}`} sub={lectureSub} detail={lecture.done ? undefined : approx(lecture.remainingSecs)} />
        ) : (
          <Row lamp="done" done title="Language Transfer" sub={lectureSub} />
        )}
      </Group>
      <Pad><GoKey icon="play" onClick={start}>{keyLabel}</GoKey></Pad>
      {plan.firstRun && !lastBackup && (
        <Pad top={20}>
          <Notice title="Your progress lives on this iPhone">
            Export a backup from Status now and then. Moving from another install?{' '}
            <button type="button" className="link" onClick={() => navigate({ name: 'status' })}>Restore from backup</button>
          </Notice>
        </Pad>
      )}
      {!plan.firstRun && (
        <>
          <SectionHeader left="Also" style={{ paddingTop: 24 }} />
          <Group><Row icon="note" title="Reviews only" chevron onClick={() => navigate({ name: 'review', only: 'reviews' })} /></Group>
        </>
      )}
      <Foot>
        {loadingContent ? `Loading word data · ${loadingContent.done} of ${loadingContent.total} files. ` : ''}
        Time today: {minutes(s.timeToday)}.{footBackup}
        {!s.paceMeasured && (reviews.remaining > 0 || fresh.remaining > 0) ? ' Times are first estimates until you have done a few reviews.' : ''}
      </Foot>
    </>
  );
}
