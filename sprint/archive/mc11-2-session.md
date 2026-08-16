---
story_id: "mc11-2"
jira_key: "mc11-2"
epic: "mc11"
workflow: "tdd"
---
# Story mc11-2: Emit the bonus count-up cue

## Story Details
- **ID:** mc11-2
- **Jira Key:** mc11-2
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Repos:** arcade
**Branch:** feat/mc11-2-emit-bonus-count-up-cue
**PR:** https://github.com/slabgorb/arcade/pull/465
**Phase:** finish
**Phase Started:** 2026-08-16T15:55:52Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T15:23:02Z | 2026-08-16T15:25:21Z | 2m 19s |
| red | 2026-08-16T15:25:21Z | 2026-08-16T15:32:45Z | 7m 24s |
| green | 2026-08-16T15:32:45Z | 2026-08-16T15:35:15Z | 2m 30s |
| review | 2026-08-16T15:35:15Z | 2026-08-16T15:44:30Z | 9m 15s |
| red | 2026-08-16T15:44:30Z | 2026-08-16T15:48:35Z | 4m 5s |
| green | 2026-08-16T15:48:35Z | 2026-08-16T15:49:20Z | 45s |
| review | 2026-08-16T15:49:20Z | 2026-08-16T15:55:52Z | 6m 32s |
| finish | 2026-08-16T15:55:52Z | - | - |

## Sm Assessment

**Story:** mc11-2 (5pt, missile-command, tdd/phased). Description and acceptance_criteria are both null — the TITLE is the spec; ACs were derived by sm-setup into the context file.

**Premise verified against the current tree before setup (all TRUE, cites drift 1-2 lines, substance exact):**
- `plugins/missile-command/src/core/game.ts` — the `between` branch (401-419) pays the end-of-wave bonus as the lump `waveEndBonus(survivingCities, unusedMissiles)` with `soundEvents: []`; no per-unit cue.
- `plugins/missile-command/src/core/sound-events.ts` — `BonusTickEvent` exists and carries the note "(Emitter is a filed follow-up; the map is wired.)" — the note this story strikes.
- `plugins/missile-command/src/shell/audio-dispatch.ts:51` — `case 'bonusTick': audio.play('bonus-tick')` already dispatches TK/SUNABM. The audio map is fully wired; only the CORE emitter is missing.

**Scope:** in the `between` branch, emit N `{type:'bonusTick'}` events into `soundEvents` (one per bonus UNIT tallied), assert event count === units paid, and strike the follow-up note.

**Key open design question flagged for TEA/Dev (in context):** `waveEndBonus` returns a POINT total, not a unit count — the "one event per bonus unit tallied" points-per-unit mapping must be pinned to ROM accounting (W3SOUN / SUNABM count-up loop), not invented.

**Board:** clean at setup — no sibling branch, no sibling session (a-2=jt12-1, a-3=pm5-4). Claim pushed on `feat/mc11-2-emit-bonus-count-up-cue`, status stamped `in_progress`. Handing to TEA for RED.

## Tea Assessment

The phase pointer read `red` on arrival → handing to Dev for green. RED verified: 14 fail / 3 pass in `plugins/missile-command/tests/mc11-2-bonus-tick-emit.test.ts`; the rest of the missile-command project stays green (1360 passed). `npm run lint` clean.

### The load-bearing ROM derivation (this is the story's flagged question — RESOLVED)
`waveEndBonus()` returns a POINT total, but the count-up TICK count is a **unit census**:
- **ENDWV2** (W3MAIN.MAC:4277): one `SUNABM` per **unused ABM** (SBC 1 / ERAABM / ABMADD / draw / SNDON).
- **ENDWV4** (W3MAIN.MAC:4463): `MISIND` = surviving-city count; one `SUNABM` per **surviving city** (erase / ICMUL2 / draw / SNDON / DEC MISIND).

⇒ **N == survivingCities + unusedMissiles**, and the wave multiplier (SMULTI) scales the POINTS added per tick (ABMADD/ICMUL2), **never the number of ticks**. Dev must NOT derive the count from the point total. `survivingCities = cities.filter(alive).length`, `unusedMissiles = Σ ammo over live bases` — exactly the two locals already computed in the game.ts `between` branch (lines 402-403).

