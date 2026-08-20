---
story_id: "pt1-27"
jira_key: "pt1-27"
epic: "pt1"
workflow: "tdd"
---
# Story pt1-27: Defender laser must keep its firing row (y captured at fire time)

## Story Details
- **ID:** pt1-27
- **Jira Key:** pt1-27
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** fix/pt1-27-laser-y-tracking
- **PR:** (none yet - recorded when the PR is created)
- **Stack Parent:** none

## Background

**Defect:** The player-laser record (`plugins/defender/src/core/laser.ts`) stores
x/facing/alive but no y. Render (`scene.ts` drawLaserStreak call in composeFrame)
and collision (`sim.ts` hitTestLasers) both substitute the ship's LIVE row for
every in-flight laser, so vertical ship movement drags airborne shots to the new
row — visually and lethally. Correct behavior: each laser captures its y at fire
time and keeps it, independent of later ship movement.

**Root cause (researched by SM):**
- `laser.ts`: `Laser` / `LaserRecord` have no `y`; `fire(shipX, facing)` takes no shipY
- `sim.ts` fire call site: `state._laserBank.fire(plax16, shipFacing)` — no ship y passed
- `scene.ts` composeFrame: streak drawn at `state.ship.y` instead of `laser.y`
- `sim.ts` hitTestLasers: query at `shipRow` instead of `laser.y`

## TEA Assessment

**Tests Required:** Yes
**Reason:** Behavioral bug with both render and collision consequences; no existing coverage pins the laser's row.

**Test Files:**
- `plugins/defender/tests/pt1-27-laser-y-capture.test.ts` — 6 tests, all RED against current code

**Tests Written:** 6 tests covering 4 ACs
- AC1 (unit, laser.ts): `fire(shipX, facing, shipY)` captures shipY into the record; travel never touches it; per-record (two lasers keep distinct rows).
- AC2 (sim wiring): `state.lasers[].y` stays at the firing row while the ship climbs 20+ rows.
- AC3 (behavior, hitTestLasers): a shot fired at row 120 must NOT kill a stationary pod wall parked at the ship's NEW row (top-freeze band, rows 40..50), and MUST still kill the mirror wall at rows 116..126 (its own firing row) after the ship has left. Pods chosen as the wall enemy because their drift is unported (perfectly stationary), wave 1 spawns none (`pod-hit` is unambiguous), and the 4x8 PRBP1 box blankets the freeze row.
- AC4 (render, composeFrame): frame DIFFER method — same state with/without lasers; the differing pixels (the streak) must include row 120 and never the parked band. Current code puts the streak on `[ 42 ]`.

**Status:** RED (all 6 fail — `expected undefined to be 120/200`, `pod-hit` present/absent inverted, streak rows `[ 42 ]`). Lint (tsc) green; rest of defender suite 1112 passing, untouched.

