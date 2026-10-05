// A grammar topic (design spec 5.4): its status, the outside explanations and exercises, and its table.
import { useState } from 'react';
import { openExternal } from '../lib/dictionaries';
import { navigate } from '../lib/router';
import { BackButton, DetailTitle, Foot, Group, Key2, NavRow, Row, Seg, SectionHeader } from '../ui/kit';
import { rememberBlankTopics, setTopicStatus, useGrammar, useTopicStatuses, type Blank, type TopicStatus } from './data';

const BLANK_TEXT: Record<Blank, string> = {
  article: 'articles', preposition: 'prepositions', verb: 'the conjugated verb', adjective: 'adjective endings',
};

export function TopicPage({ id }: { id: string }) {
  const { data } = useGrammar();
  const statuses = useTopicStatuses();
  const [opened, setOpened] = useState<string | null>(null);
  const nav = <NavRow left={<BackButton label="Grammar" to={{ name: 'grammar' }} />} />;
  if (!data) return nav;
  const topic = data.topics.find(t => t.id === id);
  if (!topic) return <>{nav}<DetailTitle title="Topic not found" /></>;

  const status = statuses[id] ?? 'none';
  const lessons = topic.lessons.map(l => data.lessons.find(x => x.id === l)).filter(Boolean) as typeof data.lessons;
  const first = lessons[0];
  const table = topic.table ? data.tables.find(t => t.id === topic.table) : undefined;
  const set = (s: TopicStatus) => {
    void setTopicStatus(id, s);
    if (s === 'practiced') void rememberBlankTopics(data);
  };
  const open = (name: string, url: string) => { openExternal(url); if (status === 'none') setOpened(name); };

  return (
    <>
      {nav}
      <DetailTitle title={topic.title} lang={topic.lang} sub={first ? <>{first.level} · {first.chapter} · lesson <span lang="de">{first.title}</span></> : topic.level} />
      <div style={{ padding: '14px 16px 0' }}>
        <Seg label="Status" value={status} onChange={set}
          options={[{ value: 'none', label: 'Not started' }, { value: 'read', label: 'Read' }, { value: 'practiced', label: 'Practiced' }]} />
      </div>
      {topic.blank && <Foot>Marking it Practiced adds fill-in-the-blank cards for {BLANK_TEXT[topic.blank]} to your new cards.</Foot>}

      <SectionHeader left="Explanations and exercises" />
      <Group>
        {lessons.map(l => (
          <Row key={l.id} icon="ext" title="Nicos Weg lesson" sub={<>DW · <span lang="de">{l.title}</span></>} onClick={() => open('the Nicos Weg lesson', l.url)} />
        ))}
        {topic.grimm && <Row icon="ext" title="Grimm Grammar" sub={`University of Texas at Austin · ${topic.grimm.title}`} onClick={() => open('Grimm Grammar', topic.grimm!.url)} />}
        {topic.schubert && <Row icon="ext" title="Exercises" sub={`Schubert-Verlag, online · ${topic.schubert.title}`} onClick={() => open('the exercises', topic.schubert!.url)} />}
        {opened && status === 'none' && (
          <div className="inline">
            <div className="t-sub">You opened {opened}. Mark this topic read?</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
              <Key2 style={{ flex: 1, height: 44 }} onClick={() => { set('read'); setOpened(null); }}>Mark read</Key2>
              <Key2 style={{ flex: 1, height: 44 }} onClick={() => setOpened(null)}>Not yet</Key2>
            </div>
          </div>
        )}
      </Group>
      {!topic.grimm && !topic.schubert && <Foot>No matching Grimm Grammar page or Schubert-Verlag exercise was found for this topic.</Foot>}

      {table && (
        <>
          <SectionHeader left="Reference" />
          <Group><Row icon="grammar" title={table.title} sub={table.sub} chevron onClick={() => navigate({ name: 'table', id: table.id })} /></Group>
        </>
      )}
    </>
  );
}
