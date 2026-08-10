---
story_id: "pm4-2"
jira_key: "pm4-2"
epic: "pm4"
workflow: "tdd"
---
# Story pm4-2: Animation-hold divisor (shell render)

## Story Details
- **ID:** pm4-2
- **Jira Key:** pm4-2
- **Epic:** pm4
- **Workflow:** tdd
- **Branch:** feat/pm4-2-animation-hold-divisor
- **PR:** https://github.com/slabgorb/arcade/pull/205
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-10T16:50:42Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-10T14:20:32.076180+00:00 | 2026-08-10T14:23:25Z | 2m 52s |
| red | 2026-08-10T14:23:25Z | 2026-08-10T16:33:49Z | 2h 10m |
| green | 2026-08-10T16:33:49Z | 2026-08-10T16:38:37Z | 4m 48s |
| review | 2026-08-10T16:38:37Z | 2026-08-10T16:50:42Z | 12m 5s |
| finish | 2026-08-10T16:50:42Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings at setup.

### TEA (test design)

- **Improvement** (non-blocking): render.ts's `drawPacman`/`drawGhost` header comments (render.ts:343-365) still describe `animPhase` as being `game.pac.frame` / `game.ghostFrame[id]` respectively. After this fix main.ts feeds them a HELD phase and no longer reads `game.ghostFrame` for rendering — update those comments so they don't misdescribe the caller. Affects `plugins/pac-man/src/shell/render.ts` (comment-only). *Found by TEA during test design.*
- **Gap** (non-blocking): neither existing counter is a clean monotonic render clock — `game.pac.frame` only advances on non-eat-paused frames (pacman.ts:38) and `game.ghostFrame[id]` is the conditionally-incremented speed-pattern cursor (game.ts:539-540), and there is NO global frame counter in `GameState`. Dev should give main.ts its OWN monotonic sim-frame counter (incremented once per `stepGame` sub-step) and feed `heldAnimPhase(thatCounter)` to both blitters, rather than dividing either core cursor. Affects `plugins/pac-man/src/main.ts`. *Found by TEA during test design.*

### Dev (implementation)

- No upstream findings. Both TEA findings above were resolved in-phase: (1) the render.ts `drawPacman`/`drawGhost` header comments were updated to describe `animPhase` as the already-held `heldAnimPhase` index (not the raw core cursors); (2) main.ts got its own monotonic `animClock`, incremented once per `stepGame` sub-step, fed through `heldAnimPhase` to both blitters. Animation freezes on game-over (the sub-step callback returns early there) — deliberate and harmless. *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): the `anim-hold.test.ts:110-111` assertion `expect(mainSrc).toContain('heldAnimPhase')` is a whole-file positive `toContain` that the `animClock` doc comment (main.ts:158, which names `heldAnimPhase` in backticks) satisfies on its own — so that ONE assertion cannot, by itself, prove the import/wiring. The suite's line-anchored siblings (drawPacman/drawGhost line scans, anim-hold.test.ts:113-121) DO catch the revert mutant, so the suite's guarantee is intact; this assertion is merely redundant/weak. Affects `plugins/pac-man/tests/shell/anim-hold.test.ts` (narrow the scan to the import line, e.g. the line containing `from './shell/render'`). *Found by Reviewer during code review.*
- **Question** (non-blocking): `animClock` increments inside the per-sub-step callback (main.ts:179), gated only by the `game-over` early-return — identical to the core cursors, so no desync exists TODAY. But epic pm4 is about layering freeze/pauses (a "level-clear freeze not strobe" is an explicit accessibility goal). Whoever adds that freeze must ensure it either skips the sub-step (freezing `animClock` too) or explicitly halts the animation clock — otherwise the chomp/legs will keep animating through a "frozen" screen. Affects `plugins/pac-man/src/main.ts` (forward-looking note for the freeze story). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

No deviations at setup.

### Reviewer (audit)

- No spec deviations found. The implementation matches the SM/TEA-authored seam exactly: `ANIM_HOLD = 6` (integer > 1, honest-uncited shell constant beside `FLASH_HALF_PERIOD`), `heldAnimPhase = Math.floor(frame / ANIM_HOLD)`, a shell-owned monotonic `animClock` fed to BOTH blitters, and `game.ghostFrame` retired from render. Nothing diverged from the spec; there is nothing to stamp ACCEPTED or FLAG. The chomp no longer freezing on eat-pause frames (a side effect of switching off `game.pac.frame`) is IN spec — AC2's decoupling intent — and is more ROM-accurate (arcade sprite animation is a global-timer cadence, not movement-tied), so it is not an undocumented deviation.

