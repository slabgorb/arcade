---
story_id: "lb2-7"
jira_key: "lb2-7"
epic: "lb2"
workflow: "tdd"
---
# Story lb2-7: Dress the lobby as a cabinet — implement the 'Arcade Lobby' Claude design (marquee, vector grid floor, bezel, CRT, tile redesign)

## Story Details
- **ID:** lb2-7
- **Jira Key:** lb2-7
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-12T14:24:48Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-12T13:54:33Z | 2026-07-12T13:56:54Z | 2m 21s |
| red | 2026-07-12T13:56:54Z | 2026-07-12T14:04:55Z | 8m 1s |
| green | 2026-07-12T14:04:55Z | 2026-07-12T14:12:58Z | 8m 3s |
| review | 2026-07-12T14:12:58Z | 2026-07-12T14:24:48Z | 11m 50s |
| finish | 2026-07-12T14:24:48Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): The design's wordmark is spelled one `<span>` per letter
  (`V·E·C·T·O·R A·R·C·A·D·E`) with a spacer span for the word break, so the `<h1>`
  has no accessible name — a screen reader gets `VECTORARCADE`, or spells it out.
  Affects `lobby/index.html` (the `<h1>` needs `aria-label="VECTOR ARCADE"`, or real
  spacing that survives `textContent`). A test pins the accessible name; the
  implementation choice is Dev's. *Found by TEA during test design.*
- **Gap** (non-blocking): AC-6 (layout holds from phone to wide desktop) is **not
  pinned by any test** and cannot be — jsdom has no layout engine, so there is no
  honest way to assert that the grid wraps or that the marquee does not overflow.
  Affects the story's verification strategy: this AC needs a real-browser check at
  review, not a green suite. Flagged so nobody reads "tests pass" as "AC-6 met".
  *Found by TEA during test design.*
- **Improvement** (non-blocking): the lobby had **no DOM test capability at all** —
  `vite.config.ts` sets `environment: 'node'` and `main.ts` does all its work at
  module scope, so not one line of the page's rendering was reachable by a test.
  Added `jsdom` as a devDependency; the DOM suites opt in per-file with a
  `// @vitest-environment jsdom` docblock, leaving `vite.config.ts` on `node` so the
  existing pure suites are untouched. Affects `lobby/package.json`.
  *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): shipping this story makes the cabinet look finished while
  **every tile reads NO SCORE in production**. That is not a bug in lb2-7 — it is
  ADR-0004's diagnosis arriving on screen: `getTopScore()` still reads
  `localStorage` on the *lobby's* origin, which no game ever writes, and the
  cross-origin cookie that fixes it is lb2-2 (still backlog). Affects
  `lobby/src/shell/storage.ts`. Worth knowing before release: the redesign will make
  the empty score line much more conspicuous than the old one did, so lb2-7 landing
  before lb2-2 is a visible regression in *perceived* polish even though it changes
  no score behaviour at all. *Found by Dev during implementation.*
- **Improvement** (non-blocking): the pinned dev port 5270 was already held by
  another lobby dev server (a different checkout of this repo), so `npm run dev`
  died on `strictPort`. I verified on a scratch port instead of killing a process I
  did not own. Nothing to fix in the code — noting it because "just serve fails on a
  second checkout" is the intended, documented behaviour and is easy to misread as a
  broken build. *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (non-blocking): `buildTile(game: Game, …)` takes the registry singleton by
  mutable reference, so nothing in the type prevents a future edit inside it from
  mutating the cabinet's single source of truth. Affects `lib/../src/shell/tiles.ts:35`
  (widen to `Readonly<Game>`; `renderTiles` already gets this right at the array level
  with `readonly Game[]`). Typescript rule #2. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the decoration's marker (`data-chrome`) and its style
  hook (`.chrome`) are two different selectors, and every furniture element carries both.
  A new layer marked but not classed would be unstyled and would swallow clicks. Verified
  that `[data-chrome] { pointer-events: none }` cascades correctly in both browsers and
  jsdom, so the class is redundant. Affects `lobby/index.html`. *Found by Reviewer during
  code review.*
- **Gap** (non-blocking): **no automated test can see this page.** jsdom has no layout
  engine, and the suite was 63/63 green while the footer disclaimer was visibly clipping.
  The green suite certified a page it never rendered. Affects the lobby's verification
  strategy: every future lobby story (lb2-8's rotating board, lb2-9's vector models) must
  include a real-browser pass, or consider standing up a Playwright smoke test — otherwise
  "tests pass" will keep meaning less than it sounds like it means. *Found by Reviewer
  during code review.*
