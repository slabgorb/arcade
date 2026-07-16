---
story_id: "sw7-13"
jira_key: "sw7-13"
epic: "sw7"
workflow: "tdd"
---
# Story sw7-13: R9c Darth Vader's TIE — 4 lives, immortal in space, retreats, 2000 pts (A-016)

## Story Details
- **ID:** sw7-13
- **Jira Key:** sw7-13
- **Workflow:** tdd
- **Stack Parent:** sw7-9 (split; satisfied by sw7-11 and sw7-12)
- **Points:** 5
- **Priority:** p2
- **Repo:** star-wars

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-16T05:52:44Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-16T04:36:36Z | 2026-07-16T04:36:36Z | immediate |
| red | 2026-07-16T04:36:36Z | 2026-07-16T05:03:41Z | 27m 5s |
| green | 2026-07-16T05:03:41Z | 2026-07-16T05:30:55Z | 27m 14s |
| review | 2026-07-16T05:30:55Z | 2026-07-16T05:52:44Z | 21m 49s |
| finish | 2026-07-16T05:52:44Z | - | - |

## Technical Approach

### A-016: Darth Vader TIE Implementation
- **4 lives**: Darth TIE spawns with quad-health state (destructible per A-009 VM)
- **Immortal in space**: While on playfield (not surface), takes no damage from player fire (collision only for collision damage, no shoot-to-kill)
- **Retreats behavior**: Follows A-009 VM bytecode orchestration + TSPWAV wave composition (sw7-12) to trigger retreat sequences
- **2,000 point award**: Currently S-002 bonus sits unawarded; Darth TIE destruction triggers S-002 scoring path, award 2,000 pts

### Dependency Chain
- **sw7-11** (R9a VM engine): Provides bytecode VM dispatch for Darth AI, flight state machine, and multi-life tracking ✓ DONE
- **sw7-12** (R9b TSPWAV): Provides 6 wave-composition sets + Darth ordering for wave scheduling ✓ DONE
- **sw7-1** (Timebase): Foundation all numeric stories build on; constants baked at 20.508 Hz frame rate ✓ DONE

### Acceptance Criteria
1. **A-016 citation remediated**: Port Darth Vader TIE 4-life mechanic and immortal-in-space state from cabinet ROM per audit findings A-016
2. **S-002 scoring remediated**: Award S-002 2,000 pts (currently unawarded) on Darth TIE destruction; mark S-002 as remediated_by in audit findings JSON
3. **Wave scheduling applied**: Darth TIE wave appearance/retreat driven by TSPWAV (sw7-12) composition, riding sw7-11 VM bytecode
4. **All tests green**: npm test passes with all audit citations verified (find A-016 and S-002 marked remediated_by)
5. **No audit regressions**: Citations stay green; no new unremediatable findings

### Testing Strategy (RED phase)
- Audit citations framework: `npm test -- citations` validates A-016 + S-002 marked remediated_by
- Scoring integration test: Darth TIE destruction awards 2,000 pts (S-002)
- State machine tests: 4-life tracking on Darth TIE per wave + retreat sequences
- Immortal-in-space gate: Verify enemy fire does NOT decrease Darth health while in space (ground collision still counts)

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** sw7-13 ports absent enemy behaviour (A-016) and awards an unawarded score (S-002) — a pure-core change with clear observable deltas.

**Test Files:**
- `star-wars/tests/core/darth-vader-enemy-rom.test.ts` — Darth as a live enemy: distinct kind (`.WS RTH,4`), immortal in space (KEEP DARTH ALIVE, WSCPU.MAC:341-373), 2,000 pts per hit (SCRDARTH → VADER_SCORE), glow double-jeopardy gate, and the sw7-12 wave plan (tie-waves.ts) wired into spawning.
- `star-wars/tests/audit/sw7-13-remediation.test.ts` — the audit ledger: A-016 (pair-tie-ai.json) + S-002 (pair-score-shields.json) marked `remediated_by: sw7-13`; the deferred roll-burst A-018 stays open.

