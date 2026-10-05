# Scheiße — Build Plan

Status: restructure (no sessions) and Phases 2–4 built and tested on the PC, published 2026-10-05; next is the owner's on-phone checklist (section 4, "Restructure and Phases 2–4")
Last updated: 2026-10-05

This plan covers **how** the app is built and shipped. **What** it does is in `docs/product-spec.md`; **how it looks** is in `design/design-spec.md` (being written). If this plan conflicts with the product spec, the product spec wins.

The owner does not read code. So the plan relies on three safety nets instead: automated tests on every change, a test run in Safari's own engine before anything is published, and a short on-phone checklist at the end of each phase.

---

## 1. Decisions

| Topic | Decision | Why |
|---|---|---|
| Host | **GitHub Pages**, public repository `hitarth101/scheisse` (owner decision) | Free, already set up, secure `https://` address the iPhone accepts. Public repo is required on a free account. |
| Address | `https://hitarth101.github.io/scheisse/` | GitHub's default for a repo named `scheisse`. The name on the home screen is "Scheiße" regardless. |
| Lecture MP3s | Committed to the repo, so publicly visible (owner decision) | See product spec section 3 for the known licence risk. |
| Technical approach | **TypeScript + Vite + React** | TypeScript catches mistakes before they reach the phone; React is the most widely used and tested way to build app screens; Vite packages the files for the host. |
| Stored data | **IndexedDB** (the browser's built-in database on the phone), through the small, widely used library **Dexie** | Holds cards, review history, progress and notes on the phone. |
| Scheduling | **ts-fsrs**, the official FSRS code from the FSRS authors | Same method Anki uses; no need to write our own. |
| Tests | **Vitest** for logic (scheduling, answer comparison, coverage %, backup); **Playwright** running **WebKit** (Safari's engine) at iPhone 14 Pro size for screens | Catches most problems on the PC before the phone sees them. |
| Publishing | **GitHub Actions**: on every push, run all tests, build, and publish to Pages. A failing test stops publishing. | The live app never receives a broken version. |
| Offline / service worker | None | Offline is not required (product spec section 3). Fewer moving parts. |
| Push notifications | None | Out of scope for version 1. |

## 2. Repository layout

The whole project folder `GERMAN/` becomes the repository.

```
GERMAN/
  docs/          product spec, build plan            (public)
  design/        design spec, mockups, icon files    (public)
  app/           the app's source code
  app/public/audio/   re-encoded lecture MP3s        (public)
  tools/         PC-side scripts that turn source datasets into small data files
  Language Transfer Lectures/   original MP3s — NOT uploaded (excluded)
```

Large raw datasets (Wiktionary dump, Tatoeba exports) stay on the PC and are never uploaded; only the small processed files are.

## 3. How a change reaches the phone

1. Change is made and all tests run on the PC.
2. The owner approves; the change is pushed to GitHub. (Nothing is pushed without the owner's OK.)
3. GitHub Actions re-runs the tests, builds and publishes, usually within a few minutes.
4. GitHub Pages caches files for about 10 minutes. The app checks a version number on launch and reloads itself once when a newer version is live, so the owner never has to reinstall.

## 4. Phases

Phase content follows product spec section 9.

### Phase 0 — Phone checks (done 2026-10-03)

A bare test page, not the app. It is published at the address above, added to the home screen, and run on the iPhone 14 Pro. Each check has Pass / Fail buttons; at the end, a "Copy results" button produces text to paste into the chat.

Product-spec checks:
1. Background audio: lecture keeps playing with the screen locked.
2. Lock-screen controls: title, play/pause, ±10 seconds.
3. Fallback: screen stays awake during playback.
4. Seeking and resume: jump to 3:20, close the app, reopen, position restored (also proves GitHub Pages streams MP3s correctly: Safari needs the host to send audio in pieces for seeking to work).
5. German voice: which German voices exist, and how one sounds on a real sentence (Tatoeba #2301788).
6. Storage: whether the phone grants "persistent" storage, how much space is available, and whether a saved record survives closing the app.

Design checks added (they decide details in the design spec):

7. Text size: whether the app's text follows the iPhone text-size setting.
8. Safe areas: content clears the Dynamic Island and home indicator.
9. Keyboard: whether a row of ä ö ü ß keys can sit directly above the iPhone keyboard.
10. Long-press: holding a sentence triggers the app's action without iOS's own text-selection menu.
11. Haptics: whether a light tap vibration is available (iOS offers this to websites only through a workaround).
12. Return from a link: the app notices when you come back from an outside website (for "Mark lesson done?").
13. Home screen: name shows as "Scheiße" with the R1 icon.

Only lecture 01 is uploaded for Phase 0.

**Results (2026-10-03, iPhone 14 Pro, iOS 18.7 / Safari 18.7.5, home-screen mode, dark mode):**

| # | Check | Result | Consequence |
|---|---|---|---|
| 13 | Home screen name and icon | Pass | — |
| 1 | Background audio | Pass | Persistent mini-player |
| 2 | Lock-screen controls | Pass | Media Session with ±10 s |
| 3 | Keep screen on | Pass | Not needed; not built |
| 4 | Seek and resume | Pass (host returns HTTP 206) | Resume positions as specified |
| 5 | German voice | Pass; 10 voices reported, most are Apple novelty voices | Default to Anna; prefer an installed enhanced/premium German voice; hide novelty voices; voice choice in Settings |
| 6 | Storage | Pass; persistent storage granted; 41.2 GB quota | Request persistence on first launch; backup stays mandatory |
| 7 | Text size | Pass | Type scale built on the iPhone text-size setting |
| 8 | Notch and home bar | Fail (visual); measured insets correct, 59 / 34 pt | Solid backdrop behind the status bar on scrolling screens; owner note pending |
| 9 | Keyboard key row | Pass | ä ö ü ß row above the keyboard in typed answers |
| 10 | Long-press | Pass | Long-press to add a sentence |
| 11 | Haptics | Pass via the switch-control workaround; standard vibration unavailable | Optional light tick; never relied on |
| 12 | Return from a website | Inconclusive: fired at 0 s, before the owner returned | "Mark done?" shown inline until answered; no detection |

### Phase 1 — Core

Lectures (player, mini-player or screen-awake fallback per Phase 0, notes, sentence-tick screen); review engine with word and sentence cards; content import (Goethe lists, Wiktionary, Tatoeba, DeReWo); basic Today; backup and restore. Built against the finished design spec.

**Built (2026-10-03/04), on branch `phase1`, not yet published:**

| Step | What | Where |
|---|---|---|
| 1 | App skeleton: Vite + React + TypeScript, design tokens from `f.css`, tab bar, status-bar backdrop (fixes Phase 0 check 8), update check | `app/` |
| 2 | Lectures: list, full player, mini-player, lock-screen controls, speed, resume, notes, 95% rule; backup export (share sheet) and restore with confirmation; Settings; Credits | `app/src/lectures`, `app/src/status` |
| 3 | Content import: 2,947 Goethe A1–B1 words with Wiktionary meanings, forms and recordings, ordered by DeReWo; 13,465 native-speaker Tatoeba sentence pairs; 485 transcript pairs for the tick screen | `tools/`, reports in `tools/out/` |
| 4 | Review: FSRS scheduling, word and sentence cards (say it, hear it), speak or type, typed-answer comparison, grading keys with intervals, undo, edit, suspend, flag, leeches, All forms sheet, iPhone-voice fallback | `app/src/review` |
| 5 | Tick screen (opens when a lecture ends) and Today (daily plan within the time budget) | `app/src/lectures/TickScreen.tsx`, `app/src/today` |

Tests: 27 logic tests (Vitest) and 28 screen tests (Playwright, WebKit, iPhone 14 Pro size, light and dark). The publishing job runs all of them before every publish. The 50 lectures are re-encoded to mono 64 kbps (184 MB; `tools/encode-lectures.sh`).

**Decisions made during the build** (none changes a feature in the product spec; listed so the owner can object). Items 1, 4 and 6 were replaced by the restructure (below); 2 and 5 were updated.

1. ~~Only the Today and Lectures tabs are shown until Reading, Grammar and Inbox exist.~~ All five tabs now exist.
2. "New cards per day" counts new items. Each item makes two cards: say it, and hear it, which is not counted against the limit. *Updated:* hear it now appears from the day after say it is first answered (before, the day after the card was made), so the two sides never meet on the same day.
3. New items: the next Goethe words by frequency, plus one Tatoeba sentence for every three words once a sentence exists whose words have all been introduced.
4. ~~Today's plan is fixed the first time the app is opened each day; reviews are capped on a heavy day.~~ No plan and no cap any more.
5. Time estimates start at 15 s per review and 35 s per new card, and switch to the owner's measured pace after 10 answers. Flashcards says so in its footnote until then.
6. ~~A card answered during a session comes back within the same session…~~ A missed card comes back when its few-minute step is up, and up to 20 minutes early when nothing else is left.
7. The 95% rule counts 5-second stretches actually played, so rewinding and re-listening never counts twice and skipping to the end does not count.
8. Tick screen wording adds: "where the student and the teacher differ, go by the teacher", because the transcript records the student's wrong attempts too.
9. The All forms sheet shows Wiktionary's forms exactly as listed (without articles); the mockup showed articles.
10. Recordings: Wikimedia Commons (via Wiktionary) for words; Tatoeba only under CC BY 4.0 or CC BY-NC 4.0. Unlicensed Tatoeba recordings are not used.
11. Austrian and Swiss variants in the Goethe lists are left out. The DeReWo list itself is never published (its licence forbids it without its documentation); only each word's position is.
12. The Phase 0 test page is no longer published; the app replaces it at the same address.
13. Imported content is stored as two whole lists on the phone (first import 0.7 s instead of minutes).

**Function words (decided by the owner 2026-10-04, product spec 5.5):** ordering by real-world frequency put function words first (*der, in, und, sein, werden, von, mit…*), some with grammar descriptions as their English. Articles and other article words, pronouns, prepositions and conjunctions now get no word card (99 words); they keep appearing in sentence cards. The first new words are now *sein, werden, haben, nicht, auch, können, aus, so, noch, nur*.

**On-phone checklist for Phase 1** (replaced by the checklist under "Restructure and Phases 2–4"; kept for the record):

1. Delete the Phase 0 icon. In Safari open `https://hitarth101.github.io/scheisse/`, Share, Add to Home Screen. Name "Scheiße", Eszett-key icon.
2. Lectures: scroll the list. No text shows behind the time and battery at the top (check 8).
3. Today on first launch: Reviews "None yet", New cards "10 · first Goethe A1 words", Lecture 01. "Loading word data" in the footnote disappears within a few seconds.
4. Start session: say the answer, Reveal, the word's recording plays, grade. Switch to Type: the ä ö ü ß row sits directly above the keyboard; typing "ue" for ü shows a note, not a mistake.
5. After the cards, "Continue: Lecture 01" starts the lecture. Lock the phone: it keeps playing; lock-screen ±10 s work.
6. Close the app completely and reopen: the mini-player shows the lecture at its position.
7. Play lecture 02 to its end (or skip close to the end and let it finish): the tick screen opens. Tick two pairs, Add 2 cards.
8. Track page notes: type a note, close the app, reopen: the note is there.
9. Status, Export backup: the share sheet opens; save to Files. "Last backup" shows today. Restore from that file: the confirm sheet names its date; Replace works.
10. iPhone text size at the largest accessibility size: the app follows; on a revealed card the grading keys become a 2 × 2 grid.
11. Dark mode.
12. On a track page, swipe from the left edge: goes back once.
13. Settings, iPhone voice: German voices listed (no novelty voices); choosing one speaks a sample sentence.
14. Tomorrow: Today shows due reviews and the "hear it" cards from today's words.

### Restructure and Phases 2–4 (built 2026-10-04/05)

The owner dropped the session format on 2026-10-04 (product spec 4.1): separate tabs, used at any time. Then Phases 2–4 were built.

| Part | What | Where |
|---|---|---|
| Restructure | Flashcards tab instead of Today: the one queue (due reviews most likely forgotten first, hear-it cards, then new cards up to the daily allowance, picked cards first), Add 5 more, the pause rule, every card with search and filter, a card page. Study is the old review screen as one continuous queue. Status is a tab. | `app/src/review/queue.ts`, `app/src/flashcards`, `app/src/review/ReviewSession.tsx` |
| Phase 2 | Capture and Inbox inside Flashcards; full Status (7-day forecast, cards by state, words known, time with outside entries, progress); Dictionaries; Grammar tab (topics in Nicos Weg order with Grimm Grammar and Schubert-Verlag links, the Nicos Weg lessons, reference tables); fill-in-the-blank cards | `app/src/inbox`, `app/src/status`, `app/src/grammar`, `app/src/review/cloze.ts`, `tools/build_grammar.py` |
| Phase 3 | Reading: library by known-word percentage; stage 1 daily Tatoeba set; 32 texts (3 Wikibooks dialogues; 15 Grimm tales, 12 from a 1921 edition and 3 from the 1857 edition with the Historical spelling chip; Heidi part 1 in 14 chapters), aligned by sentence where German and English agree and by paragraph elsewhere; LibriVox readings for 28 of them; reading view with sentence English, word popups, long-press to add, read-aloud, saved position | `app/src/reading`, `tools/build_reading.py`, `tools/build_reading_sources.py` |
| Phase 4 | Engineering deck (514 words, off by default); adjective-ending blanks; LibriVox German readings (14 Grimm tales, all 14 Heidi chapters), streamed from archive.org | `tools/build_content.py`, `tools/fetch_librivox.py`, `app/src/review/notes.ts` |
| Content | Nicos Weg A1–B1 (231 lessons, 147 topics), grammar links, blank positions in the sentence data, the engineering deck | `tools/sources/`, `tools/fetch_nicos_weg.py`, reports in `tools/out/` |

Not built: the Today session builder and Swap (dropped by the owner), and IATE (needs the owner's EU Login).

Tests: 37 logic tests (Vitest), including the queue rules (allowance, Add 5 more, picked cards first, hear-it timing, the pause rule), Inbox matching and fill-in-the-blank cards; 18 screen tests, each in light and dark (Playwright, WebKit, iPhone 14 Pro size), including the new tabs at phone width and names for VoiceOver on every new page.

**Decisions made during the build** (listed so the owner can object):

1. Pause rule: a day counts as heavy when its reviews, answered plus still due, would take longer than the set time ("Pause new cards after", which replaces the daily time budget). Measured that way, the pause can't switch on and off while you study.
2. Order inside the queue: missed cards whose few-minute step is up come before other due reviews, because their timing matters most; other due reviews come most-likely-forgotten first.
3. Flashcards keeps the Inbox and the + key for Capture (5 tabs is the most a tab bar fits). Capture returns to the page it was opened from.
4. Leeches and flagged cards moved from Status to Flashcards (filter "Suspended"), with the design's three decisions (return, edit, delete) on the card page.
5. Grammar has a third view, Lessons, for Nicos Weg progress ("Mark it done?" stays inline until answered). DW's B1 course is in German, so B1 names are German.
6. Prepositions by case come from the Wikibooks German course's table: Wiktionary's own case categories include regional uses (for example *bei* with the accusative) and would mislead.
7. Reference tables measure themselves and switch to one block per row whenever the columns don't fit (long forms such as *meinem*), not only at the largest text sizes.
8. Fill-in-the-blank positions are worked out on the PC from Wiktionary's tags, and checked by hand on samples: an article must stand before a noun, a preposition must be the word itself (not *dazu*), an adjective must stand before a noun (so *lieben* the verb isn't taken for an adjective). Verbs and adjectives show their base form as a hint.
9. Reading taps work in two steps: first a sentence (its English), then a word in it (its popup). Stage 1 picks sentences from words studied at least once, not only known words (no word is "known" for the first three weeks). Function words count as known in the percentage; names are left out.
10. Reading time is logged in 15-second steps while the reading page is in use (no input for 2 minutes stops the count).
11. The engineering deck uses only senses with a specific engineering label and none of the unrelated fields that share Wiktionary's "engineering" label (computing, firearms, aviation, law…); names, brands and Goethe words are left out.
12. The content version changed (blank positions, word positions for Reading, the engineering deck), so the phone imports the word data once more on first launch (a few seconds).
13. 44 grammar links cover only part of their topic (for example one of two prepositions); they were kept because each is a verified explanation of that part, and they are listed in `tools/out/nicos-weg-report.md`.
14. LibriVox readings are linked, not copied: they stream from archive.org. A reading may follow a slightly different edition from the text on screen; the reading view says so.

**On-phone checklist (after publishing):**

1. Open the app from the home screen. It reloads itself once for the new version. Tabs: Flashcards, Lectures, Reading, Grammar, Status.
2. Flashcards: Reviews and New cards rows with times; green Study key. Tap Study: cards come one after another; the header says how many are left. Close halfway, reopen Study: it continues where it was.
3. Answer cards until "Nothing due right now"; it says when the next reviews are, and offers "Add 5 more new cards".
4. Flashcards list: search a word you studied; open it; Suspend, then Return to reviews.
5. Lectures: open a lecture you finished; "Sentences (N)" opens the tick screen; tick two, Add 2 cards. Flashcards says "2 you picked come first"; Study shows them before other new words.
6. + on Flashcards: type a phrase heard on TV, save. The Inbox row shows it; open the Inbox: a match shows Review, otherwise "ask your tutor" with Dictionary.
7. Grammar: Topics in Nicos Weg order; open one, open Grimm Grammar, come back, "Mark this topic read?". Lessons: open one on DW, come back, "Mark it done?". Tables: open each; nothing scrolls sideways.
8. Mark the topic "Articles: definite" Practiced; after a few more new cards, a "Fill the gap" card appears.
9. Reading: stage 1 appears once a few words are studied. Open a Grimm tale: tap a sentence (English appears), tap a word in it (popup), hold a sentence (add sheet). The speaker key reads aloud. Leave and reopen: same place.
10. Status: 7-day forecast, cards by state, Add outside time (TV, 30 min), progress rows. Export backup still works.
11. Settings: "Pause new cards after", engineering vocabulary switch.
12. Largest text size and dark mode on Flashcards, a reference table and the reading view.

## 5. Open decisions

1. ~~Other copyrighted data in a public repo.~~ Decided 2026-10-03 (owner): the processed Goethe word data and the transcript pairs are published, with attribution, like the MP3s.
2. ~~Re-encoding the MP3s.~~ Done 2026-10-03: FFmpeg installed (winget), 50 lectures at mono 64 kbps, durations checked against the originals.
3. **Repository name** `scheisse` (GitHub addresses can't contain ß). Renaming later changes the app's address, so the app would have to be re-added to the home screen and progress restored from a backup.
4. ~~Function words as word cards.~~ Decided 2026-10-04: no word cards for them (Phase 1 above).
5. ~~LibriVox recordings~~ Done 2026-10-05: German readings for 14 Grimm tales and all 14 Heidi chapters, linked from archive.org (public domain).
6. **IATE** engineering terms need the owner's free EU Login account; nothing is built until then.
7. **Bigger Inbox lookup**: the Inbox searches only the app's 13,454 sentences. Adding all native-speaker Tatoeba pairs would find more TV phrases but adds several MB.