**Handoff:** To Dev for implementation — `.session/pt1-27-handoff-red.md`

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/defender/src/core/laser.ts` - `Laser.y` (readonly) + `LaserRecord.y`; `fire(shipX, facing, shipY = 0)` captures the fire-time row; travel only ever writes x
- `plugins/defender/src/core/sim.ts` - fire call site passes `shipRow`; `hitTestLasers` queries at `laser.y` (unused `shipRow` param dropped)
- `plugins/defender/src/core/scene.ts` - `drawLaserStreak` draws at `laser.y` instead of `state.ship.y`
- `plugins/defender/tests/df3-6-live-sim.test.ts` - hand-built laser literal gains the now-required `y: 120`
- `plugins/defender/tests/df5-9-world-scroll.test.ts` - same (`y: 120`)
- `plugins/defender/tests/df6-1-audio-events.test.ts` - seed-42 cue-stream fingerprint re-baselined `22cffd53e6e17bea` → `e80467cdef87c1e5` (287 cues before AND after — content shifted, count unchanged), per that test's documented re-baseline idiom: the collision-row fix changes WHICH enemies in-flight shots strike over the scripted climb/dive run

**Tests:** 1118/1118 passing (GREEN — 6 new pt1-27 + 1112 pre-existing). `npm run lint` (tsc): clean.
**Branch:** fix/pt1-27-laser-y-tracking (pushed)

**Handoff:** To Reviewer

## Design Deviations

### Dev (implementation)
- **shipY is optional with default 0:** Handoff spec said `fire(shipX, facing, shipY)`; implemented `shipY?: number` / `shipY = 0`. Reason: the trailing-param decision exists precisely so the ~20 legacy two-arg `fire(x, facing)` calls in `laser.test.ts` keep compiling under repo-wide tsc — a required third param would redden lint at every legacy site. The sim's real call site always passes `shipRow`; only hand-built unit fixtures take the default.
- **No non-finite shipY guard:** Handoff left it as Dev's call. Skipped — x's guard exists because a non-finite x makes `offScreen()` forever-false and leaks an LFLG slot; y is never compared, so a bad y cannot leak a process. Minimal code wins.

### TEA (test design)
- **fire() signature — trailing shipY:** Story implies fire must receive the ship's y; TEA pinned `fire(shipX, facing, shipY)` (trailing param) rather than `(shipX, shipY, facing)`. Reason: the existing df3-5 suite (`laser.test.ts`) calls `fire(x, facing)` at ~20 sites and never reads y; a trailing param leaves that green suite byte-untouched, while an inserted param would silently shift `facing` into the y slot at every legacy call site.
- **AC2 fire row asserted as the resting row (120):** The fire tick uses neutral vertical input so the captured row is exactly INITIAL_Y; climb starts the tick after. Avoids coupling the test to whether sim captures shipRow before or after stepVerticalY on the fire tick.

### Reviewer (audit)
- **shipY optional with default 0 — ACCEPTED.** Verified by grep: the ONLY production `_laserBank.fire` call site (sim.ts:557) passes `shipRow`; every two-arg call lives in `tests/laser.test.ts` (the df3-5 suite). TEA's own contract ("trailing, so the two-arg calls stay untouched" + a required param) cannot both hold under repo-wide tsc, so Dev's resolution is the correct reading. Residual risk noted as a nit below: a future call site omitting shipY compiles and fires at row 0 silently.
- **No non-finite shipY guard — ACCEPTED.** Rationale verified against laser.ts: the x guard exists because a non-finite x makes `offScreen()` forever-false and leaks an LFLG slot; y feeds only the render row and the collision query, so a bad y cannot leak a process. Production shipY is `vy.y16 >> 8` (always a finite int32).
- **TEA trailing-param placement + AC2 resting-row pin — ACCEPTED.** Both rationales verified; AC2's decoupling from fire-tick capture order is sound (fire at step 7 uses the post-clamp `shipRow` from line 549, same value the ship renders with).
- No undocumented deviations found. Dropping the now-unused `shipRow` param from `hitTestLasers` is within TEA's pinned contract and left no dead references (lint green repo-wide).

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `input.fire` → stepSim step 7 → `_laserBank.fire(plax16, shipFacing, shipRow)` (sim.ts:557) → `rec.y` captured once at spawn (laser.ts) → travel loop writes x only → `state.lasers` view → the two consumers: `drawLaserStreak(fb, projectOnscreenX(laser.x), laser.y, facing)` (scene.ts:483, the ONLY `state.lasers` consumer in scene) and the `hitTestLasers` query `{x, y: laser.y}` (sim.ts:847). Safe: fire (step 7) precedes collision (step 10) in the same tick, so on the fire tick `laser.y === shipRow` — behavior on the fire tick is bit-identical to before; divergence begins only when the ship moves, which is exactly the bug.

**Pattern observed:** RED tests follow the df6-1 Rig/cast idiom (test-local contract shim over the real module, pt1-27-laser-y-capture.test.ts:60-91) and AC3 drives the REAL `hitTestLasers` path via the sim's own pod spawner — no re-implemented collision. AC4 uses the canonical frame-DIFFER method.

**Error handling:** Non-finite shipX still guarded (laser.ts, lang-review #21); shipY deliberately unguarded with verified rationale (see audit above).

**Observations (verified by execution, not inspection):**
1. Full defender suite: 89 files / 1118 tests pass. `npm run lint` (tsc repo-wide): clean. Purity suite: 49/49.
2. Mutation probe (core files reverted to pre-fix, then restored): ALL 6 pt1-27 tests redden — none vacuous.
3. Same probe proves the df6-1 re-baseline is exactly the fix and nothing else: pre-fix core reproduces the OLD fingerprint `22cffd53e6e17bea` at 287 cues; post-fix stream measured (forced-mismatch probe) at 287 cues → `e80467cdef87c1e5`. Count unchanged, content shifted — the comment's claim is true by measurement. Re-baseline comment follows the test's documented idiom (prior 300→287 note retained).
4. The `shipY = 0` default is unreachable from production (single call site passes shipRow); all two-arg calls are in tests/laser.test.ts.
5. `hitTestLasers` shipRow param fully removed — no caller or dead reference survives (grep + tsc).
6. df3-6/df5-9 ripples are the minimal `y: 120` literal additions the now-required field forces — benign.
7. Nit (non-blocking, recorded for the record): the default-0 escape hatch means a hypothetical future production `fire(x, facing)` call would silently fire at row 0. Acceptable today; if `laser.test.ts` is ever touched wholesale, making shipY required is the tidier end state.

**Findings:** 0 blocker / 0 should-fix / 1 nit (observation 7).

**Handoff:** To SM for finish-story

## Delivery Findings

### TEA (test design)
- **Improvement** (non-blocking): `hitTestLasers` (sim.ts) does not consume the laser on a hit — the beam pierces and keeps killing along its row. AC3's "own firing row" test relies on the sweep continuing across the wall; if a later fidelity story makes lasers die on impact, that test's wall still works (the first pod hit emits the cue), but the note belongs with whoever ports LCOL fully. *Found by TEA during test design.*