**Tests Written:** 10 (7 behaviour + 3 ledger) covering 4 behaviour ACs + the bookkeeping AC.
**Status:** RED — verified via testing-runner (RUN_ID sw7-13-tea-red). Both files load clean (no collection/import errors). 8 fail on assertions for the correct reason (Darth is destroyed on the first hit / scores 1,000 not 2,000 / no Darth spawns from the RTH slot / `remediated_by` unset); 2 anchor guards pass (SHAPE_LIVES.RTH===4 & TIE===1; A-018 stays open).
**Runner-misjudgment note:** the haiku testing-runner labelled the four immortality-survival failures "WRONG-REASON". That is wrong. "Darth is killed on the first hit today" IS the absent behaviour — those are correct REDs that go green the moment GREEN implements the KEEP-DARTH-ALIVE survival rule. Independently confirmed: the spawn test fails on `some(k=>k!=='tie')` (not on `toContain('tie')`), proving enemies DO spawn and only the Darth is missing.

### Rule Coverage

| Rule (lang-review/typescript.md) | Test / self-check | Status |
|----------------------------------|-------------------|--------|
| #8 test quality — meaningful assertions | every test pins a concrete delta (enemies length, exact score delta, event list, `remediated_by`); no `let _=`, no `assert(true)`, no always-None `is_none` | enforced |
| #8 test quality — no `as any` / type-escape casts in tests | fixtures use a direct `kind:'darth'` (a RED type-widening for GREEN), NOT a cast; ledger `load()` returns via a declared return type, not `JSON.parse(...) as T` | enforced |
| #8 test quality — import from `src/` not `dist/` | both files import `../../src/core/*` and `@arcade/shared/math3d` | enforced |
| #4 null/undefined — `??` not `||` | ledger guard normalises `remediated_by ?? undefined` (null→undefined) — correct nullish handling | enforced |
| #1 type-safety escapes | no `@ts-ignore`/`@ts-expect-error`; the single intentional type error (`kind:'darth'`) is left VISIBLE for GREEN to fix by widening `Enemy.kind` — not suppressed | enforced |

