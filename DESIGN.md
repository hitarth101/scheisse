---
name: Scheiße
description: An iPhone home-screen German trainer built from Apple's own app structure, finished with Braun instrument details.
colors:
  housing: "#EFEFEC"
  housing-dark: "#000000"
  cell: "#FFFFFF"
  cell-dark: "#1C1C1E"
  well: "#E6E6E2"
  well-dark: "#121213"
  fill: "#E4E4E0"
  fill-dark: "#2C2C2E"
  fill-press: "#D6D6D1"
  fill-press-dark: "#3A3A3C"
  key-face: "#FAFAF8"
  key-face-dark: "#2C2C2E"
  graphite-ink: "#1C1C1A"
  graphite-ink-dark: "#F2F2EF"
  graphite-secondary: "#64645F"
  graphite-secondary-dark: "#A6A6A1"
  graphite-tertiary: "#8E8E88"
  graphite-tertiary-dark: "#6E6E6A"
  hairline: "#D6D6D1"
  hairline-dark: "#333335"
  select: "#E8E8E4"
  select-dark: "#2C2C2E"
  graphite-switch: "#4A4A46"
  graphite-switch-dark: "#F2F2EF"
  lamp-done: "#4A4A46"
  lamp-done-dark: "#D1D1CC"
  signal: "#2E7D32"
  signal-dark: "#4FBF63"
  signal-hi: "#358538"
  signal-hi-dark: "#66CC78"
  on-signal: "#FFFFFF"
  on-signal-dark: "#0B1A0D"
  again-key-top: "#5A5A56"
  again-key-bottom: "#41413E"
  der-blue: "#2763B8"
  der-blue-dark: "#7DAEF1"
  die-red: "#BA3237"
  die-red-dark: "#F28C88"
  das-teal: "#0D6E74"
  das-teal-dark: "#5CCFD3"
  danger: "#B3261E"
  danger-dark: "#F2B8B5"
  danger-wash: "#F6E3E1"
  danger-wash-dark: "#3A1715"
  diff-mark: "#F3E7B3"
  diff-mark-dark: "#5A4A12"
  on-diff-mark: "#1C1C1A"
  on-diff-mark-dark: "#F7EDC6"
typography:
  large-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "min(2rem, 48px)"
    fontWeight: 700
    lineHeight: 1.206
    letterSpacing: "-0.02em"
  title1:
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "min(1.647rem, 44px)"
    fontWeight: 700
    lineHeight: 1.214
    letterSpacing: "-0.015em"
  title2:
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.294rem"
    fontWeight: 700
    lineHeight: 1.273
    letterSpacing: "-0.01em"
  title3:
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.176rem"
    fontWeight: 600
    lineHeight: 1.25
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.3
  callout:
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.941rem"
    fontWeight: 400
    lineHeight: 1.3125
  subhead:
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.882rem"
    fontWeight: 400
    lineHeight: 1.333
  footnote:
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.765rem"
    fontWeight: 400
    lineHeight: 1.385
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.706rem"
    fontWeight: 400
    lineHeight: 1.333
  de-headword:
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "min(2.47rem, 60px)"
    fontWeight: 700
    lineHeight: 1.143
    letterSpacing: "-0.025em"
  de-sentence:
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "min(1.706rem, 44px)"
    fontWeight: 700
    lineHeight: 1.207
    letterSpacing: "-0.02em"
  de-reading:
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.118rem"
    fontWeight: 400
    lineHeight: 1.58
  tab-label:
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "10.5px"
    fontWeight: 500
rounded:
  hairline-mark: "4px"
  skeleton: "6px"
  field: "14px"
  key-plain: "16px"
  chip: "16px"
  key-signal: "18px"
  well: "18px"
  notice: "18px"
  group: "20px"
  card: "24px"
  sheet: "34px"
  round: "50%"
spacing:
  "4": "4px"
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "32": "32px"
  "44": "44px"
