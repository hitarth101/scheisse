// Card audio: a human recording when the source has one, otherwise the iPhone's German voice.
// Playing card audio pauses a lecture (one audio source at a time; product spec 4.3).
import type { NoteRow } from '../db/db';
import { pauseForOtherAudio } from '../lectures/player';
import { pickVoice, speak, stopSpeaking } from '../lib/speech';

let el: HTMLAudioElement | null = null;
let unlocked = false;

// 0.1 s of silence. Playing it once from a tap lets iOS play later card audio without a tap of its own
// (for example the automatic playback after a reveal or on a listening card).
const SILENCE = 'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';

function element(): HTMLAudioElement {
  if (!el) {
    el = document.createElement('audio');
    el.setAttribute('playsinline', '');
    el.preload = 'auto';
    document.body.appendChild(el);
  }
  return el;
}

/** Call from the first tap in a review session. */
export function unlockCardAudio() {
  if (unlocked) return;
  unlocked = true;
  const a = element();
  a.src = SILENCE;
  a.play().then(() => a.pause()).catch(() => { unlocked = false; });
  try {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.speak(Object.assign(new SpeechSynthesisUtterance(''), { volume: 0 }));
  } catch { /* speech not available */ }
}

export function stopCardAudio() {
  if (el) { el.pause(); el.removeAttribute('src'); el.load(); }
  stopSpeaking();
}

/** Which audio a note will use, as a plain line for the card ("Human recording · Tatoeba 2301788"). */
export function audioLabel(note: NoteRow, voiceUri: string | null, forceVoice = false): string {
  if (note.audio && !forceVoice) {
    if (note.audio.kind === 'tatoeba') return `Human recording · ${note.audio.by}, ${note.audio.lic}`;
    return 'Human recording · Wikimedia Commons';
  }
  const v = pickVoice(voiceUri);
  return v ? `iPhone voice · ${v.name}` : 'iPhone voice';
}

/**
 * Plays the note's German. Call from a tap so iOS allows it. Rejects when a recording fails to play,
 * so the card can offer "Try again" and "Use iPhone voice".
 */
export function playNote(note: NoteRow, opts: { voice: string | null; rate: number; slow?: boolean; forceVoice?: boolean }): Promise<void> {
  pauseForOtherAudio();
  stopCardAudio();
  const rate = opts.slow ? Math.min(opts.rate, 1) * 0.7 : opts.rate;
  if (note.audio && !opts.forceVoice) {
    const a = element();
    a.src = note.audio.url;
    a.playbackRate = opts.slow ? 0.75 : 1;
    return new Promise((resolve, reject) => {
      const done = () => { cleanup(); resolve(); };
      const fail = () => { cleanup(); reject(new Error('recording failed')); };
      const cleanup = () => { a.removeEventListener('ended', done); a.removeEventListener('error', fail); };
      a.addEventListener('ended', done);
      a.addEventListener('error', fail);
      a.play().catch(err => { cleanup(); if (err?.name === 'AbortError') resolve(); else reject(err); });
    });
  }
  return speak(note.de, { voice: opts.voice, rate });
}