**Rules checked:** 5 of 13 checks are applicable to a pure-core test surface (no React/#6, async/#7, user-input validation/#10, or build-config/#9 concerns). All applicable checks enforced or self-verified.
**Self-check:** 0 vacuous tests found. The "retreat" behaviour was deliberately NOT given its own test (vacuous on the current wave-clear architecture) — logged as a deviation below, not a silent omission.

**Handoff:** To Dev (Yoda) for GREEN.

## Delivery Findings

<!-- Append-only. Never edit or remove another agent's entries. -->

### TEA (test design)
- **Question** (non-blocking): wiring `waveSpawnPlan` into spawning needs a mapping from the sim's `wave`/`phase` counter to tie-waves' 0-based `spaceWave` (`selectWaveSet`). Affects `star-wars/src/core/sim.ts` (spawn seam ~214-219, `spawnTie` ~1294-1300) — GREEN chooses `spaceWave = f(state.wave)`; the spawn test scans waves 1-6 so it holds under either ±1 mapping. *Found by TEA during test design.*
- **Gap** (non-blocking): "flight rides the sw7-11 VM" — per-frame VM ticking of Darth in `moveEnemy` is NOT exercised by this suite; tie-waves.ts:16-17 lists that as a separate wiring concern from the enemy behaviour. Affects `star-wars/src/core/sim.ts` (`moveEnemy`) / `star-wars/src/core/tie-vm.ts` (`tickChoreo`). sw7-13's testable ROM deltas are the A-016/S-002 survival+scoring rule. *Found by TEA during test design.*
- **Improvement** (non-blocking): `Enemy.kind` must widen from the single-member `'tie'` union to admit the Darth enemy. Affects `star-wars/src/core/state.ts:46`; the death-event `DeathKind` union (`events.ts`) does NOT need a Darth member — Darth never dies in space, so he emits no death cue. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): render Darth as the distinct `DARTH_TIE` model. `render.ts` (~line 384) still draws every enemy with `TIE_FIGHTER`, so a Darth is visually a mook. The model is already ROM-correct (sw5-2); wire `e.kind === 'darth' ? DARTH_TIE : TIE_FIGHTER` and eyeball orient/scale. Affects `star-wars/src/shell/render.ts`. Deferred from this GREEN because a render swap needs visual verification structural tests can't give. *Found by Dev during implementation.*
- **Gap** (non-blocking): Darth's flight does NOT yet tick the sw7-11 VM per frame — `moveEnemy` remains the homing/peel geometry every TIE uses. The story says flight "rides the sw7-11 VM"; wiring `tickChoreo` per enemy is the separate integration tie-waves.ts:16-17 / tie-vm.ts:15-17 flagged, not exercised by sw7-13's A-016/S-002 deltas. Affects `star-wars/src/core/sim.ts` (`moveEnemy`) / `star-wars/src/core/tie-vm.ts`. *Found by Dev during implementation.*
- **Note** (non-blocking): a dead-centre Darth that reaches the cockpit (no room to peel) is removed by the cockpit-collision pass and costs the player a shield — a physical collision, distinct from the laser immortality A-016 specifies (CPHTSA = "SPACE **LAZAR** HIT ALIEN SHIP"). Faithful and untested. Affects `star-wars/src/core/sim.ts` (cockpit-damage filter). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking, MEDIUM): the glow **gate** (cross-frame no-double-jeopardy) is UNTESTED. Mutation-proven twice (independent auditor + reviewer): replacing `(enemies[ei].glow ?? 0) <= 0 && !darthScored.has(ei)` with `true` leaves all 7 Darth tests GREEN. The "no double jeopardy" test passes via the loop `break` (one bolt/enemy/frame), NOT the gate, and its comment oversells what it proves. The production code is CORRECT (a bolt every frame within the glow window scores 2,000 once), so this is a coverage gap, not a live bug. Fix: add a cross-frame test (fire a bolt each frame across the glow window → assert a single VADER_SCORE) and correct the double-jeopardy test's comment. Affects `star-wars/tests/core/darth-vader-enemy-rom.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking, LOW): `!darthScored.has(ei)` in the score-gate condition is dead — the inner-loop `break` guarantees each enemy is visited once per frame, so it is always true when evaluated. `darthScored` itself is still load-bearing (the glow re-arm map at the `standingEnemies` step). Drop the redundant sub-condition. Affects `star-wars/src/core/sim.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking, LOW): `selectWaveSet(spaceWave)` (`tie-waves.ts`, sw7-12) is not defensive against a negative `spaceWave` — `spaceWave < TSPWAV.length` admits `-1` → `TSPWAV[-1]` undefined → `waveSpawnPlan`'s `for…of` throws. Unreachable today (`state.wave >= 1`, so `spaceWave >= 0`), but a wave-0/malformed fixture would crash rather than fall back to a mook. Consider clamping `spaceWave` at 0. Affects `star-wars/src/core/tie-waves.ts`. *Found by Reviewer during code review.*

## Design Deviations

### TEA (test design)
- **No dedicated "retreat at wave end" test**
  - Spec source: context-story-sw7-13.md, story title ("retreats") + finding A-016 ("it then flees at wave end")
  - Spec text: "4 lives, immortal while in space, retreats"
  - Implementation: retreat is covered only indirectly (the immortality tests prove Darth is never destroyed by fire); no test asserts a wave-end departure.
  - Rationale: the space wave clears on a KILL QUOTA (`phaseKills >= SPACE_WAVE_QUOTA`) and `enterPhase` wipes every surviving enemy — an immortal Darth cannot deadlock the wave and "leaves at wave end" is architecturally automatic, so a retreat test would pass on the current unmodified code (vacuous).
  - Severity: minor
  - Forward impact: none — if a future story makes wave-clear depend on enemies being cleared, a real retreat/deadlock test becomes necessary.
