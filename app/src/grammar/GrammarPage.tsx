// Grammar (product spec 4.4, design spec 5.4): the topic path in Nicos Weg order, the Nicos Weg lessons
// themselves (owner decision 2026-10-04: with no sessions, lesson progress lives here), and reference tables.
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { getMeta, setMeta } from '../db/settings';
import { openExternal } from '../lib/dictionaries';
import { navigate } from '../lib/router';
import { Chip, Foot, Group, Key2, LargeTitle, NavRow, Notice, Pad, Row, Seg, SectionHeader, type LampState } from '../ui/kit';
import { setLessonDone, useGrammar, useLessonsDone, useTopicStatuses, type GrammarData, type Lesson, type TopicStatus } from './data';

type View = 'topics' | 'lessons' | 'tables';
let rememberedView: View = 'topics';

export function topicLamp(status: TopicStatus | undefined, next: boolean): LampState {
  if (status === 'practiced') return 'done';
  if (status === 'read') return 'part';
  return next ? 'on' : 'off';
}

const STATUS_TEXT: Record<TopicStatus, string> = { none: '', read: 'read', practiced: 'practiced' };

export function GrammarPage() {
  const { data, error, retry } = useGrammar();
  const statuses = useTopicStatuses();
  const done = useLessonsDone();
  const [view, setView] = useState<View>(rememberedView);
  const change = (v: View) => { rememberedView = v; setView(v); };

  if (error) {
    return (
      <>
        <NavRow />
        <LargeTitle title="Grammar" />
        <Pad top={22}><Notice kind="err" title="Couldn't load the grammar list">Check your internet connection, then try again. Your progress is safe on this iPhone.</Notice></Pad>
        <Pad><Key2 onClick={retry}>Try again</Key2></Pad>
      </>
    );
  }

  const read = Object.values(statuses).filter(s => s !== 'none').length;
  const sub = !data ? 'Nicos Weg order' : view === 'lessons' ? `Nicos Weg · ${data.lessons.filter(l => done.has(l.id)).length} of ${data.lessons.length} lessons done`
    : view === 'tables' ? 'Reference tables' : `Nicos Weg order · ${read} of ${data.topics.length} topics read`;

  return (
    <>
      <NavRow />
      <LargeTitle title="Grammar" sub={sub} />
      <div style={{ padding: '12px 16px 0' }}>
        <Seg label="Grammar view" value={view} onChange={change}
          options={[{ value: 'topics', label: 'Topics' }, { value: 'lessons', label: 'Lessons' }, { value: 'tables', label: 'Tables' }]} />
      </div>
      {!data ? (
        <Group style={{ marginTop: 20 }}>{[50, 40, 60].map(w => <div className="cl" key={w}><div className="ct"><div className="skel" style={{ width: `${w}%` }} /></div></div>)}</Group>
      ) : view === 'topics' ? <Topics data={data} statuses={statuses} />
        : view === 'lessons' ? <Lessons data={data} done={done} />
        : <Tables data={data} />}
    </>
  );
}

/** Chapters in course order, each with the items whose first lesson is in it. */
function byChapter<T>(data: GrammarData, items: T[], lessonOf: (t: T) => string): { title: string; items: T[] }[] {
  const index = new Map(data.lessons.map((l, i) => [l.id, i]));
  const groups = new Map<string, T[]>();
  const order = new Map<string, number>();
  for (const it of items) {
    const l = data.lessons[index.get(lessonOf(it)) ?? 0];
    const key = `${l.level} · ${l.chapter}`;
    groups.set(key, [...(groups.get(key) ?? []), it]);
    order.set(key, Math.min(order.get(key) ?? Infinity, index.get(l.id) ?? 0));
  }
  return [...groups.entries()].sort((a, b) => order.get(a[0])! - order.get(b[0])!).map(([title, items]) => ({ title, items }));
}

