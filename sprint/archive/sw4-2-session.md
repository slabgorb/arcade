---
story_id: "sw4-2"
jira_key: ""
epic: "sw4"
workflow: "tdd"
---
# Story sw4-2: Homing fireball threat — replace 300 u/s straight-line (max reach 1,800, provably can't arrive) with ROM homing law sub_A875: pos decays 7/8 per tick toward cockpit, frame-rate independent pow(7/8, dt×TICK_HZ), 64-tick lifetime, ALWAYS arrives ~1-2s; un-shot = shield hit (gunnery defense); stays shootable (spec §B)

## Story Details
- **ID:** sw4-2
- **Jira Key:** (none)
- **Workflow:** tdd
- **Stack Parent:** sw4-1
- **Type:** feature
- **Points:** 3
- **Priority:** p1
- **Repos:** star-wars

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-12T00:37:34Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-11T23:37:26Z | 2026-07-11T23:39:07Z | 1m 41s |
| red | 2026-07-11T23:39:07Z | 2026-07-12T00:13:47Z | 34m 40s |
| green | 2026-07-12T00:13:47Z | 2026-07-12T00:30:13Z | 16m 26s |
| review | 2026-07-12T00:30:13Z | 2026-07-12T00:37:34Z | 7m 21s |
| finish | 2026-07-12T00:37:34Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Setup (discovery)
- **ROM homing law documented:** `docs/tie-flight-ai-model.md` §6 ("Fireball travel") provides the authoritative algorithm: relative coordinates shrink `vel -= vel>>3` per frame (~7/8 decay), lifetime = 64 frames (0x40), self-despawns when lifetime hits 0. Source: `sub_A849` → `sub_A875` in the ROM disassembly (gitignored `reference/disasm/StarWars_annotated.lst`). *(CONFIRMED in ROM)*
- **Current implementation:** `src/core/state.ts:172` `ENEMY_SHOT_SPEED = 300`, `src/core/sim.ts:210,431` fireballs spawned with velocity = `scale(toCockpit(...), ENEMY_SHOT_SPEED)` — straight-line aimed at the cockpit, no homing.
- **Spec anchor:** Epic sw4 description cites "spec §B" and the design doc `docs/superpowers/specs/2026-07-11-world-metric-threat-restoration-design.md` (not yet created; accept that spec may be authored during TEA phase). The story acceptance criteria are: homing law replaces straight-line, frame-rate independent, 64-tick lifetime ensures ~1-2s arrival, un-shot = shield hit, stays shootable.
- **Quarry location:** The homing algorithm lives in `src/core/state.ts` (fireball velocity decay constants) and `src/core/sim.ts` (fireball step/advance logic, `stepSpace` or equivalent). The ROM reference is the tie-flight model doc + the gitignored disassembly. No new constants expected beyond the `7/8` factor and frame-rate tuning (`TICK_HZ`).