components:
  key-signal:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.on-signal}"
    typography: "{typography.headline}"
    rounded: "{rounded.key-signal}"
    padding: "0 22px"
    height: "58px"
  key-signal-disabled:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.graphite-tertiary}"
    rounded: "{rounded.key-signal}"
    height: "58px"
  key-plain:
    backgroundColor: "{colors.key-face}"
    textColor: "{colors.graphite-ink}"
    typography: "{typography.headline}"
    rounded: "{rounded.key-plain}"
    padding: "0 18px"
    height: "50px"
  key-plain-pressed:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.graphite-ink}"
    rounded: "{rounded.key-plain}"
    height: "50px"
  key-icon:
    backgroundColor: "{colors.key-face}"
    textColor: "{colors.graphite-secondary}"
    rounded: "{rounded.round}"
    size: "42px"
  grading-key:
    backgroundColor: "{colors.key-face}"
    textColor: "{colors.graphite-ink}"
    rounded: "{rounded.round}"
    size: "76px"
  grading-key-good:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.on-signal}"
    rounded: "{rounded.round}"
    size: "76px"
  grading-key-again:
    backgroundColor: "{colors.again-key-bottom}"
    textColor: "#F4F4F1"
    rounded: "{rounded.round}"
    size: "76px"
  text-button:
    textColor: "{colors.graphite-ink}"
    typography: "{typography.headline}"
    height: "44px"
  text-button-danger:
    textColor: "{colors.danger}"
    typography: "{typography.headline}"
    height: "44px"
  chip:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.graphite-ink}"
    typography: "{typography.subhead}"
    rounded: "{rounded.chip}"
    padding: "0 12px"
    height: "32px"
  grouped-list:
    backgroundColor: "{colors.cell}"
    textColor: "{colors.graphite-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.group}"
    padding: "0 18px"
    height: "52px"
  list-row-selected:
    backgroundColor: "{colors.select}"
    textColor: "{colors.graphite-ink}"
  card:
    backgroundColor: "{colors.cell}"
    rounded: "{rounded.card}"
    padding: "20px"
  answer-well:
    backgroundColor: "{colors.well}"
    rounded: "{rounded.well}"
    padding: "16px"
  text-field:
    backgroundColor: "{colors.cell}"
    textColor: "{colors.graphite-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "0 16px"
    height: "52px"
  segmented-control:
    backgroundColor: "{colors.fill}"
    textColor: "{colors.graphite-ink}"
    rounded: "17px"
    padding: "2px"
    height: "34px"
  switch-on:
    backgroundColor: "{colors.graphite-switch}"
    rounded: "16px"
    width: "51px"
    height: "31px"
  switch-off:
    backgroundColor: "{colors.fill-press}"
    rounded: "16px"
    width: "51px"
    height: "31px"
  lamp:
    rounded: "{rounded.round}"
    size: "10px"
  lamp-next:
    backgroundColor: "{colors.signal}"
    rounded: "{rounded.round}"
    size: "10px"
  lamp-done:
    backgroundColor: "{colors.lamp-done}"
    rounded: "{rounded.round}"
    size: "10px"
  tab-bar:
    typography: "{typography.tab-label}"
    rounded: "31px"
    padding: "0 6px"
    height: "62px"
  mini-player:
    rounded: "29px"
    padding: "0 8px 0 18px"
    height: "58px"
  sheet:
    backgroundColor: "{colors.cell}"
    rounded: "{rounded.sheet}"
    padding: "8px 20px 26px"
  notice:
    backgroundColor: "{colors.cell}"
    rounded: "{rounded.notice}"
    padding: "14px 16px"
  notice-error:
    backgroundColor: "{colors.danger-wash}"
    rounded: "{rounded.notice}"
    padding: "14px 16px"
  toast:
    backgroundColor: "{colors.graphite-ink}"
    textColor: "{colors.housing}"
    typography: "{typography.subhead}"
    rounded: "18px"
    padding: "10px 16px"
---

# Design System: Scheiße

The owner-facing spec, with screen-by-screen layouts, motion timings, haptics, copy tone and measured contrast, is `design/design-spec.md`. This file is the machine-readable layer and agrees with it. The reference stylesheet is `design/mockups/f.css`; its device frame, `.doc`, `.panel` and fake keyboard are mockup-only and never ship.

