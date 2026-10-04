// Typed-answer comparison (product spec 4.3, design spec 5.2). The app shows differences; it never grades.
// - "ae/oe/ue/ss" typed for "ä/ö/ü/ß" is a note, not a mistake.
// - A capital letter that differs is a difference (capitals matter on German nouns), with a note.
// - Punctuation is ignored.

export type Seg = { text: string; kind: 'ok' | 'x' | 'miss' | 'nt' };
export interface Comparison {
  segments: Seg[];
  /** Notes to show under the answer. */
  notes: { kind: 'case' | 'umlaut' | 'eszett'; text: string }[];
  /** True when the only differences are notes ("ue" for ü) and punctuation. */
  exact: boolean;
}

const UML: Record<string, string> = { 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'Ä': 'Ae', 'Ö': 'Oe', 'Ü': 'Ue', 'ß': 'ss' };
const PUNCT = /[.,!?;:„“”"'‚‘’«»()\-–—…]/;

export function normalise(s: string): string {
  return s.normalize('NFC').replace(/\s+/g, ' ').trim();
}

type Op = { cost: number; kind: Seg['kind'] | 'skip'; ti: number; ej: number; text: string; note?: Comparison['notes'][number]['kind'] };

/** Aligns what was typed with the expected answer and marks each typed character. */
export function compareAnswer(typedRaw: string, expectedRaw: string): Comparison {
  const t = normalise(typedRaw);
  const e = normalise(expectedRaw);
  const n = t.length, m = e.length;
  const INF = 1e9;
  // cost[i][j]: best cost to align t[i:] with e[j:]
  const cost: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(INF));
  const step: (Op | null)[][] = Array.from({ length: n + 1 }, () => new Array<Op | null>(m + 1).fill(null));
  cost[n][m] = 0;
  for (let i = n; i >= 0; i--) {
    for (let j = m; j >= 0; j--) {
      if (i === n && j === m) continue;
      let best = INF, op: Op | null = null;
      const consider = (o: Op, ni: number, nj: number) => {
        const c = o.cost + cost[ni][nj];
        if (c < best) { best = c; op = o; }
      };
      if (i < n && j < m) {
        const a = t[i], b = e[j];
        if (a === b) consider({ cost: 0, kind: 'ok', ti: 1, ej: 1, text: a }, i + 1, j + 1);
        else if (a.toLowerCase() === b.toLowerCase()) consider({ cost: 0.5, kind: 'x', ti: 1, ej: 1, text: a, note: 'case' }, i + 1, j + 1);
        else if (PUNCT.test(a) && PUNCT.test(b)) consider({ cost: 0, kind: 'ok', ti: 1, ej: 1, text: a }, i + 1, j + 1);
        else consider({ cost: 1, kind: 'x', ti: 1, ej: 1, text: a }, i + 1, j + 1);
        // "ue" typed for "ü", "ss" for "ß"
        const alt = UML[b];
        if (alt && i + 1 < n && t.slice(i, i + 2).toLowerCase() === alt.toLowerCase()) {
          const caseOk = t[i] === alt[0];
          consider({ cost: caseOk ? 0.01 : 0.51, kind: 'nt', ti: 2, ej: 1, text: t.slice(i, i + 2), note: b === 'ß' ? 'eszett' : 'umlaut' }, i + 2, j + 1);
        }
      }
      if (i < n) {
        // extra typed character
        const a = t[i];
        consider(PUNCT.test(a) || a === ' ' && (j === 0 || j === m || e[j - 1] === ' ' || e[j] === ' ')
          ? { cost: PUNCT.test(a) ? 0 : 0.2, kind: 'ok', ti: 1, ej: 0, text: a }
          : { cost: 1, kind: 'x', ti: 1, ej: 0, text: a }, i + 1, j);
      }
      if (j < m) {
        // character missing from what was typed
        const b = e[j];
        consider(PUNCT.test(b)
          ? { cost: 0, kind: 'skip', ti: 0, ej: 1, text: '' }
          : { cost: 1, kind: 'miss', ti: 0, ej: 1, text: b }, i, j + 1);
      }
      cost[i][j] = best;
      step[i][j] = op;
    }
  }

  const segments: Seg[] = [];
  const noteKinds = new Set<Comparison['notes'][number]['kind']>();
  let exact = true;
  let i = 0, j = 0;
  const push = (text: string, kind: Seg['kind']) => {
    const last = segments[segments.length - 1];
    if (last && last.kind === kind && kind !== 'nt') last.text += text;
    else segments.push({ text, kind });
  };
  while (i < n || j < m) {
    const op = step[i][j];
    if (!op) break;
    if (op.note) noteKinds.add(op.note);
    if (op.kind === 'x' || op.kind === 'miss') exact = false;
    if (op.kind !== 'skip') push(op.text, op.kind);
    i += op.ti; j += op.ej;
  }

  const notes: Comparison['notes'] = [];
  if (noteKinds.has('case')) notes.push({ kind: 'case', text: 'Capital letters differ. German capitalises every noun and the first word of a sentence.' });
  if (noteKinds.has('umlaut')) notes.push({ kind: 'umlaut', text: '“ae”, “oe” and “ue” for ä, ö and ü are accepted keyboard spellings, so they are a note, not a mistake.' });
  if (noteKinds.has('eszett')) notes.push({ kind: 'eszett', text: '“ss” for ß is an accepted keyboard spelling, so it is a note, not a mistake.' });
  return { segments, notes, exact };
}