### TEA (test design)
- **Conflict** (blocking): `tests/core/rom-score-values.test.ts` is RED on the **develop baseline** — NOT caused by sw4-2 (my diff is test-only, in three unrelated space-phase files). Its `portKill` helper stages the exhaust-port kill at the port's phase-entry position (`state.exhaustPort!.pos` = z = −`EXHAUST_PORT_DISTANCE` = −2,400), which is OUTSIDE sw3-15's new `PORT_APPROACH_WINDOW` (`$800`) gate, so the two end-to-end port-kill tests (lines 124/130) score `+0` instead of 25,000 / 30,000. **Escaped regression from sw3-15 (#68):** that commit re-seated `force-bonus.test.ts` (→ `IN_WINDOW_PORT [0,0,-300]`) and `exhaust-port-outcome.test.ts` but its file list never touched `rom-score-values.test.ts`. The GAME is correct — the in-window sibling suites are green. Affects `tests/core/rom-score-values.test.ts` (re-seat `portKill` to seat the port + bolt at an in-window z ≈ −300, mirroring `force-bonus.test.ts:28-36`). *Found by TEA during test design.* **RESOLVED** (user-authorized, this branch, commit `e1e475d`): `portKill` re-seated to `IN_WINDOW_PORT [0,0,-300]`; both exhaust-port score tests now green; full suite back to a clean baseline (only sw4-2's 2 intended RED tests fail).
- **Gap** (non-blocking): sw4-2 depends on sw4-1, which the spec designates the owner of the shared `TICK_HZ` PROVISIONAL constant — but **sw4-1 is still `backlog`**, so `TICK_HZ` does not yet exist in `src/core/`. Since sw4-2 lands first, the Dev must INTRODUCE `TICK_HZ` (a named PROVISIONAL core constant, spec §B) with this story; sw4-1 then reuses it ("define once", not "sw4-1 must define"). Affects `src/core/state.ts` (define `TICK_HZ` once, doc-comment the cabinet-tick-unpinned caveat citing the design spec). *Found by TEA during test design.*
- **Improvement** (non-blocking): `ENEMY_SHOT_SPEED` (state.ts:181) becomes dead once the homing law replaces the straight-line `vel` — no test imports it, so it can be removed. `ENEMY_SHOT_TTL` (state.ts:183, currently 6 s) should be re-expressed as 64 ticks via `TICK_HZ`, but KEEP the name: rom-score-values / shootable-fireballs / fireball-large-target / homing-fireball tests all import it as the shot lifetime. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): `TICK_HZ = 30` is now defined in `src/core/state.ts` (shared, per the epic guardrail). sw4-1 must reconcile its TIE-speed feel against this basis — the ROM's literal 62-tick TIE cube-transit at 30 Hz is ~2.1 s, under the epic's 2.5–4 s playtest target, so sw4-1 should tune `ENEMY_SPEED` as raw u/s (as it already plans, "PROVISIONAL ~10,000") rather than assume `62 ticks × TICK_HZ`. Affects `src/core/state.ts` (sw4-1's speed constants) — a playtest/tuning reconcile, not a code dependency. *Found by Dev during implementation.*
- **Improvement** (non-blocking): homing scoped to the SPACE phase only; surface tower/turret fireballs (`sim.ts:429`) keep straight-line motion and still use `ENEMY_SHOT_SPEED` (so it was NOT removed, contra TEA's non-binding finding). A future story porting the ROM homing to surface fire would flip the one phase gate in `sim.ts` and retire `ENEMY_SHOT_SPEED` then. Affects `src/core/sim.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the homing arrival FEEL (`TICK_HZ = 30` → ~0.8–1.5 s) is a PROVISIONAL playtest item (spec §D) that no unit test pins — recommend a quick space-wave playtest before the epic ships to confirm the threat reads as "real but shootable", and reconcile against sw4-1's TIE-transit feel when it lands (already flagged by Dev). Affects `src/core/state.ts` (`TICK_HZ`) — tuning, not a code defect. *Found by Reviewer during code review.*
- No blocking findings during code review.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Exact 7/8 decay rate and 64-tick lifetime left to playtest, not unit-tested**
  - Spec source: design spec §D (Testing); context-epic-sw4.md "PROVISIONAL policy"
  - Spec text: "PROVISIONAL feel items (speeds, `TICK_HZ`): playtest verification, not unit tests; constants carry `PROVISIONAL` doc-comments"
  - Implementation: `homing-fireball.test.ts` pins the TICK_HZ-value-free invariants §D lists (deceleration / geometric decay, convergence → shield from any range, 30/60/144 Hz frame-rate independence, homes-along-launch-line) but does NOT assert the literal 7/8-per-tick factor or the 64-tick count
  - Rationale: unit-testing a `TICK_HZ`-derived value couples the suite to a constant the spec explicitly reserves for playtest; the Reviewer verifies the literal `7/8` / `0x40` by diff trace
  - Severity: minor
  - Forward impact: exact ROM rate is a Reviewer diff-check + playtest item, not a regression guard
- **Re-seated two sibling assertions from `vel`-direction to observable position-homing**
  - Spec source: context-story-sw4-2.md (stays aimed at cockpit); design spec §B
  - Spec text: "Replace `vel: scale(toCockpit(e.pos), ENEMY_SHOT_SPEED)` straight-line motion with the ROM homing law"
  - Implementation: `space-combat.test.ts` ("enemies fire fireballs aimed at the cockpit") and `tie-strafe-fire.test.ts` ("a fireball launches … aimed at the cockpit") asserted `dot(shot.vel, toCockpit) > 0`; the homing law makes `vel` vestigial (motion is position-decay), so both now isolate the shot and assert a step pulls its POSITION inward toward the origin
  - Rationale: the vel-direction assertion breaks if the Dev drops/zeros the vestigial velocity; the position-homing assertion is robust to that and stays green on BOTH the current straight-line code and the homing code (verified)
  - Severity: minor
  - Forward impact: none — preserves each test's "aimed at the cockpit" intent
- **Two of the four new tests are green-on-both guards, not RED distinguishers**
  - Spec source: design spec §D
  - Spec text: "dt-split determinism (30/60/144 Hz … same trajectory)"
  - Implementation: "homes along its launch line" and "is frame-rate independent" pass on the current straight-line code too (linear motion is dt-invariant and cockpit-directed); they guard the required invariants against a NAIVE homing impl (per-step ×7/8 breaks frame-rate independence). The RED distinguishers are "decelerates as it homes" and "converges … costs one shield from any range"
  - Rationale: §D mandates the dt-split determinism test; its natural failure mode is the naive impl the guardrail warns about, not the current code
  - Severity: minor
  - Forward impact: none

### Dev (implementation)
- **Homing scoped to the SPACE phase; surface fire kept straight-line**
  - Spec source: design spec §B; SM Assessment (session)
  - Spec text: "In `sim.ts` (space-phase enemy fire) + `state.ts` constants"; SM: "space-combat change only"
  - Implementation: the enemyShots advance is phase-gated — `state.phase === 'space' ? homeShots(...) : advance(...)`. Surface tower/turret fire (`sim.ts:429`) keeps the straight-line `advance` + `ENEMY_SHOT_SPEED`
  - Rationale: the story scopes to space fire; homing all fireballs would change out-of-scope surface behaviour and strand `ENEMY_SHOT_SPEED` (still used by surface). This is why TEA's non-binding "remove ENEMY_SHOT_SPEED" was NOT taken
  - Severity: minor
  - Forward impact: a future "surface homing" story flips the one phase gate and retires `ENEMY_SHOT_SPEED`
- **TICK_HZ set to 30 (PROVISIONAL value)**
  - Spec source: design spec §B/§D; epic sw4 guardrail
  - Spec text: "TICK_HZ a named PROVISIONAL constant … playtest verification, not unit tests"; "practical arrival ≈ 1–2 s from any launch range"
  - Implementation: `TICK_HZ = 30` (fireball life 64/30 ≈ 2.13 s; arrival ~0.8–1.5 s across the 2,048–31,744 launch range)
  - Rationale: 30 lands arrival in the spec's "~1–2 s" window; one TICK_HZ can't satisfy both the fireball's 64-tick "~1 s" feel and sw4-1's 62-tick TIE-transit "2.5–4 s" feel (literal-tick ranges don't overlap), so I optimised for this story's fireball feel and flagged the sw4-1 reconcile (Delivery Finding)
  - Severity: minor
  - Forward impact: sw4-1 shares TICK_HZ — tune its speeds against 30 Hz, or adjust TICK_HZ with a documented reconcile
- **Two sibling tests re-seated for the homing motion (assertion-preserving)**
  - Spec source: TEA tests (shootable-fireballs, tie-strafe-fire); Dev sidecar gotcha "tightening a shared mechanism breaks sibling fixtures"
  - Spec text: "Re-seat the fixture INTO the gate (mechanical, assertion-preserving)"
  - Implementation: `shootable-fireballs.test.ts` destroyed-cue z loosened from `toBeCloseTo(-400,0)` to a `(-401,-350)` band (homing moves the shot ~1.6 u toward the cockpit in the 0.001 s step); `tie-strafe-fire.test.ts` "multiple in-window TIEs…" now tracks the PEAK simultaneous fireballs, not the end count (homing removes them as they arrive, understating the fire that went up)
  - Rationale: both assertions' intent is preserved (cue is downrange not cockpit; per-TIE fire puts ≥3 aloft, beating the formation timer's 2); only the tolerance / sampling point changed to survive the homing mechanism. No `src` change makes them pass without the re-seat
  - Severity: minor
  - Forward impact: none — Reviewer/TEA to confirm intent unchanged
- **Space fireball spawn velocity set to `[0,0,0]`**
  - Spec source: design spec §B
  - Spec text: "Replace `vel: scale(toCockpit(e.pos), ENEMY_SHOT_SPEED)` straight-line motion with the ROM homing law"
  - Implementation: the space fireball spawn sets `vel: [0,0,0]` (homing drives it by position decay; `render.ts` reads only `pos` + `ttl`, never `vel`)
  - Rationale: honest representation — a homing shot has no velocity; the old cockpit-pointing vel would be a misleading vestige
  - Severity: trivial
  - Forward impact: none

### Reviewer (audit)
Every logged deviation stamped; no undocumented deviations found.
- **TEA — exact 7/8 rate & 64-tick life left to playtest** → ✓ ACCEPTED: matches design spec §D "PROVISIONAL feel items … not unit tests"; I diff-verified the literals directly (`Math.pow(7 / 8, …)`, `64 / TICK_HZ`) per §D's "Reviewer diff trace".
- **TEA — re-seat two `vel`-direction assertions to position-homing** → ✓ ACCEPTED: correctly anticipated Dev zeroing the vestigial `vel`; the position-homing assertion is robust and non-vacuous.
- **TEA — two new tests are green-on-both guards** → ✓ ACCEPTED: §D mandates the dt-split determinism test; the RED distinguishers ("decelerates", "converges→shield") carry the behavioural load — verified both fail on straight-line and pass on homing.
- **Dev — homing scoped to SPACE phase, surface kept straight-line** → ✓ ACCEPTED: matches spec §B ("space-phase enemy fire") + SM "space-combat change only"; `enterPhase` clears `enemyShots` (sim.ts:846) so no space shot ever reaches the surface `advance()` — the scope split is leak-free.
- **Dev — TICK_HZ = 30 (PROVISIONAL)** → ✓ ACCEPTED: documented, playtest-tunable, and the "always arrives" property is TICK_HZ-value-independent (max arrival ~45 ticks < 64-tick life); the sw4-1 reconcile is a flagged non-blocking Delivery Finding.
- **Dev — two sibling re-seats for the homing motion** → ✓ ACCEPTED: diff-verified assertion-preserving — shootable cue still asserts downrange-not-cockpit `(-401,-350)`; tie-strafe peak-aloft still asserts ≥3 from per-TIE fire.
- **Dev — space fireball spawn `vel: [0,0,0]`** → ✓ ACCEPTED: verified safe — `render.ts` reads only `pos`+`ttl`, and `enterPhase` wipes `enemyShots` on transition, so the zero velocity can never be consumed by the surface straight-line `advance()`.

## SM Assessment

**Scope:** Feature implementation — replace the straight-line fireball threat model with the ROM's homing law (pos decays 7/8 per tick toward cockpit, 64-tick lifetime, frame-rate independent). This is a core-simulation change only; shell rendering of fireballs is out of scope.

**Stack dependency:** `sw4-2` depends on `sw4-1` (space world-metric restoration). The homing fireball assumes the world scale & threat timing from sw4-1 is in place; it is not blocked and can proceed in parallel once sw4-1's metrics are live.

**Quarry for TEA (verify against ROM before pinning):**
- `docs/tie-flight-ai-model.md` §6 "Fireball travel" — the ROM homing algorithm (`sub_A849` → `sub_A875`, `vel -= vel>>3` per frame, lifetime 64 frames).
- `src/core/state.ts:172` `ENEMY_SHOT_SPEED = 300` and related fireball lifetime constants.
- `src/core/sim.ts` — fireball spawn and per-frame advance logic (grep for `pushFire`, `spawnFire`, or the main `stepSpace` / `stepGame` loop).
- Test coverage: Verify no regression in other fireballs; ensure shootability is not broken.

**Guardrails:**
- Frame-rate independence: the 7/8 decay must use `pow(7/8, dt * TICK_HZ)`, not a fixed-frame constant.
- Lifetime: 64 ticks exactly (authenticate against the ROM constant in the doc).
- Homing toward cockpit (origin), not away.
- The speed ramp (7/8 per frame) ensures ALWAYS arrives ~1-2s; a straight-line 300 u/s with max reach 1,800 cannot arrive from most positions (provably). The homing law is the fix.

**Routing:** → O'Brien (TEA) for the RED phase (test design). Julia (Dev) implements to green. Reviewer audits the frame-rate independence and homing correctness.

## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `tests/core/homing-fireball.test.ts` (NEW) — 4 tests pinning the §B / §6 homing law through the public `stepGame` surface.
- `tests/core/space-combat.test.ts` (re-seated 1 test) — "enemies fire fireballs aimed at the cockpit" now asserts position-homing, not vestigial `vel`.
- `tests/core/tie-strafe-fire.test.ts` (re-seated 1 test) — "a fireball launches … aimed at the cockpit" likewise.

**Tests Written:** 4 new tests covering the fireball ACs (deceleration, convergence→shield from any range, frame-rate independence, homes-along-launch-line) + 2 sibling re-seats.
**Status:** RED (confirmed via testing-runner, RUN_ID sw4-2-tea-red)

**RED verification (testing-runner):**
- ❌ `decelerates as it homes …` — `expected 15 to be less than 15` (current straight-line covers a constant 300·dt/step). **RED as designed.**
- ❌ `converges … costs exactly one shield — from any launch range` — `expected 6 to be 5` (straight-line reach 1,800 never arrives from 2,048 / 8,000 / 31,744). **RED as designed.**
- ✅ `homes along its launch line …` — green (guard; both laws head cockpit-ward).
- ✅ `is frame-rate independent (30/60/144 Hz) …` — green (guard vs the naive per-step ×7/8 impl).
- ✅ Re-seated `space-combat` + `tie-strafe-fire` — green on current code (verified robust to the motion change).
- ✅ Untouched siblings `shootable-fireballs`, `fireball-large-target` — still green (analysed for interception-timing under homing; the 150-u radius keeps the crossing intercept intact — no re-seat needed).

**Baseline finding (NOT sw4-2's doing) — RESOLVED:** `rom-score-values.test.ts` was RED on develop (2 tests) — an escaped sw3-15 (#68) regression; its `portKill` staged the port outside the new `$800` window. User authorized the fix on this branch; re-seated into the window (commit `e1e475d`). Baseline is now green; the ONLY remaining failures are sw4-2's 2 intended RED tests (verified, RUN_ID sw4-2-tea-red-2). See Delivery Findings.

### Rule Coverage

| Rule (lang-review typescript.md) | Test(s) | Status |
|------|---------|--------|
| #4 null/undefined — dt handling must be frame-rate-independent (`??` not `\|\|`, correct dt math) | `is frame-rate independent — 30/60/144 Hz` | guard (green; RED vs naive impl) |
| #1 type-safety escapes — no `as any` | all new tests use typed fixtures (`as Vec3` on tuple literals only) | pass |
| #8 test quality — every test asserts something meaningful, no vacuous pins | all 4 new tests + 2 re-seats assert observable state (`length`, `lives`, `enemyShots`) | pass |
| Determinism (SOUL / core boundary) — pure, dt-only, seeded RNG | convergence + frame-rate tests drive only `stepGame(state, input, dt)`; no DOM/time/random | pass |

**Rules checked:** the applicable behavioral TS checks for a pure-core motion change (#1, #4, #8) + the repo's core-purity rule. React/async/module rules N/A (pure sim, no I/O).
**Self-check:** 0 vacuous tests — each assertion reads observable state; the two guards are documented as green-on-both (a deviation), not vacuous.

**Handoff:** To Julia (Dev) for GREEN — pending the user's call on the `rom-score-values` baseline.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/state.ts` — added `TICK_HZ = 30` (PROVISIONAL shared cabinet-tick basis, doc'd); re-expressed `ENEMY_SHOT_TTL` as the ROM 64-tick life (`64 / TICK_HZ`); re-doc'd `ENEMY_SHOT_SPEED` as surface-only.
- `src/core/sim.ts` — added `homeShots()` (ROM `sub_A875`: position decays `pow(7/8, dt × TICK_HZ)` toward the cockpit, ages the 64-tick ttl, pure/new-array); phase-gated the enemyShots advance (space = `homeShots`, surface/trench = straight-line `advance`); space fireball spawn velocity → `[0,0,0]`.
- `tests/core/shootable-fireballs.test.ts`, `tests/core/tie-strafe-fire.test.ts` — assertion-preserving re-seats for the homing motion (see Dev deviations).

**Tests:** 787/787 passing (GREEN, RUN_ID sw4-2-dev-green-2). Build clean (`tsc --noEmit` + `vite build`).
**Branch:** feat/sw4-2-homing-fireball (pushed)

**Scope discipline:** space-phase enemy fire only — surface/trench fire untouched. Purity preserved (`homeShots` returns a new array, decays by `dt` only, no RNG; input never mutated). `render.ts` already draws fireballs from `pos`+`ttl`, so the shell is wired with no change. The exact `TICK_HZ` / arrival FEEL is a PROVISIONAL **playtest** item (spec §D), not unit-tested.

**Self-review:** wired (render consumes enemyShots by pos) ✓ · follows the named-constant + pure-core patterns ✓ · all 6 story ACs met (homing decay, frame-rate independent, 64-tick life, un-shot→shield, shootable, no regression) ✓ · no new error paths needed (pure sim) ✓.

**Handoff:** To verify (TEA simplify + quality-pass), then Reviewer.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 real smells (1 style note: inline `7/8`) | confirmed 0 blocking; deferred 1 (LOW) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — edge domain covered by Reviewer ([EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer ([SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer ([TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer ([DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer ([TYPE]) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer ([SEC]) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer ([SIMPLE]) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer ([RULE]) |

**All received:** Yes (1 enabled subagent returned; 8 disabled via settings, their domains covered by the Reviewer directly)
**Total findings:** 0 confirmed blocking, 0 dismissed, 2 deferred (LOW/non-blocking: inline `7/8`; TICK_HZ playtest feel)

### Rule Compliance (.pennyfarthing/gates/lang-review/typescript.md)

Enumerated against every changed `.ts` symbol:
- **#1 type-safety escapes:** no `as any`, `@ts-ignore`, or non-null-on-nullable. `as Vec3` appears only on 3-tuple literals (`[...pos] as Vec3`; `vel:[0,0,0]` via contextual `Vec3`) — legitimate; `tsc --noEmit` passes. COMPLIANT.
- **#2 generics/interfaces:** `homeShots(shots: readonly Projectile[], dt: number): Projectile[]` — `readonly` on the input it must not mutate; no `Record<string,any>`/`Function`. COMPLIANT.
- **#4 null/undefined:** `homeShots` needs no `??` (all inputs total); existing `advance` keeps `b.vel ?? ZERO`; no `||`-on-falsy-valid. COMPLIANT.
- **#5 module/declaration:** `TICK_HZ` import added; unused `dot`/`sub` removed from the two re-seated tests; no missing exports; repo resolves via bundler (existing relative imports carry no `.js`, build passes). COMPLIANT.
- **#8 test quality:** every new/changed test asserts observable state (`length`, `lives`, `enemyShots`, position bands); no vacuous pins. COMPLIANT.
- **#3 enum / #6 React / #7 async / #10–12 input-val/perf:** N/A — pure deterministic sim; no enums added, no JSX, no async, no I/O or untrusted string input.
- **Core-purity rule (CLAUDE.md):** `homeShots` is pure — new array, decays by `dt` only, no DOM/time/RNG, input untouched. COMPLIANT (shootable "does not mutate input" test green).

### Devil's Advocate

Assume it is broken. Attack vectors:
1. **Tunneling the cockpit:** could a large-dt homing step jump a shot from outside `COCKPIT_HIT_RADIUS` (80) past the origin without a shield hit? No — the decay is a monotonic scalar shrink toward the origin; the shot converges asymptotically and never crosses to the far side, so once inside 80 it stays and the cockpit pass removes it. The convergence test proves arrival + exactly one shield from 2,048/8,000/31,744. Homing is un-tunnelable (unlike a straight-line bolt).
2. **Phase-transition leak:** space shots carry `vel:[0,0,0]`; if one survived into `surface`, the straight-line `advance()` would freeze it (a hung orb). But `enterPhase` resets `enemyShots: []` on every transition (sim.ts:846) — no space shot ever reaches the surface path. Leak-free.
3. **Frame-rate independence fraud:** does the LIFETIME stay in sync with POSITION across dt splits? Both are pure functions of elapsed time (`pos = pos0·pow(7/8, T·TICK_HZ)`, `ttl = TTL − T`); the frame-rate test confirms position parity at 30/60/144 Hz and ttl is trivially dt-additive. No desync.
4. **"Always arrives" fragility vs TICK_HZ:** arrival is counted in TICKS (~24–45 for 2,048–31,744), always < the 64-tick life regardless of TICK_HZ's wall-clock value — a future retune can't silently break the guarantee.
5. **Shootability regression:** the bolt-vs-fireball collision (`ENEMY_SHOT_HIT_RADIUS` 150) is untouched; the ~1.6 u/step motion near launch keeps the shot inside its own hit sphere for the intercept (fireball-large-target + shootable suites green).
6. **Purity via shared `vel` reference:** `homeShots` carries `vel: s.vel` by reference (like `advance`); nothing mutates `vel`, and the input-mutation test is green. No aliasing hazard.
Nothing uncovered promotes to a finding; the sole residual is stylistic (inline `7/8`, LOW).

## Reviewer Assessment

**Verdict:** APPROVED

Faithful, minimal, in-scope port of the ROM homing fireball law; 787/787 tests green, `tsc`+`vite` build clean.

- **[preflight]** 787/787 tests GREEN, build PASS, 0 real code smells, tree clean, branch in sync.
- **[EDGE]** (Reviewer — subagent disabled) No unhandled boundary: dt=0 → decay 1, ttl unchanged; empty `enemyShots` → loop no-op; at-origin shot stays and registers; the cockpit is un-tunnelable (Devil's Advocate #1). VERIFIED.
- **[SILENT]** (Reviewer) No swallowed errors, empty catches, or silent fallbacks; `homeShots` drops expired ttl explicitly, mirroring `advance`. VERIFIED.
- **[TEST]** (Reviewer) Assertion census — 4 new tests + both re-seats assert observable state; the convergence test cannot pass vacuously (isolated state: only the fireball can move `lives`). VERIFIED.
- **[DOC]** (Reviewer) Comments accurate — the `homeShots` JSDoc and `TICK_HZ`/`ENEMY_SHOT_TTL` doc-comments correctly cite ROM `sub_A875` / `5,u=$40`; the stale "advances the same way in every phase" comment was correctly replaced. No misleading docs.
- **[TYPE]** (Reviewer) No type escapes; `readonly Projectile[]` param; `Vec3` tuples type-check (build passes). VERIFIED.
- **[SEC]** (Reviewer) N/A — pure deterministic sim: no I/O, auth, secrets, or untrusted-string input; inputs bounded (aim/dt/fire). No attack surface.
- **[SIMPLE]** (Reviewer) `homeShots` mirrors `advance` (consistent); the phase ternary is minimal. One optional simplification: name the ROM `7/8` decay (see [LOW]). No over-engineering.
- **[RULE]** (Reviewer) TypeScript lang-review checklist enumerated above — all applicable checks (#1/#2/#4/#5/#8 + core-purity) COMPLIANT; the rest N/A.

**Observations (≥5):**
1. [VERIFIED] `homeShots` pure + frame-rate independent — sim.ts:914-926; `pow` composes across dt splits (frame-rate test green), returns a new array (input-mutation test green). Complies with the CLAUDE.md core-purity rule.
2. [VERIFIED] Un-tunnelable cockpit + "always arrives" — monotonic convergence; convergence test proves shield-from-any-range; arrival ticks < 64-tick life for all TICK_HZ.
3. [VERIFIED] Phase gate leak-free — `enterPhase` clears `enemyShots` (sim.ts:846), so `vel:[0,0,0]` is never consumed by the surface `advance()`.
4. [VERIFIED] Scope discipline — surface/turret fire untouched; the diff touches only space fire + its tests; `ENEMY_SHOT_SPEED` correctly retained for surface.
5. [VERIFIED] Test re-seats assertion-preserving + non-vacuous — diff-confirmed (shootable band, tie-strafe peak, position-homing).
6. [LOW] `7/8` inline in `homeShots` (sim.ts:919) rather than a named `HOMING_DECAY_PER_TICK` — the repo favours single-sourced magic numbers; documented inline and used once, so optional, not blocking. [preflight-noted / SIMPLE]
7. [LOW→non-blocking] `TICK_HZ = 30` arrival feel is a PROVISIONAL playtest item; sw4-1 reconcile flagged (Delivery Findings).

**Data flow traced:** a TIE fires (space) → `enemyShots.push({pos, vel:[0,0,0], ttl})` → each step `homeShots` decays `pos` toward the origin → either a player bolt intercepts it (`ENEMY_SHOT_HIT_RADIUS`, scores, no shield) or it reaches `COCKPIT_HIT_RADIUS` and costs exactly one shield (removed) → `render.ts` draws it from `pos`+`ttl`. Safe: bounded, deterministic, no unhandled state.
**Pattern observed:** `homeShots` mirrors the existing `advance` helper (sim.ts:891) — same signature/purity shape, phase-selected at the single call site (sim.ts:164). Consistent.
**Error handling:** pure sim — no failure paths; expired shots dropped explicitly; empty/at-origin/large-dt inputs all handled (Devil's Advocate).

**Handoff:** To SM for finish-story.

## Acceptance Criteria

Formalized by TEA (RED). Grounded in the original 1983 Atari source (`docs/tie-flight-ai-model.md` §6, ROM `sub_A849/A875`):

1. **Replace straight-line with homing decay.** A fireball spawned at the TIE position no longer travels straight at the player at constant 300 u/s. Instead, its **relative position toward the cockpit decays by 7/8 per simulation frame** — i.e. `rel_pos *= 7/8` — so it homes in on the cockpit asymptotically.
2. **Frame-rate independent.** The 7/8 decay is expressed as `pos *= pow(7/8, dt * TICK_HZ)` or equivalent, so a slower/faster frame rate produces the same arrival time in real seconds.
3. **64-tick lifetime.** The fireball despawns after exactly 64 simulation ticks (a ROM constant), guaranteeing arrival in ~1-2 seconds at typical game speed (ensuring the threat "ALWAYS arrives" — the current 300 u/s can reach only 1,800 units and provably misses from far spawns).
4. **Un-shot = shield hit.** If a fireball reaches the cockpit without being shot, it triggers the shield-damage event (gunnery defense failure).
5. **Shootable.** The fireball remains targetable by the player's bolts (no changes to hit-detection); shooting it down still scores points.
6. **No regression.** The `ENEMY_FIREBALL_SPEED` constant (if it existed as a fixed speed) is retired; existing fireball rendering, audio, and collision mechanics still work.

## Notes

- No Jira integration; story tracked locally via sprint YAML
- Branch strategy: gitflow (feat/sw4-2-homing-fireball off origin/develop in star-wars repo)
- Depends on: sw4-1 (world metric restoration)