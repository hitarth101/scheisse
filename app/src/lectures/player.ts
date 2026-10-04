// The one lecture player. A single <audio> element lives for the whole app session, so playback continues
// across pages, with the screen locked, and from the lock screen (Media Session API, proven in Phase 0).
import { useSyncExternalStore } from 'react';
import { addTime } from '../db/time';
import { setMeta, setSetting } from '../db/settings';
import { trackNo } from '../lib/format';
import { isListened, markCovered } from './progress';
import { lectureNow, updateLecture } from './store';
import { audioUrl, trackSeconds } from './tracks';

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export interface PlayerState {
  track: number | null;
  status: PlayerStatus;
  position: number;
  duration: number;
  rate: number;
}

const SAVE_EVERY_MS = 3000;
const SKIP = 10;

let state: PlayerState = { track: null, status: 'idle', position: 0, duration: 0, rate: 1 };
const listeners = new Set<() => void>();
const endedListeners = new Set<(track: number) => void>();

function set(patch: Partial<PlayerState>) {
  state = { ...state, ...patch };
  listeners.forEach(l => l());
}

export function getPlayer(): PlayerState { return state; }
export function subscribePlayer(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; }
export function usePlayer(): PlayerState { return useSyncExternalStore(subscribePlayer, getPlayer, getPlayer); }
/** Called when a track plays to its end (used to open the sentence tick screen). */
export function onTrackEnded(l: (track: number) => void) { endedListeners.add(l); return () => { endedListeners.delete(l); }; }

let audio: HTMLAudioElement | null = null;
let lastTime = 0;          // last currentTime seen while playing, for coverage and time logging
let covered = '';
let pendingSeconds = 0;    // listening time not yet written to the time log
let lastSave = 0;
let wantPlay = false;

function el(): HTMLAudioElement {
  if (audio) return audio;
  const a = document.createElement('audio');
  a.preload = 'metadata';
  a.setAttribute('playsinline', '');
  a.style.display = 'none';
  document.body.appendChild(a);
  audio = a;

  a.addEventListener('loadedmetadata', () => {
    if (isFinite(a.duration)) set({ duration: a.duration });
    // Fallback when the #t= start position in the address was not applied.
    const want = startAt;
    if (want > 0 && Math.abs(a.currentTime - want) > 2) a.currentTime = want;
    lastTime = a.currentTime;
  });
  a.addEventListener('playing', () => { lastTime = a.currentTime; set({ status: 'playing' }); updatePositionState(); });
  a.addEventListener('waiting', () => { if (!a.paused) set({ status: 'loading' }); });
  a.addEventListener('pause', () => {
    if (state.status !== 'error') set({ status: 'paused' });
    void save(true);
  });
  a.addEventListener('seeking', () => { lastTime = a.currentTime; set({ position: a.currentTime }); });
  a.addEventListener('timeupdate', onTime);
  a.addEventListener('ratechange', () => { set({ rate: a.playbackRate }); updatePositionState(); });
  a.addEventListener('ended', () => {
    const t = state.track;
    set({ status: 'paused', position: state.duration || a.currentTime });
    void save(true).then(() => { if (t != null) endedListeners.forEach(l => l(t)); });
  });
  a.addEventListener('error', () => {
    wantPlay = false;
    set({ status: 'error' });
  });
  setupMediaSession();
  return a;
}

let startAt = 0;

function onTime() {
  const a = el();
  const t = a.currentTime;
  if (!a.paused && state.track != null) {
    const delta = t - lastTime;
    // Only continuous playback counts; seeks and skips jump further than this.
    if (delta > 0 && delta <= 1.5 * Math.max(1, a.playbackRate)) {
      covered = markCovered(covered, state.duration || trackSeconds(state.track), lastTime, t);
      pendingSeconds += delta / (a.playbackRate || 1);
    }
  }
  lastTime = t;
  set({ position: t });
  if (Date.now() - lastSave > SAVE_EVERY_MS) void save(false);
  updatePositionState();
}

/** Writes position, coverage, done state and listening time. */
async function save(force: boolean) {
  const track = state.track;
  if (track == null) return;
  if (!force && Date.now() - lastSave < SAVE_EVERY_MS) return;
  lastSave = Date.now();
  const row = lectureNow(track);
  const changes: Parameters<typeof updateLecture>[1] = {
    position: state.position,
    covered,
    lastPlayedAt: Date.now(),
  };
  if (!row.done && isListened(covered)) Object.assign(changes, { done: 1, doneAt: Date.now(), doneBy: 'listened' });
  const secs = pendingSeconds;
  pendingSeconds = 0;
  await updateLecture(track, changes);
  if (secs > 0) await addTime('lecture', secs);
}

function updatePositionState() {
  const a = audio;
  if (!a || !('mediaSession' in navigator) || !isFinite(a.duration) || !a.duration) return;
  try {
    navigator.mediaSession.setPositionState({ duration: a.duration, playbackRate: a.playbackRate, position: Math.min(a.currentTime, a.duration) });
  } catch { /* not supported */ }
}

