# German Learning App — Product Spec

Status: approved; restructured by the owner on 2026-10-04 (no sessions, separate tabs)
Last updated: 2026-10-05
Owner: hitarth101 (single user)

This document defines **what the app does**. It is the source of truth for the design chat and the build chat. The visual design lives in a separate design spec (`design/design-spec.md`). If the design needs a feature to change, it is proposed and this file is updated — features are not changed silently.

---

## 1. Purpose

A personal, free, iPhone-only study tool for learning German from zero, ideally to B2 (upper-intermediate), with no deadline and no exam. Motivation: possible relocation to Germany for work.

The app is one part of a wider routine:

| Activity | Role | Where it happens |
|---|---|---|
| Language Transfer "Complete German" (50 audio tracks) | Spoken foundation; builds sentences by thinking, not memorizing | In the app (Lectures) |
| DW "Nicos Weg" (free online course, A1–B1) | Structured course backbone after/alongside Language Transfer | External website; the app links to it and tracks progress |
| German-dubbed TV and films | Large amounts of listening | Own time; phrases captured in the app (Capture) |
| In-person lessons | Speaking practice and correction | Later; not built into the app |
| **This app** | Practice hub in separate tabs (flashcards, lectures, reading, grammar), used whenever and for as long as the learner likes; memory system; reading practice | iPhone |

## 2. Non-negotiable principles

1. **No gamification.** No XP, points, streaks, levels, badges, achievements, leaderboards, mascots, confetti, celebration animations, or guilt-trip messages. Numbers are shown only as plain facts.
2. **Only real, published content.** The app never contains German learning content written by an AI (words, sentences, translations, drills, explanations). Every item comes from a named published source.
3. **Every imported item must have an English translation from a real source.** No machine translation. If a source has no English, it is not imported.
4. **Recall over recognition.** The learner produces answers (out loud or typed). No multiple choice.
5. **One review queue.** Vocabulary, sentences, grammar and listening cards all live in one spaced-repetition system.
6. **Speaking first, typing supported.** Both answer modes are available on every card.
7. **Free to run.** No paid services, fonts or APIs.
8. **Calm by default.** No push notifications in version 1.

## 3. Platform and technical constraints

- **Device:** iPhone only, portrait only. No tablet or desktop layouts.
- **Form:** a website added to the iPhone home screen, where it opens full-screen like an app (a "home-screen web app"). Light and dark mode follow the phone setting.
- **Connectivity:** internet required. Offline use is not a requirement.
- **Background audio:** **Confirmed 2026-10-03** on the owner's iPhone 14 Pro (iOS 18.7, home-screen mode): lectures keep playing with the screen locked, and lock-screen controls (play/pause, ±10 s) work. The keep-awake fallback also works but is not needed.
- **Storage:** all progress is stored on the phone, inside the home-screen app. Home-screen apps are exempt from Safari's 7-day data wipe, but iOS can still delete data under low storage or if the app is removed. **Therefore backup/export is mandatory** (see 4.7).
- **Storage isolation:** the home-screen app and Safari keep separate data on iOS. Features must never be split between the two (e.g. never send lectures to a Safari tab).
- **Lecture audio hosting:** 50 MP3 files, 367 MB total, 128 kbps stereo, ~6.4 hours. Plan: re-encode to mono ~64 kbps (≈185 MB). **Decided 2026-10-03 (owner):** the app and the MP3s are hosted on GitHub Pages from a public repository on a free GitHub account, so the MP3s are publicly visible. This replaces the earlier rule that they must not be publicly listed. Known risk: Language Transfer publishes no licence for re-hosting its audio; a takedown request is possible.
- **Content preparation:** large source datasets (e.g. Wiktionary, ~294 MB compressed) are processed once on the PC into small data files the app loads. The phone never downloads the raw datasets.
- **Speech:** the app does not grade pronunciation or listen to the learner in version 1. In speaking mode the learner says the answer aloud, reveals it, and grades themselves (standard Anki method).
- **Audio for cards:** human recordings where a source provides them (Tatoeba, Wikimedia Commons); otherwise the iPhone's built-in German voice (approved by the user).

## 4. Pages

**Tabs** (owner decision 2026-10-04): Flashcards · Lectures · Reading · Grammar · Status. There are no sessions: every tab can be used at any time, in any order, and nothing waits for anything else. The look of each page is in the design spec.

### 4.1 Flashcards (replaces Today, owner decision 2026-10-04)

There are no sessions. Flashcards shows what the one review queue (4.3) holds right now as plain facts, one **Study** key, and every card.

