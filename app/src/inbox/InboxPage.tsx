// Inbox (design spec 5.6): phrases heard on TV, each with what the source check found.
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { contentData } from '../content/load';
import type { SentenceRow, WordRow } from '../db/db';
import { openDictionary } from '../lib/dictionaries';
import { shortDate } from '../lib/format';
import { navigate } from '../lib/router';
import { NounHead } from '../ui/German';
import { BackButton, Chip, DetailTitle, Foot, GoKey, Group, Key2, Lamp, NavRow, Pad, RKey, Row, SectionHeader, Sheet, showToast } from '../ui/kit';
import { checkPending, deleteItem, inboxItems, makeCard, wrongMatch, type InboxItem } from './inbox';

type Found = { item: InboxItem; sentence?: SentenceRow; word?: WordRow };

export function InboxPage() {
  const items = useLiveQuery(inboxItems, [], null);
  const [open, setOpen] = useState<Found | null>(null);
  useEffect(() => { void checkPending(); }, []);

  const capture = <RKey icon="plus" label="Capture a phrase" onClick={() => navigate({ name: 'capture' })} />;
  const nav = <NavRow left={<BackButton label="Flashcards" to={{ name: 'flashcards' }} />} right={capture} />;
  if (!items) return nav;

  const waiting = items.filter(i => i.state !== 'done');
  const done = items.length - waiting.length;
  const when = (i: InboxItem) => [i.show, shortDate(new Date(i.at))].filter(Boolean).join(' · ');

  const review = async (item: InboxItem) => {
    const data = await contentData();
    const m = item.match!;
    setOpen({
      item,
      sentence: m.kind === 'sentence' ? data.sentences.find(s => s.id === m.id) : undefined,
      word: m.kind === 'word' ? data.words.find(w => w.id === m.id) : undefined,
    });
  };

  const remove = async (item: InboxItem) => {
    await deleteItem(item);
    setOpen(null);
    showToast('Phrase deleted');
  };

  return (
    <>
      {nav}
      <DetailTitle title="Inbox" sub="Phrases you heard, waiting to be checked" />
      {waiting.length === 0 ? (
        <>
          <Pad top={22}>
            <div className="card" style={{ margin: 0, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><Lamp state="off" label="nothing waiting" /><h2 className="t-title3">Nothing waiting</h2></div>
              <p className="t-body l2" style={{ margin: '8px 0 0' }}>When you hear a phrase on TV, tap + and type it as you heard it. Spelling can be rough; it gets checked against the sources.</p>
            </div>
          </Pad>
          <Pad><Key2 icon="plus" onClick={() => navigate({ name: 'capture' })}>Capture a phrase</Key2></Pad>
        </>
      ) : (
        <>
          <SectionHeader left={`To check · ${waiting.length}`} />
          <Group>
            {waiting.map(item => item.state === 'match' ? (
              <Row key={item.key} lamp="on" lampLabel="match found" lang="de" title={item.text}
                sub={<span lang="en">Match found with English · {when(item)}</span>}
                trailing={<Chip onClick={() => void review(item)}>Review</Chip>} onClick={() => void review(item)} />
            ) : (
              <div key={item.key} className="cl" style={{ alignItems: 'flex-start' }}>
                <span style={{ marginTop: 16 }}><Lamp state="off" label={item.state === 'pending' ? 'not checked yet' : 'no match'} /></span>
                <div className="ct">
                  <b lang="de">{item.text}</b>
                  <span>{item.state === 'pending'
                    ? "Not checked yet: the word data isn't on this iPhone. It is checked when you next open the Inbox online."
                    : `No source translation · ask your tutor · ${when(item)}`}</span>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    {item.state === 'none' && <Chip icon="ext" onClick={() => openDictionary('dictcc', item.text)}>Dictionary</Chip>}
                    <Chip onClick={() => void remove(item)}>Delete</Chip>
                  </div>
                </div>
              </div>
            ))}
          </Group>
        </>
      )}
      {done > 0 && (
        <>
          <SectionHeader left="Done" style={{ paddingTop: 24 }} />
          <Group flush><Row title={`${done} turned into cards`} /></Group>
        </>
      )}
      <Foot>Phrases stay here until you act on them. Nothing is translated by machine.</Foot>

      {open && (
        <Sheet label="Is this what you heard?" onClose={() => setOpen(null)}>
          <h2 className="t-title3">Is this what you heard?</h2>
          <div className="t-sub l2" style={{ marginTop: 4 }}>You wrote <span lang="de" style={{ color: 'var(--label)', fontWeight: 600 }}>{open.item.text}</span></div>
          <div className="win" style={{ marginTop: 12 }}>
            {open.sentence && <>
              <div className="t-head" lang="de">{open.sentence.de}</div>
              <div className="t-sub l2" style={{ marginTop: 4 }}>{open.sentence.en}</div>
              <div className="src" style={{ marginTop: 8 }}>Tatoeba {open.sentence.id}</div>
            </>}
            {open.word && <>
              <div className="t-head">{open.word.pos === 'noun' ? <NounHead note={{ de: open.word.lemma, gender: open.word.gender, gender2: open.word.gender2, pluralOnly: open.word.pluralOnly }} /> : <span lang="de">{open.word.lemma}</span>}</div>
              <div className="t-sub l2" style={{ marginTop: 4 }}>{open.word.en.slice(0, 3).join('; ')}</div>
              <div className="src" style={{ marginTop: 8 }}>Goethe {open.word.level} · Wiktionary</div>
            </>}
          </div>
          <div className="acts">
            <GoKey center onClick={() => void makeCard(open.item).then(() => { setOpen(null); showToast('Card made. It comes first among new cards.'); })}>
              {open.word ? 'Make a word card' : 'Make a sentence card'}
            </GoKey>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Key2 onClick={() => void wrongMatch(open.item).then(() => setOpen(null))}>Wrong match</Key2>
              <Key2 onClick={() => void remove(open.item)}>Delete</Key2>
            </div>
          </div>
        </Sheet>
      )}
    </>
  );
}
