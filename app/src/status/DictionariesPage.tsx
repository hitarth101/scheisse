// Dictionaries (design spec 5.7): outside links, opened with the word typed here, or at their front page.
import { useRef, useState } from 'react';
import { DICTIONARIES, openDictionary, type DictionaryKey } from '../lib/dictionaries';
import { GermanKeys } from '../ui/GermanKeys';
import { BackButton, DetailTitle, Foot, Group, NavRow, Row, SectionHeader } from '../ui/kit';

export function DictionariesPage() {
  const [word, setWord] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <NavRow left={<BackButton label="Status" to={{ name: 'status' }} />} />
      <DetailTitle title="Dictionaries" sub="Outside websites. They open in Safari." />
      <div style={{ padding: '16px 16px 0' }}>
        <input ref={ref} className="field" type="search" lang="de" value={word} onChange={e => setWord(e.currentTarget.value)}
          placeholder="Word to look up (optional)" aria-label="Word to look up" autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} />
        <GermanKeys target={ref} />
      </div>
      <SectionHeader left="Open in" />
      <Group>
        {(Object.keys(DICTIONARIES) as DictionaryKey[]).map(k => (
          <Row key={k} title={DICTIONARIES[k].name} sub={DICTIONARIES[k].sub} external onClick={() => openDictionary(k, word)} />
        ))}
      </Group>
      <Foot>The app only links to these dictionaries; nothing from them is copied into your cards.</Foot>
    </>
  );
}