## Overview

**Creative North Star: "Native Gerät"**

Apple's own app structure (large titles, grouped lists, bottom sheets, a floating tab bar) finished with Braun instrument details: convex keys, a recessed answer window, small indicator lamps, and one green signal. The tool disappears into the task. Nothing needs learning, because every structure is one the iPhone already taught; character lives in a handful of precise physical details, never in decoration.

The palette is warm grey housing and graphite ink, with a single green that means "do this next" and nothing else. Density is iOS standard: 52 pt rows, 16 pt side margins, generous space above section headers. Light and dark follow the phone; there is no in-app theme switch. The system rejects the consumer language-app look (mascots, colour confetti, cartoon cards) and the stock Settings-clone look (coloured icon tiles on every row).

German is the large primary text; English is smaller, secondary, and hidden until asked for. Gender colour sits on the article only, as a memory aid that never carries meaning alone.

**Key Characteristics:**
- One green signal for the next action, Good, and the lit "next" lamp; everything else is grey and graphite.
- Convex keys, a recessed answer well, and 10 pt lamps carry the instrument feel.
- System font only, every size in rem so the app follows Dynamic Type to AX5.
- Floating glass for exactly two things: the tab bar and the mini-player.
- Neutral, downward shadows only; no coloured glows.
- 44 pt minimum tap targets everywhere.

## Colors

Restrained: warm greys and graphite, one green for the next action, three gender colours on articles only, red only for errors and destructive actions. Every token has a light and a dark value (`-dark` keys); the theme follows `prefers-color-scheme`.

### Primary
- **Signal Green** (`signal` / `signal-dark`): the one accent. Used on the green key (`.go`, one per screen at most), the Good grading key, the 116 pt play key, and the lit "next" lamp. Keys use a top-to-bottom gradient from **Signal Green High** (`signal-hi`) to Signal Green, with **On Signal** text. There is no green text anywhere.

### Secondary
- **Article Blue** (`der-blue`): masculine article.
- **Article Red** (`die-red`): feminine article.
- **Article Teal** (`das-teal`): neuter article. Teal, not green, so it is never confused with the signal.

### Tertiary
- **Danger Red** (`danger`) on **Danger Wash** (`danger-wash`): errors, error notices, destructive text buttons and action rows.
- **Diff Straw** (`diff-mark`, text `on-diff-mark`): highlights wrong or missing characters in a typed answer.

### Neutral
- **Warm Grey Housing** (`housing`): page background. Pure black in dark.
- **White Cell** (`cell`): grouped-list groups, cards, sheets, text fields.
- **Recessed Well** (`well`): the answer window set into a card.
- **Fill** (`fill`) / **Fill Pressed** (`fill-press`): segmented track, chips, skeletons, disabled keys; pressed rows and keys; switch track when off.
- **Key Face** (`key-face`): convex key surface.
- **Graphite Ink** (`graphite-ink`): primary text, text buttons, focus ring, active tab label and dot.
- **Graphite Secondary** (`graphite-secondary`): secondary text, section headers, footnotes, row icons.
- **Graphite Tertiary** (`graphite-tertiary`): chevrons, disabled glyphs, lamp-off ring. Never text.
- **Hairline** (`hairline`): 0.5 pt separators.
- **Select** (`select`): selected row, tapped word, revealed sentence highlight.
- **Graphite Switch** (`graphite-switch`) and **Lamp Done** (`lamp-done`): the switch track when on and the solid "done" lamp. In dark the switch inverts to a near-white track with a dark knob.
- **Again Key** (`again-key-top` to `again-key-bottom`): the dark graphite gradient of the Again grading key.

### Named Rules
**The One Signal Rule.** Green means "do this next" and nothing else: the green key, the Good grade, the play key, the lit next lamp. Switches, ticks, selections, links, text buttons and the active tab are graphite. If something green on a screen is not the next action, it is wrong.

