# Nicos Weg link data (pages fetched 2026-10-04 to 2026-10-05)

Built by `tools/fetch_nicos_weg.py`. Sources: learngerman.dw.com, coerll.utexas.edu/gg (Grimm Grammar), schubert-verlag.de/aufgaben. Every URL in the two JSON files answered HTTP 200. DW lesson and grammar pages were also checked against the page's own title, heading and canonical link; the Grimm and Schubert titles in `grammar-links.json` are read from the pages themselves (fetch logs: `tools/raw/dw/fetch-log.json`, `tools/raw/dw/ext/fetch-log.json`).

## Lessons

| Level | Lessons | Final test | Chapters | Lessons with a grammar line | DW grammar pages on lesson pages (distinct titles) |
|---|---|---|---|---|---|
| A1 | 77 | 1 | 20 | 67 | 128 (123) |
| A2 | 77 | 1 | 20 | 58 | 91 (88) |
| B1 | 77 | 1 | 20 | 48 | 69 (68) |

Total 231 lessons.

## Grammar topics

147 distinct topics, counted once at the level where they first appear.

| Level | Topics | Grimm link | Schubert link | blank label |
|---|---|---|---|---|
| A1 | 62 | 57 | 40 | 20 |
| A2 | 41 | 34 | 27 | 5 |
| B1 | 44 | 40 | 27 | 5 |
| all | 147 | 131 | 94 | 30 |

Both links: 90. Neither: 12. blank labels: adjective 1, article 3, preposition 14, verb 12.

## Missing or uncertain

