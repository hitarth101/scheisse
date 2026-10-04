# Handover: Phase 1 built, waiting to publish

Written 2026-10-04 for a new chat. Read this first, then the files it points to.

## Read these, in this order
1. `docs/product-spec.md`: what the app does. It is the source of truth; changes are proposed, never made silently.
2. `docs/build-plan.md`: how it is built and shipped, Phase 0 results, **Phase 1 results, the decisions made during the build, a proposal awaiting the owner, and the on-phone checklist**.
3. `design/design-spec.md` with `DESIGN.md` and `design/mockups/f.css`: how it looks. Use the Impeccable skill for UI work.
4. `tools/README.md`: how content is prepared; reports in `tools/out/`.

## State
- Phase 1 is built on the local branch `phase1` (3 commits on top of `main`). **Nothing is pushed.** Pushing to `main` publishes, so it needs the owner's OK.
- Checks: `npm --prefix app run check` runs the type check, 24 logic tests (Vitest), the build and 28 screen tests (Playwright, WebKit, light and dark). All passed on 2026-10-04. Screen tests run one browser at a time, because Playwright's WebKit crashed under parallel runs on the owner's PC.
- The publishing job (`.github/workflows/pages.yml`) runs the same checks on GitHub and publishes `app/dist`. The Phase 0 page (`site/`) is no longer published.
- Dev server for the browser preview: `.claude/launch.json` → `app-dev` (port 5173, app at `/scheisse/`).

## Next steps
1. Owner OK → merge `phase1` into `main` and push; watch the GitHub job; then the owner runs the on-phone checklist (build plan, section 4, Phase 1).
2. Owner decision on the function-word proposal (build plan, Phase 1).
3. Phase 2 (product spec 9): full Today session builder with Swap and Nicos Weg, Capture/Inbox, Grammar path and tables, fill-in-the-blank cards, full Status page, dictionary links. The Nicos Weg A1 lesson list is saved in `tools/sources/nicos-weg-a1.txt`; A2 and B1 are still to extract (`curl` on learngerman.dw.com; WebFetch is blocked there).

## Still open from before
- The 1857 Grimm text uses old spelling (Phase 3): find a modern-spelling public-domain edition or show the "Historical spelling" label.
- Commits use the owner's university email (owner: not needed right now).

## Working rules
- The owner doesn't read code. Show results, test before claiming anything works, use plain English.
- Never write German learning content. Real sources only, each with its English. (Even a voice-test phrase: the app uses Tatoeba sentence 2301788.)
- Push only with the owner's OK.
- When patching files with Python one-liners, write regexes with care: a `\b` inside a normal Python string becomes an invisible backspace character. Prefer direct edits.