## Sm Assessment

Setup complete for pm4-2 (2 pts, tdd/phased, repo arcade). Branch
`feat/pm4-2-animation-hold-divisor` cut from develop (in sync). Merge gate clear
(no open PRs); no sibling claim in a-1/a-3; no pm4-2 remote branch. Status
in_progress.

Scope is a SHELL-ONLY render fix — `plugins/pac-man/src/shell/render.ts` and
`.../shell/main.ts` only; `plugins/pac-man/src/core/**` must stay untouched
(purity.test.ts / core-boundary green). Add a render-side animation-hold divisor so
Pac-Man chomp + ghost legs advance every N sim frames instead of every frame, and
stop reusing `game.ghostFrame[id]` (the core SPEED-PATTERN cursor) as an animation
index.

The hold cadence N is an HONEST-UNCITED shell-timing choice — same posture as the
existing `FLASH_HALF_PERIOD` constant. TEA/Dev must NOT fabricate a pacman.asm/ROM
citation for it and must NOT add it to any core citations.test.ts claim.

Note: sm-setup emitted a generic stub context (Problem/Approach/Scope/AC all
placeholder filler despite a detailed brief); SM authored the real context by hand and
committed it (f48d4d94). ACs live in `sprint/context/context-story-pm4-2.md`.

Handoff → TEA for RED phase.

## TEA Assessment

**Tests Required:** Yes
**Reason:** shell render behaviour change — the animation-hold divisor and its main.ts wiring both need pinning.

**Test Files:**
- `plugins/pac-man/tests/shell/anim-hold.test.ts` — the render-side animation-hold: the `ANIM_HOLD` constant, the `heldAnimPhase` divisor, and the main.ts wiring (both blitters fed the held phase; `game.ghostFrame` retired from render).

**Tests Written:** 10 tests covering 4 ACs (AC1–AC4; AC5 is the whole-suite green gate).
**Status:** RED — verified 10 failed / 0 passed in the new file; full pac-man suite 10 failed / 297 passed (24/25 files green, only the new file red — no regression).

**Seam Dev implements (the tests define it):**
- `export const ANIM_HOLD` — integer > 1, a NAMED, HONEST-UNCITED shell-timing constant in render.ts (same posture as `FLASH_HALF_PERIOD`; no ROM citation, no core citations.test claim).
- `export function heldAnimPhase(frame: number): number` = `Math.floor(frame / ANIM_HOLD)` (monotonic, holds each animation index for a full ANIM_HOLD window, advances by exactly 1 per window).
- main.ts feeds `heldAnimPhase(<monotonic sim-frame counter>)` to BOTH `drawPacman` and `drawGhost`, and stops reading `game.ghostFrame` / `game.pac.frame` raw for the animation phase. `drawPacman`/`drawGhost` signatures are UNCHANGED (their `animPhase` is still the already-held index — that keeps the existing `sprites.test.ts` phase-0-vs-1 assertions green).

### Rule Coverage

| Rule (typescript.md) | Test(s) | Status |
|------|---------|--------|
| #8 test quality — no vacuous assertions | self-check: hardened the window test with a `checked === ANIM_HOLD` guard so it can't pass vacuously when ANIM_HOLD is undefined/NaN/1 | failing (RED) |
| #4 null/falsy handling — a hold of 0/1 is a no-op | `ANIM_HOLD is an integer strictly greater than 1` | failing (RED) |
| purity / core-boundary (arcade rule) | AC4 covered by existing `purity.test.ts` staying green (core untouched); new tests import only from `src/shell/*` and `src/main.ts` | (regression guard) |

