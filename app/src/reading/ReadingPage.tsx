// Reading library (design spec 5.5): texts sorted by how many of their words you know. The known-word
// percentage is the main fact on each row; a text is suggested at about 90% or more.
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { navigate } from '../lib/router';
import { Foot, Group, Key2, Lamp, LargeTitle, NavRow, Notice, Pad, Row, SectionHeader, type LampState } from '../ui/kit';
import { coverage, functionLemmas, knownLemmas, loadIndex, positions, SUGGEST_AT, tatoebaMeta, type Position, type TextMeta } from './data';

const STAGES: Record<number, string> = {
  1: 'Stage 1 · Tatoeba sentences',
  2: 'Stage 2 · Wikibooks dialogues',
  3: 'Stage 3 · Grimm fairy tales',
  4: 'Stage 4 · Heidi',
};

export function ReadingPage() {
  const [texts, setTexts] = useState<TextMeta[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const known = useLiveQuery(async () => ({ known: await knownLemmas(), fw: await functionLemmas() }), [], null);
  const pos = useLiveQuery(positions, [], {} as Record<string, Position>);
  const daily = useLiveQuery(tatoebaMeta, [], null);

  useEffect(() => {
    setError(false);
    loadIndex().then(setTexts, () => setError(true));
  }, [attempt]);

  if (error) {
    return (
      <>
        <NavRow />
        <LargeTitle title="Reading" />
        <Pad top={22}><Notice kind="err" title="Couldn't load the reading list">Check your internet connection, then try again.</Notice></Pad>
        <Pad><Key2 onClick={() => setAttempt(a => a + 1)}>Try again</Key2></Pad>
      </>
    );
  }

  const all = [...(daily ? [daily] : []), ...(texts ?? [])];
  const pct = (t: TextMeta) => (known ? coverage(t, known.known, known.fw) : 0);
  const suggested = all.filter(t => pct(t) >= SUGGEST_AT).sort((a, b) => pct(b) - pct(a));
  const closest = [...all].sort((a, b) => pct(b) - pct(a))[0];
  const firstUnread = suggested.find(t => !pos[t.id]?.done)?.id;

  const row = (t: TextMeta) => {
    const p = pos[t.id];
    const lamp: LampState = p?.done ? 'done' : p ? 'part' : t.id === firstUnread ? 'on' : 'off';
    const length = t.id === 'tatoeba' ? `Tatoeba · ${t.words} words · a new set each day` : [t.author, t.year, `${t.words} words`].filter(Boolean).join(' · ');
    const extra = [t.historicalSpelling ? 'historical spelling' : null, t.audio ? 'recording' : null, p?.done ? 'read' : p ? 'position saved' : null].filter(Boolean).join(' · ');
    return (
      <Row key={t.id} lamp={lamp} lampLabel={p?.done ? 'read' : p ? 'in progress' : t.id === firstUnread ? 'suggested next' : 'not started'}
        title={<span lang={t.id === 'tatoeba' ? 'en' : 'de'}>{t.title}</span>} sub={extra ? `${length} · ${extra}` : length}
        trailing={<div className="pct">{known ? `${Math.round(pct(t) * 100)}%` : '–'}<small>known</small></div>}
        onClick={() => navigate({ name: 'text', id: t.id })} label={`${t.title}, ${Math.round(pct(t) * 100)}% of words known`} />
    );
  };

  const stages = [1, 2, 3, 4].map(n => ({ n, items: all.filter(t => t.stage === n) })).filter(s => s.items.length);

  return (
    <>
      <NavRow />
      <LargeTitle title="Reading" sub="Sorted by how many of the words you know" />
      {!texts && <Group style={{ marginTop: 20 }}>{[50, 40].map(w => <div className="cl" key={w}><div className="ct"><div className="skel" style={{ width: `${w}%` }} /></div></div>)}</Group>}
      {texts && (
        <>
          <SectionHeader left={`Suggested · ${Math.round(SUGGEST_AT * 100)}% or more known`} />
          {suggested.length ? <Group>{suggested.map(row)}</Group> : (
            <Pad top={0}>
              <div className="card" style={{ margin: 0, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Lamp state="off" label="nothing suggested" /><h2 className="t-title3">Nothing suggested yet</h2></div>
                <p className="t-body l2" style={{ margin: '8px 0 0' }}>
                  No text has {Math.round(SUGGEST_AT * 100)}% or more known words yet. A word counts as known once its card comes back after 21 days or more, or when you mark it known while reading.
                  {closest ? ` The closest is below at ${Math.round(pct(closest) * 100)}%; every text can still be opened.` : ''}
                </p>
              </div>
            </Pad>
          )}
          {stages.map(s => (
            <div key={s.n}>
              <SectionHeader left={STAGES[s.n]} />
              <Group>{s.items.sort((a, b) => pct(b) - pct(a)).map(row)}</Group>
            </div>
          ))}
          {!daily && <Foot>Stage 1 starts once you have studied a few words: it picks Tatoeba sentences in which you have studied every word but one.</Foot>}
          <Foot>No free A2–B1 texts with English have been found yet, so the step from stage 2 to stage 3 is a jump. Articles, pronouns, prepositions and conjunctions count as known.</Foot>
        </>
      )}
    </>
  );
}
