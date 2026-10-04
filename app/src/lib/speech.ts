// The iPhone's built-in German voice, used when a card has no human recording (product spec 3).
// Phase 0 found 10 German voices, most of them Apple novelty voices; those are never offered (design spec 10).

const NOVELTY = /\b(eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|oma|opa)\b/i;

export interface VoiceOption { uri: string; name: string; quality: 'premium' | 'enhanced' | 'standard' }

function quality(v: SpeechSynthesisVoice): VoiceOption['quality'] {
  const s = `${v.name} ${v.voiceURI}`.toLowerCase();
  if (s.includes('premium')) return 'premium';
  if (s.includes('enhanced') || s.includes('erweitert')) return 'enhanced';
  return 'standard';
}

/** German voices, best first: premium, then enhanced, then Anna, then the rest. */
export function germanVoices(all: SpeechSynthesisVoice[] = typeof speechSynthesis !== 'undefined' ? speechSynthesis.getVoices() : []): SpeechSynthesisVoice[] {
  const rank = (v: SpeechSynthesisVoice) => {
    const q = quality(v);
    return (q === 'premium' ? 0 : q === 'enhanced' ? 10 : 20) + (/anna/i.test(v.name) ? 0 : 1);
  };
  return all
    .filter(v => (v.lang || '').toLowerCase().replace('_', '-').startsWith('de'))
    .filter(v => !NOVELTY.test(v.name))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

export function voiceOptions(): VoiceOption[] {
  return germanVoices().map(v => ({ uri: v.voiceURI, name: v.name, quality: quality(v) }));
}

/** The chosen voice, or the best available German voice. */
export function pickVoice(uri: string | null): SpeechSynthesisVoice | undefined {
  const list = germanVoices();
  return (uri && list.find(v => v.voiceURI === uri)) || list[0];
}

/** Voices load late on iPhone; resolves once they are known (or after 2 s). */
export function voicesReady(): Promise<void> {
  if (typeof speechSynthesis === 'undefined') return Promise.resolve();
  if (speechSynthesis.getVoices().length) return Promise.resolve();
  return new Promise(res => {
    const done = () => { speechSynthesis.removeEventListener('voiceschanged', done); res(); };
    speechSynthesis.addEventListener('voiceschanged', done);
    setTimeout(done, 2000);
  });
}

export function speechAvailable(): boolean {
  return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
}

/** Speaks German text. Resolves when finished; rejects when the voice fails. */
export function speak(text: string, opts: { voice: string | null; rate: number }): Promise<void> {
  if (!speechAvailable()) return Promise.reject(new Error('Speech is not available'));
  speechSynthesis.cancel();
  return new Promise((resolve, reject) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    const v = pickVoice(opts.voice);
    if (v) u.voice = v;
    u.rate = opts.rate;
    u.onend = () => resolve();
    u.onerror = e => (e.error === 'interrupted' || e.error === 'canceled' ? resolve() : reject(new Error(e.error)));
    speechSynthesis.speak(u);
  });
}

export function stopSpeaking() {
  if (speechAvailable()) speechSynthesis.cancel();
}