function Topics({ data, statuses }: { data: GrammarData; statuses: Record<string, TopicStatus> }) {
  const lessonTitle = new Map(data.lessons.map(l => [l.id, l.title]));
  const next = data.topics.find(t => !statuses[t.id] || statuses[t.id] === 'none')?.id;
  if (!data.topics.length) return <Foot>The topic list isn't available in this version.</Foot>;
  return (
    <>
      {byChapter(data, data.topics, t => t.lessons[0]).map(g => (
        <div key={g.title}>
          <SectionHeader left={g.title} />
          <Group>
            {g.items.map(t => {
              const st = statuses[t.id] ?? 'none';
              return (
                <Row key={t.id} lamp={topicLamp(st, t.id === next)} done={st === 'practiced'} title={t.title} chevron
                  sub={<><span lang="de">{t.lessons.map(id => lessonTitle.get(id)).filter(Boolean).slice(0, 3).join(' · ')}</span>{st !== 'none' ? ` · ${STATUS_TEXT[st]}` : t.id === next ? ' · next' : ''}</>}
                  onClick={() => navigate({ name: 'topic', id: t.id })} />
              );
            })}
          </Group>
        </div>
      ))}
      <Foot>Topic and lesson names are DW's own, in the order Nicos Weg teaches them. The lessons open on DW's website.</Foot>
    </>
  );
}

function Lessons({ data, done }: { data: GrammarData; done: Set<string> }) {
  // "Mark it done?" stays inline until answered (design spec 11.1), also after the app was closed.
  const asking = useLiveQuery(() => getMeta<string>('lessonAsk'), [], undefined);
  const next = data.lessons.find(l => !done.has(l.id))?.id;
  const open = (l: Lesson) => {
    openExternal(l.url);
    if (!done.has(l.id)) void setMeta('lessonAsk', l.id);
  };
  const answer = (l: Lesson, yes: boolean) => {
    void setMeta('lessonAsk', null);
    if (yes) void setLessonDone(l.id, true);
  };
  return (
    <>
      {byChapter(data, data.lessons, l => l.id).map(g => (
        <div key={g.title}>
          <SectionHeader left={g.title} />
          <Group>
            {g.items.map(l => (
              <div key={l.id}>
                <Row lamp={done.has(l.id) ? 'done' : l.id === next ? 'on' : 'off'} done={done.has(l.id)} lang="de" title={l.title} external
                  sub={<span lang="en">{[l.subtitle, done.has(l.id) ? 'done' : l.id === next ? 'next' : null].filter(Boolean).join(' · ')}</span>}
                  onClick={() => open(l)} label={`${l.title}, opens on DW`} />
                {asking === l.id && (
                  <div className="inline">
                    <div className="t-sub">You opened this lesson. Mark it done?</div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                      <Key2 style={{ flex: 1, height: 44 }} onClick={() => answer(l, true)}>Mark done</Key2>
                      <Key2 style={{ flex: 1, height: 44 }} onClick={() => answer(l, false)}>Not yet</Key2>
                    </div>
                  </div>
                )}
                {done.has(l.id) && asking !== l.id && (
                  <div className="inline" style={{ paddingTop: 0, borderTop: 0 }}>
                    <Chip onClick={() => void setLessonDone(l.id, false)}>Mark not done</Chip>
                  </div>
                )}
              </div>
            ))}
          </Group>
        </div>
      ))}
      <Foot>Nicos Weg is DW's free course. Lessons open in Safari; progress is kept here.</Foot>
    </>
  );
}

function Tables({ data }: { data: GrammarData }) {
  const groups = ['Articles and pronouns', 'Prepositions and endings', 'Verbs'] as const;
  return (
    <>
      {groups.map(g => (
        <div key={g}>
          <SectionHeader left={g} />
          <Group>
            {data.tables.filter(t => t.group === g).map(t => (
              <Row key={t.id} title={t.title} sub={t.sub} chevron onClick={() => navigate({ name: 'table', id: t.id })} />
            ))}
          </Group>
        </div>
      ))}
      <Foot>Every form in these tables is copied from Wiktionary or the Wikibooks German course.</Foot>
    </>
  );
}
