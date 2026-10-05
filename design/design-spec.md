# Scheiße — Design Spec

Status: complete for build, version 1; navigation updated 2026-10-05 for the owner's restructure (no sessions)
Last updated: 2026-10-05
Direction: **F · Native Gerät** (locked by the owner after two rounds)

This document defines **how the app looks and behaves**. What each page does is defined in `docs/product-spec.md`, which wins on any conflict about features. How the app is built and shipped is in `docs/build-plan.md`.

**Companion files**

| File | What it is |
|---|---|
| `design/mockups/index.html` | Every page and state as clickable mockups, light and dark, at iPhone 14 Pro size |
| `design/mockups/f.css` | The reference stylesheet: every token and component below, in code. The build copies its values, not its mockup-only parts (marked) |
| `design/mockups/00-components.html` | All components and states on one sheet, both themes |
| `design/logo/eszett-r1-tile-key.svg` | App icon master (1024 × 1024) |
| `site/phase0/icon-*.png` | Icon exported at 180, 192 and 512 px |

On Windows the mockups show Inter in place of the iPhone's San Francisco font. On the iPhone the app uses San Francisco.

---

## 1. Design principles

1. **The tool disappears into the task.** Apple's own app structure (large titles, grouped lists, sheets, a tab bar), so nothing needs learning. Character lives in a few precise details, never in decoration.
2. **One signal.** Green means "do this next" and nothing else: the green key, the lit lamp of the next block or item, and the Good grade. Switches, ticks, selections, links, text buttons and the current tab are graphite. Everything else is warm grey and graphite. If something green on a screen is not the next action, it is wrong.
3. **Facts, never feelings.** Numbers are counts and durations. No praise, no streaks, no reminders, no "great job". "Done for today" is a statement, not a reward.
4. **German first, English on request.** German is the large, primary text. English is smaller, secondary, and hidden until asked for, except where the product spec says the English is the prompt or the hint.
5. **Thumb first.** Reveal, grade, play/pause and the next-step key sit in the lower third of the screen. Rarely used things (Status, settings, the More menu) sit at the top.
6. **Real material only.** Every German word on screen comes from a named source, and the screen says which (Tatoeba number, Wiktionary, the lecture).

## 2. Visual system

### 2.1 Typography

**Font:** the iPhone system font (San Francisco) for everything, German included. It covers ä ö ü ß and the capital ẞ. No web fonts are loaded in the app.

```css
html { font: -apple-system-body; }            /* 1rem = the owner's iPhone text size (17px by default) */
body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
```

Every size below is in `rem`, so the whole app follows the iPhone text-size setting (Dynamic Type). Phase 0 check 7 confirmed this works in home-screen mode.

| Token | Size / line at default (pt) | rem | Weight | Use |
|---|---|---|---|---|
| `t-large` | 34 / 41 | 2, max 48 px | 700 | Page titles (Today, Lectures…) |
| `t-title1` | 28 / 34 | 1.647, max 44 px | 700 | Detail page titles, review prompt word |
| `t-title2` | 22 / 28 | 1.294 | 700 | Typed-answer prompt |
| `t-title3` | 20 / 25 | 1.176 | 600 | Sheet titles, card headings, example sentences |
| `t-head` | 17 / 22 | 1 | 600 | Emphasised body |
| `t-body` | 17 / 22 | 1 | 400 | Body, list rows (line height minimum 1.3) |
| `t-call` | 16 / 21 | 0.941 | 400 | Revealed English under a reading sentence |
| `t-sub` | 15 / 20 | 0.882 | 400 | Secondary lines, notes |
| `t-foot` | 13 / 18 | 0.765 | 400 | Footnotes under groups, list section headers |
| `de-head` | 42 / 48 | 2.47, max 60 px | 700 | Revealed headword ("der Tisch") |
| `de-sent` | 29 / 35 | 1.706, max 44 px | 700 | Revealed answer sentence |
| `de-read` | 19 / 30 | 1.118 | 400 | Reading text (line height 1.58) |

Nothing smaller than 12 pt except the tab-bar labels (10.5 pt, the iOS standard). There are no small all-caps labels above blocks ("WORD", "EXAMPLE"): the content or the header says what a block is.

**Very large text sizes.** Body and secondary text are never capped; they follow the setting all the way to AX5. Display sizes grow with the setting until their ceiling (`min()` in the table above), so a headword never becomes wider than the screen. The nav row, the review header and the tab bar stay compact (iOS behaviour). At accessibility sizes (body 28 pt and up) the four round grading keys become a 2 × 2 grid of wide keys with label and interval inside, and the card scrolls behind them (mockup: Review, "Very large text"). Numbers use tabular figures (`font-variant-numeric: tabular-nums`) wherever they line up in columns or change while you watch (times, counts).

**German text rules**

