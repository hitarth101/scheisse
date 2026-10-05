# Handover: restructure and Phases 2–4 published, waiting for the on-phone check

Written 2026-10-05 for a new chat. Read this first, then the files it points to.

## Read these, in this order
1. `docs/product-spec.md`: what the app does. It is the source of truth; changes are proposed, never made silently. Section 4.1 (Flashcards) records the owner's 2026-10-04 restructure: no sessions, separate tabs.
2. `docs/build-plan.md`: how it is built and shipped; Phase 0 results; Phase 1; **"Restructure and Phases 2–4": what was built, the decisions made during the build, and the on-phone checklist**.
3. `design/design-spec.md` (section 3 updated for the new tabs) with `DESIGN.md` and `design/mockups/f.css`: how it looks. Use the Impeccable skill for UI work.
4. `tools/README.md`: how content is prepared; reports in `tools/out/`.

## State
- Tabs: Flashcards (the one queue, Study, every card, Inbox and Capture), Lectures, Reading, Grammar, Status.
- Pushes to `main` publish; further pushes still need the owner's OK.
- Checks: `npm --prefix app run check` runs the type check, the logic tests (Vitest), the build and the screen tests (Playwright, WebKit, light and dark). Screen tests run one browser at a time, because Playwright's WebKit crashed under parallel runs on the owner's PC.
- Dev server for the browser preview: `.claude/launch.json` → `app-dev` (port 5173, app at `/scheisse/`).
- Progress lives in IndexedDB; grammar statuses, lessons done, inbox phrases, reading positions and words marked known are rows in the `meta` table (prefixes `topic:`, `lesson:`, `inbox:`, `read:`, `known:`), so backups carry them without a format change.

## Next steps
1. The owner runs the on-phone checklist (build plan, "Restructure and Phases 2–4") and reports results; fix what fails.
2. Open decisions in build plan section 5: repository name, LibriVox, IATE (needs the owner's EU Login), a bigger Inbox lookup.

## Still open from before
- The 1857 Grimm text uses old spelling: the reading view shows the "Historical spelling" chip.
- No free A2–B1 reading source with English has been found (product spec 4.5).
- Commits use the owner's university email (owner: not needed right now).

## Working rules
- The owner doesn't read code. Show results, test before claiming anything works, use plain English.
- Never write German learning content. Real sources only, each with its English. (Even a voice-test phrase: the app uses Tatoeba sentence 2301788.)
- Push only with the owner's OK.
- Keep it simple: this is a basic language learning tool (owner, 2026-10-04).
- When patching files with Python one-liners, write regexes with care: a `\b` inside a normal Python string becomes an invisible backspace character. Prefer direct edits. Heredocs containing apostrophes fail in this shell; write such scripts to a file first.
