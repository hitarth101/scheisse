# Scheiße — Build Plan

Status: draft for owner approval
Last updated: 2026-10-03

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

### Phase 0 — Phone checks (next)

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

### Phase 2

Full Today session builder; Capture; Grammar path and reference tables; fill-in-the-blank cards; Status page; dictionary links.

### Phase 3

Reading: Tatoeba sets, then Wikibooks dialogues, then Gutenberg books, with coverage estimates.

### Phase 4

Engineering deck, LibriVox audio, IATE (optional), adjective-ending blanks.

Each phase ends with: all tests passing, a WebKit screen check against the design spec, and a short on-phone checklist for the owner.

## 5. Open decisions

1. **Other copyrighted data in a public repo.** Besides the MP3s, the Goethe-Institut word lists (marked "personal use" in the product spec) and the volunteer Language Transfer transcript would also become public once processed into the repo. Options: publish them too (same kind of risk as the MP3s), or keep them off GitHub and load them onto the phone once from a file (no exposure, one extra setup step, covered by backup). **Needed before Phase 1 content import.**
2. **Re-encoding the MP3s** to mono 64 kbps (halves size and loading time) needs the free tool FFmpeg installed on the PC (download via Windows' own `winget` installer). Not needed for Phase 0, which uses the original lecture 01. **Needed before Phase 1.**
3. **Repository name** `scheisse` (GitHub addresses can't contain ß). Change now if wanted; renaming later changes the app's address, so the app would have to be re-added to the home screen and progress restored from a backup.