### Where the emitter goes
The `between` branch in `plugins/missile-command/src/core/game.ts` (401-419) currently returns `soundEvents: []`. Emit `Array(survivingCities + unusedMissiles).fill({type:'bonusTick'})` (or equivalent) there. The kind (`sound-events.ts BonusTickEvent`) and the shell map (`audio-dispatch.ts:51 → play('bonus-tick')`) already exist end-to-end — only this emitter is missing. Also strike the "(Emitter is a filed follow-up; the map is wired.)" note in sound-events.ts (AC3).

In-sim invariant honoured by every fixture: a real `between` state always has ≥1 surviving city (`nextWavePhase` returns `over` when all cities are dead).

### Rule Coverage
- **Core purity:** the emitter is pure per-frame DATA (`readonly SoundEvent[]`), no callbacks — mirrors the mc8-2 channel. Tests read the returned array only; determinism pinned (same seed → identical stream).
- **No vacuous assertions:** the shape test now asserts `ticks.length > 0` before iterating (hardened after first RED run — it passed vacuously while silent).
- **Anti-naive guards (the real value):** 1 saved city ⇒ exactly **1** tick while score rises **100** (kills a per-point emitter); +1 unused ABM ⇒ +5 score but +1 tick; tick count identical at wave 1 vs wave 10 (kills any points-derived count).
- **Decomposition:** cities-only and missiles-delta fixtures prove BOTH count-up loops are wired, not just one.
- **One-shot:** the frame after the resolve (now `play`) emits no `bonusTick` (channel rebuilt each step).
- **Removal guard with a control:** `/filed follow-?up/i` must be absent AND `interface BonusTickEvent` / `'bonusTick'` must remain (guards the note removal from over-reaching into the type).

### TEA rework (review round 1 → red)

Heimdall's two confirmed findings are closed with mutation-proven guards in `mc11-2-bonus-tick-emit.test.ts` (commit 991b64aa):
- **Dead-base exclusion (was [HIGH]):** a `between` state with 2 live cities, two live bases at 10 ABMs, and one DESTROYED base still holding 7 → ticks === 22 (only the 20 LIVE ABMs count), `.not.toBe(29)`. Differential-probed: dropping game.ts:403's `b.alive ?` guard now FAILS this test (was 17/17 green before).
- **N=0 floor (was [MEDIUM]):** `betweenState(0,0)` → exactly 0 ticks. Differential-probed: flooring the length at `Math.max(N,1)` now FAILS this test.
- **LOW notes strengthened:** the multiplier test now observes `scoreMultiplier(10) > scoreMultiplier(1)` (equal ticks is a real non-dependence, not a wave that never mattered); the seed test now uses two DIFFERENT seeds (seed-independence is observed, not tautological).

**These tests PASS on arrival — the production code was already correct; the reject was coverage-only.** So there is no code for Dev to change: this is a green-confirmation pass (verify 19/19, project 1376/1376) en route to Reviewer round 2. No production file touched in the rework.

## Dev Assessment

The phase pointer read `green` on arrival. GREEN: 17/17 in `mc11-2-bonus-tick-emit.test.ts`, 1374/1374 across missile-command, orchestrator 505/505, `npm run lint` clean.