- **Study** opens the review screen. Cards keep coming until nothing is left; closing at any point loses nothing, because every grade is saved the moment it is given.
- **Order of cards:**
  1. missed cards whose few-minute step is up;
  2. due reviews, most likely forgotten first;
  3. "hear it" cards of items whose "say it" card was first answered on an earlier day;
  4. new cards up to today's allowance: cards the learner picked (ticked lecture sentences, Reading, Inbox) first, oldest first; then the next items in learning order (5.5).
  Missed cards coming back within 20 minutes are shown early when nothing else is left.
- **New-card allowance:** "New cards per day" (default 10). Picked cards count toward it. "Add 5 more new cards today" raises it for that day only.
- **Pause rule:** when a day's reviews (answered plus still due) take longer than "Pause new cards after" (default 30 minutes, at the learner's measured pace), new cards pause for the rest of that day, so the following days don't grow. "Add 5 more" still works.
- **Facts on the page:** reviews due and their estimated time; new cards left today, paused or done (and picked cards waiting for tomorrow); when missed cards come back; next reviews when nothing is due; time today; last backup. A first-run notice points to Restore from backup.
- **All cards:** search in German or English (umlauts optional), a filter (all cards, words, sentences, from lectures, suspended), newest first. A card page shows both sides with their state, the source, Suspend / Return to reviews, Edit and Delete. Leeches and flagged cards are found under Suspended.
- **Inbox** (4.6) is reached from here; the + key opens Capture.

Dropped with Today: the session builder, Swap, the main block, "Reviews only", the fixed daily plan and the review cap.

### 4.2 Lectures

- **List of 50 tracks** with track number, length, and status (not started / in progress with position / done). A track counts as done at ≥95% listened or when marked done manually.
- **Player:** play/pause (large — the course asks you to pause and think often), rewind 10 seconds, forward 10 seconds, playback speed (0.75×–1.5×), scrubber, resume from last position. Lock-screen controls.
- **Notes per track:** free-text notes, written after listening (the course itself advises not taking notes while listening).
- **After a track ends → "Sentences from this track" screen:**
  - Shows English → German sentence pairs taken from the volunteer-made transcript for that track. The transcript itself warns it contains many errors.
  - The learner ticks only the pairs that match what they heard, and may correct a pair before ticking.
  - Ticked pairs become sentence cards (see 5). Unticked pairs are discarded.
  - The screen can be skipped and revisited later from the track.
- Sentences can be chosen at any time from the track page ("Sentences (N)"); the page says how many of the lecture's sentences are already cards. Ticked sentences come first among new cards and use the daily allowance (owner decision 2026-10-04).

### 4.3 Review

One spaced-repetition queue (cards return just before you are likely to forget them). Scheduling uses **FSRS**, the open-source scheduling method used by Anki.

Opened with **Study** on the Flashcards tab (4.1); its header shows how many cards are left right now. When nothing is left it says so, with when the next reviews are due, and offers "Add 5 more new cards". A "hear it" card first appears the day after its "say it" card was first answered, so the two sides of an item never meet on the same day.

- **Answer modes**, switchable per session and remembered:
  - *Speak:* see prompt → say the answer aloud → tap to reveal.
  - *Type:* see prompt → type the answer → app shows the correct answer with differences highlighted.
- **Grading:** the learner always grades themselves: Again / Hard / Good / Easy. In type mode the app shows the comparison but does not grade automatically. Typing "ae/oe/ue/ss" for "ä/ö/ü/ß" is shown as a note, not an error. Capital letters on nouns are shown as a difference (they matter in German).
- **During review:** play audio (auto-play setting), undo last grade, edit card, suspend card, flag card as wrong source data.
- **Flagged cards** are suspended and listed in Status next to leeches, for the learner to decide on. *(Approved design proposal, 2026-10-03.)*
- **One audio source at a time:** starting Review, or playing any card audio, pauses a playing lecture; the mini-player shows it as paused. *(Approved design proposal, 2026-10-03.)*
- **Leeches** (cards failed 8 times): automatically suspended and listed in Status for the learner to decide on. Stated neutrally.
- Card types are defined in section 5.

### 4.4 Grammar

Two parts:

1. **Topic path.** Grammar topics in the order Nicos Weg introduces them (A1 → A2 → B1). Each topic has:
   - links to the Nicos Weg grammar page, the matching Grimm Grammar page (University of Texas), and matching Schubert-Verlag exercises;
   - a status the learner sets: not started / read / practiced;
   - marking a topic "practiced" unlocks its related fill-in-the-blank card type, if one exists (see 5.3).
   The topic list itself is copied from Nicos Weg's structure at build time (topic names and links only, not their content).