- B1 exists on DW only with the German interface (the /en/ course page returns HTTP 200 but no content). B1 chapter names, grammar names and subtitles are German, exactly as DW shows them. `subtitle` is null for B1 and the German subtitle is in `subtitleDe`. No English subtitle exists for B1.
- Chapters: 'Welcome to A1!', 'Welcome to A2!' and 'Intro zu B1' are DW's unnumbered intro chapters (`n` null). The A1/A2 final test has no group in DW's data; DW's page heads it with its own label (course.otherLessons), which is copied from DW's translation table into the chapter `title` (`n` null). The B1 final test is in the group 'Abschlusstest'.
- Topic = the one grammar line DW's course overview shows per lesson (A1: 62 distinct, matching the design spec). DW's lesson pages list more grammar pages, with DW's own numbering (for example 'Informal and formal (1)'); all of them, titles exactly as DW shows them, are in each lesson's `grammarPages`. `grammar[].url` is the page that belongs to the overview line (see matching notes at the end).
- Schubert-Verlag has no grammar-topic index. Its exercises are listed by textbook chapter; only the 'Weitere Übungen' pages carry a grammar label per exercise. Picks are by exercise heading, instruction line and content; `schubert.detail` is Schubert's own index line. Grimm Grammar has no pages for numbers or indefinite pronouns.
- Fields added to the specified shape: level `lang`; lesson `subtitleDe` (B1 only) and `grammarPages`; topic `lessons` (every lesson where it appears); outside link `detail` (Schubert's own index line for the exercise).
- `blank` comes from the topic name only: article = articles; preposition = prepositions, including 'Verbs + preposition' and 'Adjective(s) + preposition'; verb = present-tense conjugation, vowel change and modal verbs; adjective = 'Adjective declension'. Past-tense topics, 'Separable verbs', 'Imperative', 'Possessive determiners', 'The dative', 'Nouns: gender' and 'Relative clauses + preposition' are null.
- A topic is linked only where a page's title, heading or section clearly names it. Partial matches (one preposition of two, one verb of several) are listed below so they can be dropped if unwanted.
- Not linked although close (heading or label does not name the topic, or the core of the topic is missing from the page): Schubert 'Begrüßung und Verabschiedung' (a1_k01_gruessen) for 'Informal and formal'; Schubert 'An welchem Tag?' (xg05_06) and 'Nationale Feiertage' (a1_k09_feiertage) for the ordinal topics; Schubert 'Zahlen' listening pages for the number topics (audio, numbers not verifiable); Schubert 'Nomen mit typischen Endungen' (b1_kap1_artikel) for the noun-ending topics; Grimm 'dative' for 'Expressions with the dative'; Grimm 'present regular verbs' for 'Conjugation: bügeln' (the -eln rule is not there); Grimm 'sich lassen' (vpass_04) for 'lassen + Infinitiv'; Grimm 'telling time', 'days of the week' and 'months and seasons' for 'Temporale Präpositionen'.

- Weaker matches (44): a1-informal-and-formal (grimm); a1-nouns-gender (schubert); a1-vowel-change-e-to-i (grimm); a1-conjugation-sprechen (schubert); a1-negatives-nicht (schubert); a1-prepositions-of-time-an (grimm); a1-prepositions-of-time-an (schubert); a1-time-specification-24-hour-clock (schubert); a1-ordinal-numbers (grimm); a1-modal-verbs (schubert); a1-prepositions-bei-von (schubert); a1-prepositions-of-place (schubert); a1-prepositions-mit (schubert); a1-prepositions-in-auf (schubert); a1-instructions (schubert); a1-prepositions-vor-nach (grimm); a1-prepositions-vor-nach (schubert); a2-prepositions-vor-seit (grimm); a2-prepositions-vor-seit (schubert); a2-compound-conjunctions (grimm); a2-indirect-interrogatives (schubert); a2-subordinate-clauses (schubert); a2-nouns-ending-in-ung (schubert); a2-adjective-preposition (schubert); a2-indirect-questions (schubert); a2-relative-clauses-nominative (schubert); a2-relative-clauses-accusative (schubert); a2-impersonal-verbs (grimm); a2-simple-past-regular-verbs (schubert); a2-verbs-with-two-objects (grimm); a2-sentence-construction-pronouns (schubert); a2-genitive (schubert); a2-adjectives-preposition (schubert); b1-nominalisierung (grimm); b1-praeteritum-unregelmaessig (schubert); b1-praeteritum-oder-perfekt (grimm); b1-praeteritum-oder-perfekt (schubert); b1-doppelkonjunktionen (grimm); b1-wortbildung-adjektive (schubert); b1-kausale-verbindungen (grimm); b1-ordnungszahlen (grimm); b1-genitiv (schubert); b1-adversative-verbindungen (grimm); b1-wuensche-ausdruecken (grimm).

- Schubert picks from a different level than the topic (22): a1-negatives-nicht (A2); a1-time-12-hour-clock (A2); a1-time-specification-24-hour-clock (A2); a1-negation-nicht-kein (A2); a1-adjective-declension (A2); a1-modal-verbs-sollen (A2); a1-modal-verbs-duerfen (A2); a1-subjunctive-wishes (B1); a2-simple-past-muessen-duerfen (A1); a2-simple-past-koennen-wollen (A1); a2-verbs-with-two-objects (A1); a2-sentence-construction-pronouns (A1); a2-final-clauses-um-zu (B1); b1-indirekte-fragesaetze-ob (A2); b1-praeteritum-oder-perfekt (A2); b1-adverbien-gruende (A2); b1-wortbildung-adjektive (A2); b1-konzessive-verbindungen (A2); b1-fragewoerter-wo-r (A2); b1-modalverben-sollen (A2); b1-genitiv (A2); b1-nomen-auf-heit-keit (A2).

- Topics without a Grimm link (16): a1-numbers-from-11-to-19; a1-numbers-over-100; a1-indefinite-pronouns-man; a1-zu-adjective; a1-gehen-infinitive; a2-conjugation-buegeln; a2-adjective-preposition; a2-expressions-with-the-dative; a2-indefinite-pronouns; a2-messages-without-a-subject; a2-making-suggestions; a2-adjectives-preposition; b1-partizip-i; b1-temporale-praepositionen; b1-relativadverb-wo; b1-lassen-infinitiv.

- Topics without a Schubert link (53): a1-informal-and-formal; a1-personal-pronouns-ich-du; a1-personal-pronouns-er-sie; a1-numbers-from-11-to-19; a1-numbers-over-100; a1-questions-and-statements; a1-indefinite-pronouns-man; a1-sentence-construction-subject; a1-adjectives-following-sein; a1-zu-adjective; a1-possessive-determiners; a1-adverbs-sequence; a1-ordinal-numbers; a1-word-formation-professions; a1-modal-verbs-wollen; a1-gehen-infinitive; a1-question-words-wie-viel; a1-pronouns-es; a1-question-words-welch; a1-the-possessive-determiner; a1-time-specification-wann; a1-muessen-or-sollen; a2-compound-conjunctions; a2-conjugation-buegeln; a2-conjunctions-aber; a2-conjunctions-oder; a2-expressions-with-the-dative; a2-indefinite-pronouns; a2-time-specification-wie-oft; a2-messages-without-a-subject; a2-relative-clauses-interruptive; a2-linked-relative-clauses; a2-adverbs-gradable; a2-impersonal-verbs; a2-question-words-case; a2-making-suggestions; b1-nebensaetze-waehrend; b1-indirekte-rede; b1-satzbau-hauptsaetze; b1-doppelkonjunktionen; b1-konjunktionen-sondern; b1-ordnungszahlen; b1-praepositionen-wegen; b1-futur-i; b1-plusquamperfekt; b1-nebensaetze-seit; b1-nebensaetze-bevor; b1-brauchen-zu-infinitiv; b1-nomen-auf-chen; b1-praepositionen-waehrend; b1-adversative-verbindungen; b1-relativadverb-wo; b1-lassen-infinitiv.

## DW matching notes

- A1-49: 'Prepositions: in, auf' matched to page 'Prepositions of place: in, auf' by the text after the colon (tier 3)
- A1-72: 'Prepositions: vor, nach' matched to page 'Prepositions of time: vor, nach' by the text after the colon (tier 3)
- A1-73: 'Adjective declension' matches 3 DW pages with the same title; first one used
- A1-76: 'Subjunctive: Wishes' matches 3 DW pages with the same title; first one used
- A2-1: 'Prepositions: vor, seit' matched to page 'Prepositions of time: vor, seit' by the text after the colon (tier 3)
- A2-5: 'Subordinate clauses' matched to page 'Sentence construction: subordinate clauses (2)' by the text after the colon (tier 4)
- A2-10: 'Adjective declension' matches 2 DW pages with the same title; first one used
- A2-16: 'Comparison' matches 2 DW pages with the same title; first one used
- A2-43: 'Two-case prepositions' matches 2 DW pages with the same title; first one used
- A2-51: 'Subjunctive: polite requests' matches 2 DW pages with the same title; first one used
- A2-74: 'Passive' matches 2 DW pages with the same title; first one used
- B1-8: 'Indirekte Rede' matches 2 DW pages with the same title; first one used
- B1-30: 'Negation: nicht/kein' matched to page 'Verneinung: nicht/kein' by the text after the colon (tier 3)
- B1-37: 'Fragewörter: wo(r)-' matches 2 DW pages with the same title; first one used
- B1-43: 'Präpositionen: wegen' matched to page 'Kausale Präpositionen: wegen' by the text after the colon (tier 3)
- B1-55: 'Partizip I' matches 2 DW pages with the same title; first one used
- B1-66: 'Präpositionen: während' matched to page 'Temporale Präpositionen: während' by the text after the colon (tier 3)

## Verification problems on the last run: 0

