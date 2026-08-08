---
story_id: "mc4-2"
jira_key: "mc4-2"
epic: "mc4"
workflow: "tdd"
---
# Story mc4-2: End-of-wave transition: city bonus + unused-missile bonus, regenerate cities, refill ammo, advance wave

## Story Details
- **ID:** mc4-2
- **Jira Key:** mc4-2
- **Workflow:** tdd
- **Stack Parent:** mc4-1 (feat/mc4-1-wave-model-icbm-ramp)
- **Repos:** arcade
- **Branch:** feat/mc4-2-end-of-wave-transition
- **PR:** https://github.com/slabgorb/arcade/pull/91

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-08T00:44:49Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-07T23:57:44Z | 2026-08-08T00:00:34Z | 2m 50s |
| red | 2026-08-08T00:00:34Z | 2026-08-08T00:16:51Z | 16m 17s |
| green | 2026-08-08T00:16:51Z | 2026-08-08T00:29:11Z | 12m 20s |
| review | 2026-08-08T00:29:11Z | 2026-08-08T00:37:34Z | 8m 23s |
| red | 2026-08-08T00:37:34Z | 2026-08-08T00:41:57Z | 4m 23s |
| green | 2026-08-08T00:41:57Z | 2026-08-08T00:42:47Z | 50s |
| review | 2026-08-08T00:42:47Z | 2026-08-08T00:44:49Z | 2m 2s |
| finish | 2026-08-08T00:44:49Z | - | - |

## Delivery Findings

<!-- Append findings below. Do not edit another agent's entries. -->

### TEA (test design)
- **Improvement** (non-blocking): the mc4-1 Reviewer folded a comment-cleanup into mc4-2 (mc4-1 session, review round 2). Three stale/miscited comments in `src/core/wave.ts`: lines 41 and 55 restate the RETIRED `1/period` velocity formula (the shipped code is `1/(period+1)`), and line 44's `INITIAL_WAVE` cite names `NEWWV1` where the wave-1 init is `NEGAM`. Code/claims/tests are correct — this is a truth-up only. Affects `plugins/missile-command/src/core/wave.ts` (Dev fixes the three comments during GREEN, since mc4-2 already edits this file). *Found by TEA during test design (carried from mc4-1 review).*
- **Question** (non-blocking): the regen `reserve` (city entitlement) that `regenerateCities` consumes is fed by mc4-3's bonus-city award (`CHEKBO`, claim MC-SCITYM). Until mc4-3 lands there is no reserve source, so mc4-4's stepGame wiring will pass a reserve of 0 (no free regeneration) — which is correct interim behaviour, not a bug. Affects `src/core/game.ts` (mc4-4 threads the reserve once mc4-3 supplies it). *Found by TEA during test design.*
- **Gap** (non-blocking, latent): mc4-1's deferred `#21` — `launchIcbm`'s degenerate-velocity guard (`velocity ?? 1` accepts 0/NaN) — is still open and belongs to mc4-4's spawner wiring, not mc4-2. Noted so it is not lost. Affects `src/core/icbm.ts:49`. *Found by TEA during test design (carried from mc4-1 review).*

### Dev (implementation)
- **Improvement** (non-blocking): the mc4-1 review's comment-fix note named the wave-1-init routine `NEGAM`; the actual label is `NEWGAM` (NEW GAME SETUP), which sets `WAVENO=1` via `LDA I,1 / STA WAVENO` at W3MAIN.MAC:3863 ("START WITH WAVE 1"). The truth-up cites `NEWGAM:3863` accordingly, not the typo. Affects `plugins/missile-command/src/core/wave.ts` (done this story). *Found by Dev during implementation.*
- No other upstream findings during implementation.

### Reviewer (code review)
- **Improvement** (non-blocking, deferred to mc4-4): when `regenerateCities` is wired into `stepGame`, draw the revived city from the seeded RNG (ROM `RANBIT`, W3MAIN.MAC:4831 "GET A RANDOM DEAD CITY") instead of lowest-index order, for regeneration-selection fidelity. Affects `src/core/game.ts` + `regenerateCities` signature (mc4-4). *Found by Reviewer during code review.*
- The two REJECT items (M5 cap-clause vacuous, M6 dead-only-selection unpinned) are testable rework, captured in the Reviewer Assessment verdict table — routed to TEA (red rework), not restated here.