2. **Reference tables,** readable on a phone screen, sourced from Wiktionary and the Wikibooks German course (open license, attributed): definite and indefinite articles by case; personal pronouns by case; possessive words; prepositions grouped by case (the Wikibooks course's table, meanings from Wiktionary); adjective endings after der-words, after ein-words and without an article (Wiktionary's declension of *gut*); present tense of sein, haben, werden and the modal verbs. Where the columns don't fit the screen, each row becomes its own block.
3. **Lessons** (owner decision 2026-10-04: with Today gone, Nicos Weg progress lives here): every Nicos Weg lesson A1–B1 in DW's order, opening on DW's website. After a lesson is opened, "Mark it done?" stays inline until answered.

The Grammar tab shows these as three views: Topics, Lessons, Tables.

Per-word tables (all forms of a specific verb or noun) are shown from Wiktionary data in the word popup and on card backs.

### 4.5 Reading

Goal: build reading ability with a German text and its English translation available to cross-check, while forcing an attempt before checking.

- **Coverage estimate:** before opening a text, show what % of its words the learner already knows (see "known word" in 6). Texts are sorted by this number, and a text is suggested when coverage is roughly 90% or more.
- **Reading view:**
  - German text, English hidden by default.
  - Tap a sentence → reveal its English translation.
  - Tap a word → popup with English meaning(s), gender and plural for nouns, key verb forms, buttons: "Add as card", "Mark as known", "Open in dictionary".
  - Long-press a sentence → add it as a sentence card. The German/English pair is shown for confirmation first, because translations of older books don't always line up sentence by sentence.
  - Audio playback where available (human recording or iPhone voice).
  - Reading position saved per text.
  - Tapping works in two steps: tap a sentence for its English; tap a word in that (highlighted) sentence for its popup. Tapping the sentence again hides the English. *(Build decision 2026-10-05, so the two taps never compete.)*
  - Reading time is logged automatically while the page is in use.
- **Reading ladder:**

| Stage | Source | Approximate level | Notes |
|---|---|---|---|
| 1 | Tatoeba sentence sets | A1+ | A daily set of up to 20 sentences in which the learner has studied every word but one (a word counts once any of its cards has been answered), function words aside. Human English translations. |
| 2 | Wikibooks German course dialogues | A1–A2 | Short dialogues with English translations. Open license. Community-written; quality uneven. |
| 3 | Grimm fairy tales (Project Gutenberg) | B1+ | German original + public-domain 19th-century English translation. Loose translation → sentence alignment imperfect; paragraph-level fallback. |
| 4 | Longer public-domain books, e.g. Heidi (Project Gutenberg) | B1–B2 | Same caveats as stage 3. |

Known gap: no free source with English translations has been found for the A2–B1 range between stages 2 and 3. Reading will be thin there.

For the known-word percentage, articles, pronouns, prepositions and conjunctions count as known, because they get no word card (5.5) and the courses teach them first. Names are not counted.

### 4.6 Capture

Fast inbox for phrases heard while watching German TV. Reached from the Flashcards tab (+ key and the Inbox row); after saving, Capture returns to where it was opened.

- One text field, opens with the keyboard ready. Optional: what you were watching.
- Later, from the inbox, each item is looked up against the app's sources (Tatoeba sentences and Wiktionary words/phrases):
  - **match found with English** → shown for confirmation → becomes a card;
  - **no match** → stays in the inbox marked "No source translation — ask tutor", with a button to open an outside dictionary. No machine translation.
- Items can be deleted.
- Matching uses only the app's own data: a Tatoeba sentence that is the phrase (rough spelling allowed: umlauts, "ue"/"ss", a few wrong letters), or the shortest one containing it; a single word matches its Goethe word, also through its forms, except function words. The sentence data holds the 13,454 sentences made of Goethe A1–B1 words, so many TV phrases will have no match.

### 4.7 Status and data

A tab (owner decision 2026-10-04). Plain facts only.

