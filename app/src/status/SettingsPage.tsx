import { useEffect, useState } from 'react';
import { setSetting, useSettings, type SettingKey, type Settings } from '../db/settings';
import { setHapticsEnabled } from '../lib/device';
import { pickVoice, speak, voiceOptions, voicesReady, type VoiceOption } from '../lib/speech';
import { Icon } from '../ui/icons';
import { BackButton, DetailTitle, Group, Key2, NavRow, Row, SectionHeader, Sheet, Switch } from '../ui/kit';

type Choice<T> = { value: T; label: string; sub?: string };
type Picker = { key: SettingKey; title: string; note?: string; options: Choice<Settings[SettingKey]>[] };

const DAILY: Choice<number>[] = [15, 20, 30, 45, 60].map(v => ({ value: v, label: `${v} min` }));
const NEW: Choice<number>[] = [0, 5, 10, 15, 20].map(v => ({ value: v, label: String(v) }));
const RETENTION: Choice<number>[] = [0.8, 0.85, 0.9, 0.95].map(v => ({ value: v, label: `${Math.round(v * 100)}%`, sub: v === 0.9 ? 'Default' : v > 0.9 ? 'More reviews' : 'Fewer reviews' }));
const MODE: Choice<'speak' | 'type'>[] = [{ value: 'speak', label: 'Speak', sub: 'Say the answer aloud, then reveal' }, { value: 'type', label: 'Type', sub: 'Type the answer, then compare' }];
const RATE: Choice<number>[] = [0.7, 0.85, 1].map(v => ({ value: v, label: `${v.toFixed(v === 1 ? 1 : 2).replace(/0$/, '')}×` }));

/** Voice preview: Tatoeba sentence 2301788 ("There's no speed limit."), CC BY 2.0 FR. Also used in Phase 0. */
const VOICE_SAMPLE = 'Es gibt keine Geschwindigkeitsbegrenzung.';

const labelOf =<T,>(opts: Choice<T>[], v: T) => opts.find(o => o.value === v)?.label ?? String(v);

export function SettingsPage() {
  const s = useSettings();
  const [picker, setPicker] = useState<Picker | null>(null);
  const [voices, setVoices] = useState<VoiceOption[]>([]);

  useEffect(() => { void voicesReady().then(() => setVoices(voiceOptions())); }, []);
  const voiceName = pickVoice(s.voice)?.name ?? (voices.length ? voices[0].name : 'Not available');

  const open = (p: Picker) => setPicker(p);

  return (
    <>
      <NavRow left={<BackButton label="Status" to={{ name: 'status' }} />} />
      <DetailTitle title="Settings" />

      <SectionHeader left="Flashcards" />
      <Group flush>
        <Row title="New cards per day" detail={s.newPerDay} chevron onClick={() => open({ key: 'newPerDay', title: 'New cards per day', note: 'Cards you pick from lectures, reading and the inbox count toward this and come first. “Add 5 more” on the Flashcards tab raises it for one day.', options: NEW })} />
        <Row title="Pause new cards after" sub="When a day's reviews take longer, no new cards that day" detail={`${s.dailyMinutes} min`} chevron
          onClick={() => open({ key: 'dailyMinutes', title: 'Pause new cards after', note: 'When a day’s reviews take longer than this, new cards pause for that day, so the following days don’t grow too. “Add 5 more” still works.', options: DAILY })} />
        <Row title="Target memory rate" sub="How often you should still remember a card when it comes back" detail={`${Math.round(s.retention * 100)}%`} chevron
          onClick={() => open({ key: 'retention', title: 'Target memory rate', note: 'A higher rate brings cards back sooner, which means more reviews each day.', options: RETENTION })} />
      </Group>

      <SectionHeader left="Answers and audio" />
      <Group flush>
        <Row title="Default answer mode" detail={labelOf(MODE, s.answerMode)} chevron onClick={() => open({ key: 'answerMode', title: 'Default answer mode', options: MODE })} />
        <Row title="Play audio automatically" sub="After the answer is revealed" trailing={<Switch label="Play audio automatically" checked={s.autoplay} onChange={v => setSetting('autoplay', v)} />} />
        <Row title="iPhone voice" sub="Used when no human recording exists" detail={voiceName} chevron
          onClick={() => open({ key: 'voice', title: 'iPhone voice', note: voices.length ? 'Enhanced and premium voices can be downloaded in the iPhone Settings under Accessibility, Spoken Content, Voices, German.' : 'No German voice was found. Check the iPhone Settings under Accessibility, Spoken Content, Voices, German.', options: voices.map(v => ({ value: v.uri, label: v.name, sub: v.quality === 'standard' ? undefined : v.quality === 'premium' ? 'Premium' : 'Enhanced' })) })} />
        <Row title="Voice speed" detail={labelOf(RATE, s.voiceRate)} chevron onClick={() => open({ key: 'voiceRate', title: 'Voice speed', options: RATE })} />
      </Group>

      <SectionHeader left="Content and display" />
      <Group flush>
        <Row title="Engineering vocabulary" sub="Off until you turn it on; suggested after A2. One engineering word joins every three new words."
          trailing={<Switch label="Engineering vocabulary" checked={s.engineering} onChange={v => setSetting('engineering', v)} />} />
        <Row title="Colour articles by gender" sub="der, die, das" trailing={<Switch label="Colour articles by gender" checked={s.genderColours} onChange={v => setSetting('genderColours', v)} />} />
        <Row title="Light tap feedback" trailing={<Switch label="Light tap feedback" checked={s.haptics} onChange={v => { setHapticsEnabled(v); void setSetting('haptics', v); }} />} />
      </Group>

      {picker && (
        <Sheet label={picker.title} onClose={() => setPicker(null)}>
          <h2 className="t-title3">{picker.title}</h2>
          {picker.note && <p className="t-sub l2" style={{ margin: '2px 0 0' }}>{picker.note}</p>}
          <Group flush className="on-bg" style={{ margin: '14px 0 0' }}>
            {picker.options.map(o => {
              const selected = (s[picker.key] ?? (picker.key === 'voice' ? pickVoice(null)?.voiceURI : undefined)) === o.value;
              return (
                <Row key={String(o.value)} selected={selected}
                  lead={<span style={{ width: 22, height: 22, display: 'grid', placeItems: 'center', color: 'var(--label)' }}>{selected && <Icon name="check" />}</span>}
                  title={o.label} sub={o.sub}
                  onClick={() => {
                    void setSetting(picker.key, o.value as never);
                    if (picker.key === 'voice' || picker.key === 'voiceRate') {
                      void speak(VOICE_SAMPLE, { voice: picker.key === 'voice' ? (o.value as string) : s.voice, rate: picker.key === 'voiceRate' ? (o.value as number) : s.voiceRate }).catch(() => {});
                    }
                  }} />
              );
            })}
          </Group>
          <div className="acts"><Key2 onClick={() => setPicker(null)}>Done</Key2></div>
        </Sheet>
      )}
    </>
  );
}