**The Article-Only Rule.** Gender colour is applied to the article word only, never the noun, the row, or a dot. The article is always printed (*der Tisch*), so colour is a memory aid, never the only signal. The plural *die* stays uncoloured so it never looks like feminine *die*. In tables the colour follows the gender, not the word: every singular case form of the article (der, den, dem, des for a masculine noun) takes that gender's colour, every plural form stays uncoloured. Running reading text is never coloured. With the setting off, articles print in the surrounding text colour.

**The Never-Text Rule.** Graphite Tertiary is for non-text only (3.3:1). Secondary text uses Graphite Secondary.

## Typography

**Display Font:** the iPhone system font, San Francisco (`-apple-system, BlinkMacSystemFont, sans-serif`)
**Body Font:** the same
**Label/Mono Font:** none; numbers use tabular figures of the system font

**Character:** Apple's own text styles, unmodified, so German reads like any native iPhone app. No web fonts are loaded; San Francisco covers ä ö ü ß and capital ẞ.

The root is `html { font: -apple-system-body; }`, which makes 1rem the owner's iPhone body size (17 px at default). Every size is in rem, so the whole app follows Dynamic Type.

### Hierarchy
- **Large title** (700, 34/41 at default, ceiling 48 px): page titles.
- **Title 1** (700, 28/34, ceiling 44 px): detail page titles, review prompt word.
- **Title 2** (700, 22/28): typed-answer prompt, Capture phrase.
- **Title 3** (600, 20/25): sheet titles, card headings, example sentences.
- **Headline** (600, 17/22): emphasised body, key and text-button labels.
- **Body** (400, 17/22): body and list rows; line height never below 1.3.
- **Callout** (400, 16/21): revealed English under a reading sentence.
- **Subhead** (400, 15/20): secondary lines, notes, chips.
- **Footnote** (400, 13/18): footnotes and list section headers.
- **Caption** (400, 12/16): the smallest text size.
- **German headword** (700, 42/48, ceiling 60 px): revealed headword.
- **German sentence** (700, 29/35, ceiling 44 px): revealed answer sentence.
- **German reading** (400, 19/30, line height 1.58): reading text.
- **Tab label** (500, 10.5 pt fixed): tab bar only, the iOS standard and the one exception to the 12 pt floor.

### Named Rules
**The Dynamic Type Rule.** Every size is rem from `-apple-system-body`. Body and secondary text are never capped. Display sizes grow to a `min()` ceiling so a headword never outgrows the screen. At accessibility sizes (body 28 pt and up) the four round grading keys become a 2 x 2 grid of 64 pt wide keys with label and interval inside, and reference tables stack one block per case. Nav row, review header and tab bar stay compact, as in iOS.

**The No Eyebrow Rule.** There are no small all-caps labels above blocks ("WORD", "EXAMPLE"). The content or a sentence-case header says what a block is. All UI labels are sentence case; German nouns keep their capital everywhere.

**The Compound Rule.** Every German element carries `lang="de"` with `hyphens: auto`. Long compounds break at their joints via soft hyphens from the content data; never shrink text to fit, never `word-break: break-all`.

## Layout

Single-column portrait iPhone layout, standalone home-screen mode, respecting `env(safe-area-inset-*)`. Spacing scale 4, 8, 12, 16, 20, 24, 32, 44 pt. Side margin 16 pt for groups and cards, 20 pt for page titles and free text, 22 to 24 pt for reading text and the player. Section headers sit 20 pt below the previous group and 7 pt above their own. The nav row is 44 pt under the status bar; large titles sit beneath it. Scrolling pages put a solid housing backdrop behind the status bar.

Thumb first: Reveal, grading keys, play/pause and the green key sit in the lower third; rarely used things (Status, settings, More) sit at the top. The floating tab bar sits 16 pt from the sides and 24 pt above the bottom edge; the mini-player docks above it. Focus modes (Review, Capture, Tick screen) hide both.

**The 44 Point Rule.** Every tap target is at least 44 x 44 pt. Chips are 32 pt tall with an invisible hit area extended 6 pt above and below, and neighbouring chips stay at least 8 pt apart. Icon keys are 42 pt drawn inside a 44 pt target. Grading keys are 76 pt, the play key 116 pt, list rows at least 52 pt.

## Elevation & Depth

