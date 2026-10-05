# Reading sources report

Built 2026-10-05 02:47 by `tools/build_reading_sources.py` in 53 s. Texts: `tools/sources/reading/<id>.json`, list: `tools/sources/reading/index.json`.

Nothing in these files was written, translated or corrected by Claude or by the script. Every German and English string is copied from its source; only whitespace is normalised and layout marks that are not text are removed (see Method). The copy check below found **0 strings** out of 4088 that are not plain substrings of their source.

## Summary

| id | stage | words | paragraphs | sentences | paragraphs with sentence pairs | sentences with pairs | would be with joined sentences (not used) |
|---|---|---|---|---|---|---|---|
| wikibooks-wie-heisst-du-1 | 2 | 33 | 6 | 11 | 100% | 100% | - |
| wikibooks-wie-heisst-du-2 | 2 | 35 | 5 | 11 | 100% | 100% | - |
| wikibooks-bitte-buchstabieren-sie | 2 | 75 | 5 | 10 | 60% | 50% | - |
| grimm-die-brautschau | 3 | 145 | 1 | 5 | 100% | 100% | - |
| grimm-die-scholle | 3 | 215 | 3 | 11 | 100% | 100% | - |
| grimm-der-suesse-brei | 3 | 222 | 1 | 6 | 0% | 0% | - |
| grimm-die-sternthaler | 3 | 298 | 1 | 11 | 0% | 0% | - |
| grimm-des-herrn-und-des-teufels-getier | 3 | 314 | 3 | 15 | 100% | 100% | - |
| grimm-vom-tode-des-huehnchens | 3 | 587 | 5 | 25 | 80% | 52% | - |
| grimm-das-lumpengesindel | 3 | 723 | 2 | 23 | 50% | 30% | - |
| grimm-rotkaeppchen | 3 | 996 | 22 | 48 | 68% | 48% | - |
| grimm-der-wolf-und-die-sieben-jungen-geisslein | 3 | 1000 | 8 | 49 | 50% | 35% | - |
| grimm-rumpelstilzchen | 3 | 1002 | 8 | 42 | 50% | 19% | - |
| grimm-die-wichtelmaenner | 3 | 1065 | 11 | 45 | 55% | 24% | - |
| grimm-frau-holle | 3 | 1082 | 6 | 46 | 33% | 4% | - |
| grimm-die-bremer-stadtmusikanten | 3 | 1184 | 9 | 49 | 33% | 16% | - |
| grimm-der-froschkoenig | 3 | 1278 | 15 | 52 | 53% | 36% | - |
| grimm-haensel-und-gretel | 3 | 2664 | 30 | 131 | 70% | 68% | - |
| heidi-1-01 | 4 | 4293 | 50 | 141 | 34% | 23% | - |
| heidi-1-02 | 4 | 2470 | 39 | 112 | 69% | 41% | - |
| heidi-1-03 | 4 | 4265 | 84 | 203 | 58% | 38% | - |
| heidi-1-04 | 4 | 4670 | 62 | 155 | 58% | 50% | - |
| heidi-1-05 | 4 | 3669 | 59 | 122 | 73% | 57% | - |
| heidi-1-06 | 4 | 2622 | 53 | 112 | 77% | 77% | - |
| heidi-1-07 | 4 | 4544 | 114 | 216 | 76% | 57% | - |
| heidi-1-08 | 4 | 3368 | 53 | 170 | 49% | 26% | - |
| heidi-1-09 | 4 | 1940 | 42 | 78 | 57% | 37% | - |
| heidi-1-10 | 4 | 3229 | 60 | 127 | 58% | 57% | - |
| heidi-1-11 | 4 | 1836 | 22 | 44 | 59% | 34% | - |
| heidi-1-12 | 4 | 3689 | 62 | 159 | 58% | 41% | - |
| heidi-1-13 | 4 | 5712 | 80 | 207 | 42% | 24% | - |
| heidi-1-14 | 4 | 4736 | 63 | 160 | 40% | 31% | - |

- Stage 2 Wikibooks: 3 texts, 143 German words, 32 sentences; sentence pairs for 84% of the sentences and 58% of the words.

- Stage 3 Grimm: 15 texts, 12775 German words, 558 sentences; sentence pairs for 41% of the sentences and 39% of the words.

- Stage 4 Heidi part 1: 14 texts, 51043 German words, 2006 sentences; sentence pairs for 42% of the sentences and 39% of the words.

