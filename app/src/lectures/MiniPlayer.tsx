import { clock, trackNo } from '../lib/format';
import { openPlayerSheet } from '../lib/ui';
import { Icon } from '../ui/icons';
import { skip, toggle, usePlayer } from './player';

/** Docked above the tab bar on every tabbed page while a lecture is loaded (design spec 4). */
export function MiniPlayer() {
  const p = usePlayer();
  if (p.track == null) return null;
  const playing = p.status === 'playing' || p.status === 'loading';
  const pct = p.duration ? Math.min(100, (p.position / p.duration) * 100) : 0;
  const state = p.status === 'error' ? ' · couldn’t load' : p.status === 'loading' ? ' · loading' : p.status === 'playing' ? '' : ' · paused';
  return (
    <div className="mini" data-testid="mini-player">
      <button type="button" className="mt" onClick={openPlayerSheet} aria-label={`Open player, lecture ${trackNo(p.track)}`}>
        <b>Lecture {trackNo(p.track)}</b>
        <span>{clock(p.position)} of {clock(p.duration)}{state}</span>
      </button>
      <button type="button" className="rkey" onClick={() => skip(-10)} aria-label="Skip back 10 seconds" disabled={p.status === 'error'}>
        <Icon name="rew10" />
      </button>
      <button type="button" className="rkey" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
        <Icon name={playing ? 'pause' : 'play'} />
      </button>
      <div className="bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
    </div>
  );
}