A hybrid of tonal layering and physical material. Structure is tonal: white cells on the warm grey housing, no shadow. Shadows exist only where a thing is a physical object: a convex key, a recessed well, a floating panel, a sheet. All shadows are neutral black at low opacity with a downward offset.

### Shadow Vocabulary
- **Convex key** (`0 1px 0 rgba(255,255,255,.9) inset, 0 1px 1px rgba(0,0,0,.10), 0 3px 8px -2px rgba(0,0,0,.14)`): key faces, icon keys, grading keys. Pressed: `inset 0 1px 3px rgba(0,0,0,.16)` and 1 pt lower.
- **Signal key** (`0 1px 0 rgba(255,255,255,.25) inset, 0 1px 1px rgba(0,0,0,.14), 0 4px 10px -3px rgba(0,0,0,.22)`): green key and Good. Pressed: `inset 0 2px 4px rgba(0,0,0,.25)`.
- **Recessed well** (`inset 0 1px 3px rgba(0,0,0,.12)`): the answer window.
- **Float** (`0 6px 24px -6px rgba(0,0,0,.18), inset 0 0 0 .5px rgba(0,0,0,.08)`): tab bar and mini-player.
- **Sheet** (`0 -8px 32px -8px rgba(0,0,0,.22)`): bottom sheets.

Dark values are deeper versions of the same shapes; see the sidecar.

### Named Rules
**The Two Glass Rule.** Only the tab bar and the mini-player are glass (translucent, `blur(24px) saturate(1.5)`). Nothing else floats or blurs.

**The No Glow Rule.** Shadows are neutral, never coloured. The lit lamp is a solid dot with a slight inner shade; lamps never glow.

## Shapes

Continuous rounded rectangles and circles, sized like hardware. Fields 14, plain keys and chips 16, green key, well and notices 18, groups 20, cards 24, sheets 34 (inset 8 pt from the screen edges). Icon keys, grading keys, the play key and lamps are full circles; the tab bar and mini-player are full capsules. Separators are 0.5 pt hairlines inset to the text. Icons are one authored set on a 24-unit grid, 1.8 stroke, round caps and joins, inline SVG, 22 pt by default, 25 pt in the tab bar, 14 pt chevrons.

## Components

### Buttons
Tactile and few: keys look pressable because they are drawn as keys.
- **Green key:** 58 pt tall, 18 radius, signal gradient, label left and icon right (or centred). One per screen at most. Pressed: flat signal with an inner shadow. Disabled: fill with tertiary label. Loading: the label changes ("Loading…"), no spinner.
- **Plain key:** 50 pt tall (44 inside rows), 16 radius, convex key face, graphite semibold label. Pressed: fill plus inner shadow.
- **Icon key:** 42 pt circle (52 pt beside the player, 64 pt for skip keys), convex face, secondary-graphite glyph.
- **Text button:** graphite semibold text, often with an icon, 44 pt hit area. Pressed at 60% opacity. Danger variant in danger red.
- **Focus:** a 2 pt graphite ring with 2 pt offset for hardware-keyboard users.

### Grading keys (signature)
Four 76 pt round calculator keys in a row: Again (dark graphite gradient), Hard, Good (signal green), Easy, each with its next interval printed beneath in tabular footnote. Hidden until reveal, never greyed. Pressed: inner shadow, 1 pt lower. At accessibility text sizes they become a 2 x 2 grid of 64 pt wide keys with the interval inside.

### Lamps (signature)
10 pt dots that carry state, always paired with text. Off: 1.5 pt ring in the lamp-off grey. Next: solid signal green with an inner shade. Part: half-filled graphite with a graphite ring (in progress, or "read"). Done: solid graphite.

### Answer window (signature)
A recessed well (18 radius, 16 padding, inner shadow) inside a card. Holds the prompt text when empty and the revealed answer after; the reveal fades in and rises 8 pt.

### Chips
- **Style:** 32 pt pill, fill background, graphite subhead text at weight 500, optional 16 pt icon.
- **State:** default and pressed. Invisible 44 pt hit area; 8 pt minimum gap.