## Design Deviations

### TEA (test design)
- **mc4-2 delivers PURE reducers only; no game.ts / GameState edit**
  - Spec source: sprint/epic-mc4.yaml (mc4-4 story), context-story-mc4-2.md AC1
  - Spec text: "advance to the next wave and re-seed its attack from the mc4-1 schedule"; mc4-4: "stepGame runs the wave-end resolution … GameState gains the wave number and multiplier"
  - Implementation: RED pins pure reducers (`waveEndBonus`, `isWaveOver`, `refillAmmo`, `regenerateCities`, `nextWaveBudget` in wave.ts; `nextWavePhase`, `resumePlay` + a `'between'` Phase member in state.ts). The stepGame composition and the `GameState.wave` field are left to mc4-4 — exactly as mc4-1 kept `stepIcbm` arity-1 and deferred spawner wiring.
  - Rationale: the epic explicitly splits the wiring into mc4-4; testing the composed reducer here would either duplicate mc4-4's scope or force a GameState change this story does not own. Dev MAY rename these functions but must preserve the observable contract and arity so mc4-4 can compose them.
  - Severity: minor
  - Forward impact: mc4-4 wires `isWaveOver`-gated resolution into stepGame, adds `GameState.wave`, and the HUD/playthrough; until then no in-game wave transition is visible (correct for mc4-2's scope).
- **Bonuses pinned at the BASE (1×) multiplier**
  - Spec source: sprint/epic-mc4.yaml (mc4-3 story), score.ts:8
  - Spec text: mc4-3 "the per-ICBM kill value scales by the wave multiplier, capped at MAXMUL"; score.ts "the ×-wave ramp is mc4"
  - Implementation: `waveEndBonus(1,0)===100` (4×ICBM_KILL_POINTS) and `waveEndBonus(0,1)===5` assert the wave-1 / 1× values. The score multiplier (`SMULTI`) that scales both ROM tallies (ICMUL2 uses ICBPT=25×mult; ABMADD loops SMULTI×5) is mc4-3, not asserted here.
  - Rationale: mc4-3 owns the multiplier; pinning a scaled value now would pre-empt it and redden mc4-3.
  - Severity: minor
  - Forward impact: mc4-3 applies the multiplier at the composition site; the base per-unit values (100, 5) remain the wave-1 truth.
- **`regenerateCities(cities, reserve, cap=NCITY)` takes an explicit `reserve`, not a full-board refill**
  - Spec source: context-story-mc4-2.md AC3; W3MAIN.MAC:4777 (REGEN); sprint/epic-mc4.yaml (mc4-3)
  - Spec text: AC3 "destroyed cities regenerate up to the cited cap"; mc4-3 "a bonus city is awarded … subject to the mc4-2 city cap"
  - Implementation: regen brings the living count UP TO `min(reserve, cap)` — faithful to REGEN (`X = min(PLIVES, NCITY) − alive`). It does NOT resurrect the whole board every wave. `reserve` is the mc4-3-fed entitlement; the cap is the existing MC-NCITY (=6).
  - Rationale: a free full board each wave contradicts the ROM and would make mc4-3's bonus-city award meaningless (mc4-3 explicitly defers to "the mc4-2 city cap"). So mc4-2 owns the cap + path and takes the entitlement as a parameter.
  - Severity: minor (a genuine design fork — flagged for the Reviewer)
  - Forward impact: mc4-4 threads a reserve into the reducer (0 until mc4-3 lands, per the Delivery Finding above); if the Reviewer prefers a different reserve model the fix is the signature + a few tests, not a redesign.

### Dev (implementation)
- **Modified a test file (`citations-source.test.ts`) during GREEN to register the two new instruction-site claims**
  - Spec source: tests/citations-source.test.ts (the `DERIVED` set + value-consistency blocks); mc4-1/mc8-2 precedent
  - Spec text: "every non-EQU claim carries a kind-tag string value, never a number" — a numeric-valued instruction claim MUST be in `DERIVED`
  - Implementation: added `CITYBON`/`ABMBON` to `DERIVED` and a new `it(...)` block proving each value decodes from its cited operand (CITYBON = LDX I,3 operand + 1; ABMBON = LDA I,5). Without this the two claims would either fail the kind-tag test (as non-EQU) or their values could not enter the un-cited-literal guard's `claimedValues`, leaving `4`/`5` in wave.ts un-coverable.
  - Rationale: the established claim-registration pattern (ICBPTS/`ADC I,25` in mc3, the wave tables in mc4-1, the sound bytes in mc8-2 all live in `DERIVED` with a consistency block). The edit STRENGTHENS the suite (adds a derivation proof); it does not weaken a test to pass.
  - Severity: minor
  - Forward impact: none — additive; mc4-3's multiplier work will not touch these entries.

### Reviewer (audit)
- **TEA: "mc4-2 delivers PURE reducers only; no game.ts / GameState edit"** → ✓ ACCEPTED by Reviewer: matches the epic's explicit mc4-2/mc4-4 split and the mc4-1 stepIcbm precedent; signatures are composable and arity-stable.
- **TEA: "Bonuses pinned at the BASE (1×) multiplier"** → ✓ ACCEPTED by Reviewer: the multiplier is mc4-3 by the epic; 100/city (4×25) and 5/missile are the correct wave-1 values, re-derived from ICMUL2/ABMADD.
- **TEA: "`regenerateCities(cities, reserve, cap=NCITY)` takes an explicit reserve"** → ✓ ACCEPTED by Reviewer (the design fork is sound and faithful to REGEN's `min(PLIVES,NCITY)−alive`) — BUT the reserve/cap/dead-only bounds are under-tested (see the REJECT's M5/M6); accepting the DESIGN, rejecting the test coverage of it.
- **Dev: "Modified citations-source.test.ts to register CITYBON/ABMBON in DERIVED + consistency block"** → ✓ ACCEPTED by Reviewer: the established claim-registration pattern (ICBPTS/mc4-1/mc8-2); the edit strengthens the suite, and M10 proved the new consistency block has teeth.
- **UNDOCUMENTED (Reviewer): regen victim SELECTION is lowest-index, not `RANBIT` random.** Spec/source: REGEN (W3MAIN.MAC:4831 `JSR RANBIT ;GET A RANDOM DEAD CITY`) picks a RANDOM dead city; the reducer revives lowest-index-first. TEA logged "deterministic" but did not log the selection-order deviation. Severity: LOW — not blocking for mc4-2 (RNG unthreaded, AC4 only requires determinism, regen not yet wired). Deferred to mc4-4 (thread the seeded RNG for RANBIT fidelity when regen enters stepGame).

## SM Assessment

Setup for mc4-2 (5pt, p1, tdd — the end-of-wave transition reducer). The phase
pointer read `setup` on arrival; routing to TEA for RED.

**Board / contention:** Clean. Sibling branch probe (`git branch -r | grep mc4-2`)
empty before setup; the only live sibling session is a-3's mc9-2 (unrelated). No open
PRs. Claim pushed: branch `feat/mc4-2-end-of-wave-transition` on origin +
`status: in_progress` stamp landed on the branch.

**Dependency:** mc4-1 is `status: done` — the wave model + per-wave ICBM ramp already
landed, so the wave-end/advance surface exists.

**Premise verified before setup (not assumed):**
- Named surfaces exist: `plugins/missile-command/src/core/wave.ts`,
  `plugins/missile-command/src/core/state.ts`.
- Both ROM citations sanity-checked against
  `plugins/missile-command/reference/source/W3MAIN.MAC` and land on their `.SBTTL`
  labels: `:4323` → CITY BONUS (routine `ENDWV3`), `:4765` → REGENERATE CITIES
  (routine `REGEN`). No stale-citation correction needed; ACs copied verbatim
  (four distinctive phrases confirmed epic↔context 1:1).

**For TEA (RED):** Author failing tests covering the four ACs — (1) wave ends only when
budget spent AND screen clear, phase steps through the between-wave beat back to play,
game-over wins if all cities dead; (2) city-bonus per survivor + unused-missile bonus
per remaining ABM (zero when neither); (3) cities regenerate up to the cited cap and
live bases refill ammo, but a base killed in play stays dead; (4) new bonus/regen
constants carry byte-exact claims, `citations.test.ts` + `purity.test.ts` stay green,
deterministic for a fixed seed.

**Citation-gate note for TEA/Dev:** the mc un-cited-literal scanner is LINE-based and
reads `//` comments, NOT `/** */` JSDoc — put new constant values behind `//` cites.
New `.BYTE`/constant tables need a DERIVED note plus a value-consistency block, or the
scanner reddens. Derive the actual bonus/regen point values and the city cap from the
cited routines; the citation is a pointer to pin, not a value to transcribe.

## TEA Assessment

**Phase (red).**
**Tests Required:** Yes
**Reason:** 5-point pure-logic reducer story with four behavioural ACs — TDD RED applies (not a chore bypass).

**Test Files:**
- `plugins/missile-command/tests/wave-transition.test.ts` — 30 tests across all four ACs: wave-end detection, the between-wave phase beat, the city + unused-missile bonus, city regeneration up to the cap, ammo refill (dead bases stay dead), and the schedule-reseeded wave advance.

**Tests Written:** 30 tests covering 4 ACs.
**Status:** RED (30 failing — every test throws its module-loader spec message because the reducers do not exist yet). `tsc --noEmit` green; 589 sibling missile-command tests still pass (35/36 files green — only the new RED file fails, as intended).

### Rule Coverage

| Rule (typescript.md) | Test(s) / practice | Status |
|---|---|---|
| "Every guard must be mutation-tested — delete the mechanism → red" (:142) | Exact-value guards: change the ×4 city factor, the 5/missile rate, the NCITY cap, the reserve bound, or the +1 wave step and the corresponding `toBe(...)` reddens. Verified all 30 fail now; each pins a distinct value. | covered |
| "A fixture whose value IS the expectation" — avoid (:208) | Bonus expectations are literals (100/5/600/150/215) cross-checked against real constants (`4 * ICBM_KILL_POINTS`, `NCITY`, `3 * MAXMIS`), not a value echoed back from the code under test. | covered |
| "A test helper that REIMPLEMENTS a platform algorithm is untested code" (:214) | Helpers (`killCities`, `aliveCount`, `allCitiesDead`) are trivial; `regenerateCities`/`waveEndBonus` are NOT re-derived in-test — assertions are on observable counts/values only. | covered |
| Real fixtures, not look-alikes (state.test.ts precedent) | All city/base fixtures come from `createCities()`/`createBases()` (mc3-1's `field.ts`), never hand-built objects. | covered |
| Determinism (AC4) | `regenerateCities(dead,4)` asserted equal across two calls; no clock/entropy referenced. | covered |
| No-uncited-literal / purity (AC4) | Auto-enforced by `citations-source.test.ts` + `purity.test.ts` on the new src/core code the moment it lands (mc4-1 wave-claims precedent); not re-asserted here. New literals `4` (W3MAIN.MAC:4423) and `5` (:5451) are Dev's GREEN claims; `6`/`10`/`25` reuse MC-NCITY/MC-MAXMIS/MC-ICBPTS. | Dev (GREEN) |

**Rules checked:** all applicable typescript.md heuristics have coverage or an explicit Dev/auto owner.
**Self-check:** every test has a meaningful `toBe`/`toEqual`; no `let _ =`, no `assert(true)`, no always-null assertions. One duplicate test authored and removed before commit.

**Handoff:** To Dev (Loki Silvertongue) for GREEN — implement the seven reducers + the `'between'` Phase member per the loader spec messages, file the two new byte-exact claims (4 @ W3MAIN.MAC:4423, 5 @ W3MAIN.MAC:5451), truth-up the three stale `wave.ts` comments (Delivery Finding), and leave the stepGame wiring to mc4-4.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/missile-command/src/core/state.ts` — `Phase` gains `'between'`; `nextWavePhase` + `resumePlay` (the wave-end phase beat, game-over wins).
- `plugins/missile-command/src/core/wave.ts` — `CITY_BONUS_ICBM_UNITS`(4), `MISSILE_BONUS_PTS`(5), `waveEndBonus`, `isWaveOver`, `refillAmmo`, `regenerateCities`, `nextWaveBudget`; + the three mc4-1 comment truth-ups.
- `plugins/missile-command/docs/rom-study/claims/wave.json` — new claims MC-CITYBON (4 @ W3MAIN.MAC:4423) and MC-ABMBON (5 @ W3MAIN.MAC:5451).
- `plugins/missile-command/tests/citations-source.test.ts` — registered CITYBON/ABMBON in `DERIVED` + a consistency block deriving each value from its cited instruction operand.

**Tests:** 620/620 missile-command passing (GREEN); the 30 mc4-2 tests all green. `tsc --noEmit` clean; orchestrator suite 408/408; byte-checker "all claims verified" (143).
**Branch:** feat/mc4-2-end-of-wave-transition (pushed, commit 02be4b9c)

**Kept minimal (minimalist discipline):** function names/arities match TEA's loader contract exactly — no extra abstraction, no stepGame/GameState edit (deferred to mc4-4 per the epic split), no multiplier (mc4-3). The one non-obvious value is the city bonus factor 4: the ROM's `LDX I,3` runs ICMUL2's `MIEND` (BPL) loop four times (X = 3,2,1,0), which is why the claim value is the operand + 1 — pinned by the new consistency block, not asserted by eye.

**Handoff:** To Reviewer (Heimdall) for code review.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | Skipped | disabled | Disabled via `workflow.reviewer_subagents` — ran mechanical checks (tests/lint/byte-checker) myself |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Disabled — covered by the mutation battery + boundary analysis (negative reserve, empty arrays, over-cap) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Disabled — no error paths in pure reducers; nothing swallowed |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | Disabled — replaced by a 10-mutant battery; 2 survivors found (M5, M6) |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | Disabled — verified the NEWGAM truth-up and cite accuracy myself |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Disabled — Phase union extension + signatures reviewed manually |
| 7 | reviewer-security | Yes | Skipped | disabled | Disabled — pure deterministic core, no I/O, no secrets, N/A |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Disabled — flagged the possibly-redundant cap clause (see M5) myself |
| 9 | reviewer-rule-checker | Yes | Skipped | disabled | Disabled — enumerated typescript.md checks in Rule Compliance below |

**All received:** Yes (all 9 disabled via settings; findings produced by a hands-on mutation battery)
**Total findings:** 2 confirmed (blocking rework), 0 dismissed, 1 deferred (mc4-4 fidelity note)

## Reviewer Assessment

**Verdict:** REJECTED

The implementation is CORRECT — I traced every reducer and re-derived the ROM values
(ICMUL2's `MIEND`/BPL loop = 4 adds for `LDX I,3`; ABMADD's `EQEND` loop = 5×SMULTI;
both confirmed against W3MAIN.MAC). tsc, the byte-checker (143 claims), and 620/620
tests are green. But a 10-mutant battery over the diff left **two survivors on
`regenerateCities`** — the tests do not actually guard two mechanisms, which is the
precise "green tests beside a silently-breakable mechanism" failure this fidelity epic
exists to prevent (and which mc4-1's review explicitly demanded exact guards against).

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | `[TEST]` The dead-only-selection guard `!c.alive` is UNPINNED. Every regen fixture kills the LOWEST city indices (0,1,2 / 1,3), so "revive first-N dead" and "revive first-N regardless" are indistinguishable — mutant M6 (drop `!c.alive`) passes all 30 tests. Verified: a high-index-dead fixture separates them (correct→6 alive, mutant→3). | `tests/wave-transition.test.ts` (AC3 regen group) ; mechanism at `src/core/wave.ts` regenerateCities | Add a test that kills HIGH indices — e.g. `regenerateCities(killCities(cities(),3,4,5), NCITY)` — and asserts aliveCount===6 AND indices 3,4,5 specifically became alive (dead-only selection, no live city touched). |
| [MEDIUM] | `[TEST]`/`[SIMPLE]` The `min(reserve, cap)` cap clause is untested/vacuous: the fixed 6-city array already bounds the count, so no test exercises the cap as the binding constraint — mutant M5 (drop the cap) passes. | `tests/wave-transition.test.ts` (AC3 "never exceeds the NCITY cap") | Add an explicit-cap test where the cap is the binding constraint, e.g. `regenerateCities(allCitiesDead(), 100, 4)` ⇒ aliveCount===4. (If the team deems the cap redundant given the fixed array, simplify it out instead — but AC3's "up to the cited cap" argues for keeping + testing it.) |

### Observations (mutation battery + manual)
- [VERIFIED] Bonus values pinned exactly — evidence: mutants M1 (`CITY_BONUS_ICBM_UNITS 4→3`) and M2 (`MISSILE_BONUS_PTS 5→6`) each reddened 3 tests. Complies with typescript.md:142 (delete-the-mechanism→red).
- [VERIFIED] `isWaveOver` conjunction pinned — evidence: M3 (`&&`→`||`) reddened 2 tests; the AND of budget-spent and screen-clear is guarded.
- [VERIFIED] `refillAmmo` dead-base guard pinned — evidence: M4 (drop `b.alive ?`) reddened the "dead ≠ rearmed" test.
- [VERIFIED] Wave advance +1 pinned — evidence: M7 (`wave+1`→`wave`) reddened 3 tests (exact 15/12 anchors).
- [VERIFIED] Phase machine pinned — evidence: M8 (swap `between`/`over`) reddened 3, M9 (`resumePlay` no-op) reddened 1; game-over-wins-at-wave-end holds.
- [VERIFIED] Citation consistency block has teeth — evidence: M10 (claim `CITYBON` value 4→5) reddened the new mc4-2 consistency test; the DERIVED registration is not a free pass.
- [VERIFIED] Purity + no-uncited-literal — evidence: byte-checker "all claims verified" (143); un-cited-literal guard green (the `3863` JSDoc leak was caught in GREEN and moved to a stripped `//` line — good discipline).
- [HIGH][TEST] regen dead-only selection unpinned (M6) — see table.
- [MEDIUM][TEST][SIMPLE] regen cap clause vacuous (M5) — see table.
- [LOW] Deferred fidelity note (not blocking): the ROM's REGEN picks a RANDOM dead city (`RANBIT`); this reducer revives lowest-index-first. Correct and deterministic for mc4-2 (RNG isn't threaded, AC4 wants determinism), but when mc4-4 wires regen it should draw the victim from the seeded RNG for `RANBIT` fidelity.

### Rule Compliance (typescript.md)
- **:142 every guard mutation-tested** — 8/10 mutants caught; 2 survivors are the REJECT basis. Not compliant until M5/M6 closed.
- **:208 fixture whose value IS the expectation** — this is exactly M5: the array length (not the cap) is the expectation. Confirmed violation.
- **:214 helper reimplements algorithm** — compliant; test helpers (`killCities`,`aliveCount`) are trivial, regen is not re-derived.
- **purity / no-uncited-literal (epic AC3)** — compliant; byte-checker + guard green.
- **Determinism (AC4)** — compliant; `regenerateCities` and `waveEndBonus` are pure, no clock/entropy.

### Tags coverage
[EDGE] boundary cases (negative reserve → Math.max(0,…) safe; empty arrays) reviewed — no finding. [SILENT] no swallowed errors in pure reducers — none. [TEST] M5/M6 survivors — CONFIRMED (blocking). [DOC] NEWGAM truth-up verified accurate (NEGAM was a typo; :3863 "START WITH WAVE 1") — clean. [TYPE] Phase union extension safe (nextPhase never returns 'between'; existing `['play','over']` assertions hold) — clean. [SEC] pure core, no I/O — N/A. [SIMPLE] the cap clause may be redundant with the fixed array (folded into M5). [RULE] typescript.md:142/:208 — violated by M5/M6.

### Devil's Advocate
Assume this code is broken. The most dangerous property here is that it is a set of
PURE reducers with no consumer yet — nothing in `stepGame` calls them, so every
guarantee rests entirely on the unit tests, and a unit test that cannot tell right from
wrong is worse than no test because it radiates false confidence. The mutation battery
proved that fear concrete: `regenerateCities` is the story's most intricate reducer
(three interacting bounds — reserve, cap, dead-only) and TWO of those bounds are
unguarded. A future maintainer wiring regen in mc4-4, or adding the mc4-3 bonus-city
reserve, could drop the `!c.alive` guard while refactoring and ship a game that
resurrects the WRONG cities (or culls live ones on a permissive edit) with a fully green
suite — precisely the mc4-1 failure mode (byte-correct citation beside wrong on-screen
behaviour) the epic was chartered to kill. A confused player would see a destroyed city
stay rubble while an intact one "regenerates" onto itself. What about malicious/degenerate
input? Negative reserve is safely clamped by `Math.max(0,…)`; a `cap` above the array
length is harmless because the map can only flip existing dead entries; `reserve` far
above 6 is bounded by the array — all fine. The bonus math has no overflow risk at these
magnitudes and zero-input returns zero. The phase machine correctly makes game-over win
at wave-end and keeps `'over'` terminal. So the CODE survives adversarial scrutiny; the
TESTS do not. On any other story I might weigh proportionality and track these as
follow-ups, but this epic's stated contract is that every mechanism is pinned against
silent drift, and a surviving mutant is the operational definition of an unpinned
mechanism. The fix is two small fixtures. Reject, tighten, re-verify.

**Handoff:** Back to TEA (red rework) — the fixes are testable (add two distinguishing fixtures), so the mechanism, not just the code, gets pinned.
## TEA Assessment (rework round 1)

**Phase (red rework).** Responding to Heimdall's review: two surviving mutants (M5, M6) on `regenerateCities`.

**Nature of this rework:** the CODE was correct — the review found TEST-teeth gaps, not logic bugs. So the two added tests PASS on the current (correct) code; their "RED" is against the mutants the reviewer found, not against the shipped code. This is the proper end state of a mutation-driven hardening: green on correct code, red on the defect. There is therefore no failing test in the suite (the code has no defect to expose).

**Tests added (`tests/wave-transition.test.ts`, AC3 regen group):**
- `revives only DEAD cities — a top-half-dead board…` — kills M6 (drop `!c.alive`): verified reddens the mutant, passes on correct code.
- `an explicit cap below the dead count is the binding limit…` — kills M5 (drop `min(reserve,cap)`): verified reddens the mutant, passes on correct code.

**Verification:** 32/32 wave-transition tests green; re-ran both mutants post-fix — each now reddens exactly one test. Full missile-command suite green.

### Rule Coverage (rework)
| Rule | Test | Status |
|------|------|--------|
| typescript.md:142 mutation-tested guards | M5/M6 killers added — battery now 10/10 caught | closed |
| typescript.md:208 fixture-is-the-expectation | explicit-cap test removes the array-length-masks-cap vacuity | closed |

**Handoff:** To Dev (Loki) for GREEN confirmation — no implementation needed (code already satisfies the new tests); Dev confirms the suite is green and hands to Reviewer.
## Dev Assessment (rework round 1)

**Implementation Complete:** Yes — NO code change required.
**Reason:** Review round 1 rejected on test-teeth (M5/M6), not a logic bug. TEA added two discriminating fixtures that PASS on the existing correct code. Dev's role here is confirmation only.

**Verified:** 622/622 missile-command tests green (was 620 + 2 rework tests); `tsc --noEmit` clean; branch pushed (f7208726).
**Branch:** feat/mc4-2-end-of-wave-transition (pushed)

**Handoff:** To Reviewer (Heimdall) for re-review of round 1.
## Subagent Results

_(Round 2 re-review — subagent config unchanged; all 9 still disabled via `workflow.reviewer_subagents`. Evidence this round is a re-run of the full 10-mutant battery.)_

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | Skipped | disabled | Ran suite/tsc/byte-checker myself — all green |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Boundary re-check via battery |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Pure reducers, N/A |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | Battery re-run: 10/10 mutants now caught (M5/M6 closed) |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | Rework is test-only; comments unchanged |
| 6 | reviewer-type-design | Yes | Skipped | disabled | No type change this round |
| 7 | reviewer-security | Yes | Skipped | disabled | N/A |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Cap clause now justified by an explicit-cap test (kept, not dead) |
| 9 | reviewer-rule-checker | Yes | Skipped | disabled | typescript.md:142/:208 now satisfied |

**All received:** Yes (round 2; all disabled, battery re-run as evidence)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred (round-1 M5/M6 verified CLOSED)

## Reviewer Assessment (round 2)

**Verdict:** APPROVED

Round 1's two surviving mutants are CLOSED. I re-ran the full 10-mutant battery over
the updated suite: every mutant now reddens at least one test — M5 (drop `min(reserve,cap)`)
→ 1 fail, M6 (drop `!c.alive`) → 1 fail, plus M11 (drop the reserve decrement) → 2 fail
confirming the reserve bound stays pinned. The round-2 diff is exactly the 24-line test
addition (`git diff 02be4b9c..HEAD --stat`): no code change, no scope creep, no new
literal, no new deviation. tsc clean; byte-checker 143 verified; 622/622 tests green.

**Data flow traced:** `regenerateCities(cities, reserve, cap)` → cities[] — now proven
to (a) revive only dead entries at their own indices (top-half-dead fixture), (b) honour
an explicit cap as the binding limit, (c) stay bounded by reserve; pure and deterministic.
**Pattern observed:** mutation-driven test hardening — the correct end state (green on
correct code, red on the injected defect) at `tests/wave-transition.test.ts:273-296`.
**Error handling:** negative/oversized reserve safely clamped (`Math.max(0,…)`, array bound).

### Observations
- [VERIFIED] M6 closed — evidence: `wave-transition.test.ts` "revives only DEAD cities…" asserts out[3],[4],[5].alive after killing the top half; drop-`!c.alive` mutant reddens it.
- [VERIFIED] M5 closed — evidence: "an explicit cap below the dead count…" asserts aliveCount===4 for cap 4; drop-cap mutant reddens it. The cap clause is now demonstrably load-bearing, not dead code.
- [VERIFIED] No regression — evidence: battery M1–M4, M7–M9 still caught; control 622/622 green.
- [VERIFIED] Rework introduced no code/scope change — evidence: `git diff 02be4b9c..HEAD` is +24 lines in one test file.
- [VERIFIED] New tests non-vacuous — each has a concrete `toBe`, passes on correct code, reddens its mutant.

### Tags coverage
[EDGE] boundary re-checked, clean. [SILENT] N/A pure. [TEST] M5/M6 CLOSED, battery 10/10. [DOC] unchanged. [TYPE] unchanged. [SEC] N/A. [SIMPLE] cap now justified by a test (keep). [RULE] typescript.md:142/:208 satisfied.

### Devil's Advocate (round 2)
Could the rework itself be broken or performative? The risk in a test-only rework is a
vacuous or tautological test that appears to close the gap without teeth. I guarded against
that by RE-RUNNING the mutants the tests claim to kill: both reddened, so the tests
discriminate correct from broken behaviour rather than merely asserting a value the code
happens to produce. Could the fix have masked a real defect by weakening something? No — the
diff is purely additive (+24 lines, one file), no existing test or source line changed, and
the full battery plus the 622-test control confirm nothing else moved. Could the cap still be
dead code I waved through? The explicit-cap test now forces `min(reserve,cap)` to bind
(cap 4 < 6 dead), so removing it fails — it is exercised, not ornamental. The one honest
residue is the deferred RANBIT selection-fidelity note (lowest-index vs random dead city),
which remains correctly scoped to mc4-4 (the RNG is not in this reducer's signature and AC4
asks only for determinism). Nothing here blocks. Approve.

### Deviation Audit (round 2)
No new deviations introduced by the rework. The round-1 audit stands: all four logged
deviations ACCEPTED, plus the UNDOCUMENTED RANBIT-selection note deferred to mc4-4.

**Handoff:** To SM (Baldur) for finish-story.
## Impact Summary (compiled at finish)

**Final verdict: APPROVED (round 2). Blocking count: 0.** PR #91 merged into develop (merge commit 2a2932d3, verified MERGED). Integrated-tree green: byte-checker 171 claims, tsc clean, 710 mc tests, orchestrator 408.

**Two-round history (final state):** Round 1 REJECTED on two SURVIVING MUTANTS in `regenerateCities` — M5 (cap clause vacuously tested) and M6 (dead-only-selection guard unpinned). These were TEST-teeth gaps, NOT logic bugs (code correct throughout). Round 2 APPROVED: both closed by two discriminating tests (+24 lines, no code change); the 10-mutant battery is now 10/10 caught. Round 1's rejection text is CLOSED and must not be read as blocking.

**Non-blocking / deferred (correct interim state):**
- mc4-3 threads the regen `reserve` entitlement (bonus-city award); until then a reserve of 0 is correct.
- mc4-4 wires the reducers into `stepGame` (+ `GameState.wave`, HUD, playthrough) and should draw the regen victim from the seeded RNG for `RANBIT` fidelity (currently lowest-index, deterministic — fine for mc4-2).
- mc4-1's `#21` degenerate-velocity guard remains mc4-4 scope.

**Deviations:** all four ACCEPTED (pure-reducers-only; base multiplier; explicit-reserve regen; DERIVED claim registration). ACs 1–4 all verified via the suite + mutation battery.
