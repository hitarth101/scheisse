// One card, before and after the reveal (design spec 5.2). The prompt never moves; the answer rises in.
import { useEffect, useRef, useState } from 'react';
import type { CardRow, NoteRow, WordRow } from '../db/db';
import { contentData } from '../content/load';
import type { Settings } from '../db/settings';
import { Icon } from '../ui/icons';
import { Chip, RKey, TextButton } from '../ui/kit';
import { askFor, NounHead, pluralText, wordAnswer } from '../ui/German';
import { GermanKeys } from '../ui/GermanKeys';
import { audioLabel, playNote } from './audio';
import { compareAnswer, type Comparison } from './compare';

export interface CardViewProps {
  card: CardRow;
  note: NoteRow;
  settings: Settings;
  mode: 'speak' | 'type';
  revealed: boolean;
  typed: string;
  onTyped: (v: string) => void;
  onCheck: () => void;
  onAllForms: () => void;
}

/** The German the learner is asked to produce or hear. */
export function expected(note: NoteRow): string {
  return note.kind === 'word' ? wordAnswer(note) : note.de;
}

function SourceLine({ note }: { note: NoteRow }) {
  if (note.kind === 'sentence' && note.source === 'Tatoeba') return <>Tatoeba {note.sourceRef}</>;
  return <>{note.source}{note.edited ? ' · edited' : ''}</>;
}

/** Plays the card's German, with the error state from the design (Try again / Use iPhone voice). */
function useCardAudio(note: NoteRow, settings: Settings) {
  const [failed, setFailed] = useState(false);
  const [voiceOnly, setVoiceOnly] = useState(false);
  const [plays, setPlays] = useState(0);
  useEffect(() => { setFailed(false); setVoiceOnly(false); setPlays(0); }, [note.id]);
  const play = (slow = false, forceVoice = voiceOnly) => {
    setFailed(false);
    setPlays(n => n + 1);
    playNote(note, { voice: settings.voice, rate: settings.voiceRate, slow, forceVoice }).catch(() => setFailed(true));
  };
  return { failed, voiceOnly, plays, play, useVoice: () => { setVoiceOnly(true); play(false, true); } };
}

function AudioError({ onRetry, onVoice }: { onRetry: () => void; onVoice: () => void }) {
  return (
    <div className="notice err" role="alert" style={{ marginTop: 10, padding: '10px 0 0', background: 'transparent', borderRadius: 0 }}>
      <Icon name="warn" />
      <div>
        <b>Couldn't play the recording</b>
        <span>Check your connection, or hear it in the iPhone voice instead.</span>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <Chip onClick={onRetry}>Try again</Chip>
          <Chip onClick={onVoice}>Use iPhone voice</Chip>
        </div>
      </div>
    </div>
  );
}