**Change (minimal, 4 files, +19/−9):**
- `src/core/game.ts` — the `between` branch's `soundEvents: []` becomes `Array.from({ length: survivingCities + unusedMissiles }, () => ({ type: 'bonusTick' }) as const)`. Uses the two locals the branch already computes (402-403) and the existing `Array.from(...) as const` idiom (see the destruction-cue emitter at 602-605). ROM cites (W3MAIN.MAC:4463/4277) live in `//` comments, so the citations scanner strips them (no un-cited-literal leak).
- `src/core/sound-events.ts` — struck the "(Emitter is a filed follow-up; the map is wired.)" note; the `BonusTickEvent` type is untouched.
- `tests/sound-events.test.ts` + `tests/audio-dispatch.test.ts` — refreshed the two scope comments that called `bonusTick` unwired (TEA's flagged Gap; a false comment would ship green). Kept the still-true parts (the mc8-3 cruise/Sputnik drone remains a filed follow-up).

**No design deviation.** Implemented exactly to TEA's ROM derivation (tick count = unit census, decoupled from points and multiplier). No scope creep: the `between` branch still calls `waveEndBonus(...)` two-arg (base-rate points) — that is a separate pre-existing question, out of scope for mc11-2, and untouched.

### Dev rework (green confirmation, round 1)

Coverage-only reject: TEA's two guards pass on the already-correct code, so there is **no production change** — verified `git diff b6e385ff HEAD -- src/core/` is empty. 19/19 in the story file, 1376/1376 across missile-command, `npm run lint` clean. Routing to Reviewer for round 2; the two round-1 findings ([HIGH] dead-base exclusion, [MEDIUM] N=0 floor) are now pinned by mutation-proven tests.

## Subagent Results — Round 1 (superseded by Round 2 below)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (1879 pass / 0 fail, 0 smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 2, dismissed 0, deferred 2 (low-conf notes) |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A (all ROM cites verified vs W3MAIN.MAC) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A (33 rules / 47 instances / 0 violations) |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 2 confirmed (both [TEST], mutation-proven), 0 dismissed, 2 deferred (low-confidence naming notes)

## Reviewer Assessment — Round 1 (REJECTED, superseded by Round 2 below)

**Verdict:** REJECTED

The implementation is **correct** and the diff is clean on every other axis — but this story's one acceptance criterion is *"assert the event count matches the units paid,"* and two mutation-proven gaps show the acceptance suite does not fully pin that count. An AC that a surviving mutant can violate is not genuinely met.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | The `b.alive ?` ammo guard (`game.ts:403`) is untested: every fixture sets all bases `alive:true`, so a destroyed base's leftover ABMs are never excluded from the count. **Proven:** mutating the guard to `n + b.ammo` (count dead bases too) passes 17/17. A base destroyed mid-wave with loaded ABMs is a real `between` state — the ROM's ENDWV2 census would exclude it. | `tests/mc11-2-bonus-tick-emit.test.ts` (fixture gap; `betweenState` always `alive:true`) | Add a fixture with one base `alive:false, ammo>0`; assert ticks = survivingCities + Σ(alive bases' ammo), excluding the dead base's ammo. |
| [MEDIUM] | The `N=0` lower boundary is unpinned: smallest tested count is 1, so an `Array.from({length: Math.max(N,1)})` floor is invisible. **Proven:** flooring the length at 1 passes 17/17. `betweenState(0,0)` is directly constructible (it bypasses `nextWavePhase`). | `tests/mc11-2-bonus-tick-emit.test.ts:95` (no zero-count case) | Add `betweenState(0,0)` (or otherwise N=0); assert `bonusTicks(...).length === 0`. |

**Data flow traced:** `state.cities`/`state.bases` (incoming wave-end state) → `survivingCities`/`unusedMissiles` (game.ts:402-403) → `Array.from({length: survivingCities + unusedMissiles})` → `soundEvents` → audio-dispatch `play('bonus-tick')`. Safe and single-path: `[RULE]` (TS-14) confirmed `'between'` resolves at exactly one site (game.ts:401), so the tick-count and the `waveEndBonus` score credit cannot drift.

### Observations (mixed severity)
- `[VERIFIED]` The emitter is faithful to the ROM: N = survivingCities + unusedMissiles (ENDWV4 per-city SUNABM W3MAIN.MAC:4463 + ENDWV2 per-ABM SUNABM :4277), independent of SMULTI — evidence: game.ts:424-427 reads neither `wave` nor `multiplier`; comment-analyzer verified the cites against W3MAIN.MAC directly.
- `[VERIFIED]` 0-city case cannot reach the emitter in real play — `nextWavePhase` (state.ts:42) returns `'over'` when all cities dead; the only in-sim `between` entry (game.ts:634) therefore guarantees ≥1 city. (The test gap above is about the *unit-level* floor, constructible only by bypassing that path — still worth pinning.)
- `[VERIFIED]` `as const` is necessary and house-consistent — game.ts:426 mirrors the sibling emitters at game.ts:612-614; without it `type` widens to `string` and fails the `SoundEvent` union.
- `[TEST]` (confirmed, HIGH) dead-base ammo gap — see severity table.
- `[TEST]` (confirmed, MEDIUM) N=0 boundary gap — see severity table.
- `[TEST]` (deferred, LOW) the multiplier-independence test passes by construction (the emitter never reads `wave`); acceptable as a forward regression guard, but consider observing `scoreMultiplier`/a `>1` multiplier so the non-dependency is an observed fact. Optional.
- `[TEST]` (deferred, LOW) the "seed-deterministic" test uses the *same* seed twice (the emitter never reads `rng`), so it pins repeat-call idempotence, not seed-independence; rename or run two *different* seeds. Optional.
- `[DOC]` clean — comment-analyzer verified every ROM citation and confirmed no stale "unwired/filed follow-up" claim survives anywhere in the tree.
- `[RULE]` clean — 33 rules / 47 instances / 0 violations; citations in `//` comments (31/31 citation tests pass), core purity intact, `expectedTicks` independently derived (not a copy of the production formula).
- `[EDGE]` / `[SILENT]` / `[TYPE]` / `[SEC]` / `[SIMPLE]` — specialists disabled via `workflow.reviewer_subagents`; assessed the domains myself: no boundary/error/type/security/complexity issues in a 36-element pure-arithmetic emitter with no external input, no try/catch, no new types, no branching.

