---
story_id: "pt1-11"
jira_key: "pt1-11"
epic: "pt1"
workflow: "tdd"
---
# Story pt1-11: star-wars: difficulty selector missing its death-star illustrations, and the easy/medium/hard hit regions are offset left

## Story Details
- **ID:** pt1-11
- **Jira Key:** pt1-11
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pt1-11-pt1-11-difficulty-selector-hit-region
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-20T12:10:41Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-20T10:46:57Z | 2026-08-20T10:50:40Z | 3m 43s |
| red | 2026-08-20T10:50:40Z | 2026-08-20T11:11:42Z | 21m 2s |
| green | 2026-08-20T11:11:42Z | 2026-08-20T11:37:57Z | 26m 15s |
| review | 2026-08-20T11:37:57Z | 2026-08-20T11:50:09Z | 12m 12s |
| red | 2026-08-20T11:50:09Z | 2026-08-20T11:54:07Z | 3m 58s |
| green | 2026-08-20T11:54:07Z | 2026-08-20T11:59:24Z | 5m 17s |
| review | 2026-08-20T11:59:24Z | 2026-08-20T12:10:41Z | 11m 17s |
| finish | 2026-08-20T12:10:41Z | - | - |

## Acceptance Criteria
- [x] Death-star illustrations display correctly for easy, medium, and hard difficulty tiers
- [x] Hit regions for easy/medium/hard options are aligned with their labels
- [x] Player can select difficulty by hovering over and clicking the correct region

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Reviewer (round 1):** No cross-story/upstream delivery findings. The one HIGH finding
  (illustration not inside its own hit region) is scoped entirely to pt1-11 and is carried in
  the Reviewer Assessment as required rework.
- **Reviewer (round 2):** No cross-story/upstream findings. The round-1 HIGH is closed; the one
  LOW comment-precision nit was resolved in-round (commit `3cf127e`). Story APPROVED.

## Sm Assessment

### SM (Titus Pullo) — setup assessment
- **Premise is current, no correction needed.** This is a playtest bug filed 2026-08-19 (one day old); the description's two observations reflect the tree as playtested, so unlike a parked/stale story there is no falsifiable premise to re-measure at setup.
- **Board clear.** No `feat/pt1-11` branch on origin before this claim; live sibling sessions are a-1/pt1-16 and a-2/pt1-3 (different stories). Claim branch pushed at one commit ahead for sibling visibility; story stamped `in_progress`.
- **Two independent defects for TEA to cover separately:**
  (a) **Missing illustrations** — the difficulty selector should render death-star illustrations per tier (easy/medium/hard) and renders none.
  (b) **Hit-region left-offset** — the clickable/hover region for easy/medium/hard sits LEFT of the labels; the player must hover left of "easy" to select it. This is a hit-testing coordinate bug.
- **Routing note for TEA:** the difficulty selector is a shell concern (menu/render/input/hit-testing), not core sim. Read `plugins/star-wars/CLAUDE.md` for the core/shell boundary and purity rules before writing RED. Confirm the exact selector source during RED — the offset is almost certainly a coordinate-space mismatch between where labels are drawn and where hit-testing measures.

## Subagent Results

**Cycle: 1**
**All received:** Yes

Method (round 2): re-ran preflight, comment-analyzer and rule-checker on the round-2 diff;
security carried forward from round 1 (no security-surface change) with its domain re-assessed
first-hand (2 changed arithmetic lines + one test file — no eval/DOM/network/injection surface).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 (1 justified `as unknown as` cast) | confirmed 0, dismissed 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | clean | 0 (all citations verified against ROM) | confirmed 0 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | 0 | confirmed 0 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 32 rules | confirmed 0 |