- **Question** (non-blocking): shipping lb2-7 before lb2-2 means a cabinet that looks
  finished while **every tile reads NO SCORE in production** — the redesign makes that
  emptiness far more prominent than the old bare list did. Not a defect (the lobby is
  being honest, and ADR-0004's transport simply isn't built yet), but it is a release
  sequencing call for the Jedi. Affects `lobby/src/shell/storage.ts` / epic ordering.
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **The model slot ships empty, without the design's glyph and caption**
  - Spec source: `Arcade Lobby.dc.html`, the per-tile `data-model-slot` span
  - Spec text: the slot holds a `◈` glyph at 45% opacity plus a caption
    (`BLASTER`, `TIE FIGHTER`, `ASTEROID`, `TANK`, `BIPLANE`)
  - Implementation (pinned by test): the slot renders **empty** —
    `slot.children.length === 0`, `textContent` blank
  - Rationale: story AC-4 reserves an *empty* slot for lb2-9. In the design those
    captions are placeholder scaffolding for a model that isn't drawn yet; shipped
    literally they are a dashed box captioned with a word that is not a title, not a
    score, and not a model. lb2-9 draws the real vector model into this seam.
  - Severity: minor
  - Forward impact: lb2-9 fills the slot; the slot's box is sized by CSS so filling
    it must not move the tile layout.

- **The score line carries no player name**
  - Spec source: `Arcade Lobby.dc.html`, the per-tile score line
  - Spec text: `HI · JPX · 149,830`
  - Implementation (pinned by test): `HI · 149,830`, or `NO SCORE`
  - Rationale: the lobby cannot read a player *name*. `getTopScore()` returns a
    number or null, and ADR-0004's cross-origin cookie carries a single bare number.
    The name in the design is invented sample data. Rendering a fabricated one would
    be the cabinet lying about who holds the record.
  - Severity: minor
  - Forward impact: lb2-8 must amend ADR-0004 to carry name+score rows; if it does,
    the name can be restored to this line and the format widened.

- **The scanline overlay is not shipped**
  - Spec source: `Arcade Lobby.dc.html`, `data-props` block
  - Spec text: `scanlines` is a tweakable prop, `"default": false`
  - Implementation (pinned by test): no scanline element exists in the markup
  - Rationale: the design's own default is **off** — the designer turned it off. The
    `.dc.html` prop system is a design-tool affordance with no counterpart in the
    shipped app, so each tweak collapses to its default: curvature on, scanlines off,
    insert-coin on.
  - Severity: trivial
  - Forward impact: none. If scanlines are ever wanted, they are one element and one
    keyframe.

### Dev (implementation)

- **Tile titles are forced onto one line with `white-space: nowrap`**
  - Spec source: `Arcade Lobby.dc.html`, per-tile title span
  - Spec text: the design writes its titles as `STAR&nbsp;WARS` / `RED&nbsp;BARON` —
    non-breaking spaces, hardcoded into the markup
  - Implementation: `.tile-title { white-space: nowrap }` in CSS
  - Rationale: our titles come from the registry as ordinary strings (`STAR WARS`),
    and they broke at the space — those two tiles rendered two lines tall next to
    one-line neighbours and ragged the whole row (seen in the browser; the tests
    cannot see it). The design solved this in its *data*; we cannot, because the data
    is the registry and putting `&nbsp;` in it would corrupt a game's title for every
    other consumer. So the fix belongs in the presentation layer.
  - Severity: trivial
  - Forward impact: a future game with a very long title will overflow its tile
    rather than wrap. `18rem` fits `BATTLEZONE` at the clamp's max; anything much
    longer needs the clamp re-tuned.

