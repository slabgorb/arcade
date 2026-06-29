---
story_id: "10-8"
jira_key: ""
epic: "10"
workflow: "tdd"
---
# Story 10-8: Ammo-count bullet color (yellow/blue/red by charges in flight)

## Story Details
- **ID:** 10-8
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 2
- **Type:** chore

## Story Description

Tint the player bullet center by charges currently in flight (book ch. player charges, CHACOU): 
- Fewer than 6 in flight = yellow
- 6-7 in flight = blue
- 8 in flight = red

Currently bullets are always white (render.ts:204-215, glyphs.ts:262-267).

Reference: context-epic-10.md Player charges section.

## Acceptance Criteria
1. Player bullet color reflects live bullet count: under 6 yellow, 6-7 blue, 8 red
2. Color derives from bullet count at render time (no core change required)
3. Existing bullet render/tests unaffected

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-29T16:59:38Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T16:36:03Z | 2026-06-29T16:40:53Z | 4m 50s |
| red | 2026-06-29T16:40:53Z | 2026-06-29T16:49:11Z | 8m 18s |
| green | 2026-06-29T16:49:11Z | 2026-06-29T16:52:47Z | 3m 36s |
| review | 2026-06-29T16:52:47Z | 2026-06-29T16:59:38Z | 6m 51s |
| finish | 2026-06-29T16:59:38Z | - | - |

## Technical Approach

**Scope:** Shell/render layer only (glyphs.ts, render.ts)

**Implementation Plan:**
1. Read current charge count from GameState at render time
2. Compute color index based on charges in flight:
   - 0-5 charges → yellow (YELLOW constant)
   - 6-7 charges → blue (BLUE constant)
   - 8+ charges → red (RED constant)
3. Pass color to drawBullet or equivalent render function
4. Add unit test covering all three color thresholds

**Files to Modify:**
- `tempest/src/shell/render.ts` — update bullet render to accept/use color
- `tempest/src/shell/glyphs.ts` — update drawBullet signature to accept color
- `tempest/tests/shell/render.bullet.test.ts` — add color threshold tests

**Note:** No core/sim change needed; charge state is already tracked in GameState.

## Delivery Findings

### TEA (test design)
- **Improvement** (non-blocking): the story's `render.ts:204-215` / `glyphs.ts:262-267`
  line refs are stale — the real bullet code is `drawBullets` at `render.ts:267-278`
  and `playerBulletGlyph` at `glyphs.ts:262-267`. Affects only the spec pointer;
  tests target the real seams. *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings during implementation.

### Reviewer (code review)
- **Improvement** (non-blocking): the `?raw` wiring assertions in
  `tests/shell/render.bullet-color.test.ts` are loose — `/bullets\.length/` (l.70) and
  `/\bplayerBulletGlyph\b/` (l.80) aren't anchored to the call site, and the Set-size /
  not-toContain checks (l.59-60) are dominated by the preceding `toEqual`. Affects
  `tempest/tests/shell/render.bullet-color.test.ts` (tighten regexes to the call site;
  drop the redundant lines). Behaviour is fully covered by the pure-function tests, so
  this is polish, not a correctness gap. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

3 deviations