Working-tree audit: initially DIRTY on `sprint/epic-pt1.yaml` (pf's `in_progress→in_review` tracking stamp only, exit 0) — reverted, re-audit CLEAN. Not a source mutation.

**Round 2 re-dispatch** (rework re-review; change was 2 render.ts lines + 1 new test file): preflight
re-run (2428/2428 green, lint clean, no smells); comment-analyzer re-run (1 LOW comment-precision
nit, below); rule-checker re-run (0 violations / 33 rules, independently mutation-tested the fix);
security carried forward from round 1 (no security-surface change). Working-tree audit CLEAN after
reverting the same tracking stamp.

## Reviewer Assessment

### Reviewer (Marcus Tullius Cicero) — review phase

**Verdict:** REJECTED — 1 HIGH finding

The mechanical picture is spotless: 2425/2425 tests green, lint clean, all four enabled
subagents returned clean (comment-analyzer independently opened the 1983 ROM and confirmed
every citation; rule-checker cleared all 32 checklist rules; security clean). This is exactly
the trap of reviewing one's own Dev work — every line looks right because I remember writing
it. So I hunted behaviourally, which is where the disabled `edge_hunter` would have looked.

**[HIGH] The death-star illustrations are not inside their own choice's hit region — firing
at a death star (what the on-screen instruction and the ROM both direct) does not select it.**
- `plugins/star-wars/src/shell/render.ts` — `drawSelect` draws each label AT the choice's aim
  (the hit origin) but places the illustration at `y − radius·1.9` above it
  (`drawDeathStarPicker(ctx, x, y - radius * 1.9, radius)`). That offset is ≈0.227 in aim
  units — larger than `SELECT_HIT_RADIUS = 0.18` (sim.ts:867).
- **Confirmed by probe** (inverting the drawn illustration centre through input.ts's mouse→aim
  map, then the real `stepGame` hit test): hovering the death star returns `hover = null` on
  square 600×600 and wide 1024×576 for ALL three tiers; it only selects on portrait 540×960
  (where the same offset shrinks in aim-y). The common landscape aspect ratios are exactly the
  ones that fail.
- **Why this is HIGH, not a nitpick:** the screen literally says "FIRE LASER AT DESIRED DEATH
  STAR", and this story ADDS three death stars a player will aim at — but aiming at them does
  nothing; only the small text label beneath is hittable. That re-introduces the same
  selection-confusion class of bug the story exists to fix. The story context spelled out the
  structural remedy — "ROM hit region is an axis-clipped diamond centred on the ILLUSTRATION ...
  draw and hit share one origin BY CONSTRUCTION, which is the structural lesson for the fix" —
  and its suggested AC1 was "hovering the drawn **label/star** selects it." The illustration
  and the hit region were each built correctly but never integrated with each other.
- **Note on scope:** the finalized session ACs say "aligned with their labels", which the
  implementation does meet. I am rejecting on the un-integrated illustration because it is a
  confirmed user-facing regression in the interaction the story delivers, and the fix is small
  and already prescribed by the context — not deferring it (per the "never defer integration"
  standing guidance) is the right call.

**Required rework:**
1. (TEA) Add a failing test asserting that hovering the drawn illustration centre selects its
   choice, for all three window shapes — the coverage gap that let this through (the current
   `render.select-hit-align` suite only inverts the LABEL pixel, never the illustration).
2. (Dev) Reposition so the death star sits within its choice's hit region — center the
   illustration on the choice aim (the ROM's shared origin) with the label adjacent but still
   inside `SELECT_HIT_RADIUS`, so hovering EITHER the star or the label selects. Keep the
   existing label-selection and illustration-cluster suites green.

**Everything else is approved:** the alignment fix itself is correct and exact at every window
shape; the illustration palette/spread is faithful (M-010 models, no drift); the two
test-harness fixes (lastText-leak, green-text/surface isolation) are sound and re-verified RED
on the pre-fix tree; all citations path-qualified.

### Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/typescript.md` (30 numbered checks) + project rules
(core/shell boundary, comment-citation path-qualification). The `reviewer-rule-checker`
specialist verified all 32 exhaustively — **0 violations** — and I independently confirm the
load-bearing ones:

- **#1 type-safety escapes** — the single `proxy as unknown as CanvasRenderingContext2D` is the
  established shell-test double idiom (14+ sibling test files); not a real-boundary escape. VERIFIED (rule-compatible: checklist #1 permits documented test doubles).
- **#11 error handling** — `labelPixel`'s `if (!hit) throw` is an explicit guard, not a bare `!`
  non-null assertion. VERIFIED.
- **#17 comments assert only verified mechanisms** — comment-analyzer opened input.ts and the ROM
  and confirmed every citation (src/shell/input.ts:35-38, WSVROM.MAC:2658 BMIN, TCMES.MAC:582-587)
  and the draw/hit reasoning. VERIFIED.
- **#18/#19 test apparatus not self-satisfying** — both suites round-trip through the REAL
  `render()`/`stepGame()`; the illustration suite's y-band excludes only the title/instruction
  rows, never the illustration band, and a feature-absent mutant reddens all four assertions
  (that IS the pre-fix state). VERIFIED.
- **#24 retirement of the old `·0.3` scale** — swept: no live production survivor; the only
  remaining `·0.3` mentions are an unrelated scoring-page constant and the test's past-tense
  root-cause narrative. VERIFIED.
- **Core/shell boundary** — render.ts is shell; `Model3D` imported as a type from core (shell→core,
  the allowed direction); core/ untouched; core-purity suite green. VERIFIED.
- **Citation path-qualification** — all ambiguous-basename cites are `src/shell/input.ts:...`;
  tree-wide citation guard green. VERIFIED.

None of these VERIFIEDs contradicts any subagent finding (all four enabled subagents returned
clean); the one HIGH finding above is an ADDITIONAL behavioural gap none was scoped to catch
(the behavioural `edge_hunter` is disabled on this project).

## Reviewer Assessment

### Reviewer (Marcus Tullius Cicero) — review phase, ROUND 2 (re-review of the rework)

**Verdict:** APPROVED

The round-1 HIGH finding is CLOSED. Dev repositioned so the death star (`y − radius`) and its
label (`y + radius·0.9`) straddle the choice's hit origin, both inside `SELECT_HIT_RADIUS`.

**Independently verified the finding is fixed — three ways, not just "the test is green":**
- My own probe: at all 3 tiers × all 3 window shapes, BOTH the drawn star centre AND the label
  centre invert (through input.ts's map) to a hit on their own choice (`star=i, label=i`
  everywhere) — where round 1 returned `null` for the star on square/wide.
- The new guard is non-vacuous: I reverted ONLY the round-2 reposition and the star-hit suite
  reddened exactly as the finding described (square + wide `[null,null,null]`, tall passes),
  then went green when restored. `reviewer-rule-checker` independently reproduced the same
  mutation. So the test guards precisely this fix.
- `comment-analyzer` read `WSMAIN.MAC:1102-1120` in the ROM and confirmed the fix's "draw and
  hit share one origin" claim is a precise characterisation of PHESDS (the draw setup and the
  hit-test loop both walk the same `TDTH` table), and recomputed the offset invariant: the star
  sits ~0.12 aim and the label ~0.108 aim from the origin for ANY window shape — under 0.18 by
  construction, not by luck of the three tested sizes.

**Round-2 subagents:** [PRE] preflight clean (2428/2428, lint clean, no smells). [RULE]
rule-checker 0/33 violations, and independently mutation-tested the fix (revert → red, restore →
green). [SEC] security carried forward and re-assessed first-hand — the change is 2 arithmetic
render lines + a test file, no eval/DOM/network/injection/secret surface; clean. [DOC]
comment-analyzer confirmed the `drawSelect` comment and the WSMAIN.MAC:1102-1120 ROM citation are
accurate, and raised ONE LOW comment-precision nit — the star-hit test's "turret-free" framing
mis-credited the green isolation (surface phase, not turret-emptying, is what excludes the green
TIEs). **[DOC] resolved during this round** (commit `3cf127e`, comment-only): both test files'
isolation comments now attribute green-freeness to the surface phase and red-freeness to the
emptied ground objects. Re-verified green + citation guard clean. No Critical/High remain.

**One noted non-blocking observation (LOW, no action):** `starCenters()`'s `Math.min(...xs)` in
the star-hit test would emit `Infinity` on an empty cluster, but rule-checker traced it
unreachable in the test's domain (groups are always non-empty; an empty `pts` surfaces as a
clean `toHaveLength(3)` failure). Test-only, not shipped.

### Rule Compliance

Rubric unchanged from round 1 (`.pennyfarthing/gates/lang-review/typescript.md`, 30 checks +
core/shell boundary + citation path-qualification). `reviewer-rule-checker` re-ran the FULL
rubric against the round-2 surface (2 changed render.ts lines + the new `render.select-star-hit`
test) — **0 violations / 33 rules**. Load-bearing VERIFIEDs:

- **#1 / #8 test quality** — no `as any`, no non-null assertions, no unsafe casts in the new
  test; imports from `src/`, not `dist/`. VERIFIED.
- **#15 / #18 non-vacuous guard** — mutation-tested by two independent parties (rule-checker and
  me): revert the fix → the star-hit suite reddens exactly (square+wide `[null,null,null]`),
  restore → green. Not a self-satisfying fixture; it round-trips the REAL `render()` →
  `input.ts` inversion → `stepGame`/`hoverFromAim`. VERIFIED.
