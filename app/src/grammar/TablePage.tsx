// A reference table (design spec 5.4): columns × case rows, gender colours on the columns, and one block per
// row whenever the columns don't fit the screen (large text, long forms), so there is never sideways scrolling.
import { useLayoutEffect, useRef, useState } from 'react';
import { BackButton, DetailTitle, Foot, NavRow, SectionHeader } from '../ui/kit';
import { useGrammar, type RefSection } from './data';

const GENDER_CLASS = ['art g-der', 'art g-die', 'art g-das', ''];

function cellClass(s: RefSection, col: number) {
  return s.gender ? GENDER_CLASS[col] : undefined;
}

function Section({ s }: { s: RefSection }) {
  const nameLang = s.nameLang ?? 'en';
  const box = useRef<HTMLDivElement>(null);
  const [stacked, setStacked] = useState(false);
  // Measure: if the table is wider than its card, show one block per row instead.
  useLayoutEffect(() => {
    const check = () => {
      setStacked(false);
      requestAnimationFrame(() => {
        const el = box.current;
        if (el) setStacked(el.scrollWidth > el.clientWidth + 1);
      });
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return (
    <>
      {s.title && <SectionHeader left={s.title} />}
      {!stacked && <div ref={box} className="card" style={{ marginTop: s.title ? 0 : 16, padding: '8px 8px 4px', overflow: 'hidden' }}>
        <table className="rtable">
          <thead><tr><th />{s.columns.map(c => <th key={c} lang={s.gender || c === 'Meaning' ? 'en' : 'de'}>{c}</th>)}</tr></thead>
          <tbody lang="de">
            {s.rows.map(r => (
              <tr key={r.name}>
                <th scope="row" lang={nameLang}>{r.name}</th>
                {r.cells.map((c, i) => <td key={i} className={cellClass(s, i)} lang={s.columns[i] === 'Meaning' ? 'en' : 'de'}
                  style={s.columns[i] === 'Meaning' ? { fontWeight: 400, fontSize: '.941rem' } : undefined}>{c ?? '–'}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
      {stacked && <div className="card stack" style={{ marginTop: s.title ? 0 : 14, padding: 0 }}>
        {s.rows.map(r => (
          <div className="case" key={r.name}>
            <div className="nm" lang={nameLang}>{r.name}</div>
            <div className="forms" lang="de" style={s.columns.length === 1 ? { gridTemplateColumns: '1fr' } : undefined}>
              {r.cells.map((c, i) => (
                <div key={i}><span lang={s.gender ? 'en' : 'de'}>{s.columns[i]}</span><b className={cellClass(s, i)} lang={s.columns[i] === 'Meaning' ? 'en' : 'de'}>{c ?? '–'}</b></div>
              ))}
            </div>
          </div>
        ))}
      </div>}
    </>
  );
}

export function TablePage({ id }: { id: string }) {
  const { data } = useGrammar();
  const nav = <NavRow left={<BackButton label="Grammar" to={{ name: 'grammar' }} />} />;
  if (!data) return nav;
  const t = data.tables.find(x => x.id === id);
  if (!t) return <>{nav}<DetailTitle title="Table not found" /></>;
  return (
    <>
      {nav}
      <DetailTitle title={t.title} sub={t.sub} />
      {t.sections.map((s, i) => <Section key={i} s={s} />)}
      <Foot>{t.foot ? `${t.foot} ` : ''}{t.sections.some(s => s.gender) ? 'Columns carry the gender colours; the plural stays uncoloured. ' : ''}Source: {t.source}.</Foot>
    </>
  );
}