### Rule Compliance
- **Core/shell purity (CLAUDE.md):** COMPLIANT — the emitted `soundEvents` is pure `readonly SoundEvent[]` built from in-state data; no DOM/clock/RNG/callback (grep clean; `purity.test.ts` green).
- **Citations gate (ROM cites in `//`, not JSDoc):** COMPLIANT — both W3MAIN.MAC:4463/4277 cites are in `//` comments; 31/31 citation tests pass.
- **TS lang-review checklist:** COMPLIANT — no `as any`/`@ts-ignore`/non-null assertions; `readonly` preserved; `as const` correct; no enum/async/null-handling concerns introduced.
- **Test-quality (every test asserts meaningfully):** the shipped assertions are non-vacuous, but the suite is INCOMPLETE against the AC (the two gaps above) — that is the reject basis.

### Devil's Advocate
Argue this is broken. First, the count derivation is a *census*, and a census is only as trustworthy as its exclusion rules — the one exclusion the code performs (`b.alive ?`, skipping a dead base's ammo) is precisely the one no test exercises. A future refactor "simplifying" `state.bases.reduce((n,b) => b.alive ? n + b.ammo : n, 0)` to a plain sum would sail through all 17 green tests and silently over-fire the bonus cue for every game where a base died mid-wave holding ABMs — a common late-wave state, not an exotic one. That is a real acoustic regression hiding behind a green suite, on the exact line the story exists to get right. Second, the lower boundary: the emitter's length is `Array.from({length: N})`, and nothing proves N can be 0 — every test floor is 1, so an off-by-one or a defensive `Math.max(N,1)` (the kind of "never emit an empty count-up" instinct a later maintainer might add) is undetectable; the audio shell would then play a spurious lone tick on a zero-bonus resolve. Third, a confused maintainer reading only the passing tests would reasonably conclude "the count is fully specified" and build on that false confidence. The multiplier and seed guards, while harmless, *overstate* what they prove — they read as strong coupling checks but are satisfied by the code simply never touching `wave` or `rng`, so they cannot alert on a regression that *starts* reading those. None of this makes today's code wrong — it makes the acceptance net porous on its central claim. For a 5-point story whose title is "assert the event count matches the units paid," two mutation-proven survivors on that count are worth one cheap round to close.

**Handoff:** Back to TEA (red) — add the two fixtures (dead-base-ammo exclusion; N=0 → 0 ticks). The two LOW notes are optional polish TEA may fold in while there. The production code needs no change.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (1376 project + 505 orchestrator green, lint clean, 0 smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | clean | none | N/A (both r1 findings independently re-mutated & confirmed closed; no new vacuous/coupled assertions) |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A (every new comment verified — 22/29 arithmetic, scoreMultiplier 5>1, N=0) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A (30 checks / 27 instances / 0 violations; praised the independent-literal 22) |

**All received:** Yes (4 enabled returned clean, 5 disabled pre-filled)
**Total findings:** 0 new. Round 1's 2 confirmed findings are CLOSED and independently re-verified (mutation-probed by both the Reviewer and test-analyzer).

## Reviewer Assessment

**Verdict:** APPROVED

Round 2. The round-2 delta is **test-only** (`git diff b6e385ff...HEAD` = +50/−4 in `mc11-2-bonus-tick-emit.test.ts`; production `src/core/` byte-identical to the round-1-approved code on every axis but the two coverage gaps). Both round-1 findings are closed with mutation-proven guards, independently confirmed.

**Both round-1 findings — CLOSED (re-verified by me, not just claimed):**
- `[TEST]` (was HIGH) dead-base exclusion — mutating game.ts:403 to drop the `b.alive` guard now FAILS the new test (`expected 29 to be 22`). The fidelity-bearing guard is pinned.
- `[TEST]` (was MEDIUM) N=0 census floor — flooring the emitted length at `Math.max(N,1)` now FAILS the new test (`expected 1 to be 0`). The lower boundary is pinned.
- The two round-1 LOW notes were strengthened, not merely acknowledged: the multiplier test now observes `scoreMultiplier(10)=5 > scoreMultiplier(1)=1` (equal ticks is a real non-dependence), and the seed test uses two DIFFERENT seeds (1 vs 999) with an explicit length pin (25) — closing the "two empty arrays are trivially equal" loophole.

**Data flow traced:** unchanged from round-1's APPROVED-on-code trace — `state.cities`/`state.bases` → `survivingCities`/`unusedMissiles` (game.ts:402-403) → `Array.from({length: N})` → `soundEvents` → `play('bonus-tick')`; single-path `between` resolve, no drift with the score credit.

### Observations
- `[VERIFIED]` Both mutants I raised in round 1 are now caught — evidence: re-ran each mutation this round; each fails exactly one new test and nothing else. The suite went from 17→19 tests; the two additions are the two guards.
- `[VERIFIED]` No production change in the rework — `git diff b6e385ff HEAD -- plugins/missile-command/src/core/ plugins/missile-command/src/shell/` is empty; the fix was coverage, as diagnosed.
- `[TEST]` clean (round 2) — test-analyzer independently re-mutated both cases and confirmed closure; no new vacuous/coupled assertion.
- `[DOC]` clean (round 2) — comment-analyzer verified every new comment (dead-base 22/29, N=0 construction, `scoreMultiplier` 5>1, two-seed rationale).
- `[RULE]` clean (round 2) — rule-checker ran 30 checks / 0 violations and specifically confirmed the dead-base expectation `22` is an independent literal, NOT the `expectedTicks` helper (which would give the wrong 29 for a fixture with a dead base) — the exact TS-18/TS-26 anti-pattern, correctly avoided.
- `[EDGE]`/`[SILENT]`/`[TYPE]`/`[SEC]`/`[SIMPLE]` — disabled via settings; assessed myself: a test-only delta of exact-count assertions over a 36-element pure emitter surfaces no boundary/error/type/security/complexity concern.

### Rule Compliance
- **Core purity:** unchanged and intact — no production code touched; `purity.test.ts` green.
- **Citations gate:** no new ROM citation added by the rework; the existing `//`-comment cites remain (31/31 citation tests pass).
- **TS lang-review:** the one new import (`scoreMultiplier` from `../src/core/score.js`) is a correctly-typed value import with `.js` extension from `src/`, actually called; no `as any`/non-null assertions introduced.
- **Test-quality:** the suite now fully pins the story's central claim ("count matches units paid") — the two mutation-proven gaps that blocked round 1 are closed. AC genuinely met.

### Devil's Advocate
Try to break round 2. First, could the dead-base test pass for the wrong reason? Its expected value `22` is a bare literal, so a fixture typo (say, ammo 10→11 on a live base) would silently shift the true count and the literal would be stale — but the mutation probe defends against exactly this: dropping the guard flips the result to 29 and the test fails, which can only happen if the fixture really has a dead base carrying ammo and the guard really excludes it, so the wiring is genuinely exercised. Second, does `betweenState(0,0)` construct a legitimate state, or an impossible one whose "0 ticks" is meaningless? It bypasses `nextWavePhase` (which the comment discloses), so it is not reachable in real play — but the emitter is a total function over N≥0 and the test pins its floor, which is the correct scope for a unit-level guard; the invariant that real play never reaches it is separately VERIFIED and unaffected. Third, could the strengthened seed test still be tautological? No — seeds 1 and 999 produce different `rng` states, and the branch provably never reads `rng`, so identical streams is now an observed property across genuinely different inputs, plus the length pin (25) forecloses the empty-array-equality escape. Fourth, is approving a REJECT-then-fix on a test-only change too lenient? The production code was correct from round-1 GREEN; the reject was a real coverage hole on the AC, now closed and re-verified by two independent mutation runs. Nothing in the rework touched behavior. I can find no surviving defect: the story's one acceptance criterion — the emitted count equals the units paid — is now pinned against per-point, points/5, multiplier-scaled, unguarded-dead-base, and floored-at-1 wrong implementations. Approve.

**Handoff:** To SM for finish-story.

## Impact Summary

**Blocking:** 0 blocking items. Story APPROVED at review round 2; both round-1 findings CLOSED and independently mutation-verified.

**Delivered:** the end-of-wave bonus count-up cue (TK/SUNABM) now emits one `bonusTick` per bonus unit (`survivingCities + unusedMissiles`) from the `between` resolve in `plugins/missile-command/src/core/game.ts`, faithful to the ROM count-up (ENDWV4 per-city + ENDWV2 per-ABM), decoupled from points and the wave multiplier. The `BonusTickEvent` "filed follow-up" note is struck; the type is preserved. New suite `tests/mc11-2-bonus-tick-emit.test.ts` (19 tests) pins the count against per-point/points-5/multiplier-scaled/unguarded-dead-base/floored-at-1 wrong implementations.

**Review:** 2 rounds. Round 1 REJECTED on two mutation-proven test-coverage gaps (dead-base `b.alive` guard; N=0 census floor) — production code was correct, the gaps were coverage-only. Round 2 APPROVED after both were pinned with mutation-proven guards and two LOW notes strengthened. No production code changed between rounds.

**Delivery findings (all resolved/non-blocking):** Dev's stale-comment Gap RESOLVED in GREEN (two sibling test comments refreshed). Reviewer's round-1 Gaps CLOSED in the rework. One tooling-hygiene Improvement filed (a review subagent used `git stash` in a shared checkout — no damage, verified clean). The pre-existing two-arg `waveEndBonus` base-rate call is out of scope and untouched.

**Verification:** 19/19 story file, missile-command project green, orchestrator 505/505, lint clean; verified green on a trial-merge with current `develop` (vitest 16901 pass) before merging PR #465.

## Delivery Findings

### Reviewer (code review) — Round 2

- Both round-1 Gap items below are **CLOSED** and independently re-verified (mutation-probed). No new upstream findings in round 2. The production `waveEndBonus`/`between`-branch two-arg base-rate call remains a pre-existing, out-of-scope question (Dev noted it; not introduced here) — not filed as this story's concern.

### Reviewer (code review) — Round 1

- **Gap** (non-blocking, routed to this story's rework): the acceptance suite leaves the `b.alive` ammo guard and the N=0 census floor unpinned — two mutation-proven survivors. Affects `plugins/missile-command/tests/mc11-2-bonus-tick-emit.test.ts` (add two fixtures; production code correct).
- **Improvement** (non-blocking): tooling hygiene — a review subagent (rule-checker) ran `git stash pop` which popped an unrelated pre-existing stash and briefly conflicted `sprint/archive/epic-df3.yaml`; it self-reverted and I verified the tree is clean (no markers, my commits + epic stamp intact, 15 stashes undisturbed). No damage. Subagents should snapshot via `git show <sha>:<path>`, never `git stash`, in a shared checkout.

- **Gap (RESOLVED by Dev) — stale scope comments in sibling test files.** After GREEN wires the emitter, two comments become false and should be updated by Dev (they claim the producer does not exist): `plugins/missile-command/tests/sound-events.test.ts:20-24` ("`bonusTick` … has no producer in the sim yet (wave.ts is not wired into stepGame)") and `plugins/missile-command/tests/audio-dispatch.test.ts:30` ("bonusTick has no sim producer yet"). A false comment ships green; strike/refresh both alongside the sound-events.ts note (AC3).



Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Reviewer (audit)
- No design deviations were logged by TEA or Dev, and none observed: the implementation follows TEA's ROM derivation exactly (tick count = unit census, decoupled from points/multiplier) and the house `as const` emitter idiom. Nothing undocumented diverged.
- Round 2: the rework added no deviations (test-only coverage; production unchanged). Nothing to audit.