- **"blue" bucket maps to the existing `cyan` palette colour, not a new `blue`**
  - Rationale: avoids adding a near-duplicate palette colour (palette stays tight,
  - Severity: minor
  - Forward impact: if a distinct true-blue is ever wanted, add it to GlyphColor +
- **"bullet center" interpreted as the bullet glyph body (both octagon rings)**
  - Rationale: the glyph IS the bullet's visible body/center; the streak is motion FX.
  - Severity: minor
- **Red threshold uses a literal `8`, not core's `MAX_BULLETS`**
  - Rationale: `glyphs.ts` is declared SHELL-only and must never import core (the Hard
  - Severity: minor
  - Forward impact: if the 8-shot cap ever changes, this literal must change in

## Design Deviations

### TEA (test design)
- **"blue" bucket maps to the existing `cyan` palette colour, not a new `blue`**
  - Spec source: context-story-10-8.md, Problem / AC1
  - Spec text: "6-7 = blue"
  - Implementation: `playerBulletColor(6|7)` returns GlyphColor `'cyan'` (#00e5ff).
    `GlyphColor` / `GLYPH_HEX` carry no `blue`; `cyan` IS the codebase's blue.
  - Rationale: avoids adding a near-duplicate palette colour (palette stays tight,
    per "don't gold-plate"); cyan is the established blue used elsewhere (pulsar, stars).
  - Severity: minor
  - Forward impact: if a distinct true-blue is ever wanted, add it to GlyphColor +
    GLYPH_HEX and flip the middle bucket — single-line change, tests pin the bucket.
- **"bullet center" interpreted as the bullet glyph body (both octagon rings)**
  - Spec source: context-story-10-8.md, Problem
  - Spec text: "Tint the player bullet center"
  - Implementation: the count-derived tint recolours `playerBulletGlyph` (via the
    `strokeGlyph` `override` arg); the travel streak/tail keeps its colour.
  - Rationale: the glyph IS the bullet's visible body/center; the streak is motion FX.
  - Severity: minor
  - Forward impact: none

### Dev (implementation)
- **Red threshold uses a literal `8`, not core's `MAX_BULLETS`**
  - Spec source: render.bullet-color.test.ts (AC1) / context-story-10-8.md AC1
  - Spec text: "8 in flight = red"; test asserts `playerBulletColor(MAX_BULLETS) === 'red'`
  - Implementation: `chargesInFlight >= 8 ? 'red'` — a literal 8 (commented as == MAX_BULLETS)
  - Rationale: `glyphs.ts` is declared SHELL-only and must never import core (the Hard
    Architectural Boundary, stated in the glyphs.ts header). Importing `MAX_BULLETS`
    from `core/rules` would break that boundary. The TEA test independently guards
    `expect(MAX_BULLETS).toBe(8)`, so the two stay coupled in CI without an import.
  - Severity: minor
  - Forward impact: if the 8-shot cap ever changes, this literal must change in
    lockstep — the test's `MAX_BULLETS === 8` guard fails loudly and flags it.

### Reviewer (audit)
- **TEA — "blue" → palette `cyan`** → ✓ ACCEPTED by Reviewer: faithful and avoids a
  near-duplicate `GlyphColor`; `cyan` (#00e5ff) is the codebase's established blue.
  Reversal is a one-line change if a true-blue is ever wanted.
- **TEA — "center" = bullet glyph body (both octagon rings)** → ✓ ACCEPTED by Reviewer:
  recolouring the glyph via `strokeGlyph`'s `override` while the streak keeps its hue is
  the natural reading of "bullet center"; matches the existing pulsar-strobe override pattern.
- **Dev — literal `8`, not `MAX_BULLETS`** → ✓ ACCEPTED by Reviewer: importing core into
  `glyphs.ts` would violate the stated shell-only boundary (tempest/CLAUDE.md). The
  `expect(MAX_BULLETS).toBe(8)` test is a sound drift guard. Confirmed independently by
  reviewer-rule-checker (rule #14, 0 violations).
- No undocumented deviations found: spec ↔ code match on all three thresholds and the
  render-time / no-core-change constraint.

## Branch Strategy

**Branch Strategy:** gitflow (feature branch → PR targets `develop`)

Tempest uses gitflow per `.pennyfarthing/repos.yaml` (`default_branch: develop`,
`branch_strategy: gitflow`). Feature branch created off `origin/develop`:

**Branch:** `feat/10-8-ammo-count-bullet-color` (base: `origin/develop` @ 2c8ef9b)

## SM Assessment

**Routing:** Setup complete → handoff to TEA for RED phase.

**Scope:** 2-pt render-layer chore. Player bullet center tint by charges in flight
per CHACOU: <6 = yellow, 6–7 = blue, 8 = red (today always white). Touches
`render.ts` (~204–215) and `glyphs.ts` (~262–267) plus a new render test. No
core/sim change — charge count is already in `GameState` at render time.

**Setup corrections made:**
- sm-setup recorded the wrong branch strategy (trunk-based). Tempest is **gitflow**
  per `repos.yaml`; created `feat/10-8-ammo-count-bullet-color` off `origin/develop`.

**Heads-up (not part of this story):** the tempest checkout was sitting on
`feat/10-6-title-logo-approaching-rainbow` whose commits are **not** on
`origin/develop` and have **no PR**, yet the orchestrator sprint marks 10-6
complete (`bf71dd3`). The 10-6 feature branch is left untouched. Worth
reconciling separately — its code is not on `develop`.

**TEA focus:** failing tests for all three thresholds (0–5 yellow, 6–7 blue, 8 red),
asserting the chosen color constant per bullet-count bucket.

## TEA Assessment

**Tests Required:** Yes
**Reason:** New observable behaviour (count → bullet tint); not a doc/config/dep chore.

**Test Files:**
- `tempest/tests/shell/render.bullet-color.test.ts` — 9 tests, two seams:
  1. **Pure thresholds** (6 tests) — a new exported `playerBulletColor(count): GlyphColor`
     in the pure `glyphs.ts`, unit-tested without a canvas: `<6 → yellow`, `6–7 → cyan`,
     `8 (== MAX_BULLETS) → red`, both boundary flips (5/6, 7/8), and a distinctness +
     never-white check (AC3 regression guard).
  2. **drawBullets wiring** (3 tests, `render.ts?raw`) — render.ts imports
     `playerBulletColor` from glyphs, calls it, and feeds `s.bullets.length`. Source-text
     seam because `drawBullets` is module-private and draws to a live canvas (same
     approach as Story 6-17's render.enemy-scale test).

**Tests Written:** 9 tests covering 3 ACs
**Status:** RED — verified by testing-runner: `1 failed | 60 passed` files,
`9 failed | 608 passed` tests. The 9 fail for the right reasons (`playerBulletColor is
not a function` ×6; render.ts source not yet wired ×3). No pre-existing test broke.

### Rule Coverage

| Rule (TS lang-review) | Test(s) / coverage | Status |
|------|---------|--------|
| #8 test quality (no vacuous asserts) | every test asserts concrete `.toBe`/`.toEqual` values; self-checked — no `let _ =`, no `assert(true)`, no always-None | n/a (own tests) |
| #1 type-safety escapes | tests use no `as any` / `@ts-ignore`; `playerBulletColor` is typed `GlyphColor` (union), so a bad literal fails at compile | guarded |

**Rules checked:** TS lang-review is largely a Dev-side review checklist; the applicable
test-design item (#8) is satisfied. Most checks (#3 enums, #6 React, #10 input validation)
are N/A to a pure colour-bucket function.
**Self-check:** 0 vacuous tests.

**Implementation guidance for Dev (Walter):**
- Add to `src/shell/glyphs.ts` (pure module, next to `playerBulletGlyph`):
  `export function playerBulletColor(chargesInFlight: number): GlyphColor` →
  `>= 8 ? 'red' : >= 6 ? 'cyan' : 'yellow'`.
- In `src/shell/render.ts` `drawBullets`: import `playerBulletColor`, compute
  `playerBulletColor(s.bullets.length)`, pass it as the `override` (last) arg to
  `strokeGlyph(ctx, playerBulletGlyph(), …, 14, tint)`. No core/sim change.
- See Design Deviations for the blue→cyan and "center = glyph body" decisions.

**Handoff:** To Dev (Walter) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `tempest/src/shell/glyphs.ts` — added pure `export function playerBulletColor(chargesInFlight): GlyphColor`
  next to `playerBulletGlyph` (`>= 8 → 'red'`, `>= 6 → 'cyan'`, else `'yellow'`). Kept core-free
  (literal 8, not `MAX_BULLETS`) to respect the module's shell-only boundary — see deviation.
- `tempest/src/shell/render.ts` — imported `playerBulletColor`; `drawBullets` computes
  `tint = playerBulletColor(s.bullets.length)` once per frame and passes it as the `strokeGlyph`
  `override` so the bullet body is recoloured. Travel streak/glow unchanged.

**Tests:** 617/617 passing (GREEN) — verified by testing-runner. New file
`tests/shell/render.bullet-color.test.ts` 10/10 pass; no regressions (baseline 608/617 → 617/617).
**Build:** clean — `tsc --noEmit` + `vite build` both pass (no type errors).
**Branch:** `feat/10-8-ammo-count-bullet-color` (pushed → `origin`, commit `74b57fe`).

**Self-review:**
- [x] Wired into the render path (`drawBullets`), not just a dangling pure fn
- [x] Follows project patterns (pure glyph helper + `strokeGlyph` override, like pulsar strobe)
- [x] All 3 ACs met (count-driven tint; render-time only, no core change; existing tests unaffected)
- [x] No error handling needed — total pure fn over a small integer domain (0..MAX_BULLETS)

**Handoff:** To next phase (verify / review).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (617/617 tests, build clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | confirmed 3 (all LOW after downgrade), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (15 rules / 28 instances / 0 violations) | N/A |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 3 confirmed (LOW, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

A clean, minimal 2-point render-layer change. Implementation is correct; the only findings
are LOW-severity test-seam polish that do not affect behaviour. No Critical/High issues.

### Rule Compliance (TypeScript lang-review #1–#13 + tempest boundary rules)

Mapped to the lang-review checklist; reviewer-rule-checker enumerated 28 instances across
15 rules with 0 violations. My spot-confirmations:
- **#1 type-safety escapes** — [VERIFIED] `playerBulletColor` is typed `(number) → GlyphColor`;
  `tint` infers `GlyphColor`; passed to `strokeGlyph(override?: GlyphColor)` — exact match.
  No `as any`/`@ts-ignore`/non-null assertions added (glyphs.ts:272-276, render.ts:271-282).
- **#3 union exhaustiveness** — N/A: `GlyphColor` is a pre-existing union; the fn is a
  mapping with if-chains returning literals, not a switch needing `assertNever`.
- **#4 null/undefined** — [VERIFIED] `number` and `Bullet[].length` are never nullable; the
  fn is total and always returns a defined `GlyphColor`.
- **#8 test quality** — see [TEST] findings below (redundant/loose assertions, LOW).
- **#14 glyphs.ts shell-only boundary** — [VERIFIED] glyphs.ts adds zero imports; uses literal
  `8` instead of importing `MAX_BULLETS` from core — boundary intact (glyphs.ts header rule).
- **#15 determinism (no time/RNG)** — [VERIFIED] pure fn; render derives tint only from
  `s.bullets.length`. No `Date.now`/`Math.random`/`performance.now`.

### Observations (subagent findings tagged by source)

- `[SEC]` clean — [VERIFIED] data flow `s.bullets.length` → 3 literal colors → `GLYPH_HEX`
  lookup → canvas style. No external/user input reaches the canvas; lookup is inert and
  exhaustive over `GlyphColor`. No injection/leak/crash surface (client-only game).
- `[RULE]` clean — 15 rules / 28 instances / 0 violations; literal-`8` boundary call confirmed
  correct, `tint` computed once before the per-bullet loop (perf #12) confirmed correct.
- `[TEST]` LOW — redundant assertions at `render.bullet-color.test.ts:59-60`: `Set.size===3`
  and `not.toContain('white')` can't fail independently of the preceding `toEqual`. Confirmed
  per rule #8, downgraded to LOW (true & harmless; documentary). Non-blocking.
- `[TEST]` LOW — `render.bullet-color.test.ts:80`: `/\bplayerBulletGlyph\b/` is satisfied by
  the import line alone, so the "silhouette unchanged" guard is weaker than intended. Behaviour
  covered by the full suite. Recommend `/strokeGlyph\s*\([^)]*playerBulletGlyph/`. Non-blocking.
- `[TEST]` LOW — `render.bullet-color.test.ts:70`: `/bullets\.length/` isn't anchored to the
  `playerBulletColor(...)` call. Known `?raw` tradeoff (same pattern as Story 6-17); the
  count→color contract is carried by the pure-function tests. Recommend
  `/playerBulletColor\s*\(\s*s\.bullets\.length\s*\)/`. Non-blocking.
- `[VERIFIED]` wiring real, not cosmetic — `strokeGlyph` sets strokeStyle/fillStyle/shadowColor
  from `GLYPH_HEX[override]`, so override=`tint` actually recolors the bullet octagons
  (render.ts:72-75, call at render.ts:281).
- `[VERIFIED]` AC2 "no core change" — diff touches only `src/shell/*` + tests; `src/core` untouched.

**Disabled specialists (no coverage claimed):** `[EDGE]` edge-hunter, `[SILENT]`
silent-failure-hunter, `[DOC]` comment-analyzer, `[TYPE]` type-design, `[SIMPLE]` simplifier
— all disabled via `workflow.reviewer_subagents`. I covered their domains directly: edge cases
(negative/NaN/>8 all resolve safely — confirmed by security + my own trace); no swallowed
errors (no try/catch, pure fn); comments are accurate and current (the new comments correctly
describe CHACOU + the cyan/blue and core-free decisions); type design sound (typed union return,
no stringly-typed API); no over-engineering (3-line if-chain, computed once per frame).

### Devil's Advocate

Let me try to break this, because tests passing means nothing on its own. First attack: the
tint is global, not per-bullet — at exactly 6 shots on screen, *every* bullet flips to cyan in
one frame, even the ones fired while the count was 3. Is that a bug? No: the story specifies the
colour reflects "charges currently in flight," an ammo-gauge semantic, not a per-shot identity.
The ROM CHACOU is a global charge indicator, so this is correct by spec — but a player could
*misread* it as "this specific bullet is hotter." That's a design choice, not a defect, and it's
documented. Second attack: off-by-one at the boundaries. "8 = red" but the code says `>= 8`. If
the sim ever let `bullets.length` exceed 8, 9+ would still be red — harmless, and `MAX_BULLETS`
caps it at 8 anyway, guarded by a test. "Fewer than 6 = yellow" → `< 6` via the fall-through;
5 → yellow, 6 → cyan, verified by explicit boundary tests. No off-by-one. Third attack: malformed
state. Could `s.bullets` be undefined and crash `drawBullets`? It's a non-optional `Bullet[]` in
`GameState`; if it were ever undefined the entire existing render loop already throws upstream, so
this change adds no new crash surface. `NaN`/`Infinity`/negative all resolve to a valid colour
(security agent confirmed). Fourth attack: the empty case — 0 bullets computes `tint = yellow`
then the loop never runs; a wasted ternary, not a bug. Fifth attack: did they actually wire it, or
is this a dead pure function the tests pass against in isolation? No — `render.ts:281` passes
`tint` as the live `override`, and `strokeGlyph` consumes it into the canvas style; the import and
call are both present and the build type-checks. Fifth attack lands nothing. The genuine weakness
is the `?raw` wiring tests: they assert *source text*, not *rendered output*, so a sufficiently
perverse refactor could keep the tokens while breaking the draw. But that is an accepted,
repo-wide seam (Story 6-17), and the pure-function tests pin the actual logic. Nothing here rises
to blocking.

**Data flow traced:** `s.bullets.length` (GameState count) → `playerBulletColor()` (pure, 3
literals) → `tint` → `strokeGlyph(..., override=tint)` → `GLYPH_HEX[tint]` → canvas stroke/fill.
Safe: no external input, exhaustive lookup, no nullable.
**Pattern observed:** pure glyph helper + `strokeGlyph` `override` recolour — mirrors the existing
pulsar cyan/white strobe (render.ts:72) and Story 6-17's pure-math/`?raw`-wiring split.
**Error handling:** total pure function over a bounded integer domain; no failure path. N/A by design.
**Handoff:** To SM (The Dude) for finish-story.