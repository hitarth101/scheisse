# Scheiße — Build Plan

Status: Phase 1 built and tested on the PC; waiting for the owner's OK to publish, then the on-phone checklist (section 4)
Last updated: 2026-10-04

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

**Decisions made during the build** (none changes a feature in the product spec; listed so the owner can object):

1. Only the Today and Lectures tabs are shown until Reading, Grammar and Inbox exist (Phases 2–3), so no tab leads to an empty page.
2. "New cards per day" counts new items. Each item makes two cards: say it (today) and hear it (from the next day, not counted against the limit), so the two sides never meet in one session.
3. New items: the next Goethe words by frequency, plus one Tatoeba sentence for every three words once a sentence exists whose words have all been introduced.
4. Today's plan is fixed the first time the app is opened each day. On a heavy day, reviews are capped so the lecture still fits the daily time.
5. Time estimates start at 15 s per review and 35 s per new card, and switch to the owner's measured pace after 10 answers. Today says so in its footnote until then.
6. A card answered during a session comes back within the same session when its next step is due within 20 minutes (FSRS learning steps).
7. The 95% rule counts 5-second stretches actually played, so rewinding and re-listening never counts twice and skipping to the end does not count.
8. Tick screen wording adds: "where the student and the teacher differ, go by the teacher", because the transcript records the student's wrong attempts too.
9. The All forms sheet shows Wiktionary's forms exactly as listed (without articles); the mockup showed articles.
10. Recordings: Wikimedia Commons (via Wiktionary) for words; Tatoeba only under CC BY 4.0 or CC BY-NC 4.0. Unlicensed Tatoeba recordings are not used.
11. Austrian and Swiss variants in the Goethe lists are left out. The DeReWo list itself is never published (its licence forbids it without its documentation); only each word's position is.
12. The Phase 0 test page is no longer published; the app replaces it at the same address.
13. Imported content is stored as two whole lists on the phone (first import 0.7 s instead of minutes).

**Function words (decided by the owner 2026-10-04, product spec 5.5):** ordering by real-world frequency put function words first (*der, in, und, sein, werden, von, mit…*), some with grammar descriptions as their English. Articles and other article words, pronouns, prepositions and conjunctions now get no word card (99 words); they keep appearing in sentence cards. The first new words are now *sein, werden, haben, nicht, auch, können, aus, so, noch, nur*.

**On-phone checklist (after publishing):**

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

### Phase 2

Full Today session builder; Capture; Grammar path and reference tables; fill-in-the-blank cards; Status page; dictionary links.

### Phase 3

Reading: Tatoeba sets, then Wikibooks dialogues, then Gutenberg books, with coverage estimates.

### Phase 4

Engineering deck, LibriVox audio, IATE (optional), adjective-ending blanks.

Each phase ends with: all tests passing, a WebKit screen check against the design spec, and a short on-phone checklist for the owner.

## 5. Open decisions

1. ~~Other copyrighted data in a public repo.~~ Decided 2026-10-03 (owner): the processed Goethe word data and the transcript pairs are published, with attribution, like the MP3s.
2. ~~Re-encoding the MP3s.~~ Done 2026-10-03: FFmpeg installed (winget), 50 lectures at mono 64 kbps, durations checked against the originals.
3. **Repository name** `scheisse` (GitHub addresses can't contain ß). Renaming later changes the app's address, so the app would have to be re-added to the home screen and progress restored from a backup.
4. ~~Function words as word cards.~~ Decided 2026-10-04: no word cards for them (Phase 1 above).
