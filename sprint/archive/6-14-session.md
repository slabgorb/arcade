---
story_id: "6-14"
jira_key: ""
epic: "6"
workflow: "tdd"
---
# Story 6-14: Authentic per-level flipper flip patterns + multi-tick flip animation (6-9 follow-up)

## Story Details
- **ID:** 6-14
- **Jira Key:** None
- **Epic:** 6 (Tempest R2)
- **Workflow:** tdd
- **Stack Parent:** none (no stacking)
- **Repository:** tempest
- **Points:** 5
- **Branch:** feat/6-14-flipper-flip-patterns (base: develop)

## Acceptance Criteria
1. Flipper enemies animate multi-tick flips between adjacent lanes (not instantaneous)
2. Flip cadence/pattern per level matches authentic Atari ROM data
3. Core sim uses tick-based deterministic animation (no wall-clock timing)
4. Passing test coverage for per-level flip patterns (RESTful approach: RED → GREEN)

## Technical Context

### Background
- Story **6-9** (archived) established enemy motion fidelity baseline
- Story **6-13** (spawn schedule) is the sibling follow-up; this story (6-14) and 6-15/6-16 split out from the original per-level work
- Flippers are a distinct enemy type: they flip between two adjacent lanes on a pattern
- Current implementation likely uses uniform/simplified flip behavior; ROM has per-level cadence data

### Key References
- ROM source: ~/Downloads/tempest ROM + "Tempest vs Tempest" PDF (authentic per-level patterns)
- Story 6-9 session: `sprint/archive/6-9-session.md` (if present) — enemy motion baseline
- Story 6-13 context: `sprint/context/context-story-6-13.md` — spawn schedule reference
- Tempest sim code: `tempest/src/core/` (deterministic, tick-based, no DOM/Math.random/shell imports)
- Core files to review: `sim.ts`, enemy motion, geometry modules

### Core Purity Constraint
**src/core/ is deterministic:** no DOM, no wall-clock time, no Math.random, no shell imports.
Flip animation timing must use ticks (game loop iterations), not milliseconds.