"Sentences" are the entries of the `de` lists. Where the fine split gives different sentence counts on the two sides, the same test is made with a coarse split that keeps each quotation in one piece; those entries are then speech-sized (counts per text are in the detail tables). The last column is for information: it shows how much more would be paired if the programme were also allowed to join two or three sentences on one side (`MERGED_UNITS = True`). The rule for the output is the specified one (equal counts and believable lengths, otherwise the whole English paragraph).

## Stage 2: Wikibooks German course

Source: https://en.wikibooks.org/wiki/German (CC BY-SA 4.0). All 145 pages of the book were downloaded through the MediaWiki API and searched for German passages that have an English translation on the wiki itself.

Used (3 dialogues, the only passages found with a complete English translation on the page; Level I lessons 1 to 3, the lessons the course marks as 100 % complete):

- `wikibooks-wie-heisst-du-1`: Wie heißt du? (1. Teil) / What's your name? (1st Part), 6 turns, 11 sentences, pairs for 100%. Revision 4669202 (2026).
- `wikibooks-wie-heisst-du-2`: Wie heißt du? (2. Teil) / What's your name? (2nd Part), 5 turns, 11 sentences, pairs for 100%. Revision 4669205 (2026).
- `wikibooks-bitte-buchstabieren-sie`: Fernsprechauskunft / Directory Assistance, 5 turns, 10 sentences, pairs for 50%. Revision 4669476 (2026).

Left out, and why:

- Level I lessons 4 to 12 (Freizeit, Geburtstag, Essen, Kleidung, Volk und Familie, Schule, Das Fest, Privileg und Verantwortung, Wetter): the dialogues have vocabulary tables but no translation on the page (Freizeit, Essen, Kleidung, Volk und Familie, Das Fest); Wetter has English lines inside the table markup, but they are attached to table-row attributes and are not displayed on the page (and contain typing slips), so they are not a translation that the page gives; Schule has a line-by-line breakdown with word-for-word glosses and commentary, not a translation of the dialogue.
- Lessons 1 to 15 of the older course (`German/Lesson N`, `German/Level III/...`): German dialogues and reading pieces with vocabulary lists only; the exercises translate English sentences into German and the answers are German.
- Appendices (Phrasebook, Vocabulary, Exercises), grammar pages: phrases and example sentences with glosses, not reading passages.
- `German/Q&A`: a reader's question with a copy of lesson 2's translation (a duplicate).

The translation lines carry a speaker label that differs from the German one in one place (German *Auskunft*, English *Assistant*). Both labels are kept in the paragraph (`speaker`, `speakerEn`). The Wikibooks pages name recordings of the first two dialogues (files on Wikimedia Commons); their licence was not checked and they are not referenced in the files.

## Stage 3: Grimm tales

German: Project Gutenberg #77905, *Deutsche Märchen gesammelt durch die Brüder Grimm*, ed. M. Thilo-Luyken, Ebenhausen: Langewiesche-Brandt, 1921 (modern spelling; the transcription note says the Fraktur original's spelling was kept). It is the only German Grimm text on gutenberg.org (the other two German Grimm items there, #20050 and #20051, are audio books). It holds 62 tales; its text follows the 1857 edition that Hunt translated (word counts of the two sides differ by 5 to 16 % in nearly all tales), but it prints speeches run together with " -- " where Hunt starts a new paragraph.

For tales that the 1921 print does not contain (Der süße Brei, Die Sternthaler, Das Lumpengesindel) the German is the 1857 text from German Wikisource (historical spelling, `historicalSpelling: true`; the 1857 Sterntaler is titled *Die Sternthaler*). Wikisource says its transcriptions are CC BY-SA 4.0; the works themselves are public domain.

English: Margaret Hunt, 1884, Project Gutenberg #5314. `titleEn` is the heading the translation prints above the tale (the contents list gives some tales a different English title).

Choice of the 15 tales: the three that the brief named and that exist in a usable form (Der süße Brei, Die Sternthaler, Das Lumpengesindel), the classics that are short enough (Wolf und sieben Geißlein, Rumpelstilzchen, Wichtelmänner, Frau Holle, Bremer Stadtmusikanten, Froschkönig, Hänsel und Gretel), and five very short tales that pair well sentence by sentence. Files and the index are sorted by length, shortest first. Tales left out although the brief named them: **Rotkäppchen** (the 1921 print stops before the second part that Hunt translates, so its length ratio is 1.27 against about 1.0 elsewhere and many paragraphs would not match) and **Schneewittchen** (2,842 words; fine to add, it aligns like the others). The full list of candidates follows.

