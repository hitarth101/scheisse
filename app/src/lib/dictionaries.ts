// Outside dictionaries (product spec 4.7). Only links: the app never copies their content.
export const DICTIONARIES = {
  dictcc: { name: 'dict.cc', sub: 'German–English, community', home: 'https://www.dict.cc/', search: (w: string) => `https://www.dict.cc/?s=${encodeURIComponent(w)}` },
  leo: { name: 'Leo', sub: 'German–English, with forums', home: 'https://dict.leo.org/englisch-deutsch/', search: (w: string) => `https://dict.leo.org/englisch-deutsch/${encodeURIComponent(w)}` },
  dwds: { name: 'DWDS', sub: 'German only, the reference dictionary', home: 'https://www.dwds.de/', search: (w: string) => `https://www.dwds.de/wb/${encodeURIComponent(w)}` },
  wiktionary: { name: 'Wiktionary', sub: 'English Wiktionary, German entries', home: 'https://en.wiktionary.org/', search: (w: string) => `https://en.wiktionary.org/wiki/${encodeURIComponent(w)}#German` },
} as const;
export type DictionaryKey = keyof typeof DICTIONARIES;

export function openExternal(url: string) {
  window.open(url, '_blank', 'noopener');
}

/** Opens a dictionary for a word or phrase, or its front page when there is nothing to look up. */
export function openDictionary(key: DictionaryKey, word = '') {
  const d = DICTIONARIES[key];
  openExternal(word.trim() ? d.search(word.trim()) : d.home);
}