**Rules checked:** the applicable TS-review rules for a shell-timing constant (#4 falsy-divisor, #8 test quality); the rest of the checklist (enums, async, JSX, generics) is N/A to a two-symbol numeric hold.
**Self-check:** 1 vacuous test found and fixed — the intra-window hold test was passing vacuously in RED (loop bound was `undefined`); added a `checked` counter + `>1` guard so all 10 tests now genuinely fail.

**Handoff:** To Dev (Korben Dallas) for GREEN — implement `ANIM_HOLD` + `heldAnimPhase` in render.ts and wire main.ts. Keep core untouched; do not cite the cadence.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/pac-man/src/shell/render.ts` — added `export const ANIM_HOLD = 6` (an honest-uncited shell-timing constant, sitting next to `FLASH_HALF_PERIOD`; no ROM citation, no core citations.test claim) and `export function heldAnimPhase(frame) = Math.floor(frame / ANIM_HOLD)`. Refreshed the `drawPacman`/`drawGhost` header comments (they no longer misdescribe `animPhase` as the raw core cursors).
- `plugins/pac-man/src/main.ts` — added a shell-owned monotonic `animClock`, incremented once per `stepGame` sub-step (sim-rate, not rAF-rate), and fed `heldAnimPhase(animClock)` to BOTH `drawPacman` and `drawGhost`, retiring the raw `game.pac.frame` and `game.ghostFrame[id]` render reads.

**Design choice:** `ANIM_HOLD = 6` sim frames per animation step (≈0.1 s each at the 60 Hz sim). Uncited by design — a presentation cadence, same posture as `FLASH_HALF_PERIOD`.

**Tests:** 10/10 new (`anim-hold.test.ts`) GREEN; full pac-man project 307/307; `npm run lint` (tsc --noEmit) clean. Core untouched (`git diff` touches only the two shell files) so `purity.test.ts` / core-boundary stay green (AC4). `sprites.test.ts` phase-0-vs-1 assertions still pass — `drawPacman`/`drawGhost` signatures unchanged.

**Scope note (one test-refinement worth the reviewer's eye):** the "no `ghostFrame` anywhere in main.ts" scan (TEA's belt-and-suspenders over the drawGhost-line check) also forbids a *comment* naming the cursor. Rather than weaken the test, I worded the `animClock` comment to explain the contrast without embedding the literal identifier. No behavioural test was touched; the drawGhost-line test still pins the actual wiring.

**Branch:** feat/pm4-2-animation-hold-divisor (local; not pushed — PR is created at finish)

**Handoff:** To Reviewer (Jean-Baptiste Emanuel Zorg) for review.

## Reviewer Observations

Tagged observations (dispatch tags plain-text; disabled-subagent domains hand-assessed by the Reviewer).

- [PRE] Preflight GREEN — `npx vitest run --project pac-man` 307/307 (incl. anim-hold.test.ts 10/10, sprites.test.ts, purity.test.ts), orchestrator suite 457/457, `npm run lint` (tsc --noEmit) clean, zero smells (no console.log/TODO/.skip). Core untouched: `git diff develop...HEAD --stat -- 'plugins/pac-man/src/core/**'` is EMPTY.
- [SEC] CLEAN (reviewer-security). `animClock` is an internal shell counter, `+1` per sub-step from 0, never fed external input; `ANIM_HOLD` is a module-level `export const = 6` (no div-by-zero path); no NaN/Infinity can reach the divide; unbounded growth is ~millions of years to `MAX_SAFE_INTEGER` and JS numbers don't wrap. No injection/secret/network surface. render.ts:293, main.ts:161.
- [RULE] LOW (reviewer-rule-checker, rules #15/#25). `expect(mainSrc).toContain('heldAnimPhase')` at anim-hold.test.ts:110-111 is a whole-file positive scan satisfiable by the doc comment (main.ts:158) alone. NON-BLOCKING: the line-anchored drawPacman/drawGhost assertions (anim-hold.test.ts:113-121) catch the revert mutant, so the suite's mutation guarantee holds. Confirmed, rated LOW, filed as a non-blocking Delivery Finding.
- [TEST] (hand-assessed; test_analyzer disabled) Coverage is sound — hold constant (>1 integer), first window at 0, intra-window hold (with a `checked === ANIM_HOLD` anti-vacuous guard, anim-hold.test.ts:53-55), boundary advance, monotonicity, and the ANIM_HOLD-times-slower ratio. main.ts wiring is a source-scan (main.ts is the DOM/rAF entry, not unit-mountable) — the repo's established purity.test.ts style. One weak assertion (see [RULE]); no other gap.
- [DOC] (hand-assessed; comment_analyzer disabled) Comment claims VERIFIED accurate — render.ts drawPacman/drawGhost headers now describe the already-HELD `heldAnimPhase` index (not the retired core cursors); main.ts:155-160 correctly states `animClock` is per-sub-step (not per-rAF) and explains why neither core cursor fits. rule-checker rule #17 independently verified all 5 comment claims against pacman.ts:103-104 / game.ts:538-540. No stale/lying prose.
- [TYPE] (hand-assessed; type_design disabled) `heldAnimPhase(frame: number): number` — single primitive param, pure, no stringly-typed API, no unsafe cast, no `any`/non-null assertion. Signature is minimal and correct. render.ts:299.
- [SIMPLE] (hand-assessed; simplifier disabled) Minimal, no over-engineering — a one-line pure divisor + a single counter + two call-site rewrites. No dead code, no speculative generality.
- [EDGE] (hand-assessed; edge_hunter disabled) `animClock` never resets across lives/levels, so a new life's starting animation phase is arbitrary — cosmetically harmless because the blitters mod downstream (`% 2` ghost render.ts:395, `% PAC_FRAMES[dir].length` pacman) and animation is a cycle with no canonical start. Chomp no longer freezes on the 1/3-frame eat-pause — intentional (AC2 decoupling) and more ROM-accurate. No negative/NaN input path.
- [SILENT] (hand-assessed; silent_failure_hunter disabled) No swallowed errors — the diff adds no `catch`, no empty block, no silent fallback. The `game-over` early-return (main.ts:176) is a deliberate, documented animation freeze, not a swallowed failure.
- [VERIFIED] Downstream modulo makes the ever-growing monotonic index safe — drawGhost applies `animPhase % 2` (render.ts:390,395) and drawPacman applies `animPhase % PAC_FRAMES[dir].length`, so `heldAnimPhase`'s unbounded return is a legal frame selector at every value. Complies with the shell-purity rule (blitters stay pure functions of args, no clock read).
- [VERIFIED] AC2 wiring — main.ts:205 feeds `drawGhost` `heldAnimPhase(animClock)` and NO `game.ghostFrame` read survives anywhere in main.ts (grep-confirmed by rule-checker rule #24; the whole-file `not.toContain('ghostFrame')` guard at anim-hold.test.ts:125 pins it). The core speed-pattern cursor is fully decoupled from render.

### Rule Compliance

Project rules that govern this diff (CLAUDE.md core/shell boundary; honest-uncited shell-timing constants; TS lang-review checklist). Enumerated exhaustively over every symbol the diff adds/changes:

- **Core/shell boundary (CLAUDE.md — the single most important rule).** Changed files: `plugins/pac-man/src/main.ts` (shell), `plugins/pac-man/src/shell/render.ts` (shell), `plugins/pac-man/tests/shell/anim-hold.test.ts` (shell test). `git diff --name-only develop...HEAD` touches NO `plugins/pac-man/src/core/**` file. `purity.test.ts` / core-boundary scan GREEN. **COMPLIANT** (AC4).
- **Honest-uncited shell-timing constant (mirror FLASH_HALF_PERIOD).** `ANIM_HOLD` (render.ts:293) is a named `export const` with a comment stating it is an HONEST-UNCITED presentation cadence, "not a ported ROM value." `grep` of `tests/audit/citations.test.ts` shows zero `ANIM_HOLD`/`heldAnimPhase` references — no fabricated pacman.asm citation, no core citations.test claim. **COMPLIANT** (AC3).
- **Purity of render.ts blitters (no clock read).** Both `drawPacman`/`drawGhost` remain pure functions of their args; the held index is computed in main.ts and passed in. `heldAnimPhase` reads no clock. **COMPLIANT.**
- **TS lang-review checklist (26 checks, rule-checker backstop).** 34 instances checked, 1 violation — the redundant whole-file assertion (#15/#25) covered above. All other categories (type escapes, enums, null handling, async, error handling, security input-validation, degenerate numeric input #21) either N/A or COMPLIANT. No `any`, no non-null assertion, no `@ts-ignore`.
- **AC1 (N>1 hold on chomp + legs):** `ANIM_HOLD = 6`, `Math.floor(frame/ANIM_HOLD)` wired to both blitters. **COMPLIANT.** **AC5 (pac-man project green):** 307/307. **COMPLIANT.**

### Devil's Advocate

Argue the code is broken. First attack: the animation clock is a raw `let animClock = 0` at module scope, incremented forever and never reset. A malicious/marathon player who leaves the cabinet running would eventually — the argument goes — desync or overflow the animation. Rebutted: at 60 Hz it takes ~4.7 million years to reach `Number.MAX_SAFE_INTEGER`, the blitters mod the value into a legal frame index at every magnitude, and JS floats degrade to imprecision (a stale frame index at worst), never memory corruption. No security or crash consequence. Second attack: switching from `game.pac.frame` to a free-running counter means the chomp animation no longer freezes when Pac-Man eat-pauses (1 frame per dot, 3 per energizer). A confused reviewer could call this a regression — the mouth "should" stop when he stops. Rebutted: the real cabinet drives sprite animation off a global frame timer independent of actor movement, so decoupling is the AC2 intent and the more faithful behavior; the header comment documents exactly this rationale. Third attack: all four ghosts and Pac-Man now share ONE `animClock`, so every ghost's legs cycle in lockstep — previously each used its own `ghostFrame[id]` speed cursor. A stressed observer might expect per-ghost variety. Rebutted: arcade ghost leg animation is globally timed and IS in sync; the old per-ghost cursor was the wrong source (it is a move/skip cadence, not an animation one) — that overloading was the second bug the story exists to kill. Fourth attack — the strongest: what would a CONFUSED future maintainer do? Epic pm4 layers a level-clear FREEZE (an accessibility requirement — no strobe). If that freeze is implemented by short-circuiting *inside* `stepGame` while still calling it every sub-step, `animClock++` (which sits AFTER `stepGame` in the sub-step callback, main.ts:179) keeps ticking and the sprites animate through the "frozen" screen — a real defect, but a FUTURE one, not present in this diff (no such pause exists yet; today the only gate is `game-over`, which freezes animation correctly). I filed it as a non-blocking Question so the freeze story inherits the constraint. Fifth attack: could config/degenerate input reach the divide? No — `ANIM_HOLD` is a hardcoded const and `animClock` is never fed a parsed/viewport/NaN value. Nothing here breaks; the one live weakness is a redundant test assertion, not a product bug.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — all gates green (307/307, lint clean, core untouched) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain hand-assessed ([EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain hand-assessed ([SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain hand-assessed ([TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain hand-assessed ([DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain hand-assessed ([TYPE]) |
| 7 | reviewer-security | Yes | clean | none | N/A — no external input surface, no overflow/NaN/div-zero risk |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain hand-assessed ([SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | findings | 1 (LOW) | confirmed 1 (weak whole-file assertion #15/#25), non-blocking → Delivery Finding |

**All received:** Yes (3 enabled returned — preflight clean, security clean, rule-checker 1 LOW finding; 6 disabled via `workflow.reviewer_subagents`, domains hand-assessed)
**Total findings:** 1 confirmed (LOW, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** shell-owned `animClock` (main.ts:161, `+1` per sim sub-step at main.ts:179, gated on `game-over`) → `heldAnimPhase(animClock)` = `Math.floor(animClock / ANIM_HOLD)` (render.ts:299) → `drawPacman` / `drawGhost` (main.ts:205,208) → `animPhase % PAC_FRAMES[dir].length` / `% 2` frame select (render.ts:390,395). Safe because the source is an internal monotonic integer, the divisor is a nonzero const, and the ever-growing index is mod'd into a legal frame at every value.

**Pattern observed:** honest-uncited shell-timing constant beside `FLASH_HALF_PERIOD` (render.ts:293) — correct posture; no fabricated ROM citation, no core citations.test claim.

**Error handling:** no new failure paths; the `game-over` early-return (main.ts:176) deliberately freezes animation, documented, not a swallowed error.

**Subagent dispatch tags:** [PRE] preflight green · [SEC] security clean · [RULE] one LOW test-quality finding (non-blocking) · [TEST] [DOC] [TYPE] [SIMPLE] [EDGE] [SILENT] hand-assessed (subagents disabled), all clean.

**Findings:** 1 LOW (redundant whole-file test assertion, anim-hold.test.ts:110-111) — NON-BLOCKING per severity policy; recorded as a Delivery Finding, not a rework. No Critical/High/Medium. All 5 ACs satisfied; core untouched; suite + lint green.

**Handoff:** To SM (Ruby Rhod) for finish-story.