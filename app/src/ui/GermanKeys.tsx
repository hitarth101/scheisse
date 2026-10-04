// ä ö ü ß Ä Ö Ü keys pinned directly above the iPhone keyboard while a German field is focused
// (design spec 4; position technique proven in Phase 0 check 9).
import { useEffect, useRef, useState } from 'react';

const KEYS = ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'];

export function GermanKeys({ target }: { target: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null> }) {
  const [shown, setShown] = useState(false);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const field = target.current;
    if (!field) return;
    const vv = window.visualViewport;
    const place = () => {
      if (!bar.current || !vv) return;
      const gap = window.innerHeight - (vv.height + vv.offsetTop);
      bar.current.style.transform = `translateY(${-Math.max(0, gap)}px)`;
    };
    const focus = () => { setShown(true); setTimeout(place, 50); setTimeout(place, 400); };
    const blur = () => setShown(false);
    field.addEventListener('focus', focus);
    field.addEventListener('blur', blur);
    field.addEventListener('input', place);
    vv?.addEventListener('resize', place);
    vv?.addEventListener('scroll', place);
    if (document.activeElement === field) focus();
    return () => {
      field.removeEventListener('focus', focus);
      field.removeEventListener('blur', blur);
      field.removeEventListener('input', place);
      vv?.removeEventListener('resize', place);
      vv?.removeEventListener('scroll', place);
    };
  }, [target]);

  if (!shown) return null;
  const insert = (k: string) => {
    const f = target.current;
    if (!f) return;
    const s = f.selectionStart ?? f.value.length, e = f.selectionEnd ?? s;
    f.setRangeText(k, s, e, 'end');
    f.dispatchEvent(new Event('input', { bubbles: true }));
    f.focus();
  };
  return (
    <div className="kbrow" ref={bar} role="toolbar" aria-label="German letters">
      {KEYS.map(k => (
        <button key={k} type="button" onPointerDown={e => e.preventDefault()} onClick={() => insert(k)} aria-label={`Type ${k}`}>{k}</button>
      ))}
    </div>
  );
}
