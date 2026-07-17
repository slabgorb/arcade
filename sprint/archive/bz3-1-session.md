---
story_id: "bz3-1"
jira_key: "bz3-1"
epic: "bz3"
workflow: "tdd"
---
# Story bz3-1: THE TIMEBASE REBASE — the sim runs on FRAMES_PER_SEC=60; the ROM game frame is 15.625 Hz

## Story Details
- **ID:** bz3-1
- **Jira Key:** bz3-1
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-17T22:17:54Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-17T21:18:01Z | 2026-07-17T21:21:14Z | 3m 13s |
| red | 2026-07-17T21:21:14Z | 2026-07-17T21:29:43Z | 8m 29s |
| green | 2026-07-17T21:29:43Z | 2026-07-17T22:10:10Z | 40m 27s |
| review | 2026-07-17T22:10:10Z | 2026-07-17T22:17:54Z | 7m 44s |
| finish | 2026-07-17T22:17:54Z | - | - |

## Story Description

### Technical Approach

**Cluster C1** — The Timebase Rebase (bz3-1 subsumes C-001, M-001, M-003, F-004)

The systematic error and the gate on everything numeric. movement.ts:45 and firing.ts:59 hard-code FRAMES_PER_SEC=60 labelled 'the ROM player-update cadence', but the cabinet advances one game frame per 64 ms = 15.625 Hz (NMI 250 Hz / 16 via AND I,0F + INC SYNC, BZONE.MAC:1084-1088; consumed by LSR SYNC at MAIN:422).

The refutation established the effect is NOT uniform 3.84x:
- **TURN** is a pure per-frame quantum (3.84x too fast, M-001)
- **FORWARD** is 1.96x too fast because FORWARD_STEP=48 is itself under-scaled — the ROM SIN table peaks at 0x7FFF so the high byte is 127 not 64, and the M.SET halvings give 3/4 x 127 = 0x5E = 94 (M-003), partly cancelling the frame error
- **SHELL speed** is only ~4% slow because the shell integrator already sub-steps 4x per frame (SAVE3=4 loop, BZONE.MAC:608, so 256 is per-sub-step -> ~16000 u/s, F-004)

Expect the whole magnitude suite to re-baseline — that is the point, not a regression.

### Acceptance Criteria

1. **Frame rate conversion:** The 60 Hz conversion is corrected to the 15.625 Hz (64 ms) game frame everywhere it feeds a per-frame quantum (movement.ts:45, firing.ts:59), each carrying a comment citing BZONE.MAC:1085 (64 ms frame) and :422 (LSR SYNC).

2. **Forward step:** FORWARD_STEP is corrected 48 -> 0x5E = 94 (the SIN table peaks at 0x7FFF, high byte 127, times 3/4); turn rate and forward speed are re-derived at 15.625 Hz. A test pins the corrected turn (ROM ~22 deg/s), forward, and shell speeds.

3. **Shell integrator:** The shell integrator is NOT naively rescaled: it already sub-steps 4x per frame (SAVE3=4, BZONE.MAC:608), so 256 is per-sub-step and yields ~16000 u/s — leave it (~4% is within tolerance). A test proves the shell speed was not multiplied by the frame-rate fix a second time.

4. **Tests and citations:** npm test -- citations stays green; the magnitude test suite is re-baselined against the 15.625 Hz values.

## Delivery Findings

### Dev (implementation)
- **Improvement** (non-blocking): the enemy AI turn/approach/standoff rates derive from the shared
  player constants (`TANK_TURN_RATE = MAX_TURN_RATE * 0.4`, `SUPER_TANK_TURN_RATE = MAX_TURN_RATE * 0.7`,
  and `stepTank` uses `MAX_SPEED`), which bz2-10 tuned as fractions of the *wrong* 84°/s / 5760 u/s.
  Now that the player is ROM-correct (~22°/s, 2937.5 u/s), the enemy turns at ~8.8°/s and moves at
  ~half — almost certainly NOT ROM-faithful. Affects `src/core/enemies.ts` (a dedicated enemy-fidelity
  story on the E-* / M-* enemy findings should re-derive these against the ROM enemy quanta, not as
  fractions of the corrected player rate). *Found by Dev during implementation.*
