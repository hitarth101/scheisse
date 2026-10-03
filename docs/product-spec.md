# German Learning App — Product Spec

Status: approved for design and build planning
Last updated: 2026-10-03
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
| **This app** | Daily ~30-minute practice hub, memory system, reading practice | iPhone |

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
- **Background audio:** WebKit (Safari's engine) marks background audio for home-screen web apps as fixed since iOS 15.4. Expected behavior: lectures keep playing with the screen locked, with lock-screen controls. **Must be tested on the user's iPhone in the first build step.** Fallback if it fails: keep the screen awake during playback (supported since Safari 18.4).
- **Storage:** all progress is stored on the phone, inside the home-screen app. Home-screen apps are exempt from Safari's 7-day data wipe, but iOS can still delete data under low storage or if the app is removed. **Therefore backup/export is mandatory** (see 4.7).
- **Storage isolation:** the home-screen app and Safari keep separate data on iOS. Features must never be split between the two (e.g. never send lectures to a Safari tab).
- **Lecture audio hosting:** 50 MP3 files, 367 MB total, 128 kbps stereo, ~6.4 hours. Plan: re-encode to mono ~64 kbps (≈185 MB). **Decided 2026-10-03 (owner):** the app and the MP3s are hosted on GitHub Pages from a public repository on a free GitHub account, so the MP3s are publicly visible. This replaces the earlier rule that they must not be publicly listed. Known risk: Language Transfer publishes no licence for re-hosting its audio; a takedown request is possible.
- **Content preparation:** large source datasets (e.g. Wiktionary, ~294 MB compressed) are processed once on the PC into small data files the app loads. The phone never downloads the raw datasets.
- **Speech:** the app does not grade pronunciation or listen to the learner in version 1. In speaking mode the learner says the answer aloud, reveals it, and grades themselves (standard Anki method).
- **Audio for cards:** human recordings where a source provides them (Tatoeba, Wikimedia Commons); otherwise the iPhone's built-in German voice (approved by the user).

## 4. Pages

Navigation structure is decided in the design spec. The pages are:

### 4.1 Today (home)

Purpose: remove daily decisions. One "Start session" button fills the daily time budget (default 30 minutes, adjustable).

Session order:
1. **Due reviews.** All cards due today. If due reviews alone would exceed the budget, the session caps them and carries the rest to tomorrow (stated plainly).
2. **New cards.** Up to the daily new-card limit (default 10), reduced automatically when reviews already use most of the budget.
3. **Main block,** chosen by this rule (the learner can swap it):
   - next unfinished Language Transfer track, while any remain;
   - otherwise the next Nicos Weg lesson (external link + "Mark done");
   - a reading block when a suitable text exists (see 4.5).

   **Swap** offers a choice from whichever of these are available today (next Language Transfer track, next Nicos Weg lesson, a suggested reading text). *(Approved design proposal, 2026-10-03.)*

When the learner returns to the app from an external lesson or topic link (Nicos Weg, Grimm Grammar, Schubert-Verlag), the app asks once: "Mark [lesson/topic] done?" *(Approved design proposal, 2026-10-03.)*

The page also shows, as plain facts: cards due now, what the main block will be, time spent today, and any Capture items waiting. When everything is done: a neutral "Done for today" state with when the next reviews are due. No praise.

Time estimates use the learner's own measured average seconds per card, not a fixed guess.

### 4.2 Lectures

- **List of 50 tracks** with track number, length, and status (not started / in progress with position / done). A track counts as done at ≥95% listened or when marked done manually.
- **Player:** play/pause (large — the course asks you to pause and think often), rewind 10 seconds, forward 10 seconds, playback speed (0.75×–1.5×), scrubber, resume from last position. Lock-screen controls.
- **Notes per track:** free-text notes, written after listening (the course itself advises not taking notes while listening).
- **After a track ends → "Sentences from this track" screen:**
  - Shows English → German sentence pairs taken from the volunteer-made transcript for that track. The transcript itself warns it contains many errors.
  - The learner ticks only the pairs that match what they heard, and may correct a pair before ticking.
  - Ticked pairs become sentence cards (see 5). Unticked pairs are discarded.
  - The screen can be skipped and revisited later from the track.

### 4.3 Review

One spaced-repetition queue (cards return just before you are likely to forget them). Scheduling uses **FSRS**, the open-source scheduling method used by Anki.

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
2. **Reference tables,** readable on a phone screen, sourced from Wiktionary and the Wikibooks German course (open license, attributed). Planned tables: definite and indefinite articles by case; personal pronouns by case; possessive words; prepositions grouped by case; adjective endings (three tables); present tense of sein, haben, werden and modal verbs.

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
- **Reading ladder:**

| Stage | Source | Approximate level | Notes |
|---|---|---|---|
| 1 | Tatoeba sentence sets | A1+ | Sentences chosen where the learner knows all but one word. Human English translations. |
| 2 | Wikibooks German course dialogues | A1–A2 | Short dialogues with English translations. Open license. Community-written; quality uneven. |
| 3 | Grimm fairy tales (Project Gutenberg) | B1+ | German original + public-domain 19th-century English translation. Loose translation → sentence alignment imperfect; paragraph-level fallback. |
| 4 | Longer public-domain books, e.g. Heidi (Project Gutenberg) | B1–B2 | Same caveats as stage 3. |

Known gap: no free source with English translations has been found for the A2–B1 range between stages 2 and 3. Reading will be thin there. Search continues during the build.

### 4.6 Capture

Fast inbox for phrases heard while watching German TV.

- One text field, opens with the keyboard ready. Optional: what you were watching.
- Later, from the inbox, each item is looked up against the app's sources (Tatoeba sentences and Wiktionary words/phrases):
  - **match found with English** → shown for confirmation → becomes a card;
  - **no match** → stays in the inbox marked "No source translation — ask tutor", with a button to open an outside dictionary. No machine translation.
- Items can be deleted.

### 4.7 Status and data

Plain facts only.

- **Review:** cards due today and over the next 7 days; total cards by state (new / learning / review / suspended); leech list; flagged-card list.
- **Words known** (definition in 6).
- **Time logged:** automatic for reviews, lectures and reading; manual entries for outside activities (TV, Nicos Weg, lessons). Shown by week, month and total.
- **Progress:** Language Transfer tracks done (x / 50); Nicos Weg lessons done; grammar topics read/practiced.
- **Backup:**
  - "Export backup" creates one file of all progress, saved via the iPhone share sheet (e.g. to iCloud Drive or Files).
  - "Restore from backup" loads that file.
  - Shows "Last backup: [date]" as a plain line.
- **Settings:** daily time budget; new cards per day; default answer mode; audio auto-play; voice speed; target memory rate (FSRS "desired retention", default 90%); engineering vocabulary on/off; display options defined by the design spec.
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

Adjective endings come later. Each blank type is unlocked by marking its grammar topic "practiced" (4.4).

### 5.4 Engineering vocabulary

A separate word deck of general engineering terms, **off by default**, enabled in Settings (suggested after A2). Source: Wiktionary entries labeled with engineering-related topics. IATE (the EU's free official terminology database) is an optional later addition; its download requires the user to create a free EU Login account.

### 5.5 Order of new words

1. Goethe A1 words, ordered by real-world frequency (DeReWo list from the Leibniz Institute for the German Language).
2. Goethe A2 words, same ordering.
3. Goethe B1 words, same ordering.
4. Beyond B1 (toward B2): most frequent DeReWo words not already covered.

Sentence and fill-in-the-blank cards are introduced alongside, using sentences made mostly of words already learned.

## 6. Definitions used by the app

- **Known word:** a word whose production card has reached a review interval of 21 days or more, or which the learner marked "known" in Reading. Status shows both counts separately. Word forms (e.g. "ging") count toward their base word ("gehen"), using Wiktionary's form data.
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
| LibriVox | Public-domain German audiobooks | Public domain | Imported where a matching text exists | Not yet |
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
- **Phase 1 — Core:**
  - Lectures (player, notes, sentence tick screen);
  - Review engine with word and sentence cards;
  - content import for Goethe lists, Wiktionary, Tatoeba and DeReWo;
  - basic Today (due reviews + next lecture);
  - backup/restore.
- **Phase 2:**
  - full Today session builder;
  - Capture;
  - Grammar path and reference tables;
  - fill-in-the-blank cards;
  - Status page;
  - dictionary links.
- **Phase 3:** Reading — Tatoeba sets, then Wikibooks dialogues, then Gutenberg books — with coverage estimates.
- **Phase 4:** engineering deck, LibriVox audio, IATE (optional), adjective-ending blanks.

## 10. Out of scope (version 1)

- Gamification of any kind (permanent).
- Push notifications.
- Pronunciation scoring or speech recognition.
- Writing practice. Needed later for B2; likely done with a tutor.
- Pronunciation trainer and tutor log (considered, not chosen).
- News sources without English.
- Machine translation or AI-written content (permanent).
- Multiple devices or sync.
- Offline mode.

## 11. Open items

1. Phase 0 phone test results (background audio, voice, storage).
2. ~~Private audio host choice.~~ Decided: GitHub Pages, public repository (see section 3).
3. Free A2–B1 reading source with English translations (gap).
4. Extract the Nicos Weg grammar topic order (needs the built-in browser).
5. Check that the A2/B1 Goethe PDFs extract cleanly.
6. ~~App name and icon~~ Name decided 2026-10-03: **Scheiße** (the owner's first German word and an inside joke). Icon decided 2026-10-03: Eszett key, refinement R1 "the tile is the key" (`design/logo/eszett-r1-tile-key.svg`).

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