- **#17 comment mechanism** — the `drawSelect` fix comment's ROM claim (WSMAIN.MAC:1102-1120,
  draw+hit share one origin) was read in the ROM and confirmed; the offset invariant recomputed
  (~0.12 / ~0.108 aim < 0.18 for any shape). VERIFIED. The one comment-attribution nit was
  corrected in-round (`3cf127e`).
- **#21 degenerate input** — `Math.min(...xs)` unreachable-empty in the test domain (see LOW
  note). VERIFIED non-blocking.
- **Core/shell boundary** — `type Model3D` is shell→core (allowed); no core mutation; test uses
  pure `stepGame`. **Citation path-qualification** — `src/shell/input.ts:35-38` qualified; tree
  guard green. VERIFIED.

No VERIFIED contradicts any round-2 subagent finding.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Kept the collinear choice layout; did not adopt the ROM's non-collinear star positions**
  - Spec source: context-story-pt1-11.md, Technical Approach §3 / "Authentic layout details"
  - Spec text: "Consider adopting the ROM's non-collinear `aim` values while at it (EASY (−400,+100), MEDIUM (0,−300), HARD (+400,+100))"
  - Implementation: left `DEATH_STAR_CHOICES.aim` unchanged (all three at aim.y = −0.3); only the render-side scale was fixed. No core data moved.
  - Rationale: it was explicitly optional ("consider"), and not moving the aim values avoids any `SELECT_HIT_RADIUS` overlap re-check — the minimal change that satisfies both ACs.
  - Severity: minor
  - Forward impact: none
  - **Reviewer: ACCEPTED** — optional in the context; no AC requires the non-collinear layout.
