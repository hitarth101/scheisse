// Reading view (design spec 5.5). Tap a sentence: its English appears beneath it (or the paragraph's, where
// the old translation doesn't line up sentence by sentence). Tap a word in that sentence: its popup.
// Long-press a sentence: add it as a card. The iPhone voice can read the text aloud. Position is saved.
import { Fragment, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { contentData } from '../content/load';
import { db, type NoteRow } from '../db/db';
import { useSettings } from '../db/settings';
import { addTime } from '../db/time';
import { tick } from '../lib/device';
import { openDictionary } from '../lib/dictionaries';
import { speak, stopSpeaking } from '../lib/speech';
import { pauseForOtherAudio } from '../lectures/player';
import { addNote, sentenceNote, wordNote } from '../review/notes';
import { NounHead } from '../ui/German';
import { GermanKeys } from '../ui/GermanKeys';
import { Icon } from '../ui/icons';
import { BackButton, Chip, DetailTitle, Foot, GoKey, Key2, NavRow, Notice, Pad, RKey, Sheet, showToast } from '../ui/kit';
import { coverage, functionLemmas, getPosition, knownLemmas, loadIndex, loadText, markKnown, savePosition, TATOEBA_SET, TOKEN, type Gloss, type ReadingText } from './data';

type Active = { p: number; s: number | 'para' } | null;

export function TextPage({ id }: { id: string }) {
  const settings = useSettings();
  const [text, setText] = useState<ReadingText | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [active, setActive] = useState<Active>(null);
  const [popup, setPopup] = useState<{ tok: string; at: string; gloss?: Gloss } | null>(null);
  const [adding, setAdding] = useState<{ p: number; s: number } | null>(null);
  const [reading, setReading] = useState(false);
  const [pct, setPct] = useState<number | null>(null);
  const noteIds = useLiveQuery(async () => new Set(await db.notes.toCollection().primaryKeys()), [], new Set<string>());
  const known = useLiveQuery(knownLemmas, [], new Set<string>());
  const readingRun = useRef(0);
  const recording = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let live = true;
    setError(false);
    loadText(id).then(async t => {
      if (!live) return;
      setText(t);
      const pos = await getPosition(id);
      // Back to the saved paragraph, clear of the status bar.
      if (pos?.p) requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(`[data-p="${pos.p}"]`);
        if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 90);
      });
    }, () => { if (live) setError(true); });
    return () => { live = false; };
  }, [id, attempt]);

  // Known-word percentage for the subtitle (same numbers as the library).
  useEffect(() => {
    void (async () => {
      const fw = await functionLemmas();
      if (id === TATOEBA_SET || !text) return;
      const meta = (await loadIndex()).find(t => t.id === id);
      if (meta) setPct(coverage(meta, known, fw));
    })().catch(() => {});
  }, [id, text, known]);

  // Position: the first paragraph at the top of the screen, saved as you scroll; the end counts as read.
  useEffect(() => {
    if (!text) return;
    let timer: number | undefined;
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const paras = [...document.querySelectorAll<HTMLElement>('[data-p]')];
        const first = paras.find(el => el.getBoundingClientRect().bottom > 80);
        const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 40;
        void savePosition(id, Number(first?.dataset.p ?? 0), atEnd);
      }, 600);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); window.clearTimeout(timer); };
  }, [id, text]);

  // Reading time (product spec 4.7): counted while the page is open and in use, idle time left out.
  useEffect(() => {
    let last = Date.now();
    const touch = () => { last = Date.now(); };
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - last < 120_000) void addTime('reading', 15);
    }, 15_000);
    window.addEventListener('scroll', touch, { passive: true });
    window.addEventListener('pointerdown', touch);
    return () => { window.clearInterval(t); window.removeEventListener('scroll', touch); window.removeEventListener('pointerdown', touch); };
  }, []);

  useEffect(() => () => { readingRun.current++; stopSpeaking(); recording.current?.pause(); }, []);

  const toggleReading = async () => {
    if (reading) { readingRun.current++; stopSpeaking(); recording.current?.pause(); setReading(false); return; }
    if (!text) return;
    pauseForOtherAudio();
    // A LibriVox reading, when the text has one; otherwise the iPhone voice.
    if (text.audio) {
      const a = recording.current ?? (recording.current = new Audio(text.audio.url));
      a.onended = () => setReading(false);
      a.onerror = () => { setReading(false); showToast("Couldn't play the recording. Check your internet connection."); };
      setReading(true);
      try { await a.play(); } catch { setReading(false); showToast("Couldn't play the recording. Check your internet connection."); }
      return;
    }
    const run = ++readingRun.current;
    setReading(true);
    const start = Number((await getPosition(id))?.p ?? 0);
    try {
      for (const para of text.paragraphs.slice(start)) {
        for (const s of para.de) {
          if (readingRun.current !== run) return;
          await speak(s, { voice: settings.voice, rate: settings.voiceRate });
        }
      }
    } catch {
      showToast("Couldn't use the iPhone voice. Check Settings, Accessibility, Spoken Content, Voices, German.");
    } finally {
      if (readingRun.current === run) setReading(false);
    }
  };

  const nav = (
    <NavRow left={<BackButton label="Reading" to={{ name: 'reading' }} />}
      right={<RKey icon={reading ? 'pause' : text?.audio ? 'play' : 'speaker'}
        label={reading ? (text?.audio ? 'Pause the recording' : 'Stop reading aloud') : text?.audio ? `Play the LibriVox recording, read by ${text.audio.reader}` : 'Read aloud with the iPhone voice'}
        onClick={() => void toggleReading()} disabled={!text} />} />
  );

  if (error) {
    return (
      <>
        {nav}
        <Pad top={22}><Notice kind="err" title="Couldn't load this text">Check your internet connection, then try again. Your reading position is saved.</Notice></Pad>
        <Pad><Key2 onClick={() => setAttempt(a => a + 1)}>Try again</Key2></Pad>
      </>
    );
  }
  if (!text) return <>{nav}<Pad top={22}><div className="skel" style={{ height: 160 }} /></Pad></>;

  const sub = [text.author, text.year, pct != null ? `${Math.round(pct * 100)}% known` : null].filter(Boolean).join(' · ');
  const tap = (p: number, s: number, target: EventTarget) => {
    const para = text.paragraphs[p];
    const key: Active = para.en ? { p, s } : { p, s: 'para' };
    const isActive = active && active.p === p && (active.s === 'para' || active.s === s);
    const tok = (target as HTMLElement).closest?.('[data-tok]') as HTMLElement | null;
    if (isActive && tok) {
      const t = tok.dataset.tok!;
      setPopup({ tok: t, at: tok.dataset.at!, gloss: text.gloss[t] ?? text.gloss[t.toLowerCase()] });
      return;
    }
    setActive(isActive ? null : key);
  };

  return (
    <>
      {nav}
      <DetailTitle lang={id === TATOEBA_SET ? 'en' : 'de'} title={text.title} sub={sub} />
      {text.historicalSpelling && (
        <div style={{ padding: '10px 16px 6px' }}><span className="chip" style={{ cursor: 'default' }}><Icon name="info" />Historical spelling: some words are spelled differently today</span></div>
      )}
      <p className="t-sub l2" style={{ margin: '8px 22px 0' }}>Tap a sentence for its English, then a word in it for its meaning. Hold a sentence to add it as a card.</p>
      <div className="text de-read" lang="de" style={{ paddingTop: 14 }}>
        {text.paragraphs.map((para, pi) => (
          <div key={pi} data-p={pi}>
            <p>
              {para.de.map((sent, si) => {
                const on = !!active && active.p === pi && (active.s === 'para' || active.s === si);
                return (
                  <Fragment key={si}>
                    <Sentence text={sent} on={on} at={`${pi}:${si}`} hit={popup?.at}
                      onTap={target => tap(pi, si, target)} onHold={() => { tick(); setAdding({ p: pi, s: si }); }} />
                    {on && para.en && <span className="en-line" lang="en">{para.en[si]}</span>}
                    {' '}
                  </Fragment>
                );
              })}
            </p>
            {active?.p === pi && active.s === 'para' && (
              <>
                <div className="para-en" lang="en">{para.enPara ?? 'The translation has no English for this paragraph.'}</div>
                <p className="t-foot l2" lang="en" style={{ margin: '-10px 0 18px' }}>Here the German and English sentences don't line up one to one, so the English is shown for the whole paragraph.</p>
              </>
            )}
          </div>
        ))}
      </div>
      <Foot>
        {id === TATOEBA_SET ? 'Sentences and translations: Tatoeba (CC BY 2.0 FR). A new set each day.'
          : `German: ${text.de?.source ?? ''}${text.de?.license ? `, ${text.de.license}` : ''}. English: ${[text.en?.translator, text.en?.year, text.en?.source].filter(Boolean).join(', ')}${text.en?.license ? `, ${text.en.license}` : ''}.`}
        {text.audio ? ` Recording: LibriVox, read by ${text.audio.reader}${text.audio.duration ? `, ${text.audio.duration}` : ''} (public domain); it may follow a slightly different edition.` : ''}
      </Foot>

      {popup && <WordSheet popup={popup} text={text} noteIds={noteIds} known={known} onClose={() => setPopup(null)} />}
      {adding && <AddSentenceSheet text={text} at={adding} onClose={() => setAdding(null)} />}
    </>
  );
}