- **The model bay is a faint solid recess, not the design's dashed placeholder**
  - Spec source: `Arcade Lobby.dc.html`, per-tile model slot
  - Spec text: `border: 1px dashed color-mix(in srgb, currentColor 50%, transparent)`
  - Implementation: `1px solid color-mix(in srgb, currentColor 18%, transparent)`
    plus a soft inset shadow
  - Rationale: a dashed 50%-opacity box is the universal visual language for *broken
    or missing image*. In the design it is scaffolding, sitting behind a glyph and a
    caption that say "a model goes here"; with those removed (see TEA's deviation) a
    dashed empty box on a live cabinet just looks like a bug. A faint solid recess
    reads as part of the cabinet's furniture — a bay — which is what it is.
  - Severity: minor
  - Forward impact: none on lb2-9; the bay's box model is unchanged, so drawing into
    it cannot move the tile layout.

- **Added a `prefers-reduced-motion` guard the design does not have**
  - Spec source: `Arcade Lobby.dc.html`, `@keyframes vb-blink` / `vb-flick`
  - Spec text: the marquee's SELECT GAME and the footer's INSERT COIN blink on a
    ~1.1–1.4s cycle, and the whole page carries a 7s flicker — unconditionally
  - Implementation: those animations and the tile transitions are disabled under
    `@media (prefers-reduced-motion: reduce)`
  - Rationale: hard-cut blinking text and a flickering full screen are precisely the
    patterns that trigger vestibular and photosensitive reactions, and the design has
    no off switch. This is an addition beyond what any test demands — logged because
    it is scope I added on my own judgment, not because a test forced it.
  - Severity: minor
  - Forward impact: none. If lb2-8's rotating board adds motion, it should join this
    media query.

- **Page `<title>` changed from `Arcade` to `Vector Arcade`**
  - Spec source: the design's wordmark
  - Implementation: `<title>Vector Arcade</title>`
  - Rationale: the cabinet now names itself VECTOR ARCADE on screen; the browser tab
    said `Arcade`. Trivial, but it is a user-visible string I changed without a test
    demanding it.
  - Severity: trivial
  - Forward impact: none.

### Reviewer (audit)

Every deviation logged by TEA and Dev, stamped. Nothing undocumented slipped through —
I diffed the design file against the shipped markup independently.

**TEA (test design):**

- **Model slot ships empty, without the design's glyph and caption** → ✓ **ACCEPTED.**
  Agrees with author reasoning, and it is what AC-4 asks for. Shipping a dashed box
  captioned `BLASTER` — a word that is not a title, a score, or a model — would have been
  scaffolding leaking into production. lb2-9 fills the seam.
- **Score line carries no player name** → ✓ **ACCEPTED.** Forced by the architecture, not a
  shortcut: `getTopScore()` returns `number | null` and ADR-0004's cookie carries one bare
  number. The design's `JPX` is invented sample data. Inventing a name would make the
  cabinet lie about who holds a record — the one thing this line must never do.
- **Scanline overlay not shipped** → ✓ **ACCEPTED.** The design's own prop default is
  `false`. Honouring a designer's off switch is not a deviation in spirit, only in letter,
  and the test pins its absence so it cannot creep back in.

**Dev (implementation):**

- **`white-space: nowrap` on tile titles** → ✓ **ACCEPTED.** The reasoning is exactly right
  and worth preserving: the design solved this in its *data* (`STAR&nbsp;WARS`), and we
  cannot, because our data is the registry and a non-breaking space there would corrupt the
  game's title for every other consumer. Presentation problem, presentation fix. Confirmed
  in-browser: titles now sit one line tall and the rows no longer rag. Dev's own noted risk
  (a much longer future title overflows rather than wraps) is real but distant — `18rem`
  fits `BATTLEZONE` at the clamp's max.
- **Model bay is a faint solid recess, not the design's dashed placeholder** → ✓ **ACCEPTED.**
  Sound judgment. A dashed 50%-opacity box is the universal idiom for *broken image*; with
  the glyph and caption removed it would have read as a bug on a live cabinet. The box model
  is unchanged, so lb2-9 can draw into it without moving anything — which was the actual
  requirement.
- **Added a `prefers-reduced-motion` guard the design does not have** → ✓ **ACCEPTED.**
  This is scope Dev added on his own judgment and correctly logged rather than smuggled.
  I am accepting it rather than flagging it as scope creep: hard-cut blinking text on a
  ~1.1s cycle plus a full-screen flicker is a genuine vestibular/photosensitive hazard
  (WCAG 2.2.2), the design ships no off switch, and the guard is four selectors. Verified it
  covers every animated element — `.cabinet`, `.select`, `.insert-coin`, `.tile` — with
  nothing animated left outside it. If lb2-8's rotating board adds motion, it must join
  this media query.
- **Page `<title>` → `Vector Arcade`** → ✓ **ACCEPTED.** The tab now matches what the
  cabinet calls itself.

**Undocumented deviations found by me:** none. The shipped markup matches the design
everywhere the two agents did not explicitly log a divergence.

## Sm Assessment

**Setup Complete:** Yes
**Story:** lb2-7 — Dress the lobby as a cabinet (implement the "Arcade Lobby" Claude design)
**Workflow:** tdd (phased) · 5 points · repo `lobby` · branch `feat/lb2-7-cabinet-design` (cut from `develop`)
**Context:** `sprint/context/context-story-lb2-7.md`

### Origin

The story did not come off the backlog — it was materialised from a Claude design
project during this session, exactly as epic lb2's description anticipated
("additional front-end/design stories will be appended to this epic from an
in-flight Claude design pass"). The design is the spec and is fetchable, not
paraphrased:

- **DesignSync MCP** → `method: get_file`,
  `projectId: f24e04ba-f4c1-40a4-8326-cebfca93c4e8`, `path: "Arcade Lobby.dc.html"`

TEA and Dev should read it directly rather than working from this summary.

### Scope split (deliberate — do not re-merge)

The design was cut into three stories because one third of it is blocked on data
and another third is a separate craft problem:

| Story | Scope | Why separate |
|-------|-------|--------------|
| **lb2-7** (this) | Cabinet furniture: grid floor + mirrored ceiling, bezel brackets, marquee, tile restyle, empty model slots, curvature vignette, CRT flicker, footer | Pure DOM/CSS on the existing structure. Shippable today. |
| **lb2-8** | The rotating top-five HIGH SCORES board | **Blocked on data.** ADR-0004 (accepted today) has the lobby read scores cross-origin from a cookie carrying a **single bare number** — no player name, no five rows. The board cannot be fed until that ADR is amended. Building the markup now would only produce a box we must fill with lies. |
| **lb2-9** | Real vector models in the tile model slots | Its own craft problem (geometry, `@arcade/shared/glow`, and a version-pin bump off v0.4.0). |

lb2-7 therefore leaves an **empty** `data-model-slot="<gameId>"` box on each tile —
the seam lb2-9 draws into without touching layout.

### The constraint I most expect to be violated

The design file **hardcodes every game's title, launch URL, glow colour and control
hints** directly into its markup. The lobby already derives all four from
`GAMES` in `src/core/registry.ts`. Copying the design's literals into the markup
would fork the source of truth and is the single most likely way this story goes
wrong. AC-2 exists to catch it: adding a game to the registry alone must put a
correct tile on the page.

Secondary: the tiles are real `<a href>` links today, and click / Tab+Enter /
middle-click / open-in-new-tab all work for free because of that. A restyle that
turns them into `<div>`s with click handlers silently destroys four behaviours
and passes a naive test.

### Data honesty

`getTopScore()` returns a **number or null** — the lobby has no access to a player
*name*. The design's `HI · JPX · 149,830` cannot be honoured in full. The tile must
render the real score (thousands-separated) or `NO SCORE`, and never a fabricated
name or a zero. This is a spec deviation forced by the architecture, not a
shortcut, and it is recorded here so Dev does not need to re-decide it.

**Merge gate:** clear — no open PRs in `lobby`.

**Handoff:** To Han Solo (TEA) for the RED phase.

---

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev)
**Tests Written:** 39 tests across 4 new files, covering 6 of the 7 ACs
**Commit:** `4ef9471` on `feat/lb2-7-cabinet-design`

### Test Files

| File | Env | What it defends |
|------|-----|-----------------|
| `tests/score.test.ts` | node | `formatScoreLine()` — the tile's score string, pure |
| `tests/tiles.test.ts` | jsdom | `buildTile()` / `renderTiles()` — the grid, built from the registry |
| `tests/chrome.test.ts` | jsdom (`JSDOM` on `index.html`) | The cabinet furniture, and that it never swallows a click |
| `tests/main.test.ts` | jsdom | Wiring — the bootstrap actually puts tiles on the page |

### The seams Dev must build

The tests import modules that do not exist yet. That is deliberate — `main.ts` today
does every bit of its work at module scope, so **not one line of the lobby's
rendering is reachable by a test**. The restyle is the moment to fix that:

- **`src/core/score.ts`** → `formatScoreLine(top: number | null): string`
  Pure. `null → 'NO SCORE'`, `149830 → 'HI · 149,830'`.
- **`src/shell/tiles.ts`** → `buildTile(game: Game, topScore: number | null): HTMLAnchorElement`
  and `renderTiles(container, games, getScore)`.
- **`main.ts`** shrinks to wiring: `renderTiles(games, GAMES, getTopScore)` + the font.

The cabinet furniture stays static markup in `index.html`, marked with
`data-chrome="grid-floor" | "grid-ceiling" | "bezel" ×4 | "vignette"`.

### The four traps these tests are set for

1. **Forking the source of truth.** The design hardcodes all five games — titles,
   URLs, colours, control hints. The obvious move is to paste its markup in. So the
   structural tests render a **synthetic registry** (`LUNAR LANDER`, `#7d3cff`) the
   design has never heard of, and one test asserts the output contains **none** of
   the design's literals (`TEMPEST`, `#00eaff`, `BLASTER`, `JPX`, `149,830`…). Paste
   the design's markup and that test goes red immediately.
2. **Killing the link.** Tiles are real `<a href>` today, which is the only reason
   click, Tab+Enter, middle-click and open-in-new-tab all work with zero JavaScript.
   A `<div onclick>` restyle looks identical and passes any "the tile is clickable"
   test. So the element type, the `href`, and `tabIndex === 0` are asserted directly.
3. **Decoration that swallows every click.** A full-bleed grid floor with a z-index
   and no `pointer-events: none` produces a screen that is perfect in a screenshot
   and completely dead to the mouse. `chrome.test.ts` parses `index.html` into a real
   JSDOM (so the `<style>` cascade is live — verified, jsdom does apply it) and
   asserts `getComputedStyle(el).pointerEvents === 'none'` on **every** `[data-chrome]`
   element, plus that none of them is focusable.
4. **The falsy zero.** A genuine stored score of `0` is data — the player played and
   scored nothing. `if (!top) return 'NO SCORE'` silently reclassifies that as "never
   played". `null` and `0` are asserted to produce different strings. This is
   typescript rule #4 (`||` where `??` is meant) with a real consequence.

### Rule Coverage

| Rule (lang-review/typescript.md) | Test | Status |
|------|---------|--------|
| #4 null/undefined — `\|\|` where `??` is meant, `0` is falsy but valid | `treats a genuine score of 0 as a score, not as an absent one` | failing |
| #10 input validation — unvalidated input reaching an HTML sink | `sets text as textContent, so a title can never inject markup` | failing |
| #8 test quality — no vacuous assertions | self-check below | — |
| #1 type-safety escapes — no `as any` in tests | none used; DOM casts are narrowing, not escapes | — |

**Self-check:** 1 vacuous test found and fixed. `keeps every decorative layer out of
the tab order` looped over `[data-chrome]` elements — of which there are currently
zero — so it iterated nothing and passed while asserting precisely nothing. Added a
`expect(chrome.length).toBeGreaterThan(0)` guard; it now fails honestly. The
`pointer-events` test already carried that guard.

### RED verification

Full suite: **4 files failed, 2 passed · 11 failed, 28 passed** (before the vacuity
fix; 12 failing after). Failures are the right kind:

- `score.test.ts`, `tiles.test.ts` — **module-not-found** (`src/core/score`,
  `src/shell/tiles` do not exist). Expected.
- `chrome.test.ts` — 10 **assertion** failures (no `[data-chrome]` furniture, `<h1>`
  still reads `ARCADE`, no marquee/footer text). Expected.
- `main.test.ts` — 2 **assertion** failures (score reads `HI SCORE 149830`, no model
  slots). Expected.
- **No harness or config errors.** jsdom resolves, the docblock env applies, the
  `JSDOM`-on-`index.html` cascade works.

**Pre-existing suites are untouched and still green** — `registry.test.ts` and
`storage.test.ts`, 28 passing. A test-only change could not have broken them, and it
didn't.

### Not covered — read this before trusting a green suite

**AC-6 (responsive layout) has no test and cannot have one here.** jsdom has no
layout engine: it will happily report that a 4000px-wide marquee "fits". Asserting
on CSS strings (`flex-wrap: wrap` is present) would test the implementation, not the
behaviour, and would pass on a page that is visibly broken. This AC needs a real
browser at review — it is logged as a Delivery Finding so a green suite is not
mistaken for a met acceptance criterion.

**Handoff:** To Yoda (Dev) for GREEN.

---

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 63/63 passing (GREEN) · `tsc --noEmit` clean · `vite build` clean
**Branch:** `feat/lb2-7-cabinet-design` (pushed)
**Commit:** `feat(lb2-7): dress the lobby as a cabinet`

### Files Changed

| File | What |
|------|------|
| `index.html` | The cabinet: grid floor + mirrored ceiling, four bezel brackets, marquee, vignette, CRT flicker, footer, and the full tile stylesheet |
| `src/core/score.ts` | **new** — `formatScoreLine()`, pure |
| `src/shell/tiles.ts` | **new** — `buildTile()` / `renderTiles()`, the grid built from the registry |
| `src/main.ts` | shrinks to wiring: find the container, render the tiles, load the font |
| `package.json` | `jsdom` + `@types/jsdom` (test-only, added by TEA in RED) |

### What the tests demanded, and what they got

`main.ts` used to do all of its work at module scope, so **not one line of the
lobby's rendering was reachable by a test**. The restyle was the moment to fix that,
and TEA's RED suite would not go green without it. The two new modules are that seam,
not decoration on top of it.

The four traps TEA set are all live in the final code:

1. **The registry is still the only source of truth.** Nothing about a game —
   title, URL, colour, control hint — is written in `index.html`. The design hardcodes
   all five games; none of that markup was copied. Adding a game to
   `src/core/registry.ts` alone puts a correct tile on the cabinet.
2. **Tiles are still `<a href>`.** Verified in a real browser: clicking TEMPEST
   navigated to `https://tempest.slabgorb.com/`.
3. **The decoration does not swallow clicks.** Every `[data-chrome]` layer is
   `pointer-events: none` and `aria-hidden`. This is the one that jsdom cannot really
   prove — so I proved it for real (below).
4. **`null` and `0` stayed different.** `formatScoreLine(0) === 'HI · 0'`, and only
   `null` becomes `NO SCORE`.

### Verified in a real browser, not just in jsdom

TEA flagged that AC-6 (responsive layout) **cannot be pinned by any test** — jsdom has
no layout engine and will happily report that a 4000px marquee fits. A green suite
would have said nothing about it. So I drove the actual page:

- **1440×900** — marquee fits on one line, tiles wrap 3 + 2, bezel in all four
  corners, the grid floor recedes to the horizon with its reflection above.
- **390×844 (phone)** — tiles stack one per row, the wordmark still fits its line,
  no horizontal overflow. **AC-6 holds.**
- **Click-through** — a real click on the TEMPEST tile passed through the vignette
  (`z-index: 4`, full-bleed) and launched the game. **AC-1 and AC-3 hold for real.**
- **Console: 0 errors, 0 warnings.**

That pass caught a defect no test could see: `STAR WARS` and `RED BARON` were
breaking at their space and rendering two lines tall beside one-line neighbours,
ragging the row. Fixed with `white-space: nowrap` (deviation logged — the design
solved it with `&nbsp;` in its data, which we cannot do because our data is the
registry).

### Acceptance criteria

| AC | Status | Evidence |
|----|--------|----------|
| 1 — cabinet furniture, intercepts nothing | ✅ | `chrome.test.ts` (computed `pointer-events`, tab order) + real click-through |
| 2 — registry is the source of truth | ✅ | synthetic-game + no-leak tests in `tiles.test.ts` |
| 3 — real `<a href>` semantics | ✅ | element/href/tabIndex tests + real browser navigation |
| 4 — empty `data-model-slot` per tile | ✅ | `tiles.test.ts`, `main.test.ts` |
| 5 — score line shows only provable data | ✅ | `score.test.ts`, `tiles.test.ts` |
| 6 — layout holds phone → desktop | ✅ | **manual browser check at 390px and 1440px** — no test can cover this |
| 7 — build + tests pass | ✅ | 63/63, `tsc` clean, `vite build` clean |

**Out of scope, as designed:** the rotating top-five board (lb2-8, blocked on
ADR-0004's single-number cookie) and the vector models in the bays (lb2-9).

**Handoff:** To Obi-Wan Kenobi (Reviewer).

---

## Subagent Results

Only two reviewer specialists are enabled in this project
(`pf settings get workflow.reviewer_subagents`); the other seven are toggled off, so
their domains were assessed **by me directly** rather than claimed as covered.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 63/63 tests, `tsc` silent, tree clean, no debug code, no `.only`/`.skip`, no `as any`, no lint script exists |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — boundary analysis done by me (see Rule Compliance #4, Devil's Advocate) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — no `try`/`catch` in diff; `main.ts:12` fail-fast guard reviewed by me |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — vacuity check done by me and corroborated by rule-checker #8 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — comments read by me; accurate, no stale claims |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — covered by rule-checker #2 (which found the `Readonly<Game>` gap) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — covered by rule-checker #10 (textContent-only sink) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — I found one redundancy myself (`.chrome` class vs `data-chrome`) |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled specialists returned; 7 disabled and assessed directly)
**Total findings:** 4 confirmed (0 blocking), 0 dismissed, 1 accepted-by-decision

---

## Reviewer Assessment

**Verdict:** APPROVED

No Critical or High issues. Four confirmed findings, none blocking.

### Findings

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| [MEDIUM] `[RULE]` | `buildTile(game: Game)` takes the registry singleton by mutable reference. `GAMES` is the cabinet's single source of truth and `renderTiles` maps the *same* objects through `buildTile` on every render; nothing in the type stops a future edit here from doing `game.title = …` and corrupting the entry every other tile reads. `renderTiles` already gets this right at the array level (`games: readonly Game[]`). | `src/shell/tiles.ts:35` | Widen to `Readonly<Game>`. Matches typescript rule #2 (missing `readonly` on an object parameter that must not be mutated) — **confirmed, not dismissed**, per the project-rules rule. Non-blocking: no mutation exists today. |
| [LOW] `[RULE]` | Non-null assertion `doc.defaultView!` on a value typed `Window \| null`. Safe *today* (the doc comes straight from `new JSDOM(html).window.document` and the window is never closed), but it removes the compiler's guard if `loadIndex()` is ever refactored to `document.implementation.createHTMLDocument()`, where `defaultView` genuinely is `null`. | `tests/chrome.test.ts:84` | Hold the `JSDOM` instance and use `dom.window` directly. Typescript rule #1 — confirmed, severity downgraded to Low given the mitigating construction. |
| [LOW] `[SIMPLE]` | The decoration marker and the style hook are two different things: the test queries `[data-chrome]`, but the CSS keys off a separate `.chrome` class, and every furniture element carries **both**. An element marked `data-chrome` but missing `class="chrome"` would be marked-but-unstyled. I verified jsdom cascades attribute selectors correctly, so `[data-chrome] { pointer-events: none }` works in both the browser and the test — the class is pure duplication. | `index.html` (`.chrome` rule + 7 elements) | Drop `class="chrome"`, key the CSS off `[data-chrome]`. The existing test *would* catch the drift, so this is hygiene, not a hole. |
| [ACCEPTED] | The footer disclaimer is 458px wide and unwrappable (non-breaking spaces, inherited verbatim from the design), so below ~470px it bleeds off both edges and is silently clipped by `.cabinet { overflow: hidden }` — no scrollbar ever appears to reveal it. | `index.html` `.disclaimer` | **Not a defect.** The Jedi ruled mobile out of scope (2026-07-12): the games are keyboard/mouse vector sims and are unplayable on a touch screen. AC-6 has been amended to a desktop bar (~1024px+) and the clipping recorded as known-and-accepted. |

### Rule Compliance (typescript.md #1–13)

| # | Rule | Instances | Result |
|---|------|-----------|--------|
| 1 | Type-safety escapes | 1 | **1 violation** (above). No `as any`, no `as unknown as T`, no `@ts-ignore`. `main.ts:12`'s `if (!games) throw` is guard-then-narrow — compliant, not an assertion. |
| 2 | Generic/interface pitfalls | 3 | **1 violation** (above). The two `Record<…>` in tests are properly typed, not `any`. |
| 3 | Enums | 0 | N/A — no enums. |
| 4 | Null/undefined (`\|\|` vs `??`, falsy `0`) | ~9 | **Clean, end to end.** `score.ts:30` tests `=== null`, not falsiness; `tiles.test.ts:191` uses `scores[id] ?? null` so a real `0` survives; `main.ts:12` guards `HTMLElement \| null`. The null-vs-0 discipline holds along the whole path `main.ts → tiles.ts → score.ts`, not just at the one function TEA tested. |
| 5 | Module/declaration | several | Clean. `import type { Game }` correctly type-only. No `.js` extensions — correct here: `moduleResolution: "bundler"`, a Vite browser app, not a native-Node-ESM package (unlike `@arcade/shared`, where the `.js` rule bites). |
| 6 | React/JSX | 0 | N/A — no `.tsx`. |
| 7 | Async/Promise | 5 | Clean. `await import('../src/main')` + `vi.resetModules()` is the correct fresh-evaluation idiom, not a bundling smell. |
| 8 | Test quality | 41 `it()` | Clean. No `as any`; `fakeStorage` type-checks against the real `Storage`; both `for` loops carry non-empty guards (TEA fixed the one vacuous case herself); no `.only`/`.skip`. |
| 9 | Build/config | 1 | Clean. `tsconfig.json` untouched, `strict: true` intact. `package.json` additive-only (`jsdom` + `@types/jsdom`, correctly paired). |
| 10 | Input validation / HTML sinks | all registry→DOM writes | **Clean — the one I most expected to fail.** `line()` (`tiles.ts:26`) is the *only* path from registry data to the DOM and uses `textContent` exclusively. `innerHTML` is never assigned from data anywhere; the two writes in tests are hardcoded literals. A dedicated test proves a hostile title (`<img src=x onerror=…>`) renders as literal text and produces no element. |
| 11 | Error handling | 0 catches | N/A. `main.ts`'s throw is deliberately uncaught — a missing `#games` should fail loudly, not silently render nothing. |
| 12 | Performance/bundle | — | Clean. No barrel imports; `readFileSync` is in a test `beforeAll`, not a hot path. |
| 13 | Fix-regressions | 0 | N/A — not a fix round. |

**CLAUDE.md — core/shell boundary (the one I checked hardest):** compliant, verified
mechanically. `src/core/score.ts` has **zero imports** and touches no DOM/IO token
(`document`/`window`/`localStorage`/`fetch`/`fs`) — it is genuinely pure. `src/shell/tiles.ts`
touches the DOM and imports *from* core — the only permitted direction. No file under
`src/core/` imports from `src/shell/`.

### Observations

- `[VERIFIED]` **Decoration does not intercept clicks** — the claim jsdom can only half-prove.
  I clicked the TEMPEST tile in a real browser: it navigated to `https://tempest.slabgorb.com/`
  through the full-bleed vignette sitting at `z-index: 4` above the content's `z-index: 2`.
  `index.html` `.chrome { pointer-events: none }` is doing real work.
- `[VERIFIED]` **`position: fixed` furniture is not silently broken.** This is a live trap:
  a `transform`, `filter`, or `will-change` on `.cabinet` would make it a containing block
  and re-anchor every fixed child to it. `.cabinet` animates **opacity only**
  (`index.html`, `@keyframes vb-flick`), which does not — so the bezel and grid stay
  viewport-pinned. Verified in-browser: the brackets hold their corners while the page scrolls.
- `[VERIFIED]` **The footer is not eaten by `overflow: hidden`.** `.cabinet` carries
  `overflow: hidden` and `min-height: 100vh`, which looks like a clipping bug waiting to
  happen. It isn't: the box grows to its content (1009px against a 900px viewport), and
  `footer.bottom` sits inside `cabinet.bottom`. Measured, not assumed.
- `[VERIFIED]` **Desktop layout holds** — 1024 / 1440 / 2560px: no horizontal overflow, the
  wordmark never exceeds its line, tiles reflow 2→3 per row. This is AC-6's real bar.
- `[VERIFIED]` **`renderTiles` replaces rather than appends** (`tiles.ts`, `replaceChildren`),
  so lb2-3's refresh-on-return cannot double the grid. Pinned by test.
- `[PATTERN — good]` The synthetic-registry test (`tiles.test.ts`, `LUNAR LANDER` / `#7d3cff`)
  plus the no-leak assertion is the right way to enforce "the registry is the source of truth."
  It fails the instant anyone pastes the design's markup, which was the single most likely
  way this story could have gone wrong. Worth reusing.

### Devil's Advocate

Argue this is broken. The strongest case starts with what the tests *cannot* see. jsdom has
no layout engine, so the entire visual half of a visual story is untested by construction —
and I proved that is not hypothetical: the disclaimer genuinely does clip, and the suite was
63/63 green while it did. That is a green suite certifying a page it never looked at. It only
turned out benign because the Jedi rules mobile out of scope; had the bug landed at 1200px
instead of 470px, nothing in this pipeline would have caught it, and Dev's own manual pass
would still have missed it because the screenshot stopped above the footer. The lesson stands
even though the finding doesn't: **"tests pass" says nothing about this story**, and every
future lobby story must be looked at in a browser.

Second: the whole cabinet leans on `pointer-events: none`. Get one selector wrong — or add a
sixth decorative layer and forget `class="chrome"` — and the arcade becomes a beautiful
screenshot where no tile can be clicked, with nothing on fire and no test failing (the
`[data-chrome]` test would catch a *marked* element, but not an unmarked new one). The
class/attribute split makes that one careless copy-paste away. That is exactly why I filed it.

Third, the malicious angle: registry strings flow into the DOM. If `launchUrl` were ever
`javascript:…`, the tile becomes an XSS vector — but the registry is developer-authored
source, not user input, and `registry.test.ts` pins `https://` on every entry, so this
requires a hostile commit, which is a different threat model. Titles are `textContent`, proven
by test. No injection path exists today.

Fourth, the confused user: every tile now reads **NO SCORE** in production, because ADR-0004's
transport is still unbuilt (lb2-2). The redesign makes that emptiness far more prominent than
the old bare list did. Nothing is *wrong* — the lobby is being honest, exactly as designed —
but shipping this before lb2-2 means a cabinet that looks finished and knows nothing. Dev
flagged this himself. It is a sequencing judgment for the Jedi, not a code defect, and it does
not block the merge.

**Data flow traced:** `GAMES` (registry, developer-authored) → `renderTiles(games, getScore)`
→ `buildTile` → `line()` → `el.textContent`. Safe: the only sink is `textContent`; `innerHTML`
is never assigned from data. Score path: `localStorage` → `getTopScore` (fail-soft to `null`)
→ `formatScoreLine` (`null` → `NO SCORE`, `0` → `HI · 0`) → `textContent`.

**Error handling:** `main.ts:12` throws loudly on a missing `#games` container — correct, a
lobby with no grid should not pretend. `getTopScore` degrades every failure (absent, corrupt,
throwing, unavailable storage) to `null`, and `main.test.ts` proves the full grid still renders
with storage stubbed to `undefined`.

**Handoff:** To Grand Admiral Thrawn (SM) for finish-story.