export function CardView(p: CardViewProps) {
  const { card, note, settings, mode, revealed } = p;
  const audio = useCardAudio(note, settings);
  const autoplayed = useRef<string | null>(null);

  // Audio plays automatically (setting): after the reveal on production cards, never before it;
  // straight away on listening cards, where the audio is the prompt.
  useEffect(() => {
    const due = card.type === 'production' ? revealed : !revealed;
    if (due && settings.autoplay && autoplayed.current !== card.id) {
      autoplayed.current = card.id;
      audio.play();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealed, card.id]);

  if (card.type === 'listening') return <ListeningCard {...p} audio={audio} />;
  const isWord = note.kind === 'word';
  const comparison: Comparison | null = mode === 'type' && revealed && p.typed.trim() ? compareAnswer(p.typed, expected(note)) : null;

  return (
    <>
      <div className="card rv-card">
        {!revealed ? (
          isWord ? (
            <>
              <h2 className="t-title1">{note.en[0]}</h2>
              <div className="t-sub l2" style={{ marginTop: 4 }}>{askFor(note)}</div>
              {note.hint && <div className="t-sub l2" style={{ marginTop: 2 }}>Also: {note.hint}</div>}
            </>
          ) : (
            <>
              <h2 className="t-title2">{note.en[0]}</h2>
              <div className="t-sub l2" style={{ marginTop: 4 }}>{mode === 'type' ? 'Type it in German.' : 'Say it in German.'}</div>
            </>
          )
        ) : (
          <div className="t-title3 l2" style={{ margin: '0 0 14px', fontWeight: 400 }}>
            {note.en[0]}{isWord && note.pos ? ` · ${note.pos}` : ''}
          </div>
        )}

        {!revealed && mode === 'speak' && (
          <div className="win" style={{ marginTop: 20, minHeight: 120, display: 'grid', placeItems: 'center' }}>
            <span className="t-sub l2">Say it aloud, then reveal.</span>
          </div>
        )}

        {revealed && (
          <div className="reveal-in">
            {comparison && (
              <div className="typed diff" lang="de" style={{ marginBottom: 12 }}>
                <span className="t-sub l2" lang="en" style={{ fontWeight: 400, marginRight: 8 }}>You typed</span>
                {comparison.segments.map((s, i) => s.kind === 'ok' ? <span key={i}>{s.text}</span> : <span key={i} className={s.kind}>{s.text}</span>)}
              </div>
            )}
            <div className="win">
              <div className="win-row">
                {isWord ? (
                  <div className={note.pos === 'noun' ? 'de-head' : 'de-head'} lang="de">
                    {note.pos === 'noun' ? <NounHead note={note} /> : (note.hy ?? note.de)}
                  </div>
                ) : (
                  <div className="de-sent" lang="de">{note.de}</div>
                )}
                <RKey icon="speaker" label="Play the German" onClick={() => audio.play()} className="lg" />
              </div>
              {isWord && pluralText(note) && (
                <div className="t-body pl-line" lang="de"><span className="l2" lang="en">plural</span>{pluralText(note)}</div>
              )}
              {isWord && note.pluralOnly && <div className="t-body pl-line l2">plural only</div>}
              {isWord && note.forms && <div className="t-body pl-line" lang="de">{note.forms.join(' · ')}</div>}
              {audio.failed && <AudioError onRetry={() => audio.play()} onVoice={audio.useVoice} />}
            </div>
            {comparison?.notes.map(n => (
              <div className="note" key={n.kind}><Icon name="info" /><span>{n.text}</span></div>
            ))}
            {comparison?.exact && <div className="note"><Icon name="check" /><span>Same as the answer.</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 8 }}>
              <span className="src">{audioLabel(note, settings.voice, audio.voiceOnly)} · <SourceLine note={note} /></span>
              {isWord && (note.pos === 'noun' || note.pos === 'verb') && (
                <TextButton onClick={p.onAllForms}>All forms</TextButton>
              )}
            </div>
            {isWord && note.en.length > 1 && (
              <ul className="meanings" aria-label="Other meanings">
                {note.en.slice(1).map(m => <li key={m}>{m}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      {revealed && isWord && note.example && (
        <div className="card rv-card reveal-in" style={{ padding: '14px 20px' }}>
          <div className="t-title3" lang="de">{note.example.de}</div>
          <div className="t-sub l2">{note.example.en}</div>
          <div className="src" style={{ marginTop: 6 }}>Tatoeba {note.example.id}</div>
        </div>
      )}
      {revealed && !isWord && <SentenceNouns de={note.de} />}

      {!revealed && mode === 'type' && <TypeField value={p.typed} onChange={p.onTyped} onCheck={p.onCheck} cardId={card.id} />}
    </>
  );
}

function TypeField({ value, onChange, onCheck, cardId }: { value: string; onChange: (v: string) => void; onCheck: () => void; cardId: string }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, [cardId]);
  return (
    <form style={{ margin: '12px 16px 0', display: 'flex', gap: 8 }} onSubmit={e => { e.preventDefault(); onCheck(); }}>
      <input ref={ref} className="field" lang="de" value={value} onChange={e => onChange(e.currentTarget.value)}
        autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} enterKeyHint="done"
        aria-label="Your answer in German" placeholder="Your answer" style={{ flex: 1 }} />
      <button type="submit" className="go center" style={{ width: 'auto', height: 52, padding: '0 16px' }}>Check</button>
      <GermanKeys target={ref} />
    </form>
  );
}

/** Nouns used in a sentence, with article, meaning and plural (design spec 5.2, "Sentence, revealed"). */
function SentenceNouns({ de }: { de: string }) {
  const [nouns, setNouns] = useState<WordRow[]>([]);
  useEffect(() => {
    let live = true;
    const tokens = Array.from(new Set(de.match(/[A-ZÄÖÜ][a-zäöüß]+/g) ?? []));
    void contentData().then(d => {
      if (live) setNouns(tokens.flatMap(t => d.byLemma.get(t) ?? []).filter(w => w.pos === 'noun').slice(0, 4));
    });
    return () => { live = false; };
  }, [de]);
  if (!nouns.length) return null;
  return (
    <div className="card rv-card reveal-in" style={{ padding: '14px 20px' }}>
      {nouns.map(w => (
        <div key={w.id} style={{ marginTop: 4 }}>
          <div className="t-head"><NounHead note={{ de: w.lemma, hy: w.hy, gender: w.gender, gender2: w.gender2, pluralOnly: w.pluralOnly }} /></div>
          <div className="t-sub l2"><span>{w.en[0]}</span>{w.plural && !w.pluralOnly ? <> · plural <span lang="de">die {w.plural}</span></> : null}</div>
        </div>
      ))}
      <div className="src" style={{ marginTop: 8 }}>Wiktionary</div>
    </div>
  );
}

function ListeningCard(p: CardViewProps & { audio: ReturnType<typeof useCardAudio> }) {
  const { note, revealed, audio, settings } = p;
  const isWord = note.kind === 'word';
  return (
    <div className="card rv-card">
      <h2 className="t-title2">What does it mean?</h2>
      <div className="win" style={{ marginTop: 16, padding: '26px 16px', display: 'grid', justifyItems: 'center', gap: 14 }}>
        <button type="button" className="rkey listen-key" onClick={() => audio.play()} aria-label="Play the German">
          <Icon name="play" />
        </button>
        <div style={{ display: 'flex', gap: 10 }}>
          <Chip icon="turtle" onClick={() => audio.play(true)}>Play slowly</Chip>
          {audio.plays > 0 && <span className="chip" style={{ background: 'transparent' }} aria-live="polite">Played {audio.plays}×</span>}
        </div>
        {audio.failed && <AudioError onRetry={() => audio.play()} onVoice={audio.useVoice} />}
      </div>
      <div className="src" style={{ marginTop: 12 }}>{audioLabel(note, settings.voice, audio.voiceOnly)}</div>
      {revealed && (
        <div className="reveal-in" style={{ marginTop: 16 }}>
          <div className={isWord ? 'de-head' : 'de-sent'} lang="de">
            {isWord && note.pos === 'noun' ? <NounHead note={note} /> : (note.hy ?? note.de)}
          </div>
          <div className="t-title3" style={{ marginTop: 8, fontWeight: 400 }}>{note.en.join('; ')}</div>
          <div className="src" style={{ marginTop: 8 }}><SourceLine note={note} /></div>
        </div>
      )}
    </div>
  );
}
