import { useEffect, useRef, useState } from 'react';
import { clock, trackNo } from '../lib/format';
import { navigate } from '../lib/router';
import { closePlayerSheet } from '../lib/ui';
import { Icon } from '../ui/icons';
import { GoKey, Notice, RKey, Seg, Sheet, TextButton } from '../ui/kit';
import { retry, seek, setRate, skip, toggle, usePlayer } from './player';
import { lectureNow, setDone, useLectures } from './store';

const RATES = [0.75, 1, 1.25, 1.5];

/** Full player (design spec 5.3): the 116 pt play key sits under the thumb, because the course asks you to pause constantly. */
export function PlayerSheet() {
  const p = usePlayer();
  const rows = useLectures();
  const [more, setMore] = useState(false);
  const [scrubbing, setScrubbing] = useState<number | null>(null);
  const drag = useRef<{ y: number } | null>(null);
  const [dy, setDy] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closePlayerSheet(); };
    document.addEventListener('keydown', onKey);
    return () => { document.documentElement.style.overflow = ''; document.removeEventListener('keydown', onKey); };
  }, []);

  if (p.track == null) return null;
  const track = p.track;
  const row = rows[track - 1] ?? lectureNow(track);
  const pos = scrubbing ?? p.position;
  const dur = p.duration;
  const pct = dur ? (pos / dur) * 100 : 0;
  const isError = p.status === 'error';
  const isLoading = p.status === 'loading';
  const playing = p.status === 'playing';

  const goTrack = () => { closePlayerSheet(); navigate({ name: 'track', track }); };

  // Pull down from the top area to return to the mini-player.
  const start = (e: React.TouchEvent) => { if ((ref.current?.scrollTop ?? 0) <= 0) drag.current = { y: e.touches[0].clientY }; };
  const move = (e: React.TouchEvent) => { if (drag.current) setDy(Math.max(0, e.touches[0].clientY - drag.current.y)); };
  const end = () => { drag.current = null; if (dy > 110) closePlayerSheet(); else setDy(0); };

  return (
    <div className="player" ref={ref} role="dialog" aria-modal="true" aria-label={`Player, lecture ${trackNo(track)}`}
      style={dy ? { transform: `translateY(${dy}px)` } : undefined}>
      <div className="ptop" onTouchStart={start} onTouchMove={move} onTouchEnd={end} onTouchCancel={end}>
        <RKey icon="down" label="Close player" onClick={closePlayerSheet} />
        <span className="t-head">Lecture {trackNo(track)}</span>
        <RKey icon="more" label="More" onClick={() => setMore(true)} />
      </div>

      <div style={{ padding: '22px 24px 0' }}>
        <div className="t-sub l2">Language Transfer · Complete German</div>
        <div className="t-title1 num" style={{ marginTop: 4 }} aria-live="off">
          {clock(pos)} <span className="l2" style={{ fontWeight: 500 }}>of {clock(dur)}</span>
        </div>
      </div>

      {isError ? (
        <div style={{ padding: '20px 16px 0' }}>
          <Notice kind="err" title={`Couldn't load lecture ${trackNo(track)}`}>
            Check your internet connection, then try again. Your position, {clock(p.position)}, is saved.
          </Notice>
        </div>
      ) : (
        <div style={{ padding: '20px 24px 0' }}>
          <input className="scrub" type="range" min={0} max={Math.max(1, Math.floor(dur))} step={1} value={Math.floor(pos)}
            aria-label="Position" aria-valuetext={`${clock(pos)} of ${clock(dur)}`}
            style={{ ['--p' as string]: `${pct}%` }}
            onChange={e => setScrubbing(Number(e.currentTarget.value))}
            onPointerUp={e => { seek(Number(e.currentTarget.value)); setScrubbing(null); }}
            onKeyUp={e => { seek(Number(e.currentTarget.value)); setScrubbing(null); }}
            onTouchEnd={e => { seek(Number(e.currentTarget.value)); setScrubbing(null); }} />
          <div className="times"><span>{clock(pos)}</span><span>−{clock(Math.max(0, dur - pos))}</span></div>
        </div>
      )}

      <div className="spacer" style={{ minHeight: 24 }} />

      <div className="transport" style={isError ? { opacity: .4 } : undefined}>
        <RKey icon="rew10" size="skip" label="Skip back 10 seconds" onClick={() => skip(-10)} disabled={isError || isLoading} />
        {isLoading ? (
          <button type="button" className="bigkey loading" onClick={toggle} aria-label="Loading, tap to cancel">Loading</button>
        ) : (
          <button type="button" className="bigkey" onClick={toggle} disabled={isError} aria-label={playing ? 'Pause' : 'Play'}>
            <Icon name={playing ? 'pause' : 'play'} className="xl" />
          </button>
        )}
        <RKey icon="fwd10" size="skip" label="Skip forward 10 seconds" onClick={() => skip(10)} disabled={isError || isLoading} />
      </div>

      {isError ? (
        <div style={{ padding: '30px 24px 34px' }}><GoKey onClick={() => retry(true)}>Try again</GoKey></div>
      ) : (
        <>
          <div style={{ padding: '34px 24px 0' }}>
            <Seg label="Playback speed" value={p.rate} onChange={setRate}
              options={RATES.map(r => ({ value: r, label: `${r}×` }))} />
          </div>
          <div style={{ padding: '16px 24px 22px', display: 'flex', justifyContent: 'space-between' }}>
            <TextButton icon="note" onClick={goTrack}>Notes</TextButton>
            <TextButton onClick={() => setDone(track, !row.done)}>{row.done ? 'Mark not done' : 'Mark done'}</TextButton>
          </div>
        </>
      )}

      {more && (
        <Sheet label="Lecture options" onClose={() => setMore(false)}>
          <div className="t-title3">Lecture {trackNo(track)}</div>
          <div className="actlist">
            <button type="button" className="a" onClick={() => { setMore(false); goTrack(); }}><Icon name="note" />Track page and notes</button>
            <button type="button" className="a" onClick={() => { setMore(false); closePlayerSheet(); navigate({ name: 'tick', track }); }}><Icon name="check" />Sentences from this track</button>
            <button type="button" className="a" onClick={() => { void setDone(track, !row.done); setMore(false); }}><Icon name="check" />{row.done ? 'Mark not done' : 'Mark done'}</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