function setupMediaSession() {
  if (!('mediaSession' in navigator)) return;
  const h = (action: MediaSessionAction, fn: MediaSessionActionHandler) => {
    try { navigator.mediaSession.setActionHandler(action, fn); } catch { /* not supported */ }
  };
  h('play', () => { play(); });
  h('pause', () => { pause(); });
  h('seekbackward', d => skip(-(d.seekOffset || SKIP)));
  h('seekforward', d => skip(d.seekOffset || SKIP));
  h('seekto', d => { if (typeof d.seekTime === 'number') seek(d.seekTime); });
}

function setMetadata(track: number) {
  if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: `Lecture ${trackNo(track)}`,
      artist: 'Language Transfer · Complete German',
      album: 'Scheiße',
      artwork: [{ src: `${import.meta.env.BASE_URL}icon-512.png`, sizes: '512x512', type: 'image/png' }],
    });
  } catch { /* not supported */ }
}

/** Where a track resumes: its saved position, or the start when it was finished. */
function resumePoint(track: number): number {
  const row = lectureNow(track);
  const dur = trackSeconds(track);
  if (!row.position || row.position >= dur - 3) return 0;
  return row.position;
}

/**
 * Loads a track. With `autoplay`, playback starts at once; call this directly from a tap so iOS allows it.
 */
export function open(track: number, opts: { autoplay?: boolean; rate?: number } = {}) {
  const a = el();
  if (state.track === track && state.status !== 'error') {
    if (opts.autoplay) play();
    return;
  }
  if (state.track != null && !a.paused) a.pause();
  void save(true);
  const row = lectureNow(track);
  startAt = resumePoint(track);
  covered = row.covered;
  lastTime = startAt;
  pendingSeconds = 0;
  set({ track, status: opts.autoplay ? 'loading' : 'paused', position: startAt, duration: trackSeconds(track), rate: opts.rate ?? state.rate });
  void setMeta('lastTrack', track);
  a.src = audioUrl(track) + (startAt > 0 ? `#t=${startAt.toFixed(1)}` : '');
  a.playbackRate = state.rate;
  a.defaultPlaybackRate = state.rate;
  setMetadata(track);
  if (opts.autoplay) play();
  else a.load();
}

export function play() {
  const a = el();
  if (state.track == null) return;
  if (state.status === 'error') { retry(true); return; }
  wantPlay = true;
  if (a.readyState < 3) set({ status: 'loading' });
  a.play().catch(err => {
    wantPlay = false;
    // NotAllowedError: iOS refused to start without a tap; AbortError: a new source replaced this one.
    if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') { if (state.status !== 'error') set({ status: 'paused' }); }
    else set({ status: 'error' });
  });
}

export function pause() {
  wantPlay = false;
  audio?.pause();
}

export function toggle() {
  if (state.status === 'playing' || (state.status === 'loading' && wantPlay)) pause();
  else play();
}

export function seek(seconds: number) {
  const a = el();
  if (state.track == null) return;
  const dur = state.duration || trackSeconds(state.track);
  const t = Math.max(0, Math.min(dur - 0.5, seconds));
  a.currentTime = t;
  lastTime = t;
  set({ position: t });
  updatePositionState();
  void save(true);
}

export function skip(delta: number) { seek((audio?.currentTime ?? state.position) + delta); }

export function setRate(rate: number) {
  const a = el();
  a.playbackRate = rate;
  a.defaultPlaybackRate = rate;
  set({ rate });
  void setSetting('lectureRate', rate);
}

/** Reloads the current track after an error, at the saved position. */
export function retry(autoplay = true) {
  const track = state.track;
  if (track == null) return;
  const a = el();
  startAt = state.position || resumePoint(track);
  lastTime = startAt;
  set({ status: autoplay ? 'loading' : 'paused' });
  a.src = audioUrl(track) + (startAt > 0 ? `#t=${startAt.toFixed(1)}` : '');
  if (autoplay) play(); else a.load();
}

/** Pauses the lecture because other audio starts (one audio source at a time; product spec 4.3). */
export function pauseForOtherAudio() {
  if (audio && !audio.paused) pause();
}

/** Playback speed remembered from last time (set once at launch). */
export function setInitialRate(rate: number) {
  if (state.track == null) set({ rate });
}

/** Restores the last track after a relaunch, paused, without loading audio until asked. */
export function restore(track: number, rate: number) {
  if (state.track != null) return;
  const row = lectureNow(track);
  startAt = resumePoint(track);
  covered = row.covered;
  lastTime = startAt;
  set({ track, status: 'paused', position: startAt, duration: trackSeconds(track), rate });
  const a = el();
  a.preload = 'none';
  a.src = audioUrl(track) + (startAt > 0 ? `#t=${startAt.toFixed(1)}` : '');
  a.playbackRate = rate;
  a.defaultPlaybackRate = rate;
  a.preload = 'metadata';
  setMetadata(track);
}

// Save when the app goes to the background or closes.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void save(true); });
  window.addEventListener('pagehide', () => { void save(true); });
}
