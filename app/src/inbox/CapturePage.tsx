// Capture (design spec 5.6): a focus mode that opens with the keyboard up. Saving takes one tap.
import { useEffect, useRef, useState } from 'react';
import { tick } from '../lib/device';
import { back } from '../lib/router';
import { GermanKeys } from '../ui/GermanKeys';
import { GoKey, NavRow, showToast, TextButton } from '../ui/kit';
import { capture, lastShow } from './inbox';

export function CapturePage() {
  const [text, setText] = useState('');
  const [show, setShow] = useState('');
  const [last, setLast] = useState('');
  const ref = useRef<HTMLInputElement>(null);
  const showRef = useRef<HTMLInputElement>(null);

  useEffect(() => { ref.current?.focus(); void lastShow().then(setLast); }, []);

  const save = async () => {
    if (!text.trim()) return;
    tick();
    await capture(text, show);
    showToast('Saved to Inbox');
    back({ name: 'inbox' });
  };

  return (
    <div className="page focus" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <NavRow left={<TextButton onClick={() => back({ name: 'inbox' })}>Cancel</TextButton>} title="Capture" />
      <form style={{ padding: '10px 16px 0' }} onSubmit={e => { e.preventDefault(); void save(); }}>
        <input ref={ref} className="field" lang="de" value={text} onChange={e => setText(e.currentTarget.value)}
          aria-label="Phrase you heard" placeholder="The phrase, as you heard it" enterKeyHint="done"
          autoComplete="off" autoCorrect="off" spellCheck={false}
          style={{ minHeight: 64, fontSize: '1.294rem', fontWeight: 600 }} />
        <input ref={showRef} className="field" value={show} onChange={e => setShow(e.currentTarget.value)}
          aria-label="What were you watching? (optional)" placeholder="What were you watching? (optional)" enterKeyHint="done"
          style={{ marginTop: 10 }} />
        {last && <div className="t-foot l2" style={{ margin: '8px 4px 0' }}>Last time: <button type="button" className="link" onClick={() => setShow(last)}>{last}</button></div>}
        <GermanKeys target={ref} />
      </form>
      <div className="spacer" style={{ flex: 1 }} />
      <div style={{ padding: '16px 16px calc(var(--safe-bottom) + 16px)' }}>
        <GoKey center onClick={() => void save()} disabled={!text.trim()}>Save to Inbox</GoKey>
      </div>
    </div>
  );
}