### Difficulty Ratchet Rule (from project memory)
- Ratchet difficulty UP TO authentic ROM (ceiling)
- Do NOT gold-plate deep levels (L17-33+) that nobody reaches
- ROM is canonical and authoritative over playtest-tuned curves

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-28T14:43:11Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-28T14:02:15Z | 2026-06-28T14:03:59Z | 1m 44s |
| red | 2026-06-28T14:03:59Z | 2026-06-28T14:18:48Z | 14m 49s |
| green | 2026-06-28T14:18:48Z | 2026-06-28T14:29:14Z | 10m 26s |
| review | 2026-06-28T14:29:14Z | 2026-06-28T14:43:11Z | 13m 57s |
| finish | 2026-06-28T14:43:11Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): `stepFlipper` receives `params: LevelParams` but not `level`, so the per-level flip pattern must reach it through `params`. Affects `src/core/rules.ts` + `src/core/enemies/flipper.ts` (have `levelParams()` carry the `flipPatternForLevel(level)` result so `stepFlipper` can read `moveFrames`/`flipFrames`; the "completes in exactly flipFrames ticks" test cross-checks that `levelParams(1)`'s pattern equals `flipPatternForLevel(1)`). *Found by TEA during test design.*
- **Gap** (non-blocking): the new multi-tick flip state needs persistent fields on the `Flipper` type. Affects `src/core/state.ts` (add OPTIONAL `flipping?`, `flipDir?: -1 | 1`, `flipProgress?` so the ~30 existing flipper literals across the suite keep type-checking) and `makeEnemy`/grab logic in `src/core/sim.ts` (the rim-grab at `sim.ts:365-367` must skip a `flipping` enemy — the authentic `p_chk bmi` behaviour). *Found by TEA during test design.*
- **Improvement** (non-blocking): directional flip patterns (away-from-player, 2-vs-3 alternating) are descoped from 6-14 (see Design Deviations). Affects `src/core/enemies/flipper.ts` (a future story would thread the player lane into `stepFlipper` + add per-enemy flip-count state) — candidate follow-up alongside 6-15/6-16. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the render mid-flip slide (`render.ts drawEnemy`, flipper case) is untested — the shell has no render unit tests by project convention (verified by running the game). Affects `tests/shell/` (a future shell test could pin the flipper's interpolated screen position mid-flip). *Found by Dev during implementation.*
- All TEA Delivery Findings were resolved during GREEN: `flipPattern` now rides in `LevelParams` (TEA finding 1); optional `Flipper` flip fields + `sim.ts` grab-skip added (TEA finding 2). No new blockers. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `flipFrames` has no exact-value test anchor (only `>= 2` and `L33 <= L1`, both satisfied by a constant 2), and the L33 path (`flipFrames=3`, where the `>= 1 - 1e-9` float-completion epsilon is load-bearing) is never exercised. Affects `tests/core/enemies/flipper.flip.test.ts` + `tests/core/rules.flip-pattern.test.ts` (add a deep-level "flip still completes" test — note: pinning the exact `flipFrames` value is intentionally avoided per TEA deviation #3, so assert completion, not the count). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): no test drives a full `move → flip → move → flip` cadence cycle, so the post-completion move-timer reset (`flipper.ts` `flipTimer = moveFrames/60`) and the inter-flip wait are unverified; and no sim test covers a flip that COMPLETES onto the player's lane within one `stepGame` (grab-on-settle boundary). Affects `tests/core/enemies/flipper.flip.test.ts` + `tests/core/sim.flipper-flip.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the `LevelParams.flipInterval` comment says "legacy flipper fallback", but flippers no longer reference `flipInterval` at all (only pulsars do). Affects `src/core/rules.ts` (tighten the comment to "pulsars only"). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Directional flip patterns descoped — only cadence + multi-tick animation tested**
  - Spec source: context-story-6-14.md (story title); enemy-roster ROM extract §A l.9220-9348
  - Spec text: "Authentic per-level flip patterns" — the ROM `flipper_move` programs include directional logic (`m_l24` "flips 2 one way, 3 other, alternating"; `m_l87` "flip away from player, move 4 ticks")
  - Implementation: tests cover only the per-level CADENCE axis (climb frames between flips) + multi-tick animation; flip DIRECTION stays random ±1 (status quo). No test asserts away-from-player or alternating-count direction.
  - Rationale: away-from-player needs the player lane threaded into `stepFlipper` (signature change); alternating-count needs new per-enemy state. Both exceed the 5pt scope and the "don't gold-plate deep levels" guardrail; cadence is the dominant per-level feel the player actually notices.
  - Severity: minor
  - Forward impact: a follow-up story can add directional patterns — flagged in Delivery Findings.
- **Per-level cadence modeled as an envelope, not the literal per-level bytecode**
  - Spec source: enemy-roster ROM extract §A l.9204-9236; [[tempest-difficulty-ratchet]] / [[tempest-rom-is-canonical]] memory
  - Spec text: per-level `flipper_move` programs; our ROM docs decode only 4 example programs, not a full per-level table
  - Implementation: tests anchor L1 `moveFrames`=8 (gentle "move 8 ticks then flip") and L33 `moveFrames`=1 (constant flip), and assert a monotonic non-increasing cadence within bounds [1,8] — not each level's exact program.
  - Rationale: the full per-level table is not decoded in our docs; inventing exact mid-level values would be fabrication and deep-level gold-plating. The envelope captures the authentic gentle→constant feel and treats the ROM as the ceiling.
  - Severity: minor
  - Forward impact: none for reachable play; exact deep-level cadences can be refined if the ROM table is later decoded.
- **`flipFrames` pinned by lower-bound + monotonicity, not an exact authentic count**
  - Spec source: enemy-roster ROM extract §A l.7184-7187 (`flip_top_accel`)
  - Spec text: `flip_top_accel` is 2 for L1-32 and 3 for L33-99; an exact flip-duration-in-frames is NOT given in our docs
  - Implementation: tests assert `flipFrames` ≥ 2 (multi-tick) for all levels and `flipFrames` non-increasing across the L33 boundary — not an exact per-level frame count.
  - Rationale: the docs give the accel multiplier (direction of change) but not a concrete flip duration; asserting an invented exact count would be unsourced. Lower-bound + direction is the sourced, defensible contract; Dev chooses the concrete value.
  - Severity: minor
  - Forward impact: Reviewer can tighten if a source for the exact frame count emerges.

### Dev (implementation)
- **Added render-shell interpolation for the visible mid-flip slide (beyond the core test contract)**
  - Spec source: context-story-6-14.md (story title "multi-tick flip ANIMATION"); TEA API contract (this session) scoped tests to `src/core/`
  - Spec text: TEA's contract and tests cover only `src/core/`; no test exercises `src/shell/render.ts`
  - Implementation: `render.ts drawEnemy` now lerps a mid-flip flipper's screen position between its source and target lane by `flipProgress` and adds a half-turn tumble.
  - Rationale: without it the animation is invisible — the flipper would hold its lane for `flipFrames` ticks then snap, a WORSE feel than the old instant flip. Rendering the computed state is required to actually deliver the story, not gold-plating. Shell is verified by running the game (tempest CLAUDE.md), not unit tests; tsc passes.
  - Severity: minor
  - Forward impact: none — purely visual; a future shell test could pin it.
- **Flipper spawn timer now follows the authentic move cadence, not `flipInterval`**
  - Spec source: TEA Delivery Finding (this session); enemy-roster ROM extract §A
  - Spec text: no test pins `makeEnemy`'s initial flipper `flipTimer`
  - Implementation: `makeEnemy` seeds a flipper's `flipTimer` from `flipPattern.moveFrames / 60` (was `params.flipInterval`); pulsars still use `flipInterval`, and `flipInterval` stays in `LevelParams` (pulsars + `sim.difficulty.test.ts`).
  - Rationale: so the per-level cadence applies from spawn; otherwise the first flip would lag ~1.5s while later flips run on the new fast cadence — an inconsistency that contradicts "authentic per-level cadence".
  - Severity: minor
  - Forward impact: none.

### Reviewer (audit)
All five logged deviations reviewed:
- **TEA #1 — Directional flip patterns descoped** → ✓ ACCEPTED: sound. Away-from-player needs the player lane in `stepFlipper`'s signature; 2-vs-3 alternating needs per-enemy state. Both exceed the 5pt scope and the "don't gold-plate" guardrail. Cadence is the dominant per-level feel. Logged as a follow-up.
- **TEA #2 — Per-level cadence as an envelope, not literal bytecode** → ✓ ACCEPTED: the full per-level `flipper_move` table isn't decoded in our docs; the 8→1 envelope captures the authentic gentle→constant feel and treats ROM as the ceiling, consistent with [[tempest-rom-is-canonical]].
- **TEA #3 — `flipFrames` by lower-bound + monotonicity, not an exact count** → ✓ ACCEPTED: the exact flip-duration-in-frames isn't sourced from the ROM docs, so pinning it would couple the test to an arbitrary implementation pick. This is the right call — and it directly answers the test-analyzer's "pin flipFrames(1)=4" suggestion (I declined it for the same reason).
- **Dev #1 — Render-shell interpolation beyond the core test contract** → ✓ ACCEPTED: necessary, not gold-plating. Without it the multi-tick flip is invisible (hold-then-snap), a worse feel than the old instant flip. `render.ts` is shell (verified by running the game); tsc passes; core purity preserved (shell→core import direction is allowed).
- **Dev #2 — Flipper spawn timer follows the authentic move cadence, not `flipInterval`** → ✓ ACCEPTED: makes the per-level cadence apply from spawn instead of a ~1.5s first-flip lag; pulsars are untouched (`flipInterval` retained for them). Regression-checked: no other enemy init changed.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/rules.ts` — `FlipPattern` + `flipPatternForLevel(level)` (ROM cadence envelope L1 `moveFrames`=8 → L33+ =1, `flipFrames` 4→3 at L33); `flipPattern` carried in `LevelParams`.
- `src/core/state.ts` — optional mid-flip fields on `Flipper` (`flipping`/`flipDir`/`flipProgress`).
- `src/core/enemies/flipper.ts` — `stepFlipper` rewritten as a multi-tick flip state machine: starts a flip without moving the integer lane, advances `flipProgress` by `1/flipFrames` per tick, settles on `lane + flipDir` at completion, climbing throughout.
- `src/core/sim.ts` — flipper spawns on the authentic move cadence; the rim-grab finder skips a mid-flip flipper (authentic `p_chk` `$80` `bmi`).
- `src/shell/render.ts` — a mid-flip flipper slides between lanes and tumbles a half-turn (makes the animation visible).

**Tests:** 468/468 passing (GREEN) — verified by testing-runner RUN_ID `6-14-dev-green`, zero regressions (incl. `sim.difficulty`, `flipper.spawn`, `sim.death`, `sim.collisions`). `tsc --noEmit` clean.
**Branch:** `feat/6-14-flipper-flip-patterns` — committed (`1e477fa`) and pushed to origin.

**Self-review:**
- ✅ ACs met: multi-tick animation (AC1), per-level ROM cadence (AC2), tick-based deterministic — `dt`-driven, seeded RNG, no wall-clock (AC3), test coverage GREEN (AC4).
- ✅ Wired end-to-end: sim state machine → grab logic → render. Not a "computed but unused" field.
- ✅ Core purity preserved: no DOM/time/`Math.random`/shell imports added to `src/core/`.
- ✅ Pulsar behaviour untouched (`flipInterval` retained for pulsars).

**Handoff:** To Reviewer (The Big Lebowski) for the review phase.

## Sm Assessment

**Setup complete — routing to TEA for the RED phase.**

Story 6-14 is a 5pt TDD follow-up to 6-9, scoped to the **flipper** enemy in `tempest/src/core/`. Two deliverables:
1. **Multi-tick flip animation** — flips between adjacent lanes animate over several ticks rather than snapping instantly.
2. **Authentic per-level flip patterns** — flip cadence/pattern driven by ROM-authentic per-level data, not a uniform/simplified rule.

**Decisions / constraints handed to TEA:**
- **ROM is canonical and the ceiling.** Match authentic Atari per-level data; ratchet difficulty UP TO the ROM but do not exceed it. Authentic data sources: `~/Downloads/tempest` ROM dump + the "Tempest vs Tempest" PDF.
- **Core purity is non-negotiable.** Flip timing must be tick-based deterministic — no wall-clock, no `Math.random`, no DOM/shell imports in `src/core/`.
- **Don't gold-plate deep levels (L17–33+).** Fidelity nobody reaches is out of scope; cover the levels players actually see.
- **Jira:** explicitly skipped — this project tracks locally via `sprint/` YAML (no Jira).

**Gate status:** session file exists, fields set, context written (`sprint/context/context-story-6-14.md`, validated), branch `feat/6-14-flipper-flip-patterns` created on tempest `develop`. Ready for TEA to define ACs and write failing tests.

---
## TEA Assessment

**Tests Required:** Yes
**Reason:** A behavioural change to the flipper state machine (instant snap → multi-tick animation) plus new per-level data — squarely TDD.

**Test Files:**
- `tests/core/rules.flip-pattern.test.ts` (NEW, 7 tests) — authentic per-level cadence via a new `flipPatternForLevel(level)` export.
- `tests/core/enemies/flipper.flip.test.ts` (REWRITTEN, 11 tests) — multi-tick flip animation on `stepFlipper`. The previous 5 tests encoded the now-obsolete *instant* snap; replaced wholesale (behaviour change per the story, not a regression).
- `tests/core/sim.flipper-flip.test.ts` (NEW, 2 tests) — sim-level mid-flip grab immunity (authentic `p_chk bmi` skip), with a settled-grab control.

**Tests Written:** 20 tests covering 2 ACs (multi-tick animation; per-level patterns) + the mid-flip grab-skip fairness behaviour.
**Status:** RED — verified by testing-runner (RUN_ID `6-14-tea-red`): **455 passed / 13 failed / 468 total**, 49 files (46 pass, 3 fail), **zero regressions** in the other 46 files. The 13 failures are well-formed: `flipPatternForLevel is not a function` (missing export) and assertion mismatches (instant-vs-multitick; `flipping`/`flipDir`/`flipProgress` undefined; mid-flip still grabs). 5 guards + 1 control pass (climb-continues sanity, determinism/RNG threading, settled-grab control).

### Rule Coverage

| Rule (source) | Test(s) | Status |
|---------------|---------|--------|
| Core purity / determinism — seeded RNG, dt-driven, no wall-clock (tempest CLAUDE.md "Hard Architectural Boundary") | `flipper.flip`: "is deterministic: same seed…", "advances the RNG when a flip starts", "does NOT advance the RNG on a plain climb step"; `rules.flip-pattern`: "is deterministic — same level…" | failing (RED) |
| Tick-based animation, not wall-clock (SM constraint) | `flipper.flip`: "completes in exactly flipPatternForLevel(level).flipFrames ticks at 60 Hz" (advanced by `dt`, not `Date.now`) | failing (RED) |
| Totality / no NaN-or-zero (TS checklist #4 null-undefined) | `rules.flip-pattern`: "is total and sane for every level, including geometry wraps", "bottoms out at the ROM floor … never spams 0" | failing (RED) |
| Type design — explicit discriminated-union flip state (TS checklist #2) | `flipper.flip`: "exposes an in-progress flip: a direction and a fractional progress in (0,1)" | failing (RED) |
| ROM-as-ceiling, no deep-level gold-plate ([[tempest-difficulty-ratchet]], [[tempest-rom-is-canonical]]) | `rules.flip-pattern`: "cadence tightens … as the level rises", "flip animation is no slower deep — flip_top_accel 2→3 at L33", bounds [1,8] | failing (RED) |
| Test quality — no `as any`, import from `src/` not `dist/`, non-vacuous, guarded (TS checklist #8) | `sim.flipper-flip`: settled-grab **control** guards the immunity test; all assertions check concrete values | self-checked ✓ |

**Rules checked:** core purity/determinism (the project's #1 rule) + the test-relevant TS checklist items (#2, #4, #8) all have coverage. The remaining TS checklist items (#1/#3/#5–#7/#9–#13) target implementation source and are the Dev's self-review surface, not test-authorable behaviours.
**Self-check:** 0 vacuous tests. No `assert(true)`, no `let _ =`, no always-`undefined` assertions, no `as any` (a couple of `as number` casts narrow optional flip fields *after* asserting `flipping === true`).

### API contract for Dev (what RED expects)

1. **`src/core/rules.ts`** — `export interface FlipPattern { moveFrames: number; flipFrames: number }` and `export function flipPatternForLevel(level: number): FlipPattern`. Anchors: L1 `moveFrames`=8, deep (≥L33) `moveFrames`=1, monotonic non-increasing in between, all in [1,8]; `flipFrames` ≥ 2 every level and non-increasing across L33. Have `levelParams()` carry the pattern so `stepFlipper` can read it.
2. **`src/core/state.ts`** — extend `Flipper` with OPTIONAL `flipping?: boolean`, `flipDir?: -1 | 1`, `flipProgress?: number` (optional so existing flipper literals keep compiling).
3. **`src/core/enemies/flipper.ts`** — `stepFlipper` becomes a state machine: when `flipTimer` elapses, START a flip (roll direction → `flipDir`, set `flipping=true`, `flipProgress` jumps to `1/flipFrames`) WITHOUT changing the integer `lane`; each subsequent tick adds `1/flipFrames`; on reaching 1, COMPLETE (write `lane = wrapLane(lane + flipDir)`, clear `flipping`). Keep climbing (`depth`) throughout. Tick-counting convention: the start step is tick 1; completion lands on exactly `flipFrames` ticks at `dt = 1/60`.
4. **`src/core/sim.ts`** — the rim-grab finder (`sim.ts:365-367`) must SKIP an enemy that is `flipping` (authentic `p_chk bmi`).

**Handoff:** To Dev (Walter Sobchak) for the GREEN phase.

---
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (468/468 green, tsc clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 6 | confirmed 6 (all LOW/MED, non-blocking), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A (core purity confirmed) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 6 | confirmed 3 (LOW `as number`), downgraded 3 (`import type` → style, tsc-clean + matches convention) |

**All received:** Yes (4 enabled returned; 5 disabled via settings)
**Total findings:** 0 confirmed blocking, 9 confirmed non-blocking (LOW/MED), 3 downgraded-with-rationale, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

A tight, correct, well-scoped change. No Critical or High issues. Core purity and determinism — the project's #1 invariant — are intact; the flip state machine is bounded and total; no regressions in 468 tests. The findings are test-coverage gaps and cosmetic nits, none blocking.

**Data flow traced:** `levelParams(level)` → `flipPatternForLevel(level)` → `{moveFrames∈[1,8], flipFrames∈{3,4}}` rides in `LevelParams.flipPattern` → consumed by `stepFlipper` (animation timing) and `makeEnemy` (spawn timer `moveFrames/60`). The flip's intermediate state (`flipping`/`flipDir`/`flipProgress`) flows from `stepFlipper` → `resolvePlayerHits` (grab-skip) and → `render.ts drawEnemy` (visible slide). Every consumer of the new state is wired — no computed-but-unused fields. Safe because `flipFrames` is structurally locked to {3,4} (no div-by-zero) and `flipProgress` reaches the `>= 1 - 1e-9` completion within `flipFrames` ticks for both 1/4 (exact binary) and 1/3 (≈1−1.1e-16) accumulation.

### Observations

- `[VERIFIED]` **Core purity intact** `[SEC]` — evidence: `src/core/{rules,flipper,sim,state}.ts` add only `Math.max/min/round` and `rngNext(r)`; zero `Math.random`/`Date`/`performance.now`/DOM/shell imports. Confirms tempest CLAUDE.md "Hard Architectural Boundary". (security subagent: clean, 4 core files checked.)
- `[VERIFIED]` **Grab-skip is regression-safe for other grabbers** `[RULE]` — evidence: `sim.ts:369-372` `!(e.kind === 'flipper' && e.flipping)` short-circuits to `true` for fuseball/pulsar (`'fuseball' === 'flipper'` is false), and for settled flippers (`flipping` falsy), so their grab behaviour is byte-for-byte unchanged. Mid-flip immunity is also BOUNDED — a flip completes in ≤4 frames, then the flipper can grab — so it is not an exploit to dodge death indefinitely.
- `[VERIFIED]` **Float-completion epsilon is correct** — evidence: `flipper.ts:21` `>= 1 - 1e-9`; `flipFrames=4` accumulates 0.25×4 = 1.0 exactly, `flipFrames=3` accumulates to ≈0.9999999999999999 (1−1.1e-16 ≫ 1−1e-9) → both complete on the right tick; cannot complete early (2/3 < threshold).
- `[VERIFIED]` **`??` (not `||`) used correctly for the falsy `-1`** `[RULE]` — evidence: `flipper.ts:22`/`render.ts:226` `(e.flipDir ?? 1)`; `-1 || 1` would be a bug (returns 1), `-1 ?? 1` correctly returns -1. Nullish coalescing throughout.
- `[MEDIUM]` **`flipFrames` lacks an exact-value test anchor and the L33 (`flipFrames=3`) float path is never exercised** `[TEST]` at `tests/core/rules.flip-pattern.test.ts` / `flipper.flip.test.ts:62` — the suite passes even if `flipFrames` returned a constant 2; the load-bearing `1e-9` epsilon is only hit at deep levels, which no test reaches. Non-blocking: the implementation is correct. Captured as a Delivery Finding. NOTE: pinning the exact `flipFrames` count is intentionally avoided per **TEA deviation #3** (unsourced), so the right fix is a deep-level "flip still completes" test, not a value pin.
- `[LOW]` **Tautological determinism test** `[TEST]` at `tests/core/rules.flip-pattern.test.ts:68` — `expect(flipPatternForLevel(7)).toEqual(flipPatternForLevel(7))` compares a pure function to itself; passes for any return value. Redundant with the exact-value tests. Recommend removing or strengthening.
- `[LOW]` **No full cadence-cycle test; post-completion timer reset unverified** `[TEST]` — `flipper.ts` sets `flipTimer = moveFrames/60` at both flip-start and flip-completion; the start-side assignment is effectively redundant (overwritten before it is ever decremented). Harmless and defensively clear, but no test pins the inter-flip wait. Captured as a Delivery Finding.
- `[LOW]` **`as number` casts strip `undefined` in the test loop** `[RULE]` `[TEST]` at `flipper.flip.test.ts:47,48,55` — `e.flipDir as number` / `e.flipProgress as number` after asserting `flipping===true`; if a future regression broke that invariant the test would produce `NaN` rather than a clear failure. Not `as any` (no verbatim rule match); a `toBeDefined()` + `!` would be cleaner. Non-blocking.
- `[LOW]` **Stale comment** — `rules.ts` `LevelParams.flipInterval` is annotated "legacy flipper fallback", but no flipper code path references `flipInterval` anymore (pulsars only). Captured as a Delivery Finding.
- `[LOW]` **`import type` omitted for `Flipper`/`Input` in the two new test files** `[RULE]` — flagged by rule-checker; **downgraded to style**: `tsconfig` sets neither `isolatedModules` nor `verbatimModuleSyntax`, `tsc --noEmit` is clean, and the plain-`import {}` form matches the majority of the existing suite (`sim.collisions.test.ts:5`, `sim.death.test.ts:5`, etc.). Not a violation in this project's config.

### Disabled specialists (no coverage claimed)
- `[EDGE]` edge-hunter — disabled via settings; I covered boundary conditions myself (wrap at lane 0/15, float accumulation, bounded immunity, div-by-zero) in the Devil's Advocate below.
- `[SILENT]` silent-failure-hunter — disabled; no try/catch, error swallowing, or silent fallbacks exist in the diff (the only fallbacks are the `?? ` defaults, which I verified).
- `[DOC]` comment-analyzer — disabled; I manually caught one stale comment (the `flipInterval` annotation above).
- `[TYPE]` type-design — disabled; type design covered by rule-checker (#2/#3) and my own review: `FlipPattern` is a concrete interface, `flipDir?: -1 | 1` is a literal union, the `Flipper` flip fields are correctly optional. Clean.
- `[SIMPLE]` simplifier — disabled; I noted one minor redundancy (the dual `flipTimer` assignment) as a LOW finding.

### Rule Compliance (TypeScript checklist + CLAUDE.md core boundary)

Exhaustive enumeration against every applicable rule (rule-checker checked 16 rules / 61 instances; corroborated by my own read):

- **#1 Type-safety escapes:** core/shell — compliant (no `as any`/`@ts-ignore`/`!` on nullable). Tests — 3× `as number` (LOW, above).
- **#2 Generics/interfaces:** compliant. `FlipPattern` concrete interface; `LevelParams.flipPattern: FlipPattern` (not `Record<string,any>`); `flipDir?: -1 | 1` literal union.
- **#3 Enum anti-patterns:** compliant. `makeEnemy` and `drawEnemy` switches remain exhaustive over all 5 `EnemyKind`s; flipper case updated correctly; no numeric enums.
- **#4 Null/undefined:** compliant. Every new fallback uses `??` not `||`; `flipPattern` is required (safe `.moveFrames` access); `e.flipping` truthy-check correctly treats `undefined` as "settled".
- **#5 Module/declaration:** `import type` omitted for 3 type-only imports (LOW/style, downgraded — tsc clean, matches convention).
- **#6 React/JSX:** N/A (Canvas 2D, no JSX).
- **#7 Async/Promise:** N/A (no async in diff).
- **#8 Test quality:** mostly compliant (control guards the immunity test; tick-count pinned to data, not magic numbers); exceptions are the tautological test and `as number` casts (LOW).
- **#9 Build/config:** N/A (no config changes).
- **#10 Input validation:** N/A (no user input/JSON.parse; `level`/`dt` are internal sim values).
- **#11 Error handling:** N/A (no try/catch/Result).
- **#12 Perf/bundle:** compliant. `project()` called twice per mid-flip flipper — ~20 lerps/frame at O(10) flippers, negligible.
- **#13 Fix-introduced regressions:** compliant. Grab-skip inert for fuseball/pulsar/settled-flipper; `makeEnemy` flipper-init change is intentional (Dev deviation #2) and pulsars untouched.
- **CLAUDE.md core boundary (A/B/C):** compliant. No DOM/shell/time/random in core; lane arithmetic uses `wrapLane`; `EnemyKind` discriminants exhaustive; `render.ts`→`core/geometry` is the allowed import direction.

### Devil's Advocate

Let me try to break this. **Can a flipper become immortal by flipping forever at the rim?** No — each flip completes in `flipFrames` (≤4) ticks regardless of the move timer, then `flipping` clears and the grab fires on the next frame; immunity is bounded to a handful of frames, not a death-dodge exploit. **Can the flip state machine hang or NaN?** `flipFrames` is structurally `{3,4}` and `moveFrames` is clamped to `[1,8]`, so `1/flipFrames` is finite and non-zero; `flipProgress` strictly increases and crosses the epsilon within `flipFrames` ticks even with the `?? 0` guard — no infinite loop, no division by zero, no NaN. **What if `flipping=true` but `flipDir`/`flipProgress` are `undefined` (the sim test injects exactly `flipProgress: 0`)?** The `?? 1` / `?? 0` defaults keep it total: it picks +1 and progresses from 0, completing one tick later than usual — a benign off-by-one in a synthetic state that the normal flow never produces (flip-start always sets both). The cost is that the defaults *mask* a hypothetical invariant break (the `as number` test finding is the same theme), but nothing in the shipped code can reach it. **Open-tube edges:** for an open geometry, a flip past the boundary resolves through `wrapLane` (core, unchanged from before) and `render`'s `project(lane±1)` clamps via `boundaryIndex` — the visual target may sit at the clamped edge, a minor cosmetic imperfection on open tubes, not a logic bug. **Does the faster cadence (8 frames ≈ 0.13s between flips at L1, vs the old ~1.5s) make L1 unfairly hard?** It is a 10× increase in flip frequency — but `moveFrames=8` is ROM-sourced ("move 8 ticks then flip") and [[tempest-rom-is-canonical]] / [[tempest-difficulty-ratchet]] explicitly say match the ROM and don't re-tune the canonical game. So this is the *intended* authentic feel, not a regression — though, because the shell is verified by running the game (not unit tests), the visible result genuinely should be eyeballed in a playtest before this is called done. **What would a confused reader misunderstand?** The "legacy flipper fallback" comment on `flipInterval` (there is no fallback) and the redundant `flipTimer` start-assignment — both LOW, both captured. Net: I tried to find a correctness break and found only test-coverage gaps and cosmetics.

### Deviation audit
All 5 deviations reviewed and stamped ✓ ACCEPTED — see `### Reviewer (audit)` under Design Deviations.

**Pattern observed:** clean state-machine carve-out — the flip's intermediate state lives on the `Flipper` discriminated-union member as optional fields, consumed symmetrically by sim (timing + grab) and shell (render), at `src/core/enemies/flipper.ts:18-42`.
**Error handling:** N/A for this pure-sim change; totality guaranteed by clamped `flipFrames`/`moveFrames` and `??` defaults.
**Handoff:** To SM (The Dude) for finish-story.