| tale | Hunt no. | German | words | paragraphs | sentences | paragraphs with pairs | sentences with pairs | chosen |
|---|---|---|---|---|---|---|---|---|
| Die Brautschau | 155 | 1921 | 145 | 1 | 5 | 100% | 100% | yes |
| Die Scholle | 172 | 1921 | 215 | 3 | 11 | 100% | 100% | yes |
| Der süße Brei | 103 | 1857 Wikisource | 222 | 1 | 6 | 0% | 0% | yes |
| Das Bürle im Himmel | 167 | 1921 | 233 | 1 | 8 | 0% | 0% |  |
| Die Sternthaler | 153 | 1857 Wikisource | 298 | 1 | 11 | 0% | 0% | yes |
| Das alte Mütterchen | Legend 8 | 1921 | 311 | 1 | 12 | 100% | 100% |  |
| Des Herrn und des Teufels Getier | 148 | 1921 | 314 | 3 | 15 | 100% | 100% | yes |
| Der Bauer und der Teufel | 189 | 1921 | 335 | 2 | 18 | 0% | 0% |  |
| Der Fuchs und die Frau Gevatterin | 74 | 1921 | 339 | 4 | 14 | 50% | 50% |  |
| Der Fuchs und das Pferd | 132 | 1921 | 456 | 1 | 17 | 0% | 0% |  |
| Die Lebenszeit | 176 | 1921 | 535 | 3 | 35 | 0% | 0% |  |
| Vom Tode des Hühnchens | 80 | 1921 | 587 | 5 | 25 | 80% | 52% | yes |
| Die drei Brüder | 124 | 1921 | 610 | 3 | 21 | 67% | 29% |  |
| Der Wolf und der Fuchs | 73 | 1921 | 666 | 3 | 31 | 67% | 55% |  |
| Die faule Spinnerin | 128 | 1921 | 671 | 8 | 31 | 62% | 29% |  |
| Der Schneider im Himmel | 35 | 1921 | 709 | 6 | 29 | 50% | 28% |  |
| Die Hochzeit der Frau Füchsin | 38 | 1921 | 719 | 26 | 58 | 58% | 45% |  |
| Das Lumpengesindel | 10 | 1857 Wikisource | 723 | 2 | 23 | 50% | 30% | yes |
| Der Sperling und seine vier Kinder | 157 | 1921 | 815 | 7 | 36 | 0% | 0% |  |
| Die Geschenke des kleinen Volkes | 182 | 1921 | 843 | 2 | 30 | 50% | 60% |  |
| Der Zaunkönig und der Bär | 102 | 1921 | 848 | 7 | 35 | 43% | 26% |  |
| Jorinde und Joringel | 69 | 1921 | 855 | 5 | 50 | 40% | 24% |  |
| Die drei Feldscherer | 118 | 1921 | 930 | 3 | 47 | 0% | 0% |  |
| Die sieben Schwaben | 119 | 1921 | 943 | 19 | 44 | 74% | 32% |  |
| Die Rübe | 146 | 1921 | 996 | 1 | 37 | 0% | 0% |  |
| Rotkäppchen | 26 | 1921 | 996 | 22 | 48 | 68% | 48% | yes |
| Der Wolf und die sieben jungen Geißlein | 5 | 1921 | 1000 | 8 | 49 | 50% | 35% | yes |
| Rumpelstilzchen | 55 | 1921 | 1002 | 8 | 42 | 50% | 19% | yes |
| Die drei Handwerksburschen | 120 | 1921 | 1032 | 1 | 57 | 0% | 0% |  |
| Die Wichtelmänner | 39 | 1921 | 1065 | 11 | 45 | 55% | 24% | yes |
| Frau Holle | 24 | 1921 | 1082 | 6 | 46 | 33% | 4% | yes |
| Der Hund und der Sperling | 58 | 1921 | 1094 | 11 | 62 | 27% | 13% |  |
| Der Gevatter Tod | 44 | 1921 | 1108 | 14 | 53 | 71% | 53% |  |
| Die Bremer Stadtmusikanten | 27 | 1921 | 1184 | 9 | 49 | 33% | 16% | yes |
| Dornröschen | 50 | 1921 | 1216 | 5 | 45 | 60% | 60% |  |
| Der Hase und der Igel | 187 | 1921 | 1227 | 21 | 65 | 33% | 29% |  |
| Der Froschkönig oder der eiserne Heinrich | 1 | 1921 | 1278 | 15 | 52 | 53% | 36% | yes |
| Die kluge Bauerntochter | 94 | 1921 | 1288 | 2 | 49 | 0% | 0% |  |
| Der Stiefel von Büffelleder | 199 | 1921 | 1311 | 2 | 66 | 0% | 0% |  |
| Der Grabhügel | 195 | 1921 | 1328 | 11 | 68 | 18% | 7% |  |
| Rapunzel | 12 | 1921 | 1334 | 13 | 60 | 46% | 22% |  |
| Die drei Vügelkens | 96 | 1921 | 1358 | 14 | 72 | 29% | 19% |  |
| Daumerlings Wanderschaft | 45 | 1921 | 1465 | 8 | 82 | 38% | 11% |  |
| König Drosselbart | 52 | 1921 | 1529 | 12 | 85 | 0% | 0% |  |
| Der Geist im Glas | 99 | 1921 | 1630 | 6 | 73 | 17% | 19% |  |
| Marienkind | 3 | 1921 | 1763 | 8 | 67 | 25% | 22% |  |
| Der Bärenhäuter | 101 | 1921 | 1833 | 12 | 79 | 8% | 11% |  |
| Die drei Männlein im Walde | 13 | 1921 | 1854 | 36 | 87 | 81% | 62% |  |
| Hans im Glück | 83 | 1921 | 1871 | 30 | 91 | 60% | 31% |  |
| Sechse kommen durch die ganze Welt | 71 | 1921 | 1882 | 14 | 79 | 7% | 1% |  |
| Daumesdick | 37 | 1921 | 2071 | 23 | 105 | 52% | 28% |  |
| Das Wasser des Lebens | 97 | 1921 | 2084 | 16 | 81 | 25% | 22% |  |
| Brüderchen und Schwesterchen | 11 | 1921 | 2246 | 22 | 97 | 73% | 67% |  |
| Schneeweißchen und Rosenrot | 161 | 1921 | 2256 | 11 | 91 | 64% | 43% |  |
| Der Teufel mit den drei goldenen Haaren | 29 | 1921 | 2395 | 11 | 119 | 27% | 18% |  |
| Aschenputtel | 21 | 1921 | 2414 | 30 | 121 | 50% | 29% |  |
| Hänsel und Gretel | 15 | 1921 | 2664 | 30 | 131 | 70% | 68% | yes |
| Der treue Johannes | 6 | 1921 | 2812 | 19 | 106 | 47% | 35% |  |
| Sneewittchen | 53 | 1921 | 2834 | 41 | 155 | 63% | 32% |  |
| Von dem Fischer un syner Fru | 19 | 1921 | 2978 | 31 | 147 | 55% | 31% |  |
| Das tapfere Schneiderlein | 20 | 1921 | 2985 | 10 | 138 | 20% | 14% |  |
| Von dem Machandelboom | 47 | 1921 | 2990 | 58 | 135 | 41% | 21% |  |
| Märchen von einem, der auszog, das Fürchten zu lernen | 4 | 1921 | 3401 | 11 | 171 | 27% | 18% |  |
| Bruder Lustig | 81 | 1921 | 3821 | 51 | 176 | 47% | 30% |  |
| Tischchen Goldesel, Knüppel aus deck dich, und dem Sack | - | 1921 | - | - | - | - | - | not matched (no counterpart in Hunt's list) |

Low sentence-pair shares in Hunt's tales are the translation's doing: Hunt keeps the 1857 sentences but re-punctuates them, so the sentence counts differ. Those paragraphs carry the whole English paragraph(s) instead (`enPara`).

## Stage 4: Heidi, part 1

German: Project Gutenberg #7500, *Heidis Lehr- und Wanderjahre* (Gutenberg Projekt-DE text). Its spelling is modernised (*dass*, *musst*, *Tal*), so `historicalSpelling` is false; the edition it was taken from is not stated (an alternative transcription is #7511). The year 1880 is that of the book's first publication. English: Marian Edwardes, Project Gutenberg #1448 (the file lists her as "Marion Edwards"; the file gives no year, secondary sources give 1910), unabridged and in the same 14 chapters. The other public-domain translations on Project Gutenberg were not used: #20781 (Stork, 1915) is a free retelling about 40 % shorter than the German, #46409 (Abbott) omits text and renumbers the chapters.

Part 2 (German #7512, 10 chapters; Edwardes chapters XV to XXIII, 9 chapters) was not built: the brief asked for part 1 and the chapter divisions of the two books differ.

| id | German title | English title | words | paragraphs | sentences | paragraphs with pairs | sentences with pairs |
|---|---|---|---|---|---|---|---|
| heidi-1-01 | Zum Alm-Öhi hinauf | Up the Mountain to Alm-Uncle | 4293 | 50 | 141 | 34% | 23% |
| heidi-1-02 | Beim Großvater | At Home with Grandfather | 2470 | 39 | 112 | 69% | 41% |
| heidi-1-03 | Auf der Weide | Out with the Goats | 4265 | 84 | 203 | 58% | 38% |
| heidi-1-04 | Bei der Großmutter | The Visit to Grandmother | 4670 | 62 | 155 | 58% | 50% |
| heidi-1-05 | Es kommt ein Besuch und dann noch einer, der mehr Folgen hat | Two Visits and What Came of Them | 3669 | 59 | 122 | 73% | 57% |
| heidi-1-06 | Ein neues Kapitel und lauter neue Dinge | A New Chapter about New Things | 2622 | 53 | 112 | 77% | 77% |
| heidi-1-07 | Fräulein Rottenmeier hat einen unruhigen Tag | Fraulein Rottenmeier Spends an Uncomfortable Day | 4544 | 114 | 216 | 76% | 57% |
| heidi-1-08 | Im Hause Sesemann geht's unruhig zu | There is Great Commotion in the Large House | 3368 | 53 | 170 | 49% | 26% |
| heidi-1-09 | Der Hausherr hört allerlei in seinem Hause, das er noch nicht gehört hat | Herr Sesemann Hears of Things that are New to Him | 1940 | 42 | 78 | 57% | 37% |
| heidi-1-10 | Eine Großmama | Another Grandmother | 3229 | 60 | 127 | 58% | 57% |
| heidi-1-11 | Heidi nimmt auf einer Seite zu und auf der anderen ab | Heidi Gains in One Way and Loses in Another | 1836 | 22 | 44 | 59% | 34% |
| heidi-1-12 | Im Hause Sesemann spukt's | A Ghost in the House | 3689 | 62 | 159 | 58% | 41% |
| heidi-1-13 | Am Sommerabend die Alm hinan | A Summer Evening on the Mountain | 5712 | 80 | 207 | 42% | 24% |
| heidi-1-14 | Am Sonntag, wenn's läutet | Sunday Bells | 4736 | 63 | 160 | 40% | 31% |

## Method

1. Paragraphs are cut out of the Project Gutenberg texts at blank lines (lines of a paragraph are joined; a hyphen at a line end is kept, because Gutenberg proofreaders rejoin ordinary line-end hyphenation and what remains is a real compound hyphen).
2. Paragraphs are aligned with a length-based dynamic programme in the style of Gale & Church (1993). Allowed groups: 1-1, 1-2, 2-1, 1-0, 0-1 as specified, plus 2-2 and 1-k / k-1 up to k = 8. The wider groups are needed because the 1921 print puts several short speeches into one paragraph where Hunt starts a new paragraph for each; without them the English paragraphs drift against the German ones and the whole-paragraph fallback shows the wrong English (tested: 29 of 98 fallback paragraphs wrong against 10 of 113). The English/German length ratio c is measured per text; the variance is measured per text from the pairs of a first pass (generous start value 6.8, robust estimate between 1 and 6.8). Quotation marks and question marks that disagree add to a group's cost, because paragraph lengths alone are ambiguous in dialogue.
3. Each group is cut into sentences (quotation marks and abbreviations handled; the 1921 print's speaker-change dash " -- " ends a sentence and is not kept). **Sentence pairs are stored only when both sides have the same number of sentences and every pair has a believable length** (z-score against the text's own ratio at most 3.5, at most 15 % of the pairs further than 2.0, at most 15 % that turn a statement into a question or change the number of quotation marks, and the whole group within 0.65 to 1.55 of the expected length). Otherwise the German sentences are stored with the whole English paragraph(s) of the group (`enPara`); a German paragraph with no English counterpart gets `enPara: null`. No pairing is forced.
4. If the fine split gives different counts, the same test is made on a coarse split that keeps each quotation in one piece (a speech of three sentences and the words that introduce it become one entry). A group that fails is also tried joined with up to three neighbouring groups, because paragraph breaks sit in different places in the two books.
5. For the 1921 print two readings of the speech turns are tried: paragraphs as printed, and each speech as its own paragraph (the dash is dropped). The reading with more sentence pairs is kept (the tales where the split won are marked in the detail table).
6. The copy check: every `de`, `en` and `enPara` string is looked up in the whole source text (Gutenberg file, or the visible text of the wiki page) after removing only the layout marks. Result: 4088 strings checked, 0 not found.

What is removed from the sources (all of it layout, none of it words): `[Illustration]` lines; the `~` marks of spaced print in the 1921 print; the `_` marks around italic words in the German Heidi; footnote stars in Hunt (the notes themselves are not in the file) and the `* * * * * * *` divider lines; page numbers in the Wikisource text; wiki tags. Whitespace, including line breaks inside paragraphs and no-break spaces, becomes single spaces. Spelling, punctuation, capitals and quotation marks are untouched (the 1921 print uses » « , Heidi uses straight quotes, Hunt uses curly quotes).

## Detail per text

| id | c (EN/DE length) | variance | groups (German-English paragraphs) | joined with a neighbour | entries with the coarse split | German paragraphs without English (null) | English paragraphs dropped | turns split |
|---|---|---|---|---|---|---|---|---|
| wikibooks-wie-heisst-du-1 | 1.03 | 3.00 | 1-1: 6 | 0 | 0 | 0 | 0 |  |
| wikibooks-wie-heisst-du-2 | 0.93 | 3.00 | 1-1: 5 | 0 | 0 | 0 | 0 |  |
| wikibooks-bitte-buchstabieren-sie | 0.93 | 3.00 | 1-1: 5 | 0 | 0 | 0 | 0 |  |
| grimm-die-brautschau | 1.05 | 3.00 | 1-1: 1 | 0 | 0 | 0 | 0 |  |
| grimm-die-scholle | 0.99 | 3.00 | 1-1: 1, 2-1: 1 | 0 | 8 | 0 | 0 |  |
| grimm-der-suesse-brei | 1.03 | 3.00 | 1-1: 1 | 0 | 0 | 0 | 0 |  |
| grimm-die-sternthaler | 1.06 | 3.00 | 1-1: 1 | 0 | 0 | 0 | 0 |  |
| grimm-des-herrn-und-des-teufels-getier | 1.02 | 3.00 | 1-1: 1, 2-1: 1 | 0 | 0 | 0 | 0 |  |
| grimm-vom-tode-des-huehnchens | 1.02 | 1.00 | 5-1: 1 | 0 | 0 | 0 | 0 | yes |
| grimm-das-lumpengesindel | 0.97 | 3.00 | 1-1: 2 | 0 | 0 | 0 | 0 |  |
| grimm-rotkaeppchen | 1.02 | 1.04 | 1-1: 12, 1-2: 2, 1-4: 1, 2-3: 1, 5-9: 1 | 2 | 13 | 0 | 0 | yes |
| grimm-der-wolf-und-die-sieben-jungen-geisslein | 1.00 | 3.00 | 1-1: 6, 2-1: 1 | 0 | 12 | 0 | 0 |  |
| grimm-rumpelstilzchen | 0.97 | 3.00 | 1-1: 4, 4-9: 1 | 2 | 1 | 0 | 0 |  |
| grimm-die-wichtelmaenner | 0.99 | 3.00 | 1-1: 8, 3-1: 1 | 0 | 5 | 0 | 0 |  |
| grimm-frau-holle | 0.99 | 3.00 | 1-1: 2, 1-6: 1, 1-8: 1, 2-2: 1 | 0 | 1 | 0 | 0 |  |
| grimm-die-bremer-stadtmusikanten | 0.96 | 3.00 | 1-1: 3, 1-3: 2, 1-2: 1, 1-7: 1, 2-2: 1 | 1 | 0 | 0 | 0 | yes |
| grimm-der-froschkoenig | 0.98 | 3.00 | 1-1: 4, 2-1: 2, 2-2: 2, 3-3: 1 | 0 | 9 | 0 | 0 | yes |
| grimm-haensel-und-gretel | 1.00 | 1.00 | 1-1: 9, 2-1: 3, 2-2: 1, 3-2: 1, 4-1: 1, 6-4: 1 | 1 | 34 | 0 | 0 | yes |
| heidi-1-01 | 1.06 | 1.81 | 1-1: 16, 3-3: 6, 4-4: 2, 1-2: 1, 2-2: 1, 5-6: 1 | 3 | 8 | 0 | 0 |  |
| heidi-1-02 | 1.05 | 2.29 | 1-1: 24, 1-2: 1, 1-3: 1, 2-2: 1, 2-3: 1, 2-4: 1 | 4 | 3 | 0 | 0 |  |
| heidi-1-03 | 1.03 | 2.04 | 1-1: 45, 2-2: 4, 3-3: 2, 5-5: 2, 2-1: 1, 2-3: 1 | 6 | 6 | 0 | 0 |  |
| heidi-1-04 | 1.00 | 2.89 | 1-1: 29, 2-3: 3, 3-3: 3, 1-2: 1, 2-1: 1, 3-2: 1 | 5 | 17 | 0 | 0 |  |
| heidi-1-05 | 0.97 | 2.28 | 1-1: 41, 2-1: 3, 2-2: 3, 2-3: 1, 4-3: 1 | 4 | 9 | 0 | 0 |  |
| heidi-1-06 | 0.91 | 1.74 | 1-1: 33, 2-2: 2, 3-2: 2, 3-3: 1, 3-4: 1, 4-3: 1 | 4 | 25 | 0 | 0 |  |
| heidi-1-07 | 0.95 | 2.57 | 1-1: 65, 3-3: 4, 2-1: 3, 2-2: 3, 1-2: 2, 3-2: 2 | 10 | 25 | 0 | 0 |  |
| heidi-1-08 | 0.93 | 2.88 | 1-1: 16, 2-1: 2, 2-2: 2, 3-3: 2, 1-2: 1, 3-2: 1 | 6 | 1 | 0 | 0 |  |
| heidi-1-09 | 0.94 | 2.55 | 1-1: 24, 3-3: 3, 2-3: 1, 3-2: 1, 4-1: 1 | 2 | 8 | 0 | 0 |  |
| heidi-1-10 | 0.92 | 3.28 | 1-1: 32, 2-2: 3, 1-2: 2, 13-12: 1, 3-3: 1, 4-4: 1 | 6 | 4 | 0 | 0 |  |
| heidi-1-11 | 0.86 | 3.00 | 1-1: 13, 1-2: 2, 2-1: 1, 2-2: 1, 3-2: 1 | 1 | 2 | 0 | 0 |  |
| heidi-1-12 | 0.89 | 1.77 | 1-1: 29, 3-3: 4, 1-2: 1, 2-1: 1, 4-4: 1, 7-8: 1 | 5 | 9 | 0 | 0 |  |
| heidi-1-13 | 0.89 | 3.15 | 1-1: 32, 3-3: 3, 2-2: 2, 16-13: 1, 3-2: 1, 4-5: 1 | 9 | 4 | 0 | 0 |  |
| heidi-1-14 | 0.94 | 3.57 | 1-1: 22, 2-1: 5, 4-3: 2, 1-2: 1, 2-2: 1, 2-3: 1 | 7 | 0 | 0 | 0 |  |

## Spot checks

Pairs below are taken from the finished files at even spacing (the same ones every run), so that anyone can read them.

**wikibooks-wie-heisst-du-1** (Wie heißt du? (1. Teil) / What's your name? (1st Part))

- DE: Hallo, ich bin Franz.
  EN: Hello, I am Franz.
- DE: Wie heißt du?
  EN: What is your name?
- DE: Hallo, Franz.
  EN: Hello, Franz.
- DE: Ich heiße Greta.
  EN: My name is Greta.
- DE: Wie geht's?
  EN: How is it going?
- DE: Es geht mir gut.
  EN: I'm good.

**grimm-der-wolf-und-die-sieben-jungen-geisslein** (Der Wolf und die sieben jungen Geißlein / The Wolf and the Seven Little Kids)

- DE: Da ging der Wolf fort zu einem Krämer und kaufte sich ein großes Stück Kreide: die aß er und machte seine Stimme damit fein.
  EN: Then the wolf went away to a shopkeeper and bought himself a great lump of chalk, ate this and made his voice soft with it.
- DE: Und als ihm der Bäcker die Pfote bestrichen hatte, so lief er zum Müller und sprach: »Streu mir weißes Mehl auf meine Pfote.«
  EN: And when the baker had rubbed his feet over, he ran to the miller and said, “Strew some white meal over my feet for me.”
- DE: Als der Wolf endlich ausgeschlafen hatte, machte er sich auf die Beine, und weil ihm die Steine im Magen so großen Durst erregten, so wollte er zu einem Brunnen gehen und trinken.
  EN: When the wolf at length had had his sleep out, he got on his legs, and as the stones in his stomach made him very thirsty, he wanted to go to a well to drink.
- DE: Ich meinte, es wären sechs Geißlein, so sind's lauter Wackerstein.«
  EN: I thought ’t was six kids, But it’s naught but big stones.”

**grimm-haensel-und-gretel** (Hänsel und Gretel / Hansel and Grethel)

- DE: Die Kinder müssen fort, wir wollen sie tiefer in den Wald hineinführen, damit sie den Weg nicht wieder herausfinden; es ist sonst keine Rettung für uns.«
  EN: The children must go, we will take them farther into the wood, so that they will not find their way out again; there is no other means of saving ourselves!”
- DE: Und weil sie so müde waren, daß die Beine sie nicht mehr tragen wollten, so legten sie sich unter einen Baum und schliefen ein.
  EN: And as they were so weary that their legs would carry them no longer, they lay down beneath a tree and fell asleep.
- DE: Als Hänsel und Gretel in ihre Nähe kamen, da lachte sie boshaft und sprach höhnisch: »Die habe ich, die sollen mir nicht wieder entwischen.«
  EN: When Hansel and Grethel came into her neighborhood, she laughed maliciously, and said mockingly, “I have them, they shall not escape me again!”
- DE: Als sie aber ein paar Stunden gegangen waren, gelangten sie an ein großes Wasser.
  EN: When they had walked for two hours, they came to a great piece of water.

**heidi-1-03** (Auf der Weide / Out with the Goats)

- DE: "Da", tönte es von irgendwoher zurück.
  EN: "Here," called back a voice from somewhere.
- DE: "Und von wem bekommst du die Milch?", wollte Heidi wissen.
  EN: "And which do you get your milk from?" inquired Heidi.
- DE: Als ihn aber Peter hier in Sicherheit hatte, erhob er seine Rute und wollte ihn zur Strafe tüchtig durchprügeln, und der Distelfink wich scheu zurück, denn er merkte, was begegnen sollte.
  EN: Peter, now he had his goat in safety, lifted his stick in order to give her a good beating as punishment, and Greenfinch seeing what was coming shrank back in fear.
- DE: "Ist's alle Tage wieder so, alle Tage, wenn wir auf der Weide sind?", fragte Heidi, begierig nach einer bejahenden Versicherung horchend, als es nun neben dem Peter die Alm hinunterstieg.
  EN: "Is it like that every day, shall we see it every day when we bring the goats up here?" asked Heidi, as she clambered down the mountain at Peter's side; she waited eagerly for his answer, hoping that he would tell her it was so.

**heidi-1-13** (Am Sommerabend die Alm hinan / A Summer Evening on the Mountain)

- DE: "Heim?", wiederholte Heidi tonlos und wurde schneeweiß, und eine kleine Weile konnte es gar keinen Atem mehr holen, so stark wurde sein Herz von dem Eindruck gepackt.
  EN: "Home," murmured Heidi in a low voice, turning pale; she was so overcome that for a moment or two she could hardly breathe.
- DE: "So ist es dir schlecht gegangen, dass du schon wieder von so weit her heimkommst?"
  EN: "Didn't they treat you well down there that you have come back so soon?"
- DE: "Warum hast du denn dein schönes Röcklein ausgezogen?", fragte die Brigitte.
  EN: "Why have you taken off that pretty dress?" asked Brigitta.
- DE: "Nein, morgen nicht, aber übermorgen vielleicht, denn morgen muss ich zur Großmutter."
  EN: "Not to-morrow, but the day after perhaps, for to-morrow I must go down to grandmother."

## Problems and notes

- Wikibooks stage 2 is thin: 3 dialogues, 16 turns in all, about 140 German words. The rest of the course either has no translation of its dialogues or gives only word lists.
- Licence: Project Gutenberg texts are marked public domain (United States). The 1921 print was edited by M. Thilo-Luyken; the Grimms' text is public domain, and Project Gutenberg cleared the edition, but the editor's rights under German law were not checked. The Heidi German text is a modernised-spelling transcription; Project Gutenberg treats it as public domain. Wikibooks and Wikisource transcriptions are CC BY-SA 4.0 and need attribution (the files carry the page links and revision numbers).
- Spelling: stage 3 uses the 1921 print (modern spelling, but still the pre-1996 forms: *daß*, *Geißlein*, *zum zweitenmal*) for 12 tales and the 1857 text with historical spelling (*gieng*, *Thaler*, *Noth*) for 3. Heidi is in post-1996 spelling.
- Where the sentence counts do not match, the fallback shows the English paragraph(s) of the group. Where the two books break paragraphs at different places, that English can begin or end a sentence or two off.
- The Wikisource tales have their quotation marks in the 1857 style (a comma inside the closing mark, no colon before a speech); the sentence splitter handles it, but the pairs there are fewer because Hunt re-punctuated.
- Heidi: Edwardes' English is freer than Hunt's (clauses added or dropped), so more paragraphs fall back to `enPara` than in the Grimm tales with good sentence agreement.
- Hymn and verse passages (the Heidi hymn in chapter 14, the duck rhyme in Hänsel und Gretel) rarely have equal line counts and fall back to the English paragraph.
- Machine tools were used for splitting and aligning only; no pair was written or corrected by hand.
