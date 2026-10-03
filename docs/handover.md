# Handover: start of Phase 1

Written 2026-10-03 for a new chat. Read this first, then the files it points to.

## Read these, in this order
1. `docs/product-spec.md`: what the app does. It is the source of truth; changes are proposed, never made silently.
2. `docs/build-plan.md`: how it is built and shipped, plus the Phase 0 results.
3. `design/design-spec.md`: how it looks and behaves. `DESIGN.md` and `design/mockups/f.css` hold the exact tokens; the mockups are in `design/mockups/index.html`.
4. `PRODUCT.md`: short summary for the Impeccable skill (use Impeccable for any UI work).

## Settled
- **App:** "Scheiße" (owner's choice). Icon: Eszett key R1 (`design/logo/eszett-r1-tile-key.svg`, PNGs in `site/phase0/`).
- **Visual direction:** F "Native Gerät". Apple layout plus Braun details. One green for "next action" only. Articles coloured der blue / die red / das teal; plural uncoloured.
- **Stack:** TypeScript + Vite + React, IndexedDB via Dexie, ts-fsrs. Vitest and Playwright (WebKit) tests run before every publish.
- **Hosting:** GitHub Pages from the **public** repo `hitarth101/scheisse`, at https://hitarth101.github.io/scheisse/. Every push to `main` publishes through `.github/workflows/pages.yml`, which currently uploads `site/` as-is; Phase 1 replaces it with a test-and-build job. The MP3s are public, by owner decision; Language Transfer has no published re-hosting licence.
- **Phase 0 passed** on an iPhone 14 Pro running iOS 18.7: background audio, lock-screen controls, Dynamic Type, the ä ö ü ß key row, long-press, haptic tick, persistent storage. Return-from-link detection was unreliable, so "Mark done?" prompts are shown inline instead.

## Open before or during Phase 1
1. **Goethe word lists and the Language Transfer transcript:** publish them in the public repo, or load them onto the phone from a file? This needs the owner's decision before content import.
2. **FFmpeg** (to re-encode the MP3s to mono at 64 kbps): needs the owner's OK to install. Only `01.mp3` is uploaded so far; the originals are in `Language Transfer Lectures/`, which is gitignored.
3. **Phase 0 check 8** (notch and home bar) was marked Fail although the measured insets were correct. Ask the owner what they saw.
4. **The 1857 Grimm text uses old spelling.** Find a modern-spelling public-domain edition, or show the "Historical spelling" label.
5. **Nicos Weg A1 lesson and grammar order** was extracted from DW's page data (77 entries: 76 lessons plus the final test; 62 grammar topics). It was not saved; re-extract with `curl` from `learngerman.dw.com/en/nicos-weg/c-36519789` (WebFetch is blocked there). A2 and B1 are still to do.
6. **Commits** use the owner's university email (optional: switch to GitHub's noreply address).

## Phase 1 scope (product spec section 9)
- Lectures: player, mini-player, notes, sentence-tick screen.
- Review engine with word and sentence cards.
- Content import: Goethe lists, Wiktionary (kaikki.org), Tatoeba, DeReWo.
- Basic Today.
- Backup and restore.

## Working rules
- The owner doesn't read code. Show results, test before claiming anything works, and use plain English.
- Never write German learning content. Real sources only, each with its English.
- Push only with the owner's OK.