- **Review:** cards due today and over the next 7 days; total cards by state (new / learning / review / suspended). The leech and flagged lists are under Suspended on the Flashcards tab.
- **Words known** (definition in 6).
- **Time logged:** automatic for reviews, lectures and reading; manual entries for outside activities (TV, Nicos Weg, lessons). Shown by week, month and total.
- **Progress:** Language Transfer tracks done (x / 50); Nicos Weg lessons done; grammar topics read/practiced.
- **Backup:**
  - "Export backup" creates one file of all progress, saved via the iPhone share sheet (e.g. to iCloud Drive or Files).
  - "Restore from backup" loads that file.
  - Shows "Last backup: [date]" as a plain line.
- **Settings:** new cards per day; pause new cards after (minutes of reviews in a day, default 30; replaces the daily time budget); default answer mode; audio auto-play; voice speed; target memory rate (FSRS "desired retention", default 90%); engineering vocabulary on/off; display options defined by the design spec.
- **Dictionary links:** dict.cc, Leo, DWDS, Wiktionary.
- **Credits:** required attributions for open-license sources (Tatoeba, Wiktionary, Wikibooks, IATE if used).

## 5. Card system

A **note** is one item of content (a word, a sentence). One note can produce more than one **card** (e.g. one card to say it, one to understand it by ear).

### 5.1 Word notes

Source: Goethe-Institut word lists (A1, A2, B1) for the word, article, plural and level. English meanings and word forms from Wiktionary. Example sentence from Tatoeba where a native-speaker sentence containing the word exists.

| Card | Prompt | Expected answer |
|---|---|---|
| Production | English meaning + word type (+ short hint if another card has the same English) | German word; nouns **with article and plural** (e.g. der Tisch, die Tische); verbs as infinitive |
| Listening | German audio (and text revealed after) | English meaning |

Card back shows: all key forms (verb forms, noun plural), example sentence with English, audio.

A word with no English meaning in Wiktionary is skipped.

### 5.2 Sentence notes

Sources: Tatoeba (native-speaker German with human English), ticked Language Transfer transcript pairs, confirmed Reading and Capture items.

| Card | Prompt | Expected answer |
|---|---|---|
| Production | English sentence | German sentence (main card type, mirrors the Language Transfer method) |
| Listening | German audio | English meaning |

### 5.3 Fill-in-the-blank (grammar) notes

A real Tatoeba sentence with one word removed. The answer is always the original word, so no German is invented. English translation shown as a hint.

Version 1 blank types:
- articles (closed list: der, die, das, den, dem, des, ein, eine, …);
- prepositions;
- the conjugated verb.

- adjective endings (an adjective with an ending, before a noun).

Each blank type is unlocked by marking its grammar topic "practiced" (4.4). Which word may be removed is worked out on the PC from Wiktionary's grammar tags: an article directly before a noun; a preposition (not a split-off verb prefix at the end of the sentence, not *zu* before a verb); a conjugated verb (present or past, with a person); an adjective with an ending before a noun. The card shows the English and, for verbs and adjectives, the base form as a hint. Fill-in-the-blank cards have no listening side and can't be edited, so the source sentence stays exact.

### 5.4 Engineering vocabulary