### Cards / Containers
- **Corner Style:** cards 24, groups 20, notices 18.
- **Background:** white cell on housing.
- **Shadow Strategy:** none; tonal only.
- **Border:** none.
- **Internal Padding:** 20 for cards; rows 18 horizontal.

### Grouped lists
White groups inset 16 pt, rows at least 52 pt with 14 pt gaps between lamp or icon and text, 0.5 pt separators inset to the text. States: pressed (fill), selected (select plus graphite check), disabled (tertiary), with detail value in tabular secondary, with chevron, with switch, with inline prompt area. Section headers are sentence-case footnote in secondary graphite.

### Inputs / Fields
- **Style:** 52 pt tall, 14 radius, white cell, 1 pt inset hairline.
- **Focus:** 2 pt inset graphite ring.
- **Error / Disabled:** 2 pt inset danger ring with the message below.
- **German fields:** autocorrect, auto-capitalise and spell-check off; an ä ö ü ß Ä Ö Ü key row of convex keys pinned directly above the iPhone keyboard.

### Switches and segmented controls
Switch: 51 x 31 pt, fill-press track when off, graphite track when on (near-white with a dark knob in dark), never green. Segmented control: 34 pt fill track, the selected segment a white raised pill (`0 2px 6px rgba(0,0,0,.12)`) in semibold.

### Navigation
- **Nav bar:** 44 pt row under the status bar: back chevron with previous title or close key left, inline title centred on detail pages, action key right.
- **Tab bar:** floating glass capsule, 62 pt tall, five tabs (Flashcards, Lectures, Reading, Grammar, Status; changed 2026-10-04 from Today and Inbox, see design-spec section 3), 25 pt icons, 10.5 pt labels. Inactive in secondary graphite; active label in graphite ink with a 5 pt graphite dot above the icon. No badges.
- **Mini-player:** floating glass capsule, 58 pt, above the tab bar: title, tabular time, skip-back-10, play/pause on 44 pt keys, a 2 pt progress line.

### Sheets, notices, feedback
Bottom sheets: white, 34 radius, 8 pt inset, 36 x 5 pt grab handle, dimming scrim. Action lists inside sheets: 52 pt rows of icon plus label with hairlines, danger row in red. Notice: icon, bold line, secondary explanation; white for info, danger wash for errors. Toast: graphite pill with housing-coloured text, optional underlined Undo. Progress line: 4 pt fill track with a secondary-graphite bar (2 pt in the mini-player), facts only. Skeleton: fill bars, 6 radius.

### Diff marks
Wrong characters on a straw highlight (4 radius); missing characters the same plus a 2 pt underline; notes (for example "ue" for ü) as a dotted secondary underline. Always paired with a written note.

## Do's and Don'ts

### Do:
- **Do** keep green to the next action: one green key per screen, the Good grade, the play key, the lit next lamp.
- **Do** draw switches, ticks, selections, text buttons and the active-tab dot in graphite.
- **Do** colour only the article: blue der, red die, teal das; plural uncoloured; article always printed; in tables the colour follows the gender for every singular case form.
- **Do** set every size in rem from `font: -apple-system-body`, cap display sizes with `min()`, and switch grading keys to a 2 x 2 grid at accessibility sizes.
- **Do** make every tap target at least 44 x 44 pt, extending 32 pt chips with an invisible hit area.
- **Do** use convex keys for pressable things, the recessed well for answers, and 10 pt lamps for state.
- **Do** use tabular figures wherever numbers line up or change while you watch.

### Don't:
- **Don't** use green for anything that is not the next action: no green text, switches, ticks, links, or tab indicators.
- **Don't** put small all-caps eyebrow labels above blocks; the content or a sentence-case header names the block.
- **Don't** load web fonts or swap the system font for a display face.
- **Don't** make anything glass except the tab bar and the mini-player.
- **Don't** use coloured shadows or glows; shadows are neutral black, offset downward.
- **Don't** use Graphite Tertiary for text.
- **Don't** colour nouns, rows, plural articles, or running reading text by gender.
- **Don't** use emoji or Unicode symbols as icons; use the one 24-unit, 1.8-stroke line set.