/** One sentence, its words as tappable spans. Long-press (500 ms, cancelled by 10 pt of movement) adds it. */
function Sentence({ text, on, at, hit, onTap, onHold }: { text: string; on: boolean; at: string; hit?: string; onTap: (t: EventTarget) => void; onHold: () => void }) {
  const timer = useRef<number | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  const held = useRef(false);
  const parts: React.ReactNode[] = [];
  let last = 0, n = 0;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index! > last) parts.push(text.slice(last, m.index));
    const key = `${at}:${n++}`;
    parts.push(<span key={key} className={'w' + (hit === key ? ' w-hit' : '')} data-tok={m[0]} data-at={key}>{m[0]}</span>);
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  const cancel = () => { window.clearTimeout(timer.current); start.current = null; };
  return (
    <span className={'s' + (on ? ' on' : '')} role="button" tabIndex={0}
      onPointerDown={e => {
        held.current = false;
        start.current = { x: e.clientX, y: e.clientY };
        timer.current = window.setTimeout(() => { held.current = true; onHold(); }, 500);
      }}
      onPointerMove={e => { if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) cancel(); }}
      onPointerUp={cancel} onPointerCancel={cancel} onContextMenu={e => e.preventDefault()}
      onClick={e => { if (held.current) { held.current = false; return; } onTap(e.target); }}
      onKeyDown={e => { if (e.key === 'Enter') onTap(e.target); }}>
      {parts}
    </span>
  );
}

