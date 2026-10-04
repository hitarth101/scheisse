import { BUILD_ID } from '../lib/version';
import { BackButton, DetailTitle, Foot, Group, NavRow, SectionHeader } from '../ui/kit';
import { Icon } from '../ui/icons';

const SOURCES: { name: string; what: string; url: string }[] = [
  { name: 'Language Transfer', what: 'Complete German audio and the volunteer transcript', url: 'https://www.languagetransfer.org/' },
  { name: 'Tatoeba', what: 'Sentences and some recordings · CC BY 2.0 FR', url: 'https://tatoeba.org/' },
  { name: 'Wiktionary', what: 'Meanings, gender, plurals, word forms · CC BY-SA 4.0, via kaikki.org', url: 'https://en.wiktionary.org/' },
  { name: 'Goethe-Institut', what: 'A1, A2, B1 word lists', url: 'https://www.goethe.de/' },
  { name: 'Leibniz-Institut für Deutsche Sprache', what: 'DeReWo frequency list, used for the order of new words', url: 'https://www.ids-mannheim.de/digspra/kl/projekte/methoden/derewo/' },
];

/** Attributions the open licences require, in one place (design spec 5.7). */
export function CreditsPage() {
  return (
    <>
      <NavRow left={<BackButton label="Status" to={{ name: 'status' }} />} />
      <DetailTitle title="Sources and credits" />
      <SectionHeader left="Content" />
      <Group flush>
        {SOURCES.map(s => (
          <a key={s.name} className="cl" href={s.url} target="_blank" rel="noopener noreferrer">
            <div className="ct"><b>{s.name}</b><span>{s.what}</span></div>
            <Icon name="ext" className="ext" />
          </a>
        ))}
      </Group>
      <Foot>Every word and sentence in the app comes from one of these sources and keeps a note of where it came from. Nothing is machine-translated.</Foot>
      <SectionHeader left="App" />
      <Group flush>
        <div className="cl"><div className="ct"><b>Scheiße</b><span>Version {BUILD_ID} · icon letter from Inter (SIL Open Font License)</span></div></div>
      </Group>
    </>
  );
}
