# Product

<!-- impeccable:product-schema 1 -->

The authority for what the app does is `docs/product-spec.md`. This file is a short design-facing summary; where they differ, the product spec wins. Design needs that would change a feature are listed as proposals, never applied silently.

## Platform

web

iPhone-only home-screen web app (a website saved to the home screen, run in Safari's standalone mode). No desktop or tablet layouts. Primary device: iPhone 14 Pro (393 × 852 pt, Dynamic Island). Planned next device: iPhone 18 Pro (exact size unknown at time of writing; iPhone 17 Pro, 402 × 874 pt, is the stand-in). Layouts must be fluid between those widths and remain usable down to 375 pt.

## Stack

Decided in a separate build chat. This project folder holds the design spec only (`design/`).

## Users

One user: the owner. Mechanical-engineering background, new to software, learning German from zero. Goal B2 eventually, no deadline, no certificate; possible relocation to Germany for work. Uses the app about 30 minutes a day, at home, seated, in private (speaking aloud is fine). Lectures are listened to with the phone in hand or on the desk, screen on, pausing constantly to answer aloud (Language Transfer method).

## Product Purpose

A personal study tool that turns the owner's outside study material (Language Transfer audio, DW Nicos Weg, German-dubbed TV, public-domain texts) into one daily 30-minute routine: spaced-repetition review, new cards, then a lecture or reading block. Success is steady daily use with no friction, and German that is remembered.

## Positioning

Not a consumer language app. It does not teach; it organises real material the owner already uses, and remembers it for them. It is closer to a well-made reference book or a professional tool than to a game.

## Operating Context

- Pages: Today (session builder), Lectures (50 Language Transfer tracks, 7–19 min each, player with resume, 10 s rewind, speed, notes; after a track, tick volunteer-transcript sentences that match the audio to create cards), Review (one FSRS spaced-repetition queue; word, sentence, grammar cloze and listening cards; speak-then-reveal or type; self-grade Again/Hard/Good/Easy), Grammar (topic path in Nicos Weg order, links out to free explanations and exercises with done-tracking; reference tables), Reading (German texts with hidden English, tap sentence for translation, tap word for dictionary popup, long-press sentence to send to Review, known-word % before opening; single sentences up to full public-domain books, audio where available), Capture (fast inbox for phrases heard on TV), Status and data (plain numbers, backup/export, settings, outside dictionary links).
- Default review answer mode: say it aloud, then reveal.
- Audio: human recordings where available, otherwise the iPhone's built-in German voice.

## Capabilities and Constraints

- Free to run. Single user. No accounts, no social features. Offline not required. Portrait only. No push notifications in version 1.
- Light and dark mode follow the phone's setting.
- Free fonts only (system or Google Fonts).
- Lecture audio: background playback with the screen locked (plus lock-screen controls) is expected to work and is tested in Phase 0. Fallback if it fails: keep the screen awake during playback. Lectures never hand off to a Safari tab, because the home-screen app and Safari keep separate data. Design a persistent mini-player, plus the screen-awake fallback state.
- German is primary text; English is secondary and hidden until requested.
- Long German compounds (e.g. Geschwindigkeitsbegrenzung) must wrap and hyphenate correctly on narrow screens. Umlauts and ß must be easy to type in typed answers.
- Every noun carries gender (der/die/das) and is always shown with article and plural.
- Out of scope for design: content sources, data storage, hosting, the working build.

## Brand Commitments

- App name: **Scheiße** (owner's choice: an inside joke and their first German word). The joke lives in the name only; every screen inside keeps the calm tone. Icon: an Eszett (ß) key in the locked F direction, refinement R1 (`design/logo/eszett-r1-tile-key.svg`).
- No gamification of any kind: no XP, points, streaks, levels, badges, achievements, mascots, confetti, celebration animations, or guilt-trip reminders.
- Calm, focused, professional tone. Numbers are plain facts (cards due, words known, hours logged), never rewards. No praise copy.

## Evidence on Hand

- `Language Transfer Lectures/01.mp3`–`50.mp3` (Language Transfer "Complete German", ~6.4 h total).
- No German learning content may be authored by Claude. All German shown in mockups or the app comes from real published sources with English translations (Tatoeba, Wiktionary via kaikki.org, Project Gutenberg public-domain texts and translations; Goethe word-list entries for word/article/plural). Copyrighted free material (DW Nicos Weg, Grimm Grammar, Schubert-Verlag) is linked, not copied.

## Product Principles

1. The routine is the product: opening the app should lead straight into today's work.
2. Real material only; the app organises and remembers, it never invents German.
3. German first, English on request.
4. Facts, not feelings: every number is a measurement, never a reward or a nudge.
5. One hand, one thumb, no hunting: the frequent actions sit where the thumb rests.

## Accessibility & Inclusion

Must honour iOS Dynamic Type (the iPhone text-size setting), WCAG AA contrast in both themes, 44 pt minimum tap targets, and must not rely on colour alone for gender marking (red-green colour blindness).