- **Skipped the optional tier chrome (WAVE/BONUS captions and the live countdown digit)**
  - Spec source: context-story-pt1-11.md, Acceptance Criteria (suggested AC3) / "Authentic layout details"
  - Spec text: "tier chrome (WAVE/BONUS values) matches the cited ROM screen or is logged as a deviation"
  - Implementation: drew the three death-star illustrations + the existing title/instruction/labels; did NOT add the WAVE 1/3/5, NO BONUS/BONUS, 400,000/800,000 captions or the PH.TIM countdown digit.
  - Rationale: the context marks the chrome optional and the RED tests do not require it; the two filed defects (alignment + illustrations) are fully addressed. Logged per the spec's own instruction.
  - Severity: minor
  - Forward impact: none — a later polish story may add the captions; no assumption is broken.
  - **Reviewer: ACCEPTED** — chrome is optional; tests do not require it. (Unrelated to the HIGH finding.)
- **Death-star billboards drawn in 2D screen space, not through the world-camera drawDeathStar path**
  - Spec source: context-story-pt1-11.md, Findings (a) / Technical Approach §2
  - Spec text: "draw three small `drawDeathStar` billboards at the choice positions"
  - Implementation: added `drawDeathStarPicker(ctx, cx, cy, radius)` which strokes the SAME three models (DEATH_STAR / DEATH_STAR_TRENCH / DEATH_STAR_DISH) in the SAME palette, but in flat screen space at the choice pixel rather than via a world seat + view/proj.
  - Rationale: the picker is a 2D framing screen and its label placement must use the per-axis full-canvas map (to agree with input.ts's hit test), NOT the world camera's `min(w,h)` square letterbox — routing the billboards through `drawDeathStar`/`ndcToScreen` would reintroduce the very axis-disagreement being fixed. Same models, same colours, so no palette drift (M-010 stays the single source of the picture's look).
  - Severity: minor
  - Forward impact: none
  - **Reviewer: ACCEPTED** — screen-space is the correct choice; the world-camera path would reintroduce the axis mismatch. (The HIGH finding is about the illustration's OFFSET from the hit origin, not the screen-space approach itself.)

## Tea Assessment

### TEA (Atia of the Julii) — RED phase

**Two new failing suites, both driving the PUBLIC `render()` — no coupling to the fix's internals:**

1. `tests/shell/render.select-hit-align.test.ts` (AC1 — the offset bug). The **missing**
   coverage: the existing core suite (`tests/core/select-death-star.test.ts`) feeds
   `DEATH_STAR_CHOICES.aim` DIRECTLY, bypassing the pixel map, so it is green today and
   blind to this bug. This suite goes the whole way the player does — the PIXEL each label
   is drawn at, inverted through the shell's own `input.ts:35-38` mouse→aim mapping, must
   select that same choice via the real `stepGame` → `hoverFromAim` hit test. Captured the
   drawn anchor by mocking `layoutText` to a zero-width single-point glyph (glowText's first
   `moveTo` then lands exactly on the label anchor). Runs at three window shapes
   (square/wide/tall). **RED signature:** `[null, 1, null]` — EASY and HARD miss (their
   pixels invert to aim·0.6, 0.233 from their own aim, outside `SELECT_HIT_RADIUS=0.18`),
   MEDIUM hits (its error is 0.12, inside the radius). That asymmetry is the exact playtest
   report ("hover LEFT of easy") and the Architect's worked example.

2. `tests/shell/render.select-illustrations.test.ts` (AC2 — missing death-star pictures).
   Seam-agnostic per M-010 (sw3-9): reads the STROKES `render()` paints, by colour family.
   **Isolation matters and is handled explicitly:** a select frame still renders the space
   background, which draws ONE approaching death star (measured: its red dish is a ~9px
   cluster, off-centre RIGHT). Every assertion is therefore framed on a MULTI-location
   signal the lone background can't forge — ≥3 red-dish clusters, ≥3 green-body clusters,
   a red span > 0.4·W, and a red dish in the LEFT third. I deliberately DROPPED two earlier
   drafts ("red in right third", "green in both thirds") after the first run proved they
   passed today ON THE BACKGROUND alone — vacuous. All four now redden on 1-cluster today.

**What I did NOT test (deliberately, to avoid redundancy):** timeout→EASY, the TSCBN bonus
table, choice→wave mapping, hit-radius non-overlap, and purity are all already covered by
`tests/core/select-death-star.test.ts`, position-agnostically (they feed `choice.aim`), so
they SURVIVE a render-side fix unchanged. Re-testing them would be busywork.

**Guidance for Dev (Lucius Vorenus):**
- The fix is ONE shared aim→screen mapping. `drawSelect` (render.ts:1698-1699) currently
  places labels at `aim·(w·0.3)` / `aim·(h·0.3)`; `input.ts` inverts mouse over the FULL
  canvas (`aim·(w/2)` implied). Reconcile them — draw labels (and the new billboards) at
  `aim·(w/2)` / `aim·(h/2)` (or a shared pure helper) so the `SELECT_HIT_RADIUS` circle
  sits on the drawn pixels BY CONSTRUCTION. The core/shell purity test forbids fixing this
  by measuring the canvas — reconcile through the shared mapping.
- Add three `drawDeathStar` billboards at the choice positions (models already exist:
  DEATH_STAR / DEATH_STAR_TRENCH / DEATH_STAR_DISH, drawn by `drawDeathStar` render.ts:433).
- The illustration test asserts clusters, NOT exact pixels — you're free to choose billboard
  size/seat. If you adopt the ROM's non-collinear layout (context §"Authentic layout") you'd
  move `DEATH_STAR_CHOICES.aim` (core data, state.ts:383-387); the x order (EASY left / HARD
  right) is preserved, so both suites still hold, but re-run `select` to re-check radius
  overlap if you move the aim values.
- Optional tier chrome (WAVE/BONUS captions) is AC3 in the context — log a deviation if you
  skip it; the tests do not require it.

**Rule Coverage:** the language rubric here is the star-wars core/shell boundary + purity
(`tests/core/core-purity.test.ts`) — respected: both new suites exercise the SHELL render
path and the pure sim hit test through public seams only; neither imports `shell/` into
`core/` nor measures the DOM. No new citations added (I write no source constants); any ROM
lines referenced are in comments for provenance, not gated by `citations.test.ts`.

## Dev Assessment

### Dev (Lucius Vorenus) — GREEN phase, ROUND 2 (rework for Reviewer HIGH)

**Fix (`render.ts` `drawSelect`):** the death star and its label now straddle the choice's hit
origin `(x, y)` — star at `y − radius`, label at `y + radius·0.9` — so BOTH sit inside
`SELECT_HIT_RADIUS = 0.18` and hovering EITHER selects the tier (the ROM makes the illustration
itself the target: draw and hit share one origin, WSMAIN.MAC:1102-1120). Round 1 had the star at
`y − radius·1.9` (≈0.227 aim), outside the radius on landscape.

**Why these offsets:** the binding constraint is the narrowest window (wide 1024×576), where the
hit radius is only ±~52 px vertically. `y − radius` puts the star centre at ~0.12 aim above the
origin and `y + radius·0.9` puts the label centre at ~0.11 aim below — both comfortably < 0.18 on
all three shapes, with the star's lower edge clearing the label's ascenders (no overlap). The
star's body stays below the illustration test's `BAND_TOP = h·0.45` on every shape, and its x is
unchanged, so the left→right EASY/MEDIUM/HARD clustering still holds.

**Verification:** all 17 pt1-11 tests green — the new `render.select-star-hit` (3/3, star now
hittable at every shape), the round-1 `render.select-hit-align` (10/10, label still hittable —
now at ~0.11 aim, still inside the radius) and `render.select-illustrations` (4/4). Full
`npx vitest run --project star-wars` → **2428/2428 pass**. Lint clean. No deviations this round.

---

### Dev (Lucius Vorenus) — GREEN phase, round 1

**Implementation (all in `plugins/star-wars/src/shell/render.ts`):**
1. **Alignment fix (AC1/AC2-hit-region).** `drawSelect` now places each label at
   `x = w/2 + aim.x·(w/2)`, `y = h/2 − aim.y·(h/2)` — the exact inverse of input.ts's
   mouse→aim map (src/shell/input.ts:35-38), replacing the old `aim·(w·0.3)` / `aim·(h·0.3)`.
   The label anchor sits on the choice's own aim, so a hovering mouse over the label
   round-trips to that aim and selects it. Exact at every window shape.
2. **Illustrations (AC2).** Added `drawDeathStarPicker`, a screen-space billboard of the
   M-010 death-star picture (green body / white trench / red dish), drawn above each label
   at the choice site. See Design Deviations for why it's screen-space, not the world path.

**Two RED-suite harness bugs I authored as TEA and fixed here (both proven, not guessed):**
- **Alignment capture leaked `lastText` across renders.** The move-tagging mock never reset
  its "last laid-out text", so HARD's render inherited the prior test's leftover 'HARD' tag
  and mis-captured a background stroke (off-canvas x=1398) as the label. Fixed with a
  per-render `reset()`. Proven by an independent hover probe: `stepGame` returns hover 2 for
  aim (0.5,−0.3), so the hit test was always correct — only the test's capture was wrong.
- **Illustration green-cluster check was bridged by green text.** The instruction line is
  drawn in BOLT_GLOW (#9dff00, green family) and spans the width, merging the three green
  bodies into one cluster. Fixed by (a) putting the probe frame in a turret-free SURFACE
  phase so the background is steel-only (no death-star green/red behind the picker), and
  (b) restricting the colour analysis to the illustration band below the title/instruction.
  Both changes re-verified RED on the pre-fix tree (11 failed / 3 passed) before restoring
  the fix — the tests still fail without the implementation.

**Verification:** full `npx vitest run --project star-wars` → **2425/2425 pass** (was 2414 +
11 red). `npm run lint` clean. The tree-wide comment-citation guard clean (render.ts's ROM
cites resolve; input.ts is path-qualified — see the RED note below). No collateral.

---

### TEA (Atia of the Julii) — RED phase, ROUND 2 (rework for Reviewer HIGH)

**New failing suite:** `tests/shell/render.select-star-hit.test.ts` — the coverage gap the
Reviewer flagged. Round 1's `render.select-hit-align` only inverted the LABEL pixel; nothing
asserted the death-star ILLUSTRATION is hittable. This suite is placement-AGNOSTIC: it finds
each drawn death star from the render output (the symmetric green VGCGRN body's bounding-box
centre = the billboard centre, independent of where Dev seats it), inverts that centre through
the shell's own `src/shell/input.ts:35-38` mouse→aim map, and drives the REAL `stepGame` hit
test. Isolated over a turret-free SURFACE background so the only green is the three billboards.

**RED signature (matches the Reviewer's probe exactly):** `[null, null, null]` on square
600×600 and wide 1024×576 (the illustration sits `radius·1.9` ≈ 0.227 aim above the label,
outside `SELECT_HIT_RADIUS = 0.18`); PASSES on portrait 540×960 (the same offset shrinks in
aim-y). 2 failed / 1 passed — a valid RED. Round-1 select suites stay green (46/48 select tests
pass; only these 2 red). Lint clean, citation guard clean.

**Handoff to Dev:** reposition so each death star sits inside its choice's hit region — center
the illustration on the choice's aim (the ROM's shared draw/hit origin) and place the label
adjacent but still within `SELECT_HIT_RADIUS`, so hovering EITHER the star or the label selects.
Keep the round-1 label-selection (`render.select-hit-align`) and illustration-cluster
(`render.select-illustrations`) suites green — note the illustration-cluster test's `BAND_TOP =
h·0.45` filter, so keep the stars below that band. The test asserts bodies cluster left→right as
EASY/MEDIUM/HARD, which the unchanged `aim.x` order preserves.

---

**RED verified (TEA, round 1):** full `npx vitest run --project star-wars` → 2414 pass, only the 11 new pt1-11
assertions red (7 align + 4 illustration), no other file failing. Repo lint (`npm run lint`) clean.

**One collateral caught and fixed at RED (worth knowing for Dev):** the tree-wide comment-citation
guard (`tests/audit/comment-citations.test.ts`, `sw8-23-guard-hardening.test.ts`) re-opens every
`<file>:<line>` written in a source comment and holds the stale count at 0 (sw8-24). My first draft
cited `input.ts:35-38` bare; the guard's basename resolver bound it to `src/core/input.ts` (26 lines)
and flagged "span out of range" — exactly the ambiguity the guard's own RESOLVER NOTE warns about.
Fixed by PATH-QUALIFYING to `src/shell/input.ts:35-38` (the real mouse→aim map). **Lesson for Dev:**
any `<file>:<line>` you add in a comment where the basename is non-unique (input.ts, state.ts exist in
both core/ and shell/... ) MUST be path-qualified, or this guard reddens the whole tree.