import { describe, expect, it } from 'vitest';
import { germanVoices } from '../src/lib/speech';

const v = (name: string, lang: string, voiceURI = name) => ({ name, lang, voiceURI, default: false, localService: true }) as SpeechSynthesisVoice;

describe('German voice choice (design spec 10)', () => {
  it('ranks premium, then enhanced, then Anna, and hides novelty voices', () => {
    const list = germanVoices([
      v('Grandma', 'de-DE'), v('Rocko', 'de-DE'), v('Shelley', 'de-DE'), v('Eddy', 'de-DE'),
      v('Helena', 'de-DE'), v('Anna', 'de-DE'), v('Anna (Enhanced)', 'de-DE', 'com.apple.voice.enhanced.de-DE.Anna'),
      v('Petra (Premium)', 'de-DE', 'com.apple.voice.premium.de-DE.Petra'), v('Samantha', 'en-US'),
    ]);
    expect(list.map(x => x.name)).toEqual(['Petra (Premium)', 'Anna (Enhanced)', 'Anna', 'Helena']);
  });
});