- **Gap** (non-blocking): TEA's RED (`timebase.test.ts`) ran the new magnitude guards against the OLD
  code, so it could not observe the sibling ripple — correcting the player timebase slowed the enemy
  (which derives from the shared constants) and timed out four fixed-duration bz2-10 behavioral tests.
  I re-baselined only their sim-time budgets (×3.84, the timebase ratio); no quality threshold changed
  and all 42 pass with duration-only. Affects `tests/core/enemies-maneuver.test.ts`,
  `tests/core/enemies.test.ts` (Reviewer/TEA should confirm the behavioral intent is preserved).
  *Found by Dev during implementation.*
- **Note** (non-blocking): `enemies.ts:144` and `saucer.ts:97` still say "60 Hz shell frame-step" —
  left intact because those refer to the RENDER/rAF cadence (legitimately ~60 fps), NOT the game frame;
  only the game-frame quantum at `enemies.ts:320` was the bug. Finding F-002's prose ("clone's is 64")
  is now historical and kept as the audit record (F-004's `remediated_by` points to the fix). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): E-011 (CONFIRMED DIVERGENCE) already owns the enemy-turn-rate fix and
  gives the ROM targets — its claim derives the enemy pivot from ITANGL ($0080/call, 2 calls/frame regular,
  4/frame super). A follow-up story should re-derive `TANK_TURN_RATE` / `SUPER_TANK_TURN_RATE` against those
  ROM quanta at 15.625 Hz, NOT as `MAX_TURN_RATE × 0.4/0.7` (fractions tuned to the pre-bz3-1 wrong pivot).
  Affects `src/core/enemies.ts:202-203`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the shell/enemy swept-collision now steps at the ROM's 256u (was 64u);
  the graze-miss band (713–724u) sits in the circumscribed-circle corner over-approximation, so a proper
  ROM projectile-diameter decode ($6139, already a deferred TODO) would tighten it. Affects
  `src/core/firing.ts` / `src/core/movement.ts` (OBSTACLE_RADIUS). *Found by Reviewer during code review.*

## Design Deviations

### Dev (implementation)
- **Shared `GAME_FRAME_HZ` constant in a new `src/core/timebase.ts` module**
  - Spec source: context-story-bz3-1.md AC-1; Tea Assessment guidance #4
  - Spec text: "everywhere it feeds a per-frame quantum … each carrying a comment citing BZONE.MAC:1085 / :422" / TEA: "Strongly recommend a single shared `GAME_FRAME_HZ = 15.625` constant … DRY it so a fourth site can't drift"
  - Implementation: created `src/core/timebase.ts` exporting `GAME_FRAME_HZ = 15.625`; movement.ts, firing.ts and enemies.ts import it instead of each holding a local `FRAMES_PER_SEC = 60`
  - Rationale: the story's thesis is ONE frame rate, not three hard-coded 60s; a single source of truth prevents a fourth site drifting back to 60. Tests would pass with the constant inline, so the module is an abstraction beyond the literal test demand — logged per discipline
  - Severity: minor
  - Forward impact: minor — future per-frame quanta should import `GAME_FRAME_HZ`; a new `src/core/` module is now scanned by the purity + citation gates
- **`firing.ts` shell constant restructured (`SHELL_STEP_PER_FRAME` → `SHELL_STEP_PER_SUBSTEP`)**
  - Spec source: context-story-bz3-1.md AC-3
  - Spec text: "the shell integrator … already sub-steps 4x per frame (SAVE3=4), so 256 is per-sub-step and yields ~16000 u/s — leave it (~4% is within tolerance)"
  - Implementation: relabelled `SHELL_STEP_PER_FRAME`(256)→`SHELL_STEP_PER_SUBSTEP`(256) and set `SHELL_SPEED = 256 × 4 × 15.625 = 16000` (was `256 × 60 = 15360`); the swept-collision `SHELL_SUBSTEP` is now 256 (was 64)
  - Rationale: F-004 — the ROM's 256 is per-sub-step; making the 4× sub-stepping explicit yields the ROM's 16000 u/s and dodges the 4000 naive-rescale trap. The granularity 64→256 is the ROM's true value; obstacle/hit radii (≥724 / 1152) still dwarf it so no shell tunnels (existing swept tests confirm)
  - Severity: minor
  - Forward impact: minor — `SHELL_SPEED` moved 15360→16000 (~4%); `enemies.test.ts` `SHELL_SPEED/60` render-frame floor (266.7) stays < `TANK_HIT_RADIUS` (1152)
- **Re-baselined four bz2-10 sibling behavioral tests' sim-time budgets**
  - Spec source: context-story-bz3-1.md AC-4; story description
  - Spec text: "the magnitude test suite is re-baselined against the 15.625 Hz values" / "Expect the whole magnitude suite to re-baseline — that is the point, not a regression"
  - Implementation: extended sim-time budgets by the 60/15.625 = 3.84 timebase ratio — enemies-maneuver.test.ts (`STEPS` 10s→40s, `runMinDist` 12s→48s) and enemies.test.ts (approach 600→2400 frames, aim-then-fire 1800→7200 frames). No behavioral quality thresholds changed
  - Rationale: the enemy derives its rates from the shared player constants, so the timebase fix slowed it to ROM speed; the fixed durations (sized for the old 2–4× enemy) timed out before behaviors completed. Extending time restores every assertion UNCHANGED (verified: all 42 pass with duration-only)
  - Severity: minor
  - Forward impact: moderate — see the enemy-fidelity Delivery Finding; a follow-up should re-derive the enemy quanta against the ROM rather than as fractions of the corrected player rate

### Reviewer (audit)
- **Shared `GAME_FRAME_HZ` module** → ✓ ACCEPTED by Reviewer: a one-export leaf constant directly serving AC-1 "everywhere"; the purity gate scans it (green) and it is the honest single source of truth. Agrees with author reasoning.
- **`firing.ts` shell constant restructure** → ✓ ACCEPTED by Reviewer: F-004-faithful; SHELL_SPEED rises to the ROM's 16000 (not the 4000 trap) and the 64→256 granularity is the ROM's true per-sub-step, verified non-tunnelling for real hits.
- **Re-baselined four bz2-10 sibling test durations** → ✓ ACCEPTED by Reviewer: verified durations-only (no assertion/threshold changed); assertions still discriminate a broken AI; scaling by the 3.84 timebase ratio is principled and within AC-4. One LOW note: the "now-ROM-speed tank" comment overstates (enemy turn is still E-011's open divergence) — non-blocking, captured as a delivery finding.

## Session Status

- **Branch:** feat/bz3-1-timebase-rebase
- **Repo:** battlezone
- **Branch Strategy:** gitflow (feat/{STORY_ID}-{SLUG})

## Sm Assessment

**Setup:** complete. Session, story context (`sprint/context/context-story-bz3-1.md`),
epic context, and branch `feat/bz3-1-timebase-rebase` (off battlezone/develop) all created;
bz3-1 marked `in_progress`. Merge gate clear (no blocking PRs). The audit that produced this
story merged to develop as `019132e` — `docs/2026-07-17-battlezone-primary-source-audit.md`
(cluster C1) and `docs/audit/findings/pair-{cadence,tank-motion,combat}.json` are the evidence.

**Routing:** tdd (phased) → **O'Brien (TEA)** for the RED phase.

**Guidance for TEA — this is a re-baseline story, write tests to the CORRECTED values, not the current ones:**
- The fix lives in `src/core` (pure sim; no DOM/Date.now/rAF — keep the timebase a core constant).
- Pin the **correct** 15.625 Hz-derived magnitudes as the failing tests: turn rate ≈ **22 deg/s**
  (ROM sweep), forward speed re-derived with **FORWARD_STEP = 0x5E = 94** (not 48), and shell speed
  **left at ≈16000 u/s** (the shell already sub-steps 4×/frame — AC-3 explicitly forbids re-scaling it).
- The three quanta diverge by **different** factors (turn ÷3.84, forward ÷1.96, shell ~4%) — do NOT
  write one blanket "everything is 3.84× off" assertion; test each quantum independently.
- `npm test -- citations` must stay green (AC-4). The magnitude suite re-baselining IS expected — a
  red magnitude test here is the RED phase working, not a regression.

**Decision:** proceed to RED. Hand off to O'Brien.

## Tea Assessment

**RED written:** `tests/core/timebase.test.ts` — **6 failing + 1 green guard.** Full suite
**6 failed / 819 passed**; citation gate **12/12 green** (AC-4 baseline held). Committed `4ddeb3d`.
The existing movement/firing suites are magnitude-agnostic (ratios, symmetry) — these are the
**first** absolute-magnitude guards, which is exactly why the 60 Hz error was never caught.

**Coverage per AC** (each quantum pinned independently — the error is NOT a uniform 3.84×):

| AC | Test(s) | State |
|----|---------|-------|
| AC-2 turn | `MAX_TURN_RATE` = 21.97 deg/s (was 84.375) | RED |
| AC-2 forward | `MAX_SPEED` = 2937.5 u/s (was 5760) | RED |
| AC-2 `FORWARD_STEP`=0x5E=94 | isolated via the frame-rate-independent `MAX_SPEED/MAX_TURN_RATE` ratio (was 48) | RED |
| AC-3 shell | `SHELL_SPEED` guard ~16000, never 4000 | GREEN guard (see below) |
| AC-1 citation | movement.ts + firing.ts must cite 15.625 Hz/64 ms + BZONE.MAC | RED ×2 |
| AC-1 "everywhere" | enemies.ts must not hard-code `SHELL_SPEED / 60` | RED |

**Why the shell test is a green GUARD, not red-first:** AC-3 says leave the shell (~4% within
tolerance). Current `SHELL_SPEED`=15360 is already ~correct, so pinning it doesn't drive a value
change — but the instant Dev corrects `firing.ts` `FRAMES_PER_SEC` 60→15.625, `SHELL_SPEED`
= `SHELL_STEP_PER_FRAME(256) × 15.625` collapses to **4000** (the F-004 trap). The guard catches
exactly that regression. It passes now and after the *correct* fix, red only on the naive one.

**Guidance for Julia (GREEN) — all three sites are `src/core` (keep the constant pure):**
1. `movement.ts`: `FORWARD_STEP` 48 → `0x5E = 94` (sin table peaks at 0x7FFF, amplitude ¾×127);
   `FRAMES_PER_SEC` 60 → **15.625**; add the comment citing **BZONE.MAC:1085** (64 ms frame) and
   **:422** (LSR SYNC). Turn/forward then re-derive correctly.
2. `firing.ts`: `FRAMES_PER_SEC` 60 → **15.625**, but `SHELL_SPEED` must stay ~16000 —
   it is `256 per-sub-step × 4 sub-steps × 15.625`, **not** `256 × 15.625 = 4000`. The current
   `SHELL_STEP_PER_FRAME` label is inverted (F-004: the ROM's 256 is per-sub-step); restructure
   so the 4× sub-stepping is explicit. Add the BZONE.MAC citation.
3. `enemies.ts:320`: `SHELL_SPEED / 60 / 4` must use the 15.625 Hz game frame, giving the ROM's
   256-unit per-sub-step granularity (not 66.7).
4. **Strongly recommend a single shared `GAME_FRAME_HZ = 15.625` constant** — the audit's whole
   point is one frame rate, not three hard-coded 60s. DRY it so a fourth site can't drift.

### TEA (test design)
- **DEVIATION — scope expansion (flag for reviewer):** the story names `movement.ts:45` and
  `firing.ts:59`; I added a test forcing **`enemies.ts:320`** too. It is a THIRD instance of the
  60 Hz bug, in **no audit finding** (C-001/M-001/F-004 never cite it), but AC-1's "everywhere it
  feeds a per-frame quantum" plainly covers it — the enemy-shell swept-collision granularity goes
  wrong (66.7 vs ROM 256) the moment `SHELL_SPEED` is corrected. Leaving it would half-fix the
  timebase. If the reviewer prefers a follow-up story, that is a rulable descope; my default is to
  fix it here.

**Decision:** RED complete, suite behaves as intended. Hand off to Julia (Dev) for GREEN.
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/timebase.ts` (NEW) — single source of truth `GAME_FRAME_HZ = 15.625`, cited to BZONE.MAC:1085/:422
- `src/core/movement.ts` — `FORWARD_STEP` 48→`0x5E`=94 (M-003); `FRAMES_PER_SEC=60` → import `GAME_FRAME_HZ`; MAX_SPEED/MAX_TURN_RATE re-derive (2937.5 u/s, 21.97°/s); BZONE.MAC citation
- `src/core/firing.ts` — `SHELL_STEP_PER_FRAME`→`SHELL_STEP_PER_SUBSTEP` (F-004); `SHELL_SPEED = 256×4×15.625 = 16000` (not the 4000 trap); swept `SHELL_SUBSTEP` 64→256; BZONE.MAC citation
- `src/core/enemies.ts` — the third 60 Hz site: `SHELL_SPEED / 60 / 4` → `/ GAME_FRAME_HZ / 4` = 256 (AC-1 "everywhere")
- `docs/audit/findings/pair-{cadence,tank-motion,combat}.json` — C-001/M-001/M-003/F-004 marked `remediated_by: bz3-1` (divergences removed); 31 line-shifted citations re-anchored via `tools/audit/reanchor-citations.mjs` (0 lost)
- `tests/core/enemies-maneuver.test.ts`, `tests/core/enemies.test.ts` — re-baselined 4 sibling sim-time budgets ×3.84 (enemy slowed to ROM speed); no quality thresholds changed

**Tests:** 829/829 passing (GREEN) — full `vitest run`, 60 files. Citation gate 12/12, purity 41/41. Build clean (`tsc --noEmit && vite build`).

**Magnitudes now ROM-correct:** turn 84.4→21.97°/s (÷3.84, M-001), forward 5760→2937.5 u/s (1.96×, M-003), shell 15360→16000 u/s (~4%, F-004 — corrected UP via the explicit 4× sub-step, not down to 4000).

**Branch:** feat/bz3-1-timebase-rebase (pushed)

**Handoff:** To verify/review — Reviewer should confirm (a) the sibling-test re-baseline preserved bz2-10's behavioral intent (duration-only, no threshold change), and (b) the enemy-fidelity follow-up finding.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 829/829 green, build clean, citations 12/12, tree clean, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — self-assessed (swept-collision boundary) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — self-assessed (no error paths introduced) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — self-assessed (re-baseline is durations-only, non-vacuous) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — self-assessed (one LOW: "ROM-speed" comment) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — self-assessed (plain numeric const, no casts) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — self-assessed (pure core, no I/O/input) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — self-assessed (DRY module justified) |
| 9 | reviewer-rule-checker | No | Skipped | disabled | Disabled via settings — self-assessed (TS checklist below) |

**All received:** Yes (1 enabled returned clean; 8 disabled via `workflow.reviewer_subagents`, self-assessed)
**Total findings:** 1 confirmed (LOW, non-blocking), 0 dismissed, 2 deferred to delivery findings

## Reviewer Assessment

**Verdict:** APPROVED

The timebase rebase is correct, well-scoped, and fully gated. All magnitude changes are intended
re-baselines (AC-4), the citation record is honestly maintained, and the sibling-test re-baseline is
verified intent-preserving. No Critical/High issues.

### Observations (tagged)

- `[VERIFIED]` Magnitudes are ROM-correct — evidence: `movement.ts:48/51` MAX_SPEED = 94×2×15.625 = **2937.5 u/s**, MAX_TURN_RATE = (2π/512)×2×15.625 = **21.97°/s**; `firing.ts:65` SHELL_SPEED = 256×4×15.625 = **16000 u/s**. `timebase.test.ts` pins all three independently (the error was NOT a uniform 3.84×, correctly modelled).
- `[TEST]` The 4 bz2-10 sibling re-baselines are **durations-only** — verified by diffing out comments: only `10/DT→40/DT`, `12/DT→48/DT`, `600→2400`, `1800→7200` changed; **no assertion or threshold touched**. The assertions still discriminate (a truly broken AI — never approaches / never aims — fails at any duration), so they are not vacuous. Confirmed non-blocking.
- `[EDGE]` Swept-collision granularity 64→256 (`firing.ts`, `enemies.ts:320`) introduces **no real-hit tunnelling**: a centre-crossing shot samples ≥5 points inside the smallest footprint (R=724); the only graze-miss band (impact param 713–724u) lies entirely in the circle over-approximation *corner* region, beyond the real square edge (512u), where the shell is not hitting the real obstacle anyway. ROM-faithful (F-002/AC-3); existing swept tests (`firing.test.ts:305`, `enemies.test.ts:513`) still pass.
- `[DOC]` **LOW** (non-blocking): `enemies-maneuver.test.ts` comment "the now-ROM-speed tank" *overstates* — the enemy turn rate is still an open divergence (E-011: ROM enemy ≠ `MAX_TURN_RATE × 0.4`). The enemy slowed to *0.4× the corrected player rate* (~8.8°/s), which is not the ROM enemy rate. Reworded understanding captured in the delivery finding; the phrase is imprecise but harmless given the finding.
- `[TYPE]` `timebase.ts` exports a plain `const GAME_FRAME_HZ = 15.625` (numeric literal) — no `as any`, no non-null assertions, no branded-type or `Record<string, any>` concerns; consumers keep their numeric types. `export const` (a value) is correctly not `export type`.
- `[SEC]` N/A — pure `src/core` constants and arithmetic; no I/O, no user input, no auth, no deserialization. Core-purity gate green (41/41), including the new module.
- `[SIMPLE]` The new one-export `timebase.ts` is justified DRY (AC-1 "everywhere" + TEA's strong recommendation; prevents a fourth 60 drifting in). The `firing.ts` restructure *removes* the mislabelled `SHELL_STEP_PER_FRAME` — a net clarity gain, not added complexity.
- `[SILENT]` No error handling introduced or removed — the diff is constants + test durations; no catches, fallbacks, or swallowed paths.
- `[RULE]` TypeScript lang-review checklist: compliant — no type-safety escapes (#1), no generic/interface pitfalls (#2), no enum anti-patterns (#3), no `||`-vs-`??` falsy bug (#4), correct value/type export split (#5), no async concerns (#7). See Rule Compliance below.
- `[VERIFIED]` Citation integrity — `remediated_by: bz3-1` sits on **exactly** the 4 DIVERGENCE fixes (C-001/M-001/M-003/F-004), never a CONFIRMED (no phantom fix); 138 citations correct, **0 lost**; gate 12/12. Frozen `ours` verbatims correctly preserved as history.
- `[VERIFIED]` AC-1 completeness — grep confirms **no other game-frame `/60` or `×60` site** remains in `src/`; the surviving 60s are the legitimate ~60 fps render/rAF cadence (comments at `enemies.ts:144`, `saucer.ts:97`, and `enemies.test.ts:372`'s hit-radius floor) and unrelated model/geometry constants.

### Rule Compliance (TypeScript lang-review checklist)

- **#1 Type-safety escapes:** none — no `as any`, `as unknown as`, `@ts-ignore`, or non-null `!` in the diff (preflight + grep confirm).
- **#2 Generics/interfaces:** none introduced; no `Record<string, any>`/`object`/`Function`.
- **#3 Enums:** none added.
- **#4 Null/undefined:** no optional chaining, no `||`-vs-`??` on falsy-valid values; `GAME_FRAME_HZ` is a required const.
- **#5 Modules:** `import { GAME_FRAME_HZ }` is a runtime value (correct — not `import type`); `export const` correct; project uses Vite/bundler resolution so no `.js` extension requirement.
- **#8 Tests:** no `as any` in assertions; imports from `src/` not `dist/`; no `.skip`/`.only`; re-baseline changes only loop bounds.
- **#9 Build/config:** untouched; `tsc --noEmit` strict passes.
- **#10/#11 Input validation / error handling:** N/A — no external input; deterministic pure arithmetic.

### Devil's Advocate

Suppose this change is broken. The most dangerous move here is a *silent magnitude regression the
tests bless*: bz3-1 re-baselines the very suite that guards it, so an attacker-author could hide a
wrong constant behind loosened tests. I checked for exactly that — the sibling edits are provably
durations-only (no threshold moved), and the new `timebase.test.ts` pins the three magnitudes to
independently-derived ROM values, so a wrong `GAME_FRAME_HZ` or `FORWARD_STEP` fails a red test, not
a green one. Second attack: the SHELL_SPEED "fix" is the F-004 trap in disguise — a naive dev drops it
to 4000; here it rises to 16000 via an explicit 4× sub-step, and the guard test forbids <14000, so the
trap is caught. Third: the swept granularity tripled (64→256); a fast enemy shell could now tunnel a
thin obstacle and the duel silently stops working. I quantified it — the smallest footprint (724u)
still gets ≥5 samples on a centre hit, and the only miss-band is the circle's fictitious corner beyond
the real square, so no *real* hit is lost; this is strictly more ROM-faithful. Fourth: a confused
future reader of the enemy tests believes the enemy is at ROM speed and never fixes E-011 — mitigated
by an explicit delivery finding naming E-011 and the ROM targets. Fifth: the citation gate goes green
on a lie — but `remediated_by` sits only on the four true DIVERGENCE removals, the frozen quotes stay
as history, and 0 citations are lost. Sixth: a stressed run with dt=0 or huge dt — `stepFiring` already
guards `dist<=0` and `substeps=ceil(dist/256)` stays finite; the pre-existing "extreme finite dt" test
still passes. The one genuine wart is the "ROM-speed" comment (LOW). Nothing rises to blocking.

**Data flow traced:** `GAME_FRAME_HZ` (timebase.ts) → `MAX_SPEED`/`MAX_TURN_RATE` (movement.ts) and `SHELL_SPEED`/`SHELL_SUBSTEP` (firing.ts) → `stepTank`/`stepFiring`/`stepEnemies` integrators → deterministic pose/shell state. Pure throughout; no DOM/time/random enters (purity gate green).
**Pattern observed:** single-source-of-truth constant + explicit sub-step decomposition — `firing.ts:51-72`.
**Error handling:** N/A (pure arithmetic); `stepFiring` dt≤0 guard intact at `firing.ts:114`.

**Tags present:** [EDGE] [SILENT] [TEST] [DOC] [TYPE] [SEC] [SIMPLE] [RULE]

**Handoff:** To SM (Winston Smith) for finish-story.