- Every German element carries `lang="de"`, which turns on correct German hyphenation in Safari: `hyphens: auto`.
- **Long compounds break at their joints.** The content data provides soft hyphens (`&shy;`) at compound boundaries (from Wiktionary's hyphenation and compound data), so "Geschwindigkeits­begrenzung" breaks as *Geschwindigkeits- / begrenzung*, never at a random syllable. `hyphens: auto` is the fallback for words without data. Never use `word-break: break-all`.
- Never shrink text to fit a compound. Wrap instead.
- Nouns keep their capital letter everywhere, including in lists and buttons. UI labels are sentence case ("Start session"), never all caps.
- Quotation marks inside German source text stay as the source has them („…“).

### 2.2 Colour tokens

Light and dark follow the iPhone setting (`prefers-color-scheme`); there is no in-app theme switch. All values are in `f.css`.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--bg` | `#EFEFEC` | `#000000` | Page background (warm grey housing) |
| `--raised` | `#FFFFFF` | `#1C1C1E` | Cells, cards, sheets |
| `--well` | `#E6E6E2` | `#121213` | Recessed answer window |
| `--fill` | `#E4E4E0` | `#2C2C2E` | Segmented track, chips, skeletons |
| `--fill-press` | `#D6D6D1` | `#3A3A3C` | Pressed fills |
| `--label` | `#1C1C1A` | `#F2F2EF` | Primary text |
| `--label-2` | `#64645F` | `#A6A6A1` | Secondary text |
| `--label-3` | `#8E8E88` | `#6E6E6A` | Icons, disabled, chevrons — **never text** |
| `--sep` | `#D6D6D1` | `#333335` | Hairlines (0.5 pt) |
| `--signal` | `#2E7D32` | `#4FBF63` | The one green: next action, Good, lit lamp |
| `--signal-hi` | `#358538` | `#66CC78` | Top of the green key's gradient |
| `--on-signal` | `#FFFFFF` | `#0B1A0D` | Text on green |
| `--select` | `#E8E8E4` | `#2C2C2E` | Selected row, tapped word |
| `--switch-on` / `--switch-knob-on` | `#4A4A46` / `#FFFFFF` | `#F2F2EF` / `#1C1C1E` | Switch when on: graphite track in light; near-white track with a dark knob in dark. Never green |
| `--lamp-off` / `--lamp-done` | `#8E8E88` / `#4A4A46` | `#6E6E6A` / `#D1D1CC` | Lamp states |
| `--der` | `#2763B8` | `#7DAEF1` | Masculine article |
| `--die` | `#BA3237` | `#F28C88` | Feminine article |
| `--das` | `#0D6E74` | `#5CCFD3` | Neuter article (teal, kept clear of the green signal) |
| `--danger` | `#B3261E` | `#F2B8B5` | Errors, destructive actions |
| `--danger-wash` | `#F6E3E1` | `#3A1715` | Error notice background |
| `--mark` / `--on-mark` | `#F3E7B3` / `#1C1C1A` | `#5A4A12` / `#F7EDC6` | Typed-answer differences |

Colour strategy: restrained. Greys plus one green for the next action; the three gender colours appear only on articles; red only for errors and destructive actions. There is no green text anywhere.

### 2.3 Gender marking

**Decision:** mark gender, by colouring the article only.

- The article is always printed (*der Tisch*, never *Tisch* with a dot), so colour is a memory aid and never the only signal. This works for red-green colour blindness and with "Colour articles by gender" turned off in Settings.
- Blue **der**, red **die**, teal **das**. Blue/red/green is the common textbook convention; *das* is teal so it is never confused with the green action key.
- The plural *die* is uncoloured, so feminine *die* and plural *die* never look the same.
- Colour applies wherever an article stands next to its noun: card answers, word popups, word lists, leeches, and tables. **In tables the colour follows the gender, not the word:** every singular case form of the article (der, den, dem, des for a masculine noun) takes that gender's colour, and every plural form stays uncoloured. The Grammar article tables and the per-word "All forms" sheet follow the same rule. Running reading text is never coloured.
- When the setting is off, articles print in the surrounding text colour.

### 2.4 Spacing, radius, elevation

**Spacing scale (pt):** 4, 8, 12, 16, 20, 24, 32, 44. Screen side margin 16 for groups and cards, 20 for page titles and free text, 22–24 for reading text and the player. More space above a section heading (20) than below it (7).

| Radius token | Value | Used for |
|---|---|---|
| Group | 20 | Grouped lists, notices |
| Card | 24 | Review cards, standalone cards |
| Well | 18 | Recessed answer window |
| Key | 18 / 16 | Green key (58 tall) / plain key (50 tall) |
| Sheet | 34 | Bottom sheets (8 pt inset from screen edges) |
| Field | 14 | Text fields |
| Round | 50% | Icon keys, grading keys, lamps, play key |

**Materials** (the Braun details that make F more than a stock iPhone app):

- **Convex key:** `--key` face, top highlight, soft drop shadow (`--shadow-key`). Pressed: inner shadow, 1 pt lower.
- **Recessed well:** `--well` with an inner shadow. Holds the revealed answer, like a display window set into a device.
- **Lamps:** 10 pt dots for state. Off: ring. Next: lit green. Part: half-filled (in progress or "read"). Done: solid graphite. Lamps never glow; the lit lamp is a solid dot with a slight inner shade.
- **Floating glass:** tab bar and mini-player use a translucent blurred panel (`--glass`, `backdrop-filter: blur(24px)`). Only these two float; nothing else is glass.
- Shadows are always neutral (black at low opacity) with a downward offset. No coloured glows.

### 2.5 Icons

One authored set: 24-unit grid, 1.8 stroke, round caps and joins, drawn as inline SVG (see `f.js` in the mockups; 35 icons). Default display size 22 pt; tab bar 25 pt; chevrons 14 pt in `--label-3`. No emoji, no Unicode symbols as icons. The 10-second skip icons are the only ones that contain a number. If the build prefers a library, Lucide matches the style closely.

### 2.6 Motion

- 150–250 ms, ease-out, for state changes: reveal, lamp changes, rows appearing.
- **Reveal:** the answer window fades in and rises 8 pt (200 ms). The prompt doesn't move.
- **Grade:** the key depresses for 80 ms; the next card fades in (180 ms). No card-flip, no swipe-away animation.
- **Sheets:** slide up 300 ms with iOS-like deceleration; the dimming layer fades in at the same time.
- **Mini-player:** appears from the tab bar (220 ms) when a lecture is first loaded; never bounces.
- With "Reduce Motion" on: all movement becomes a 150 ms fade.
- Nothing animates on page load. Nothing celebrates.

### 2.7 Haptics

Optional light ticks, with "Light tap feedback" on in Settings (default on). Phase 0 check 11 showed the iPhone gives websites a tick only through a workaround (toggling a hidden `<input type="checkbox" switch>`); standard vibration isn't available. So:

- tick on: a grade key, a long-press being recognised, Capture saved, a sentence ticked on the tick screen;
- never as the only feedback; every tick has a visible change too;
- if a future iOS update removes the workaround, nothing breaks.

## 3. Navigation structure

**Changed 2026-10-04 by the owner** (product spec 4.1): there are no sessions, so Today is replaced by Flashcards, the Inbox moves inside Flashcards and Status becomes a tab. Everything else in this spec (look, components, states) is unchanged; the new screens are built from the same components.

```
Tab bar (floating, 5 tabs)
├── Flashcards ─────── + key → Capture · Study (focus) · Inbox · card page
├── Lectures ───────── track page (notes, sentences) · full player (sheet)
├── Reading ────────── text (reading view) · word popup (sheet) · add-sentence (sheet)
├── Grammar ────────── Topics | Lessons | Tables (segmented) · topic page · table page
└── Status ─────────── Settings · Dictionaries · Sources and credits

Focus modes (no tab bar, full screen, close key top-left):
  Study · Capture · Tick screen after a track
```

- **Tab bar:** Flashcards · Lectures · Reading · Grammar · Status. The active tab shows its label in `--label` and a small graphite dot above the icon. No badges; the Inbox count is a row on Flashcards.
- **Study is a focus mode, not a tab.** It is opened with the green Study key on Flashcards and shows "N left · Word" instead of "12 of 42". The close key returns to Flashcards; every grade is already saved.
- **Flashcards** (replaces Today, 5.1): large title; "Now" group with a Reviews row and a New cards row (lamp, one-line fact, estimated time; the lit lamp marks what Study shows first); the green Study key, or the "Nothing due right now" card when nothing is left; a group with "Add 5 more new cards today" and the Inbox row; then "All cards" with a search field, a Show row (filter sheet) and the card list. A card page lists its two sides with their state and offers Suspend / Return to reviews, Edit and Delete (the decisions of 11.4).
- **Leeches and flagged cards** are found under Suspended in the Flashcards list instead of on Status.
- **Mini-player:** docked above the tab bar on every tabbed page while a lecture is loaded. Tap opens the full player as a sheet; pull the player down to return. Hidden in focus modes. Studying, or playing any card audio, pauses the lecture (approved proposal).
- **Back:** standard back chevron with the previous page's title, top left. Swipe from the left edge also goes back.
- **App launch:** opens on Flashcards, except when relaunched within 10 minutes, in which case it reopens the last page (so Capture after a TV pause stays two taps away).

## 4. Components

All in `f.css`, shown in `design/mockups/00-components.html`. "Pressed" means while a finger is down.

| Component | Anatomy | States |
|---|---|---|
| **Green key** (`.go`) | 58 tall, radius 18, label left + icon right (or centred). One per screen at most | default · pressed (darker, inner shadow) · disabled (grey fill, `--label-3` text) · loading (label changes to e.g. "Loading…", no spinner) |
| **Plain key** (`.key2`) | 50 tall (44 inside rows), convex face | default · pressed · disabled |
| **Text button** (`.tbtn`) | Graphite semibold text (often with an icon), 44 tall hit area | default · pressed (60% opacity) · danger variant (red) |
| **Icon key** (`.rkey`) | 42 round (44 hit area), 52 for player-adjacent keys | default · pressed · disabled |
| **Grading keys** (`.gk`) | Four 76 pt round keys: Again (graphite), Hard, Good (green), Easy; next interval printed under each. At accessibility text sizes: 2 × 2 grid of 64 pt wide keys | default · pressed · hidden until reveal (not greyed) |
| **Play key** (`.bigkey`) | 116 pt round green, flanked by 64 pt skip-10 keys | playing (pause icon) · paused (play icon) · loading ("Loading" label) · disabled (grey) |
| **Lamp** (`.lamp`) | 10 pt dot | off · next · part · done |
| **Grouped list** (`.grp`, `.cl`) | White group on grey, radius 20, rows ≥ 52, 0.5 pt separators inset to the text | default · pressed (`--fill`) · selected (`--select` + graphite check) · disabled (`--label-3`) · with detail value · with chevron · with switch · with inline prompt area |
| **Switch** | A checkbox with `role="switch"`, drawn by the app (`appearance: none`) so the knob colour can change in dark mode: graphite track when on in light, near-white track with a dark knob when on in dark; `--fill-press` track when off; 40% opacity when disabled. Never green | on · off · disabled |
| **Segmented control** (`.seg`) | 34 tall, 2–4 segments | selected · unselected · pressed |
| **Chip** (`.chip`) | 32 tall pill for small actions inside rows, with an invisible 44 pt hit area (6 pt above and below); neighbouring chips at least 8 pt apart | default · pressed |
| **Card** (`.card`) | White, radius 24, padding 20 | — |
| **Answer window** (`.win`) | Recessed well inside a card | empty (prompt text) · revealed |
| **Text field** (`.field`) | 52 tall, radius 14 | placeholder · focus (2 pt graphite ring) · filled · error (2 pt danger ring + message below) · disabled |
| **Typed-answer field** | Text field with autocorrect, auto-capitalise and spell-check off; Check key beside it | as text field |
| **ä ö ü ß row** (`.kbrow`) | Key row pinned directly above the iPhone keyboard (`visualViewport`); ä ö ü ß Ä Ö Ü wherever German is typed (answers, Capture, edit forms) | shown while a German field is focused |
| **Diff marks** | `.x` highlighted characters (difference) · `.nt` dotted underline (note, e.g. "ue" for ü) | — |
| **Reference table** (`.rtable`) | Case rows × Masc/Fem/Neut/Plural; gender colours on columns | standard · stacked (one block per case) at accessibility text sizes |
| **Sheet** | Bottom sheet, 8 pt inset, radius 34, grab handle, dimming layer | open · closing; dismiss by pulling down, tapping the dim area, or its own button |
| **Action list** | Rows of icon + label inside a sheet (More menu) | default · pressed · danger row |
| **Notice** (`.notice`) | Icon + bold line + explanation | info (white) · error (`--danger-wash`) |
| **Skeleton** (`.skel`) | Grey bars holding the layout | loading only; never longer than the real content |
| **Toast** | Dark pill above the tab bar, 3 s, optional Undo | — |
| **Progress line** (`.bar`) | 4 pt (2 pt in mini-player) | — Facts only, never "progress to a goal" |
| **Tab bar** | Floating glass capsule, 62 tall, 16 pt from the sides, 24 pt above the bottom edge. Active tab: label in `--label` plus a small graphite dot above the icon | active · inactive · badge |
| **Mini-player** | Floating glass, 58 tall, above the tab bar: title, time, skip-back-10, play/pause, thin progress line | playing · paused · loading |
| **Nav bar** | 44 tall row under the status bar: back or close (left), title (centre, detail pages), action key (right) | with large title below · inline title |

## 5. Screens

Every screen is in `design/mockups/`. "→" means the mockup file.

### 5.1 Today → `01-today.html` (replaced by Flashcards, see section 3)

Kept for reference: the Flashcards tab reuses this page's parts (lamps, one-line facts with times, one green key, the "Done for today" card as "Nothing due right now"). Swap, the main block and the session states no longer exist.

Layout, top to bottom: Status key (top right) · large title "Today" + date · section header "Session · about 30 min" (right: time left) · grouped session list, one row per block with a lamp, a one-line fact, and its time · green key · "Also" group (Inbox count, Reviews only) · footnote with time today.

| State | What changes |
|---|---|
| Fresh day | First block's lamp lit; green key "Start session"; main block row carries a Swap chip |
| Mid-session | Done blocks show a solid lamp and their real time; key reads "Continue: [next block]"; mini-player present if a lecture is loaded |
| Heavy day | Reviews row: "95 of 160 due · 65 move to tomorrow"; New cards: "None today · reviews fill the budget" |
| Swap sheet | "Main block" sheet listing whatever is available today: next lecture, next Nicos Weg lesson, a suggested reading text |
| Nicos Weg block | Row shows lesson and its grammar topic with an outside-link icon; once opened, an inline "Mark it done?" with Mark done / Not yet stays until answered |
| Done for today | Card: solid lamp, "Done for today", "Next reviews: tomorrow, 37 cards." Below: today's blocks with real times. No buttons except the usual rows |
| First run | Same order as every day: Reviews "None yet", then 10 new words (lit), then Lecture 01; one notice about backup with a Restore link |
| Loading | Skeleton rows, disabled key, footnote "Loading word data · 3 of 5 files" |
| Error | Error notice naming the problem, recovery and what's safe; "Try again" key |

Time estimates use the owner's measured seconds per card (product spec 4.1).

### 5.2 Review → `02-review.html`

Focus mode. Top: close key · "12 of 42 · Word" (count plus card type) · More key; thin progress line; Speak / Type segmented control (remembered). Middle: the card. Bottom (thumb zone): the Reveal key, then the four grading keys.

| Screen | Layout |
|---|---|
| Word, before reveal | English meaning in `t-title1`, then "noun · say it with article and plural" (or other word type; plus a short hint if another card has the same English), empty window "Say it aloud, then reveal." Green Reveal key at the bottom. No audio before the reveal |
| Word, revealed | Prompt shrinks to one line; window shows the headword with coloured article, "plural die Tische" (lowercase label inline), speaker key; source line with an "All forms" text button; example card (German, English, Tatoeba number); grading keys with intervals |
| Sentence, revealed | Window shows the sentence in `de-sent` with a speaker key and its source; a card under it lists the sentence's nouns with articles, meanings and plurals (no heading needed) |
| Fill-in-the-blank | Real sentence with a drawn gap, "An article is missing." plus the English hint, source "one word removed"; Reveal key |
| Listening | Heading "What does it mean?", large play key in the window, "Play slowly" and "Played 2×" chips, voice label; Reveal shows the German text and English |
| Typing | Prompt card; text field with Check key; ä ö ü ß row above the keyboard |
| Typed answer checked | "You typed" inline before your line, with marks; the answer in the window with a speaker key, one note per marked thing (capital letter difference; "ue" for ü is a note, not a mistake); grading keys. The app never grades by itself |
| More menu | Sheet: Undo last grade (shows which), Edit card, Suspend card, Flag: source data looks wrong, Play audio automatically switch (graphite) |
| All forms | Sheet from a card back or word popup: Wiktionary's full table, case names written out (nouns: case × singular/plural; verbs: conjugation), source line, Close |
| Edit card | Full-screen form, Cancel / Save in the nav row: article (der/die/das segmented control), word, plural, English meaning; ä ö ü ß Ä Ö Ü row above the keyboard. Sentence cards and "Edit pair" use German and English fields. The source entry is kept; the card shows "edited" |
| Very large text | Word and sentence card at AX3: headword at its 60 pt ceiling, compound breaking at syllables when the joint alone isn't enough, grading keys in a 2 × 2 grid |
| Block finished | "42 reviews · 13 min" and the count per grade; "Next: 10 new cards, about 6 min"; green Continue |
| Nothing due | "Nothing due right now. Next reviews: tomorrow, 37 cards." Back to Today |
| Audio failed | Inline error inside the card: "Couldn't play the recording" with Try again / Use iPhone voice. Grading stays available |

Card audio: human recording if the source has one, otherwise the iPhone voice. Auto-play after reveal follows the setting. The voice is the one chosen in Settings, defaulting to **Anna**; if an enhanced or premium German voice is installed, it is preferred; Apple's novelty voices (Grandma, Grandpa, Rocko and similar) are not offered.

### 5.3 Lectures → `03-lectures.html`

| Screen | Layout |
|---|---|
| Track list | Large title, "8 of 50 done"; list of 50: lamp, number, "Lecture NN", length; in-progress rows show "Playing · 3:41 of 9:45" or the resume position; done rows note sentences ticked |
| Full player (sheet) | Pull-down key, title, More key; source line; big time "3:41 of 9:45"; slider with elapsed and remaining; **116 pt play/pause key** under the thumb with skip-back-10 and skip-forward-10 beside it; speed 0.75× / 1× / 1.25× / 1.5×; Notes and Mark done at the bottom |
| Loading | The play key reads "Loading" on a grey face; skip keys wait; speed can be set already |
| Error | Error notice with the saved position, transport keys disabled, green Try again |
| Mini-player | On every tabbed page while a lecture is loaded |
| Tick screen | Focus mode after a track ends (also reachable from the track page). Explanation that the transcript has errors; one row per pair: tick circle (graphite when ticked), English (small), German (bold), edit key. Editing opens the German in a field inside the row with Save correction / Cancel. Green "Add N cards"; "Skip for now" top right |
| Track page | Title, status and date; Play again and Sentences (N) keys; notes as plain text, saved as typed, with the note that the course advises writing them after listening |

Lock-screen controls: title "Lecture NN", artist "Language Transfer · Complete German", play/pause, skip ±10 s (Media Session API). Position saved every few seconds and on every pause. A track counts as done at 95% listened or when marked done.

### 5.4 Grammar → `04-grammar.html`

Added 2026-10-04: a third view, **Lessons**, lists the Nicos Weg lessons in DW's order (lamp, German lesson title, English subtitle); a lesson opens on DW's website and then shows the inline "Mark it done?" with Mark done / Not yet. Reference tables measure themselves and switch to the stacked layout whenever the columns don't fit, not only at accessibility sizes.

| Screen | Layout |
|---|---|
| Topic path | Topics / Tables segmented control. Sections per Nicos Weg chapter (DW's own names and order); each row: lamp (off / next / read = part / practiced = done), topic name, the DW lesson title(s) in German and status |
| Topic page | Title, chapter and lesson; status segmented control Not started / Read / Practiced; note "Marking it Practiced adds fill-in-the-blank cards for …" when a blank type exists; three outside links (Nicos Weg lesson, Grimm Grammar, Schubert-Verlag exercises); after one is opened, inline "Mark this topic read?"; link to the matching reference table |
| Reference table | Four columns (Masc., Fem., Neut., Plural) × case rows (Nominative, Accusative, Dative, Genitive, never abbreviated), gender colours on the columns, source line |
| Large text | When the four columns no longer fit, each case becomes its own block of two columns. Never sideways scrolling |
| Tables list | The tables from product spec 4.4, grouped: articles and pronouns · prepositions and endings · verbs |

A1 has 62 grammar topics across 76 lessons; topics repeat across lessons, so the path is organised by topic, listing every lesson where it appears.

### 5.5 Reading → `05-reading.html`

| Screen | Layout |
|---|---|
| Library | Sections: "Suggested · 90% or more known", then the reading ladder stages. Each row: lamp, title, source and length, **known-word %** right-aligned as the main fact. A footnote states the A2–B1 gap honestly |
| Reading view | Back, speaker key (iPhone voice reads the text); title, author, year, % known; a "Historical spelling" chip for pre-1901 texts; German in `de-read`. Tap a sentence: a grey highlight and its English appears beneath in `t-call` `--label-2`; tap again to hide. Position saved on scroll |
| Word popup, noun | Sheet over the lower half (the sentence stays visible): headword with coloured article and speaker key; plural and the form used in the text; numbered meanings; source; green "Add as card", "Mark as known", "Dictionary" |
| Word popup, verb | Base verb (kochen) for the tapped form (kochte, past); key forms present / past / perfect (er kocht · er kochte · er hat gekocht) from Wiktionary; meanings; "All forms" opens the conjugation |
| Long-press | After about 0.5 s on a sentence: confirmation sheet with both texts, a note that old translations drift, green "Add sentence card", Edit pair, Cancel |
| Paragraph fallback | Where sentences don't line up, the tap reveals "English for this paragraph" as a block below the paragraph, with a one-line explanation |
| Nothing suggested | Card stating why, plus the closest text, still openable |
| Text failed to load | Title kept, error notice with the saved position, Try again; speaker key disabled |
| Audio unavailable | Texts without a recording use the iPhone voice; if that fails, an error notice says how to check the German voice, and reading continues silently |

### 5.6 Inbox (Capture) → `06-inbox.html`

Since 2026-10-04 the Inbox is a page inside Flashcards (back key "Flashcards", + key top right) instead of a tab. Capture returns to the page it was opened from.

| Screen | Layout |
|---|---|
| Capture | Focus mode, keyboard up, cursor in the phrase field (`t-title2` size); optional "What were you watching?" with the last answer shown below; green "Save to Inbox" above the ä ö ü ß Ä Ö Ü row (TV phrases often start with a capitalised noun). Reached from the + key on Inbox, or the Inbox tab's empty state |
| Inbox list | "To check · N": each row has a lamp (lit = match found), the phrase, what the check found, source show and date. Match rows: Review chip. No-match rows: "No source translation · ask your tutor" with Dictionary and Delete. "Done" group with the count turned into cards |
| Confirm match | Sheet titled "Is this what you heard?": your phrase on one line, the source sentence in the window with its English and Tatoeba number; green "Make a sentence card"; "Wrong match" (moves it to the ask-your-tutor state); Delete |
| Check pending / offline | "Checking against the sources…" right after saving; offline: "Couldn't check: no internet connection. It will try again when you're online." with Check now and Delete. Saving itself never needs a connection |
| Empty | "Nothing waiting" with one line on how to use it, and a Capture key |

### 5.7 Status and data → `07-status.html`

Since 2026-10-04 Status is a tab: no back key. "Needs a decision" moved to Flashcards (Suspended). Settings' "Session" group is now "Flashcards": new cards per day, "Pause new cards after" (minutes of reviews in a day), target memory rate.

| Screen | Layout |
|---|---|
| Overview | Reviews due per day for 7 days as labelled bars with the count on each (today darker); cards by state with totals; words known as two separate counts |
| Time and progress | Time logged this week by activity, total, "Add outside time"; month and total in a footnote; Language Transfer, Nicos Weg and grammar progress as "x of y" |
| Data | Backup: last backup date, Export backup (share sheet), Restore from backup ("Replaces everything on this iPhone", with a confirm step); "Needs a decision": Leeches, Flagged cards; More: Settings, Dictionaries, Sources and credits |
| Settings | Session: daily time, new cards per day, target memory rate. Answers and audio: default answer mode, auto-play, iPhone voice, voice speed. Content and display: engineering vocabulary, colour articles by gender, light tap feedback |
| Leeches / Flagged | One row per card with Return to reviews, Edit, Delete chips |
| Add outside time | Sheet: activity segmented (TV, Nicos Weg, Lesson, Other), stepper in 5-minute steps, date, green key that repeats the amount ("Add 45 min") |
| Dictionaries, Credits | Outside links (dict.cc, Leo, DWDS, Wiktionary); the attributions the licences require; app version |

**Restore confirm** (sheet): "Replace everything with this backup?", the backup's date, card count, lectures done and time logged, what will be lost, then "Replace with this backup" (red text on a plain key), "Export current data first", Cancel. **Errors:** "Export didn't finish. Nothing was saved…" and "This file isn't a Scheiße backup… Nothing on this iPhone was changed." appear at the top of Status until dismissed.

## 6. Interactions and gestures

| Gesture | Where | Result |
|---|---|---|
| Tap | Everywhere | Primary action. Every tap target ≥ 44 × 44 pt |
| Tap sentence | Reading | Show / hide its English (or the paragraph's) |
| Tap word | Reading | Word popup sheet. The tapped word gets a grey `--select` highlight |
| Long-press ≈ 0.5 s | Reading sentence | Add-sentence sheet. iOS's own selection and Copy menu are suppressed on reading text (`-webkit-touch-callout: none; user-select: none`; Phase 0 check 10) |
| Pull down | Sheets, full player | Dismiss |
| Swipe from left edge | Detail pages | Back |
| Swipe on rows | — | **Not used.** Every action is visible as a key or in a menu |
| Double-tap | — | Not used |
| Keyboard Return | Typed answer | Check |
| Keyboard Return | Capture | Save |
| Lock screen | Lectures | Play/pause, ±10 s |
| Haptic tick | Grade, long-press recognised, Capture saved, sentence ticked | Optional, see 2.7 |

No gesture is the only way to do something.

## 7. Accessibility

**Contrast** (measured, WCAG 2.1; body text needs 4.5:1, large text and non-text 3:1):

| Pair | Light | Dark |
|---|---|---|
| `--label` on `--bg` / `--raised` | 14.8 / 17.1 | 18.7 / 15.2 |
| `--label-2` on `--bg` / `--raised` / `--well` | 5.2 / 6.0 / 4.8 | 8.6 / 7.0 / 7.7 |
| `--on-signal` on `--signal` / `--signal-hi` | 5.1 / 4.6 | 7.7 / 9.0 |
| `--der` on `--raised` / `--well` | 5.9 / 4.7 | 7.5 / 8.2 |
| `--die` on `--raised` / `--well` | 5.8 / 4.7 | 7.2 / 7.9 |
| `--das` on `--raised` / `--well` | 6.0 / 4.8 | 9.2 / 10.1 |
| `--danger` on `--raised` / `--danger-wash` | 6.5 / 5.3 | 10.0 / 9.4 |
| `--lamp-off`, `--label-3` on `--raised` (non-text only) | 3.3 | 3.3 |

`--label-3` is never used for text.

**Tap targets:** 44 × 44 pt minimum everywhere, including 32 pt chips (invisible padding to 44); grading keys 76; play key 116; list rows ≥ 52.

**Dynamic Type:** every size is in `rem` from `font: -apple-system-body`, so the app follows the iPhone setting from the smallest size to the largest accessibility sizes. Layouts reflow and never truncate German:
- list rows grow taller;
- grading keys switch to a 2 × 2 grid of wide keys at accessibility sizes;
- display sizes stop at their ceilings (headword 60, sentence 44, titles 48); body text never stops;
- reference tables switch to stacked blocks;
- the tab bar labels stay at 10.5 pt, as in iOS;
- the review window grows and the page scrolls.

Check at default size, at the largest standard size and at AX3.

**Colour independence:** gender is always carried by the article word itself; lamps pair with text ("done", "next"); diff marks pair with notes; errors pair with text.

**VoiceOver:**
- Every icon key has a label ("Status and data", "Play lecture 09", "Skip back 10 seconds").
- Lamps are labelled with their state.
- German elements carry `lang="de"` so VoiceOver switches to its German voice.
- Hidden English is not read until revealed.
- Grading keys read as "Good, next review in 3 days".

**Reduce Motion:** movement becomes fades (2.6). **Focus:** a 2 pt graphite ring with a 2 pt offset for hardware-keyboard users.

**Safe areas:**
- Content respects `env(safe-area-inset-*)`. On the 14 Pro that is 59 pt at the top and 34 pt at the bottom (Phase 0 check 8).
- Scrolling pages put a solid `--bg` backdrop behind the status bar, so text never shows through under the Dynamic Island.
- The tab bar and mini-player sit above the home indicator.

## 8. Copy tone

Calm, plain, factual English. Short sentences. Name the thing and the number. Never praise, never nudge, never guilt.

| Situation | Write | Don't write |
|---|---|---|
| Session done | "Done for today. Next reviews: tomorrow, 37 cards." | "Great job! 🎉 You crushed it!" |
| Heavy day | "95 of 160 due · 65 move to tomorrow" | "You're falling behind!" |
| Nothing due | "Nothing due right now." | "All caught up — take a break, you've earned it!" |
| Error | "Couldn't load lecture 12. Check your internet connection, then try again. Your position, 2:05, is saved." | "Oops! Something went wrong." |
| Typed answer | "“ue” for ü is an accepted keyboard spelling, so it's a note, not a mistake." | "Almost! So close!" |
| No source | "No source translation · ask your tutor" | "We couldn't translate this 😕" |
| Backup | "Last backup: 28 September 2026, 5 days ago" | "⚠️ Back up now or lose everything!" |
| Leeches | "Failed 8 times, suspended automatically" | "These cards are giving you trouble!" |
| Buttons | Verb + object: "Start session", "Add 3 cards", "Mark done", "Export backup" | "OK", "Go!", "Let's do this" |

Rules:
- Sentence case.
- Numbers as digits.
- Times as "13 min", "1 h 32 min" and "3:41 of 9:45".
- Dates as "3 October" or "Sat 3 Oct".
- No exclamation marks in UI copy (German source sentences keep theirs).
- No emoji.
- "you" is fine; "we" is not used, because there is no "we".

## 9. App name and icon

- **Name:** Scheiße (owner's choice). The home-screen label, `apple-mobile-web-app-title`, the manifest `name` and `short_name`, and the page `<title>` are all "Scheiße". It fits the home-screen label without truncation. The joke lives in the name only; nothing inside the app refers to it.
- **Icon:** the Eszett key, refinement R1 "the tile is the key". The whole tile is shaded as one convex light-grey key, with a graphite ß (outline taken from Inter, SIL Open Font License) and a green lamp at the top right. Master `design/logo/eszett-r1-tile-key.svg`; PNG exports at 180 (`apple-touch-icon`), 192 and 512. iOS applies the rounded mask; the file stays square and opaque.

## 10. Notes for the build

- **Home-screen setup** (as in `site/phase0/index.html`):
  - `viewport-fit=cover`;
  - `apple-mobile-web-app-capable`;
  - `apple-mobile-web-app-status-bar-style: black-translucent`;
  - a theme colour per scheme;
  - a manifest with `display: standalone` and `orientation: portrait`.
- **Media Session API:** set metadata, `play` / `pause` / `seekbackward` / `seekforward` / `seekto` handlers, and position state. Proven in Phase 0.
- **Keyboard row:** a fixed bar translated by `innerHeight − (visualViewport.height + visualViewport.offsetTop)`. Keys use `pointerdown → preventDefault` so the field keeps focus. Proven in Phase 0 check 9.
- **Long-press:** a 500 ms timer on `pointerdown`, cancelled on `pointerup` or `pointercancel`, or after 10 pt of movement; `contextmenu` prevented.
- **Haptics:** click a hidden `<label>` wrapping `<input type="checkbox" switch>`. Behind the setting.
- **Storage:** call `navigator.storage.persist()` on first launch (granted in Phase 0).
- **Voices:**
  - list with `speechSynthesis.getVoices()`, filtered to `de-*`;
  - rank premium, then enhanced, then Anna;
  - exclude Apple's novelty voices by name (Eddy, Flo, Grandma, Grandpa, Reed, Rocko, Sandy, Shelley).
- **Caret and selection:** `caret-color: var(--label)` on every field (graphite, never green); text selection uses `--select`.
- **Theme:** tokens under `:root` plus `@media (prefers-color-scheme: dark)`. In the mockups `.light` and `.dark` classes stand in for the media query.
- **Mockup-only parts of `f.css`:** the device frame, `.doc`, `.panel` and the fake keyboard (`.kbd`). Don't ship these.

## 11. Decisions made in design that the product spec doesn't state

None of these changes a feature. They are listed so the build chat doesn't have to guess, and so the owner can object.

1. "Mark done?" / "Mark read?" prompts stay inline until answered instead of relying on detecting the return from a website (Phase 0 check 12 was inconclusive).
2. Swap offers whichever main blocks are available today (approved proposal 3).
3. In Capture's confirm sheet, "Wrong match" moves the phrase to the ask-your-tutor state.
4. Leeches and flagged cards offer three decisions: Return to reviews, Edit, Delete.
5. Outside time is entered in 5-minute steps.
6. The app reopens the last page if relaunched within 10 minutes; otherwise Today.
7. Restore requires a confirmation that names the backup's date.
8. German voice default and filtering as in section 10.
9. Card edits keep the original source entry; the edited card is marked "edited".
10. Restore offers "Export current data first" before replacing anything.

## 12. Content used in the mockups

All German is real and attributed, as product spec principle 2 requires. Numbers, dates and statuses are demo values.

- Words: Wiktionary (Tisch, Buch, Zug, Zeit, Bahnhof, Geschwindigkeitsbegrenzung, Topf, Brei, Mutter, Wald, Haus, Frau, Kind, Welt, Wort).
- Sentences: Tatoeba #9280332, #2301788, #8320752, #13176125, #13777906, #13724962, #11966622, #4277876, #11786970, #6595406, #12134416, #12151895. On the tick screen these stand in for the Language Transfer transcript.
- Reading: "Der süße Brei", Brothers Grimm, 1857 edition (Wikisource), with Margaret Hunt's 1884 translation (Project Gutenberg #5314). The 1857 text uses pre-1901 spelling (for example *gieng*, *Armuth*), hence the "Historical spelling" chip.
- Grammar: Nicos Weg A1 chapter, lesson and grammar-topic names from DW's course page; the definite-article table from Wiktionary's declension template.
- Lecture lengths: estimated from the MP3 file sizes at 128 kbps.