A separate word deck of general engineering terms, **off by default**, enabled in Settings (suggested after A2). Source: Wiktionary entries labeled with engineering-related topics. IATE (the EU's free official terminology database) is an optional later addition; its download requires the user to create a free EU Login account.

Built (2026-10-05): 514 words, most frequent first (DeReWo). A sense counts when it carries a specific engineering label (engineering, mechanical or electrical engineering, manufacturing, construction, tools, physics, electronics and similar) and none of the unrelated fields that share Wiktionary's "engineering" label (computing, firearms, aviation, law…). Only those senses' English is used; names, brands and Goethe words are left out. When on, one engineering word joins every three new words.

### 5.5 Order of new words

1. Goethe A1 words, ordered by real-world frequency (DeReWo list from the Leibniz Institute for the German Language).
2. Goethe A2 words, same ordering.
3. Goethe B1 words, same ordering.
4. Beyond B1 (toward B2): most frequent DeReWo words not already covered.

Sentence and fill-in-the-blank cards are introduced alongside, using sentences made mostly of words already learned: one Tatoeba sentence for every three words, and, once a blank type is unlocked, one fill-in-the-blank card for every three words (the type with the fewest cards first). With the engineering deck on, one engineering word joins every three words.

**Function words get no word card** *(owner decision, 2026-10-04)*: articles and other article words (der, ein, mein, dieser, kein…), pronouns, prepositions and conjunctions are left out of word cards (99 of the 2,947 imported words). Language Transfer teaches them, noun cards drill the articles, and they keep appearing in sentence cards; a sentence counts as "made of learned words" when its other words are learned. Word types follow Wiktionary, so a few content-like words it files as pronouns are also left out (viel, mehr, nichts, etwas, jemand, niemand).

## 6. Definitions used by the app

- **Known word:** a word whose production card has reached a review interval of 21 days or more, or which the learner marked "known" in Reading. Status shows both counts separately. Word forms (e.g. "ging") count toward their base word ("gehen"), using Wiktionary's form data. Engineering-deck words count too. For the Reading percentage only, function words count as known (4.5).
- **Due:** FSRS says the card should be reviewed today.
- **Leech:** a card failed 8 times in total.

## 7. Content sources

Rule: open-license or public-domain data is **imported**; free but copyrighted material is **linked**, with progress tracked in the app.

| Source | Provides | License | Use | Access checked? |
|---|---|---|---|---|
| Language Transfer audio (user's files) | 50 lecture tracks | Free from Language Transfer; no published licence for re-hosting | Imported, hosted publicly on GitHub Pages (owner decision 2026-10-03) | Yes — files inspected |
| Language Transfer transcript (volunteer PDF) | English/German pairs per track | Free; contains many errors | Imported only through tick-to-verify | Yes — read |
| Goethe-Institut word lists A1/A2/B1 | Word, article, plural, level | Copyrighted, free download | Word entries only, personal use | A1 yes (text-encoding fix needed); A2/B1 not yet |
| DeReWo (IDS Mannheim) | Word frequency ranking | Free | Ordering only | Download page found; not yet downloaded |
| Wiktionary via kaikki.org | English meanings, gender, plural, word forms, topic labels, pronunciation audio links | CC BY-SA | Imported (processed on PC) | Yes — 294 MB compressed file listed |
| Tatoeba | German–English sentence pairs; some human audio | CC BY 2.0 FR (text); audio license per recording | Imported; German sentences only from self-reported native speakers (level 5) | Yes — downloads page |
| Wikimedia Commons / Lingua Libre | Human word pronunciations | Open licenses | Imported where available | Not yet |
| Wikibooks German course | A1–A2 dialogues with English; grammar tables | CC BY-SA 3.0 | Imported, attributed | Pages found; not inspected in depth |
| Project Gutenberg | German originals + public-domain English translations (Grimm, Heidi) | Public domain (US) | Imported | Titles found; not yet downloaded |
| LibriVox | Public-domain German audiobooks | Public domain | Linked where a matching text exists: streamed from archive.org for 14 Grimm tales and all 14 Heidi chapters | Yes (2026-10-05) |
| iPhone German voice | Fallback audio | Built into iOS | On device | To test on user's phone |
| DW Nicos Weg | Course backbone, grammar topic order | Copyrighted, free | **Linked** | Site blocks automated fetch; will read with the built-in browser at build time |
| Grimm Grammar (UT Austin) | Grammar explanations and exercises | CC BY-NC-ND (no modifications) | **Linked** | Not yet |
| Schubert-Verlag online exercises | Grammar drills A1–C2 | Copyrighted, free | **Linked** | Not yet |
| IATE | Engineering terminology DE–EN | Reuse allowed with attribution | Optional later; needs user's EU Login | Not yet |
| dict.cc, Leo, DWDS, Wiktionary | Dictionary lookups | — | **Linked** | — |

Dropped because they have no English translation: Nachrichtenleicht, DW Top-Thema, DW slow news.

Every imported item keeps a record of its source, so it can be traced and attributed.

## 8. Method basis (why the app works this way)

| Principle | Source | Applied in |
|---|---|---|
| Recalling beats re-reading and recognizing | Roediger & Karpicke 2006 | Production cards; no multiple choice |
| Spaced review beats cramming | Cepeda et al. 2006 | FSRS scheduling |
| Mixed practice beats blocked practice | Kornell & Bjork 2008 | One mixed queue |
| Understandable input drives acquisition | Krashen | Reading ladder, lectures, TV |
| Producing language exposes gaps | Swain | Speak/type answers |
| You learn what you notice | Schmidt | Capture, sentence mining in Reading |
| ~95–98% known words needed to read comfortably | Hu & Nation 2000 | Coverage estimate |

## 9. Build phases

- **Phase 0 — Phone checks** (before building features):
  - background audio with the screen locked;
  - lock-screen controls;
  - availability of the German voice;
  - whether storage can be marked persistent;
  - audio hosting on GitHub Pages works (streaming and seeking).
- **Phase 1 — Core** (done 2026-10-04):
  - Lectures (player, notes, sentence tick screen);
  - Review engine with word and sentence cards;
  - content import for Goethe lists, Wiktionary, Tatoeba and DeReWo;
  - basic Today (due reviews + next lecture);
  - backup/restore.
- **Restructure** (owner decision 2026-10-04, done 2026-10-05): Flashcards tab instead of Today and sessions (4.1); Status as a tab.
- **Phase 2** (done 2026-10-05, the session builder dropped):
  - ~~full Today session builder~~ (replaced by the restructure);
  - Capture;
  - Grammar path and reference tables;
  - fill-in-the-blank cards;
  - Status page;
  - dictionary links.
- **Phase 3** (done 2026-10-05): Reading — Tatoeba sets, then Wikibooks dialogues, then Gutenberg books — with coverage estimates.
- **Phase 4:** engineering deck (done), adjective-ending blanks (done), LibriVox audio (done), IATE (optional; not built, needs the owner's EU Login).

## 10. Out of scope (version 1)

- Gamification of any kind (permanent).
- Sessions and daily plans (owner decision 2026-10-04).
- Push notifications.
- Pronunciation scoring or speech recognition.
- Writing practice. Needed later for B2; likely done with a tutor.
- Pronunciation trainer and tutor log (considered, not chosen).
- News sources without English.
- Machine translation or AI-written content (permanent).
- Multiple devices or sync.
- Offline mode.

## 11. Open items

1. ~~Phase 0 phone test results~~ Done 2026-10-03 on iPhone 14 Pro, iOS 18.7, home-screen mode: background audio, lock-screen controls, keep-awake, seek/resume, German voices, persistent storage (granted; 41 GB quota), text size, keyboard key row, long-press, haptic tick all pass. Return-from-link detection was inconclusive (fired immediately), so the "Mark done?" prompt is shown inline until answered instead of relying on detection. Safe-area values correct (59/34 pt); visual check pending owner note. Details: `docs/build-plan.md` section 4.
2. ~~Private audio host choice.~~ Decided: GitHub Pages, public repository (see section 3).
3. Free A2–B1 reading source with English translations (gap).
4. ~~Extract the Nicos Weg grammar topic order.~~ Done 2026-10-05: A1, A2 and B1 (231 lessons), `tools/sources/nicos-weg.json`.
5. ~~Check that the A2/B1 Goethe PDFs extract cleanly.~~ Done 2026-10-03: A1, A2 and B1 headword columns extract cleanly; 2,947 words imported, the rest listed in `tools/out/content-report.md`.
6. ~~App name and icon~~ Name decided 2026-10-03: **Scheiße** (the owner's first German word and an inside joke). Icon decided 2026-10-03: Eszett key, refinement R1 "the tile is the key" (`design/logo/eszett-r1-tile-key.svg`).
7. The Inbox searches only the app's own sentence data (sentences made of Goethe A1–B1 words). A larger Tatoeba lookup would find more TV phrases but costs download size.
8. IATE needs the owner's EU Login before it can be added.

## 12. Notes for the design chat

- **Tone:** serious, calm, professional study tool; closer to a well-made reference book than a game. See principle 1.
- **Text:**
  - German is primary; English is secondary and usually hidden until asked for.
  - Long German compound words need proper hyphenation and wrapping on a narrow screen.
  - Umlauts and ß must render well.
- **Noun gender:** every noun has a gender (der/die/das). Recommend whether and how to mark it visually (a common learning aid). Must not rely on color alone (accessibility).
- **One-handed use:** frequent actions (reveal, grade buttons, play/pause) belong within thumb reach.
- **States to design for every page:** empty (e.g. no cards yet), nothing due, loading, error (e.g. audio failed to load), done for today.
- **Persistent lecture player:** design a mini-player that stays visible while moving around the app, assuming background audio works (to be confirmed in Phase 0).
- **Accessibility:** iPhone text-size setting (Dynamic Type), contrast in light and dark mode, minimum tap-target size.
- **Fonts:** free only (system or Google Fonts). Must have full German character support.

## Glossary

- **Spaced repetition:** showing each card again just before you are likely to forget it; gaps grow as you remember better.
- **FSRS:** the open-source scheduling method (used by Anki) that decides when each card is due.
- **Fill-in-the-blank / cloze card:** a sentence with one word removed for you to supply.
- **Coverage:** the share of words in a text you already know.
- **Home-screen web app:** a website saved to the iPhone home screen that opens full-screen like an app.
- **CC BY / CC BY-SA:** open licenses that allow reuse with credit (SA: shared versions keep the same license).