function WordSheet({ popup, text, noteIds, known, onClose }: { popup: { tok: string; gloss?: Gloss }; text: ReadingText; noteIds: Set<string>; known: Set<string>; onClose: () => void }) {
  const settings = useSettings();
  const g = popup.gloss;
  if (!g || g.nm) {
    return (
      <Sheet label="Word" onClose={onClose}>
        <div className="de-head" style={{ fontSize: '2rem' }} lang="de">{popup.tok}</div>
        <p className="t-sub l2" style={{ margin: '4px 0 0' }}>{g?.nm ? 'A name.' : "This word isn't in the app's dictionary data."}</p>
        {g?.en.length ? <ol className="t-body" style={{ margin: '12px 0 0', paddingLeft: 20, lineHeight: 1.45 }}>{g.en.map(m => <li key={m}>{m}</li>)}</ol> : null}
        <div className="acts"><Key2 icon="ext" onClick={() => openDictionary('dictcc', popup.tok)}>Dictionary</Key2><Key2 onClick={onClose}>Close</Key2></div>
      </Sheet>
    );
  }
  const noteId = g.w ? `w:${g.w}` : `w:${g.l}${g.g ? `|${g.g}` : ''}`;
  const isCard = noteIds.has(noteId);
  const isKnown = known.has(g.l);
  const add = async () => {
    const now = Date.now();
    let note: NoteRow;
    if (g.w) {
      const w = (await contentData()).words.find(x => x.id === g.w);
      if (!w) return;
      note = wordNote(w, now);
    } else {
      note = { id: noteId, kind: 'word', de: g.l, en: g.en, pos: g.p, gender: g.g, plural: g.pl ?? null, pluralOnly: !!g.po, forms: g.f,
        source: 'Wiktionary · from reading', sourceRef: text.title, createdAt: now };
    }
    await addNote(note, now);
    showToast('Card made. It comes first among new cards.');
    onClose();
  };
  return (
    <Sheet label={`Word: ${g.l}`} onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div className="de-head" style={{ fontSize: '2rem' }} lang="de">{g.p === 'noun' ? <NounHead note={{ de: g.l, gender: g.g, pluralOnly: !!g.po }} /> : g.l}</div>
        <RKey icon="speaker" label="Play the word" onClick={() => void speak(g.l, { voice: settings.voice, rate: settings.voiceRate }).catch(() => {})} />
      </div>
      <div className="t-sub l2" style={{ marginTop: 2 }}>
        {g.p}{g.pl && !g.po ? <> · plural <span lang="de" style={{ color: 'var(--label)' }}>die {g.pl}</span></> : null}
        {popup.tok !== g.l ? <> · in the text: <span lang="de" style={{ color: 'var(--label)' }}>{popup.tok}</span></> : null}
      </div>
      {g.f && (
        <table className="rtable" style={{ marginTop: 10 }}><tbody lang="de">
          <tr><th scope="row" lang="en">Present</th><td>{g.f[0]}</td></tr>
          <tr><th scope="row" lang="en">Past</th><td>{g.f[1]}</td></tr>
          <tr><th scope="row" lang="en">Perfect</th><td>{g.f[2]}</td></tr>
        </tbody></table>
      )}
      <ol className="t-body" style={{ margin: '10px 0 0', paddingLeft: 20, lineHeight: 1.45 }}>{g.en.map(m => <li key={m}>{m}</li>)}</ol>
      <div className="src" style={{ marginTop: 8 }}>{g.w ? 'Goethe word list · Wiktionary' : 'Wiktionary'}</div>
      {g.fw && <p className="t-sub l2" style={{ margin: '8px 0 0' }}>Articles, pronouns, prepositions and conjunctions get no word card; they come up in sentence cards.</p>}
      <div className="acts" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <GoKey center onClick={() => void add()} disabled={isCard || !!g.fw}>{isCard ? 'Already a card' : 'Add as card'}</GoKey>
        </div>
        <Key2 onClick={() => void markKnown(g.l, !isKnown).then(() => showToast(isKnown ? 'No longer marked known' : 'Marked as known'))}>{isKnown ? 'Unmark known' : 'Mark as known'}</Key2>
        <Key2 icon="ext" onClick={() => openDictionary('dictcc', g.l)}>Dictionary</Key2>
      </div>
    </Sheet>
  );
}

