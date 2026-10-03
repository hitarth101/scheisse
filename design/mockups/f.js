// Mockup helpers: device chrome, icon set, tab bar and mini-player. Mockup-only; the app draws these itself.
(() => {
const S = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`;
const F = d => `<svg viewBox="0 0 24 24" fill="currentColor">${d}</svg>`;
const I = {
  today: S('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  lectures: S('<path d="M4 15.5V12a8 8 0 0 1 16 0v3.5"/><path d="M4 14.5h3.2v6H5.6A1.6 1.6 0 0 1 4 18.9zM20 14.5h-3.2v6h1.6a1.6 1.6 0 0 0 1.6-1.6z"/>'),
  reading: S('<path d="M12 7c-2.2-1.6-5.2-2.1-8.5-1.6v13c3.3-.5 6.3 0 8.5 1.6 2.2-1.6 5.2-2.1 8.5-1.6v-13C17.2 4.9 14.2 5.4 12 7zM12 7v13"/>'),
  grammar: S('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M3.5 14.5h17M9.5 4.5v15"/>'),
  inbox: S('<path d="M3.5 13.5l2.4-7A2 2 0 0 1 7.8 5h8.4a2 2 0 0 1 1.9 1.5l2.4 7V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z"/><path d="M3.5 13.5h4.6l1.4 2.4h5l1.4-2.4h4.6"/>'),
  stats: S('<path d="M5 20v-7M10 20V5M15 20v-9M20 20V9"/>', 'stroke-width="1.9"'),
  close: S('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>', 'stroke-width="2.2"'),
  more: F('<circle cx="5.5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="18.5" cy="12" r="1.7"/>'),
  chev: S('<path d="M9 5.5l6.5 6.5L9 18.5"/>', 'stroke-width="2.6"'),
  back: S('<path d="M15 5.5L8.5 12l6.5 6.5"/>', 'stroke-width="2.4"'),
  down: S('<path d="M5.5 9l6.5 6.5L18.5 9"/>', 'stroke-width="2.4"'),
  play: F('<path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5A.8.8 0 0 0 8 5.2z"/>'),
  pause: F('<rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/>'),
  rew10: S('<path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5"/><path d="M4.5 4v4h4"/><text x="12.2" y="15.6" font-size="7.4" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none" font-family="-apple-system,Inter,sans-serif">10</text>'),
  fwd10: S('<path d="M19.5 12a7.5 7.5 0 1 1-2.4-5.5"/><path d="M19.5 4v4h-4"/><text x="11.8" y="15.6" font-size="7.4" font-weight="700" text-anchor="middle" fill="currentColor" stroke="none" font-family="-apple-system,Inter,sans-serif">10</text>'),
  speaker: S('<path d="M4 9.5h3.4L12 5.6v12.8l-4.6-3.9H4z"/><path d="M15.6 9.2a4 4 0 0 1 0 5.6M18.2 6.6a7.6 7.6 0 0 1 0 10.8"/>'),
  mic: S('<rect x="9" y="3" width="6" height="11.5" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>'),
  keyboard: S('<rect x="2.5" y="6" width="19" height="12" rx="2.2"/><path d="M6.5 10h.5M10 10h.5M13.5 10h.5M17 10h.5M8 14h8"/>'),
  check: S('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'stroke-width="2.4"'),
  plus: S('<path d="M12 5v14M5 12h14"/>', 'stroke-width="2.2"'),
  edit: S('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>'),
  flag: S('<path d="M5 21V4.5M5 4.5h11l-2 4 2 4H5"/>'),
  suspend: S('<circle cx="12" cy="12" r="8.5"/><path d="M10 9v6M14 9v6"/>'),
  undo: S('<path d="M9 7L4.5 11.5 9 16"/><path d="M4.5 11.5H14a5.5 5.5 0 0 1 0 11h-2"/>'),
  trash: S('<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>'),
  ext: S('<path d="M14 4.5h5.5V10M19.5 4.5L11 13M17 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 4 18.5v-10A1.5 1.5 0 0 1 5.5 7H10"/>'),
  info: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.2"/>', 'stroke-width="2"'),
  warn: S('<path d="M12 4l9 15.5H3z"/><path d="M12 10v4.5M12 17.3v.2"/>', 'stroke-width="2"'),
  share: S('<path d="M12 15V3.5M7.5 8L12 3.5 16.5 8"/><path d="M6 11H5a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 5 20h14a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 19 11h-1"/>'),
  restore: S('<path d="M12 3.5V15M7.5 10.5L12 15l4.5-4.5"/><path d="M6 11H5a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 5 20h14a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 19 11h-1"/>'),
  clock: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  note: S('<path d="M6 3.5h8.5L19 8v12.5H6z"/><path d="M14 3.5V8h5M9 12h7M9 15.5h7"/>'),
  swap: S('<path d="M7 7h12.5M16 3.5L19.5 7 16 10.5M17 17H4.5M8 13.5L4.5 17 8 20.5"/>'),
  turtle: S('<path d="M3.5 15.5h17M6 15.5a6 6 0 0 1 12 0M18 15.5l1.5-3h1.5M7 15.5V18M15 15.5V18"/>'),
  book2: S('<rect x="5" y="3.5" width="14" height="17" rx="1.8"/><path d="M9 3.5v17"/>'),
  type: S('<path d="M5 7V5h14v2M12 5v14M9 19h6"/>'),
};
window.FI = I;
const sbar = `<span>9:41</span><span style="display:flex;gap:7px;align-items:center">
<svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
<svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.3-1.3A10.3 10.3 0 0 0 8 .3 10.3 10.3 0 0 0 .7 3.3L2 4.6a8.4 8.4 0 0 1 6-2.4zm0 3.7c1.3 0 2.5.5 3.4 1.3l1.3-1.3A6.6 6.6 0 0 0 8 4a6.6 6.6 0 0 0-4.7 1.9l1.3 1.3c.9-.8 2.1-1.3 3.4-1.3zM8 9.6l2-2a2.9 2.9 0 0 0-4 0z"/></svg>
<svg width="27" height="13" viewBox="0 0 27 13" fill="none"><rect x=".5" y=".5" width="23" height="12" rx="3.5" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2" fill="currentColor"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill="currentColor" opacity=".45"/></svg></span>`;
const TABS = [['today', 'Today'], ['lectures', 'Lectures'], ['reading', 'Reading'], ['grammar', 'Grammar'], ['inbox', 'Inbox']];
document.querySelectorAll('i[data-i]').forEach(el => { const n = el.dataset.i, c = ('i-' + n + ' ' + (el.className || '')).trim(); el.outerHTML = (I[n] || '').replace('<svg ', '<svg class="' + c + '" '); });
document.querySelectorAll('.ph').forEach(ph => {
  const tab = ph.dataset.tab, mini = ph.dataset.mini, badge = ph.dataset.inbox;
  let html = `<div class="island"></div><div class="sbar${ph.dataset.backdrop !== undefined ? ' backdrop' : ''}">${sbar}</div><div class="homebar"></div>`;
  if (mini) {
    const playing = mini === 'playing';
    html += `<div class="mini"><div class="mt"><b>Lecture 09</b><span>${playing ? '3:41' : '3:20'} of 9:45${playing ? '' : ' · paused'}</span></div>
      <span class="rkey">${I.rew10}</span><span class="rkey" style="color:var(--label)">${playing ? I.pause : I.play}</span><div class="bar"><i style="width:${playing ? 38 : 34}%"></i></div></div>`;
  }
  if (tab) html += `<nav class="tabbar">${TABS.map(([k, n]) => `<a class="${k === tab ? 'on' : ''}">${I[k]}${n}${k === 'inbox' && badge ? `<span class="badge">${badge}</span>` : ''}</a>`).join('')}</nav>`;
  ph.insertAdjacentHTML('beforeend', html);
});
})();