- **Enemy kind pinned as the literal string `'darth'`**
  - Spec source: context-story-sw7-13.md; sibling module `star-wars/src/core/tie-waves.ts` (shape `'RTH'`)
  - Spec text: "Port Darth Vader TIE (A-016)" — the story does not name the sim's enemy-kind field
  - Implementation: the behaviour fixtures construct and pin `Enemy.kind === 'darth'` (mapping tie-waves' ROM shape `'RTH'` onto a readable lowercase kind, consistent with the existing `'tie'`).
  - Rationale: a hand-constructed Darth needs a concrete identifying value; `'darth'` matches the `DARTH_TIE` model name and the "Vader enemy" language. The spawn test uses `!== 'tie'` so it is label-agnostic; only the behaviour fixtures hard-code `'darth'`.
  - Severity: minor
  - Forward impact: none — if GREEN/Reviewer prefer `'rth'`, it is a one-string find-replace in the behaviour suite.
- **Glow duration not pinned to the ROM's $1F (~1.5 s)**
  - Spec source: WSCPU.MAC:346-348,371 (`LDA #01F ;TWO OR SO SECONDS` + the double-jeopardy gate)
  - Spec text: the post-hit glow lasts `$1F` frames (~1.5 s at 20.508 Hz) and blocks re-scoring while lit
  - Implementation: the gate is pinned qualitatively — two bolts in one frame score once; two hits 3 s apart score twice — but the exact glow length is not asserted.
  - Rationale: the exact frame count is a GREEN tuning detail; pinning it would couple the suite to an implementation representation (frames vs seconds). 3 s comfortably exceeds a faithful ~1.5 s glow, keeping the per-hit test robust.
  - Severity: minor
  - Forward impact: none.

### Dev (implementation)
- **Categorical immortality instead of a modelled HTA-4→5 counter**
  - Spec source: finding A-016 / WSCPU.MAC:362-368
  - Spec text: "on a non-fatal hit CPHTSA resets its hit counter — `LDA #05 / STA A$HTA(X) ;KEEP DARTH ALIVE` … pins HTA to 5 after every hit"
  - Implementation: a Darth is simply never added to `killedTie` (categorically immortal); no per-enemy HTA counter is modelled. Glow-gated per-hit scoring is modelled.
  - Rationale: HTA=4, DEC→3, then reset-to-5 on every hit is mathematically never-dies; a counter that can never reach 0 is unobservable, so categorical immortality is behaviourally identical and simpler (minimalist discipline).
  - Severity: minor
  - Forward impact: minor — if a later story lets Darth die somewhere (e.g. a surface encounter), the HTA counter must be added then; the pinned "4 lives" datum lives in `SHAPE_LIVES.RTH`.
- **`spawnCount` reset per wave in `clearRun`**
  - Spec source: TEA Delivery Finding (wave→`spaceWave` mapping) + tie-waves.ts (per-wave TSPWAV plan)
  - Spec text: the plan is per-wave, walked 0-based (`selectWaveSet(spaceWave)`)
  - Implementation: `clearRun` now resets `spawnCount: 0` at the wave boundary; `spawnTie` consults `waveSpawnPlan(state.wave − 1)[spawnCount]`.
  - Rationale: `spawnCount` was monotonic across all phases; left as-is the plan index would step past the RTH slot and Darth would never appear in waves 2+. Resetting is also the faithful per-wave behaviour (TBG + TSPWAV both restart per wave). `clearRun` draws no RNG, so no seeded ripple — full suite 1420/1420 green.
  - Severity: minor
  - Forward impact: minor — waves 2+ now restart the lateral (TBG) walk from slot 0 rather than continuing monotonically; closer to the ROM, in the neighbourhood of the still-open A-015 divergence (which stays open).
- **Render deferred — Darth draws as the mook `TIE_FIGHTER` model**
  - Spec source: A-016 ("a distinct Darth ship, RTH shape") + `models.ts` `DARTH_TIE` (sw5-2)
  - Spec text: "The ROM has a distinct Darth ship (RTH shape …)"
  - Implementation: the core enemy is distinct (kind `'darth'`, immortal, 2 000/hit) but `render.ts` still draws every enemy with `TIE_FIGHTER`; the `DARTH_TIE` model is not wired to the enemy render.
  - Rationale: the swap is a shell change needing eyeball verification (structural tests can't catch orient/scale), out of this GREEN's tested scope — routed to a Delivery Finding.
  - Severity: minor
  - Forward impact: minor — a follow-up wires the model and eyeballs it.
- **A-008 citation re-spelled, not remediated**
  - Spec source: the reanchor "two honest exits" rule + A-008 (CONFIRMED, "A TIE spawns facing the player")
  - Spec text: A-008 cites the `spawnTie` return for `orient: lookRotation(dir)` (the facing)
  - Implementation: my `spawnTie` edit changed `kind: 'tie'` → `kind` on that line, so reanchor reported it LOST; I hand-updated A-008's `ours.verbatim` to the new line and left it OPEN — NOT `remediated_by`.
  - Rationale: the facing A-008 confirms is unchanged (`orient: lookRotation(dir)` still there); I merely re-spelled the cited line, so the honest exit is re-anchor, not a remediation claim. `reanchor-citations.mjs` then reports 0 lost.
  - Severity: minor
  - Forward impact: none.

### Reviewer (audit)
Every logged deviation audited; dispositions below.

**TEA (test design):**
- **No dedicated "retreat at wave end" test** → ✓ ACCEPTED by Reviewer: sound. The space wave clears on `phaseKills` (not enemies-empty) and `enterPhase` wipes survivors; I verified Darth is never added to `killedTie`, so `phaseKills += killedTie.size` never counts him and he cannot deadlock the wave. A retreat test would indeed be vacuous on this architecture.
- **Enemy kind pinned as `'darth'`** → ✓ ACCEPTED by Reviewer: reasonable. Precise literal-union member (rule-checker #2 clean), matches the `DARTH_TIE` model name, and is mutation-load-bearing (reverting the darth branch → 5 RED).
- **Glow duration not pinned to $1F** → ✗ FLAGGED by Reviewer (downgraded to non-blocking): the deviation's rationale claims the gate is "pinned qualitatively — two bolts in one frame score once; two hits 3 s apart score twice." Mutation proof refutes this — the gate is NOT covered at all (removing it keeps all 7 tests green; the double-jeopardy test passes via the `break`). Not pinning the exact 31-frame duration is fine; the claim that the gate's behaviour IS covered is inaccurate. Captured as the MEDIUM Delivery Finding above. Does not block — the code is correct.

**Dev (implementation):**
- **Categorical immortality vs modelled HTA counter** → ✓ ACCEPTED by Reviewer: behaviourally identical (HTA resets to 5 every hit → never reaches 0), simpler, correct; the "4 lives" datum is preserved in `SHAPE_LIVES.RTH`.
- **`spawnCount` reset per wave** → ✓ ACCEPTED by Reviewer: required for the per-wave plan walk (else Darth never spawns in waves 2+), draws no RNG (no seeded ripple), full suite 1420/1420; more ROM-faithful than the prior monotonic walk; A-015 correctly stays open.
- **Render deferred** → ✓ ACCEPTED by Reviewer: the core enemy IS distinct and correct; the model swap is a shell change needing eyeball verification — legitimately deferred to the Delivery Finding. A-016's core (survival + scoring + shape scheduling) is what this story remediates.
- **A-008 re-spelled, not remediated** → ✓ ACCEPTED by Reviewer: independently verified — the changed verbatim is under `ours` (our `sim.ts`), NOT `source` (ROM); the facing is unchanged; A-008 carries no `remediated_by`; citations green. An honest re-anchor, not laundering.

**Undocumented deviations found:** none. Laundering audit of `docs/audit/findings/` shows only line-reanchors + 2 `remediated_by` stamps + the 1 A-008 `ours` re-spell — no `source`/`claim`/`title`/`reasoning` prose changed.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `star-wars/src/core/state.ts` — widen `Enemy.kind` to `'tie' | 'darth'`; add optional `Enemy.glow` (the A$GLW scoring gate); add `DARTH_GLOW_SECONDS = 0x1f / TICK_HZ` (≈ 1.51 s).
- `star-wars/src/core/sim.ts` — kill/score loop branches Darth (immortal: never added to `killedTie`; `+VADER_SCORE` per hit; glow double-jeopardy gate); glow decays each frame; `spawnTie` consults `waveSpawnPlan` (RTH → `'darth'`); `clearRun` resets `spawnCount` so Darth spawns in waves 2+.
- `star-wars/docs/audit/findings/pair-tie-ai.json` — A-016 `remediated_by: sw7-13`; A-008 `ours` re-spelled (`kind:'tie'`→`kind`).
- `star-wars/docs/audit/findings/pair-score-shields.json` — S-002 `remediated_by: sw7-13`.
- `star-wars/docs/audit/findings/*.json` — 52 `ours` line-numbers reanchored (pure shifts from the state.ts/sim.ts edits); reanchor reports **0 lost**.

**Tests:** 1420/1420 passing (GREEN) — the two sw7-13 files (7 + 3) + citations (12) green; `tsc --noEmit` + `vite build` clean; no ripple regressions.
**Branch:** feat/sw7-13-darth-vader-tie (pushed)

**Handoff:** To Reviewer (Obi-Wan) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1420/1420, tsc+build clean, 0 lost citations, no smells |
| 2 | reviewer-edge-hunter | No | Skipped (disabled) | N/A | Disabled via settings; edge domain covered by me + the independent auditor (spawnCount ripple, wave-0 negative index, plan-past-end, glow-field preservation) |
| 3 | reviewer-silent-failure-hunter | No | Skipped (disabled) | N/A | Disabled; verified myself — no try/catch; the `?? 'TIE'` fallback is a documented branch, not a swallowed error |
| 4 | reviewer-test-analyzer | No | Skipped (disabled) | N/A | Disabled; covered by the independent auditor + my own mutation runs — found the glow-gate coverage gap (MEDIUM) |
| 5 | reviewer-comment-analyzer | No | Skipped (disabled) | N/A | Disabled; verified myself — code comments cite WSCPU/WSGAS lines accurately; the double-jeopardy test comment oversells (flagged) |
| 6 | reviewer-type-design | No | Skipped (disabled) | N/A | Disabled; covered by rule-checker #2 — precise literal union, precise optional number, no casts |
| 7 | reviewer-security | No | Skipped (disabled) | N/A | Disabled; N/A — pure deterministic core, no external/user input, no injection surface |
| 8 | reviewer-simplifier | No | Skipped (disabled) | N/A | Disabled; verified myself — one LOW: the dead `!darthScored.has(ei)` sub-condition |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations (13 rules, 24 instances) | N/A — tsc clean; glow preserved at all rebuild sites; correct `??`; noted the dead darthScored condition as a non-rule observation |

**Independent auditor** (extra — restores the independence a self-authored review lacks): Received Yes. Confirmed ROM honesty (immortality / VADER_SCORE / glow all faithful), mutation-proved all 3 core guards RED-on-revert (remediation is real, not phantom), the A-008 re-spell honest, and the glow-gate coverage gap (MEDIUM). Tree restored clean.

**All received:** Yes (2 enabled subagents returned clean + 1 independent auditor; 7 subagents disabled via settings and covered manually)
**Total findings:** 1 MEDIUM (glow-gate coverage gap), 3 LOW (dead sub-condition; latent negative-wave crash; spawn-position simplification) — all non-blocking. 0 Critical/High.

## Reviewer Assessment

**Verdict:** APPROVED

sw7-13 faithfully ports Darth Vader's TIE (A-016 / S-002) into the deterministic core. The remediation is HONEST and mutation-proven, not a phantom stamp: reverting the immortality branch → 5 tests RED; reverting `VADER_SCORE`→`TIE_SCORE` → scoring tests RED; hardcoding `kind:'tie'` in spawnTie → spawn test RED (verified by the independent auditor AND my own hands). No Critical or High issues; one MEDIUM and three LOW, all non-blocking, captured as Delivery Findings.

**Data flow traced:** player bolt → `collides(enemy.pos, projectile.pos, TIE_HIT_RADIUS)` (sim.ts:280) → `kind === 'darth'`: bolt consumed, `+VADER_SCORE` when not glowing, Darth NEVER added to `killedTie` → survives `standingEnemies`/`liveEnemies` → persists next frame with `glow` re-armed and decaying by `dt`. Safe: `phaseKills += killedTie.size` never counts Darth, so an immortal Darth cannot deadlock the space wave (it clears on the mook kill quota).

**Findings by dispatch:**
- [RULE] rule-checker: 0 violations across 13 checks; widened union + optional `glow` are precise; `??` used correctly where `0` is a valid "not glowing" value; glow preserved at every `{...e}` rebuild site (no sw3-11 field-drop). VERIFIED — evidence: rule-checker enumerated all Enemy-returning sites (moveEnemy 3 paths, fire-cooldown map, standingEnemies map) all spread `...e`.
- [TEST] auditor + my mutations: **MEDIUM — glow gate vacuously tested.** Removing `(glow ?? 0) <= 0` → all 7 tests green; the double-jeopardy test passes via the `break`, not the gate. Code correct; coverage missing. Non-blocking Delivery Finding.
- [SIMPLE] LOW — `!darthScored.has(ei)` is dead (the `break` makes it always true). Non-blocking.
- [EDGE] LOW — `selectWaveSet` throws on a negative `spaceWave`; unreachable today (`wave >= 1`). `waveSpawnPlan[i]?.shape ?? 'TIE'` correctly handles plan-past-end. Darth spawn POSITION uses the lateral table not the RTH beginLoc (pre-existing sw4-1 scope). VERIFIED as scoped-out.
- [SILENT] clean — no swallowed errors; the `?? 'TIE'` is a documented fallback. VERIFIED.
- [DOC] code comments cite WSCPU.MAC/WSGAS.MAC lines accurately; only the double-jeopardy test comment oversells (folded into the MEDIUM). VERIFIED otherwise.
- [TYPE] clean — precise literal union `'tie' | 'darth'`, optional `number` matching sibling fields, no casts. VERIFIED.
- [SEC] N/A — pure deterministic core, no external input, no injection surface. VERIFIED.

**Deviation audit:** 6 ACCEPTED, 1 FLAGGED (downgraded non-blocking — the "glow qualitatively pinned" claim is refuted by mutation and folded into the MEDIUM finding). 0 undocumented. Laundering audit clean. See `### Reviewer (audit)`.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.

### Rule Compliance

Rubric = `lang-review/typescript.md` (13 checks) + star-wars CLAUDE.md core-purity boundary.
- **#1 type-safety escapes:** 0 — no `as any`/`as unknown`/`@ts-ignore`/non-null-assertion added (grep-confirmed across all added lines). ✓
- **#2 generics/interfaces:** `Enemy.kind: 'tie'|'darth'` (precise literal union, not `string`); `glow?: number` (matches sibling `bank?`/`fireCooldown?`). ✓
- **#3 enums:** none introduced; the new `kind` branch is an `if`, not a `switch` — no exhaustiveness gap (no `switch` on `Enemy.kind` exists anywhere in the tree). ✓
- **#4 null/undefined:** `(glow ?? 0) <= 0` correct (`0` is a valid "not glowing" value → `??`, not `||`); `e.glow ? … : e` is a skip-guard with no falsy-0 bug; `waveSpawnPlan[i]?.shape ?? 'TIE'` correct runtime OOB guard. ✓
- **#5 modules:** value imports of runtime consts/functions (`VADER_SCORE`, `DARTH_GLOW_SECONDS`, `waveSpawnPlan`); no `.js`-extension issue under `moduleResolution: bundler`. ✓
- **#7 async:** none — core stays synchronous/deterministic (no `Date.now`/`Math.random`/timers). ✓
- **#8 test quality:** the glow-gate MEDIUM (untested guard + misleading comment); the core guards ARE mutation-proven. Non-blocking.
- **#10 input validation:** N/A — all new data derives from the pure internal `waveSpawnPlan` table + sim state; no untrusted input. ✓
- **#11 error handling:** N/A — no try/catch/Result added. ✓
- **#12 perf:** the two new O(n) `.map()` passes match the existing per-frame enemy pipeline; `waveSpawnPlan` rebuilt per spawn is off the hot path (spawns are timer-gated). ✓ (noted, not flagged)
- **#13 fix-regressions:** re-scanned every added construct against #1–#12; tsc clean; 1420/1420 on clean reruns. ✓
- **Core purity (CLAUDE.md):** no DOM/window/Date/Math.random/rAF added to `core/`; `glow` is sim state decayed by `dt`, not wall-clock. ✓

### Devil's Advocate

Assume this Darth is broken. What breaks it?

*Rapid fire.* The most suspicious surface is the glow gate — and it IS the weak point, but not for correctness. A player hosing Darth with a bolt every frame scores 2,000 exactly once per ~1.5 s window, because the gate reads a `glow` that was set last frame and decays by `dt`; I mutation-verified the code is correct. The real hole is that NO test covers it — a future refactor that "simplifies away" the gate would silently make Darth score 2,000 per bolt, a fidelity regression that ships green. That is the MEDIUM. A greedy player today cannot exploit it; the gate works.

*Wave deadlock.* Could an immortal enemy stall the game? The space phase clears on `phaseKills >= SPACE_WAVE_QUOTA`, and `killedTie` never contains Darth, so `phaseKills += killedTie.size` never counts him — he cannot block the quota. The plan schedules exactly one RTH per wave (TRTH1D's third slot), and `spawnTie` mints a Darth only at that plan index, so the board cannot flood with immortals. No deadlock.

*Field-drop.* A future dev adds a per-frame enemy transform that returns a bare literal instead of `{...e}` — `glow` (and `kind`) would silently vanish (the sw3-11 class). Today every rebuild site spreads `...e` (rule-checker enumerated them), but there is no test that Darth's `glow`/`kind` survives N frames of pure motion, so this class is guarded only by convention.

*Weird inputs.* A hand-built fixture with `wave: 0` drives `spaceWave = -1` → `TSPWAV[-1]` undefined → `waveSpawnPlan` throws. Unreachable in real play (`wave >= 1`), but it is an unguarded crash rather than a graceful fallback — the LOW finding.

*Confused understanding.* The double-jeopardy test's comment says it proves the glow gate; a maintainer will believe the gate is covered when it is not. That misdirection is the most likely path to a future regression — hence flagging the comment, not just the coverage.

Net: the implementation is correct and ROM-faithful; the exposure is entirely future-regression (verification integrity), which is MEDIUM/LOW, not a live defect. Nothing rises to blocking.