function AddSentenceSheet({ text, at, onClose }: { text: ReadingText; at: { p: number; s: number }; onClose: () => void }) {
  const para = text.paragraphs[at.p];
  const deOrig = para.de[at.s];
  const enOrig = para.en?.[at.s];
  const [editing, setEditing] = useState(false);
  const [de, setDe] = useState(deOrig);
  const [en, setEn] = useState(enOrig ?? '');
  const deRef = useRef<HTMLTextAreaElement>(null);

  if (!enOrig) {
    return (
      <Sheet label="Add this sentence as a card?" onClose={onClose}>
        <h2 className="t-title3">No English for this sentence alone</h2>
        <div className="win" style={{ marginTop: 12 }}><div className="t-head" lang="de">{deOrig}</div></div>
        <p className="t-sub l2" style={{ margin: '12px 0 0' }}>The old translation only lines up paragraph by paragraph here, so this sentence can't become a card without inventing its English.</p>
        <div className="acts"><Key2 onClick={onClose}>Close</Key2></div>
      </Sheet>
    );
  }

  const add = async () => {
    const now = Date.now();
    const edited = de.trim() !== deOrig || en.trim() !== enOrig;
    let note: NoteRow;
    if (text.id === TATOEBA_SET && para.ref) {
      const s = (await contentData()).sentences.find(x => x.id === para.ref);
      if (!s) return;
      note = sentenceNote(s, now);
    } else {
      note = {
        id: `r:${text.id}:${at.p}:${at.s}`, kind: 'sentence', de: deOrig, en: [enOrig],
        source: `${text.title} · ${[text.author, text.year].filter(Boolean).join(', ')} · English: ${[text.en?.translator, text.en?.year].filter(Boolean).join(', ') || text.en?.source || ''}`,
        sourceRef: text.id, createdAt: now,
      };
    }
    if (edited) note = { ...note, de: de.trim(), en: [en.trim()], edited: 1, original: { de: note.de, en: note.en } };
    const made = await addNote(note, now);
    showToast(made.length ? 'Card made. It comes first among new cards.' : 'This sentence is already a card');
    onClose();
  };

  return (
    <Sheet label="Add this sentence as a card?" onClose={onClose}>
      <h2 className="t-title3">Add this sentence as a card?</h2>
      {editing ? (
        <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
          <textarea ref={deRef} className="field" lang="de" rows={3} value={de} onChange={e => setDe(e.currentTarget.value)} aria-label="German" />
          <textarea className="field" lang="en" rows={3} value={en} onChange={e => setEn(e.currentTarget.value)} aria-label="English" />
          <GermanKeys target={deRef} />
        </div>
      ) : (
        <div className="win" style={{ marginTop: 12 }}>
          <div className="t-head" lang="de">{deOrig}</div>
          <div className="t-sub l2" style={{ marginTop: 8 }}>{enOrig}</div>
        </div>
      )}
      {text.id !== TATOEBA_SET && (
        <div className="note"><Icon name="info" /><span>Old translations don't always line up sentence by sentence. Check that the English matches before adding.</span></div>
      )}
      <div className="acts">
        <GoKey center onClick={() => void add()} disabled={!de.trim() || !en.trim()}>Add sentence card</GoKey>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {!editing ? <Key2 icon="edit" onClick={() => setEditing(true)}>Edit pair</Key2> : <Key2 onClick={() => { setDe(deOrig); setEn(enOrig); setEditing(false); }}>Undo edits</Key2>}
          <Key2 onClick={onClose}>Cancel</Key2>
        </div>
      </div>
      {!editing && <div style={{ marginTop: 8 }}><Chip onClick={() => openDictionary('dictcc', deOrig)} icon="ext">Look it up</Chip></div>}
    </Sheet>
  );
}
