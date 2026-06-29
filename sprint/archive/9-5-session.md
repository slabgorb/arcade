---
story_id: "9-5"
jira_key: ""
epic: "9"
workflow: "tdd"
---
# Story 9-5: Wave/difficulty ramp of the TIE AI per the RE'd table (faster, more aggressive, later waves)

## Story Details
- **ID:** 9-5
- **Jira Key:** (none — local tracking)
- **Workflow:** tdd
- **Stack Parent:** none (independent from 9-2/9-3/9-4)
- **Points:** 2
- **Priority:** p3
- **Type:** feature

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-29T17:05:54Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T16:33:21Z | 2026-06-29T16:35:40Z | 2m 19s |
| red | 2026-06-29T16:35:40Z | 2026-06-29T16:51:06Z | 15m 26s |
| green | 2026-06-29T16:51:06Z | 2026-06-29T16:57:08Z | 6m 2s |
| review | 2026-06-29T16:57:08Z | 2026-06-29T17:05:54Z | 8m 46s |
| finish | 2026-06-29T17:05:54Z | - | - |

## Technical Context

### Story Summary
Apply the reverse-engineered (RE'd) per-wave difficulty table from the 1983 cabinet to drive TIE AI aggression in later waves. Instead of a scalar multiplier (`1 + 0.15·(wave−1)`), implement the **fire-aggression table** recovered in story 9-1, which controls:

1. **Fire cadence** — frame-mask windows (1/16, 1/8, 1/4 frames)
2. **Fire probability** — threshold (PRNG gating, ~50% to ~81%)
3. **Concurrent fireballs** — slot cap (1 → 6 simultaneous)

Wave difficulty is indexed as: `fireAggression = min(waveNumber + baseDifficulty, 15)`

This ensures:
- **Wave 1:** lower cadence, fewer concurrent fireballs
- **Wave 5+:** tight cadence, high probability, all 6 slots available
- **Deterministic:** driven by per-wave `waveParams`, not a formula

### RE'd Fire-Parameter Table
From `tie-flight-ai-model.md` § 8 (`ROM:8D71`):

| Index | Cadence Mask | Fire Threshold | Max Concurrent | Fire Probability | Fire Window |
|-------|------|------|------|------|------|
| 0–1 | `0x0F` | `0x80` | 1 | ~50% | 1/16 |
| 2 | `0x0F` | `0x80` | 2 | ~50% | 1/16 |
| 3 | `0x0F` | `0x40` | 3 | ~75% | 1/16 |
| 4 | `0x07` | `0x80` | 4 | ~50% | 1/8 |
| 5 | `0x07` | `0x20` | 5 | ~87% | 1/8 |
| 6 | `0x07` | `0x20` | 6 | ~87% | 1/8 |
| 7 | `0x03` | `0x80` | 6 | ~50% | 1/4 |
| 8 | `0x03` | `0x60` | 6 | ~62% | 1/4 |
| 9 | `0x03` | `0x40` | 6 | ~75% | 1/4 |
| ≥10 | `0x03` | `0x30` | 6 | ~81% | 1/4 |

**Index formula:** `min(waveNumber + baseDifficulty, 15)` where `baseDifficulty ∈ {0, 1, 2, 3}` (from DIP switches / options).

### Dependencies
- **9-2** (completed): TIE approach flight model (swoop/weave/bank); motion deterministic
- **9-3** (completed): Peel-away lifecycle; un-killed TIEs exit at wave end
- **9-4** (completed): Strafe-and-fire timing; TIEs fire during their pass window (cadence already per-TIE, not global)

This story builds on those implementations by applying the per-wave difficulty multiplier to the cadence/probability/slot-cap knobs.

### Implementation Approach

1. **Define `waveParams` type** in `core/state.ts`:
   ```typescript
   type WaveParams = {
     cadenceMask: number;      // 0x0F, 0x07, 0x03 (AND with frame counter)
     fireThreshold: number;    // 0x80, 0x40, 0x20, 0x30, etc. (PRNG gate)
     maxConcurrentFireballs: number;  // 1–6
   };
   ```

2. **Add `difficultyTable`** to `gameRules` (hardcoded from RE'd table):
   ```typescript
   const FIRE_TABLE: WaveParams[] = [
     // indices 0–15
     { cadenceMask: 0x0F, fireThreshold: 0x80, maxConcurrentFireballs: 1 },
     { cadenceMask: 0x0F, fireThreshold: 0x80, maxConcurrentFireballs: 1 },
     // ... (full table mapped from ROM:8D71)
   ];
   ```

3. **Compute difficulty index** at wave start:
   - Read `waveNumber` and `baseDifficulty` (DIP / options; default to 0)
   - `difficultyIndex = min(waveNumber + baseDifficulty, 15)`
   - Fetch `waveParams = FIRE_TABLE[difficultyIndex]`

4. **Pass `waveParams` to fire logic** in `core/sim.ts`:
   - Replace the hardcoded cadence/threshold in `fireEnemy()` with `waveParams.cadenceMask` and `waveParams.fireThreshold`
   - Apply `waveParams.maxConcurrentFireballs` cap instead of the hardcoded 6-slot limit

5. **Unit tests:**
   - **Test table lookups:** verify each index returns the correct `(cadenceMask, threshold, concurrency)` tuple
   - **Test difficulty indexing:** verify `min(wave + baseDifficulty, 15)` computation
   - **Test against Wave 1 baseline:** with `waveNumber=1, baseDifficulty=0`, fire behavior matches the hardcoded values from 9-2/9-4 (no regression)
   - **Test difficulty escalation:** Wave 5 at difficulty 0 has tighter cadence and higher probability than Wave 1; verify firing frequency increases

6. **Acceptance Criteria verification:**
   - **AC#1:** `waveParams` deterministically drives cadence/threshold/concurrency; verified in unit tests
   - **AC#2:** Wave 5/6+ are measurably harder (tighter cadence, higher probability, more concurrent); covered by sim tests with fixed seed
   - **AC#3:** Wave 1 baseline preserved (identity test: Wave 1 with baseDifficulty=0 behaves identically to pre-9-5 hardcoded values)
   - **AC#4:** All existing tests pass; no debug code; branch correct

## Delivery Findings

### TEA (test design)
- **Scope** (non-blocking): Of AC#1's four knobs, three (approach speed, fire rate, and the spawn cadence behind "aggression") ALREADY ramp via the scalar `waveParams` from story 8-6; only **simultaneous attackers** (the per-wave fireball concurrency cap) is genuinely new in 9-5. Affects `src/core/gameRules.ts` (add `maxConcurrentShots` to `WaveParams` + the table) and `src/core/sim.ts` (gate the space-phase TIE fire on it). *Found by TEA during test design.*
- **Gap** (non-blocking): The new per-wave cap must replace the hardcoded `MAX_FIREBALL_SLOTS` ONLY in the space-phase TIE fire gate (`sim.ts` ~L161). The surface-phase turret fire (`stepSurface`, ~L317) must KEEP `MAX_FIREBALL_SLOTS` — it is the absolute 6-slot pool, not a per-wave TIE cap. Affects `src/core/sim.ts` (localize the change to space combat). *Found by TEA during test design.*
- **Improvement** (non-blocking): `tests/core/difficulty.test.ts` (story 8-6) declares a LOCAL `WaveParams` interface with only the three scalar fields. Adding `maxConcurrentShots` to the real interface will not break it (structural typing), but the local copy could be updated to match for clarity. Affects `tests/core/difficulty.test.ts` (optional). *Found by TEA during test design.*

### Dev (implementation)
- **Confirmed** TEA's Gap finding: the per-wave cap replaced `MAX_FIREBALL_SLOTS` ONLY in the space-phase TIE fire gate; the surface turret gate (`stepSurface`) keeps `MAX_FIREBALL_SLOTS` (the absolute pool). No further action needed.
- **Improvement** (non-blocking): The §8 fire table's other two columns (cadence-mask, PRNG-threshold) remain unported — a future story that pins the cabinet tick rate could port them to drive `enemyFireInterval` from the table instead of the scalar ramp, for fuller fidelity. Affects `src/core/gameRules.ts` (`FIRE_CONCURRENCY` would grow into a full per-index param table). Not blocking — AC#1's documented-fallback clause covers the current scope. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): The `as unknown as { waveParams: … }` double-cast and the parallel local `WaveParams` interface in the new test are vestigial RED-phase scaffolding now that `maxConcurrentShots` is a real exported field — a direct `import { waveParams, type WaveParams } from '../../src/core/gameRules'` would restore compile-time signature checking for the file. Affects `tests/core/tie-wave-ramp.test.ts` (lines ~171, ~186–192) and, for consistency, the identical idiom in `tests/core/difficulty.test.ts`. LOW — test-only, no runtime risk, mirrors an existing merged convention. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 2 findings (1 Gap, 0 Conflict, 0 Question, 1 Improvement)
**Blocking:** None

- **Gap:** The new per-wave cap must replace the hardcoded `MAX_FIREBALL_SLOTS` ONLY in the space-phase TIE fire gate (`sim.ts` ~L161). The surface-phase turret fire (`stepSurface`, ~L317) must KEEP `MAX_FIREBALL_SLOTS` — it is the absolute 6-slot pool, not a per-wave TIE cap. Affects `src/core/sim.ts`.
- **Improvement:** `tests/core/difficulty.test.ts` (story 8-6) declares a LOCAL `WaveParams` interface with only the three scalar fields. Adding `maxConcurrentShots` to the real interface will not break it (structural typing), but the local copy could be updated to match for clarity. Affects `tests/core/difficulty.test.ts`.

### Downstream Effects

Cross-module impact: 2 findings across 2 modules

- **`src/core`** — 1 finding
- **`tests/core`** — 1 finding

### Deviation Justifications

5 deviations

- **Wave-1 TIE fire concurrency drops from the full 6-slot pool to 1 (ROM-faithful index 0)**
  - Rationale: AC#3's "no regression" names 9-2/9-3 (FLIGHT: approach + peel-away), which a fire-table ramp does not touch; the sparse-to-dense fire ramp IS the story. The Jedi explicitly chose ROM fidelity over wave-1 fire-volume stability (AskUserQuestion, 2026-06-29).
  - Severity: minor
  - Forward impact: wave-1 fire feels sparser, ramping to a full sky by wave 7. Flight and the scalar speed/spawn/fire-interval baseline are unchanged.
- **Retargeted an existing story-9-4 assertion from wave 1 to wave 7**
  - Rationale: the faithful wave-1 cap of 1 makes "≥3 aloft" impossible at wave 1; the assertion's per-TIE-vs-formation intent holds at any wave whose cap ≥ 2. Editing a merged-story test, so flagged.
  - Severity: minor
  - Forward impact: none beyond the test; intent preserved, suite stays green pre- and post-GREEN.
- **Only the concurrency column of the RE'd fire table is ported; cadence/speed stay on the scalar ramp**
  - Rationale: §5.3 states the cabinet tick rate is unrecovered, so a frame-mask→seconds cadence would be invented, not faithful. Concurrency is a tick-agnostic COUNT and ports exactly; AC#1 explicitly permits a documented fallback for the rest. Fire RATE still rises with the wave via the scalar interval.
  - Severity: minor
  - Forward impact: simultaneous-attacker count is table-exact; cadence/speed remain feel-tuned, as before.
- **Base-difficulty (DIP) axis is hardcoded to 0 rather than exposed as a parameter**
  - Rationale: the clone has no DIP switches or options byte, so the second axis has no live source; no test exercises it. Adding a defaulted parameter would be unused scaffolding (YAGNI). The closed `FIRE_CONCURRENCY` table makes adding the axis trivial later.
  - Severity: minor
  - Forward impact: a future difficulty/options story would add a `baseDifficulty` arg and offset the index; no current behavior depends on it.
- **The §8 concurrency column is expressed as an explicit 16-entry table literal**
  - Rationale: TEA offered either form; the literal table is the most faithful, reviewable transcription of ROM:8D71 (a reviewer can eyeball it against §8) and reads as data, mirroring how the cabinet stores it.
  - Severity: minor
  - Forward impact: none; the table is the natural home if the cadence/threshold columns are ported later.

## Design Deviations

### TEA (test design)
- **Wave-1 TIE fire concurrency drops from the full 6-slot pool to 1 (ROM-faithful index 0)**
  - Spec source: context-story-9-5.md, AC#3; docs/tie-flight-ai-model.md §8
  - Spec text: "Wave 1 behavior matches the 9-2/9-3 baseline (no regression)"
  - Implementation: tie-wave-ramp.test.ts pins wave-1 `maxConcurrentShots = 1` (the table's index-0 value) and asserts the sim caps wave-1 fire at one fireball aloft — down from today's effective full-pool volume.
  - Rationale: AC#3's "no regression" names 9-2/9-3 (FLIGHT: approach + peel-away), which a fire-table ramp does not touch; the sparse-to-dense fire ramp IS the story. The Jedi explicitly chose ROM fidelity over wave-1 fire-volume stability (AskUserQuestion, 2026-06-29).
  - Severity: minor
  - Forward impact: wave-1 fire feels sparser, ramping to a full sky by wave 7. Flight and the scalar speed/spawn/fire-interval baseline are unchanged.
- **Retargeted an existing story-9-4 assertion from wave 1 to wave 7**
  - Spec source: tests/core/tie-strafe-fire.test.ts (merged story 9-4)
  - Spec text: "multiple in-window TIEs put more fire in the sky than one formation timer can" — asserted `enemyShots.length >= 3` at wave 1
  - Implementation: extended the `fireReady` helper with an optional `wave` param (default 1) and moved that one assertion to wave 7 (cap 6); nothing else in the 9-4 suite changed.
  - Rationale: the faithful wave-1 cap of 1 makes "≥3 aloft" impossible at wave 1; the assertion's per-TIE-vs-formation intent holds at any wave whose cap ≥ 2. Editing a merged-story test, so flagged.
  - Severity: minor
  - Forward impact: none beyond the test; intent preserved, suite stays green pre- and post-GREEN.
- **Only the concurrency column of the RE'd fire table is ported; cadence/speed stay on the scalar ramp**
  - Spec source: context-story-9-5.md, AC#1; docs/tie-flight-ai-model.md §8, §5.3
  - Spec text: "waveParams drives the 9-2..9-4 AI knobs (approach speed, aggression, simultaneous attackers, fire rate) per the RE'd table or documented fallback"
  - Implementation: tests pin `maxConcurrentShots` to the table 1:1; the cadence-mask / PRNG-threshold columns are NOT converted to seconds — `enemyFireInterval`/`enemySpeed`/`spawnInterval` keep the existing scalar ramp (the documented fallback).
  - Rationale: §5.3 states the cabinet tick rate is unrecovered, so a frame-mask→seconds cadence would be invented, not faithful. Concurrency is a tick-agnostic COUNT and ports exactly; AC#1 explicitly permits a documented fallback for the rest. Fire RATE still rises with the wave via the scalar interval.
  - Severity: minor
  - Forward impact: simultaneous-attacker count is table-exact; cadence/speed remain feel-tuned, as before.

### Dev (implementation)
- **Base-difficulty (DIP) axis is hardcoded to 0 rather than exposed as a parameter**
  - Spec source: docs/tie-flight-ai-model.md §8; TEA Assessment "Implementation guidance"
  - Spec text: "index = min((wave - 1) + baseDifficulty, 15), `baseDifficulty` default 0"
  - Implementation: `waveParams(wave)` keeps its single-arg signature; the fire index is `min((wave - 1), 15)` with DIP fixed at 0 (commented), not a `baseDifficulty` parameter.
  - Rationale: the clone has no DIP switches or options byte, so the second axis has no live source; no test exercises it. Adding a defaulted parameter would be unused scaffolding (YAGNI). The closed `FIRE_CONCURRENCY` table makes adding the axis trivial later.
  - Severity: minor
  - Forward impact: a future difficulty/options story would add a `baseDifficulty` arg and offset the index; no current behavior depends on it.
- **The §8 concurrency column is expressed as an explicit 16-entry table literal**
  - Spec source: TEA Assessment "Implementation guidance" ("a 16-entry table (or a `min`-saturated lookup)")
  - Spec text: build the cap from the §8 table indexed by the fire-aggression index
  - Implementation: `FIRE_CONCURRENCY = [1,1,2,3,4,5,6,6,6,6,6,6,6,6,6,6]` indexed by the clamped fire index — the ROM bytes verbatim, not a closed-form formula.
  - Rationale: TEA offered either form; the literal table is the most faithful, reviewable transcription of ROM:8D71 (a reviewer can eyeball it against §8) and reads as data, mirroring how the cabinet stores it.
  - Severity: minor
  - Forward impact: none; the table is the natural home if the cadence/threshold columns are ported later.

### Reviewer (audit)
- **TEA: Wave-1 fire concurrency drops to 1 (ROM-faithful index 0)** → ✓ ACCEPTED: the Jedi explicitly chose fidelity over wave-1 fire-volume stability; AC#3's "no regression" is scoped to 9-2/9-3 flight, which is untouched. Verified: flight tests and the scalar baseline stay green; the change is confined to the fire-volume cap.
- **TEA: Retargeted the 9-4 "several fighters fill the sky" assertion wave 1 → wave 7** → ✓ ACCEPTED: the per-TIE-vs-formation intent is preserved at any wave with cap ≥ 2; the edit is minimal (one helper param + one wave override) and the 9-4 suite stays fully green.
- **TEA: Only the concurrency column is ported; cadence/speed stay scalar** → ✓ ACCEPTED: model §5.3 confirms the cabinet tick rate is unrecovered, so a frame-mask→seconds cadence would be invented; AC#1 explicitly permits a documented fallback. Faithful within what is recoverable.
- **Dev: Base-difficulty (DIP) hardcoded to 0, not a parameter** → ✓ ACCEPTED: the clone has no DIP switches/options byte, so the second axis has no live source (YAGNI); the closed table makes adding it trivial later. No behavior depends on it.
- **Dev: §8 concurrency column expressed as an explicit 16-entry table literal** → ✓ ACCEPTED: the literal is the ROM bytes verbatim — the most faithful, reviewable transcription; I cross-checked all 16 entries against docs §8 and they match exactly.
- **No undocumented deviations found.** The diff matches the logged deviations precisely; nothing diverged from spec without a corresponding entry.

## Sm Assessment

**Routing decision:** Hand off to TEA (Han Solo) for the RED phase of the TDD workflow.

**Why this story is ready:**
- Story 9-5 is a 2-pt p3 stretch story in `star-wars`, fully scoped by four acceptance criteria.
- It stands on solid ground: 9-2 (approach flight), 9-3 (peel-away lifecycle), and 9-4 (per-TIE strafe-and-fire cadence) are all complete and merged. The per-TIE fire timing 9-5 needs to modulate already exists; this story adds the per-wave difficulty *ramp* on top.
- The RE'd source-of-truth is in hand: the fire-aggression table at `star-wars/docs/tie-flight-ai-model.md` §8 (`ROM:8D71`), transcribed into this session's Technical Context. If the disasm reading proves ambiguous, the ACs explicitly permit a *documented fallback* table — TEA/Dev should note the choice, not block on it.
- Branch `feat/9-5-tie-ai-wave-ramp` is cut from latest `develop`; no open PRs in star-wars, merge gate clear.

**Strategic notes for the RED phase (TEA):**
- The single highest-value test is the **Wave 1 no-regression identity** (AC#3): with `waveNumber=1, baseDifficulty=0`, the resolved `waveParams` must reproduce the exact cadence/threshold/concurrency the 9-2/9-4 sim already uses. Pin this first — it's the guardrail that lets later-wave escalation be added safely.
- The **difficulty index formula** `min(waveNumber + baseDifficulty, 15)` and the **table lookups** are pure functions — cover them with direct unit tests independent of the sim before reaching into the simulation loop.
- **Measurable escalation** (AC#2) needs a deterministic, fixed-seed sim assertion comparing a later wave (e.g. wave 5) against wave 1 along at least one axis (firing frequency or concurrent-fireball count). Avoid wall-clock or RNG-without-seed assertions — this sim is deterministic and the test must be too.
- Keep `waveParams` data-driven (a table indexed by difficulty), not a scalar formula — AC#1 calls out the table explicitly. The old `1 + 0.15·(wave−1)` multiplier is being replaced, not extended.

**No impediments.** This is a clean, well-bounded story building on proven foundations. The pattern reveals itself; TEA may proceed.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Pure-core behavioral feature (a difficulty table + a sim fire-gate) — exactly what TDD on the deterministic core is for.

**Test Files:**
- `tests/core/tie-wave-ramp.test.ts` (NEW) — the 9-5 RED suite: the RE'd fire-table concurrency mapping, saturation, monotonicity, the sim cap wiring, and purity/determinism.
- `tests/core/tie-strafe-fire.test.ts` (EDITED) — `fireReady` gained an optional `wave` param; one "several fighters fill the sky" assertion retargeted wave 1 → wave 7 (see deviations).

**Tests Written:** 13 new tests (across 4 describe blocks) covering all 4 ACs.
**Status:** RED — verified by testing-runner (`9-5-tea-red`): **7 feature tests fail**, the green guards pass, the retargeted 9-4 test passes, and all 27 other test files stay green (364 passed / 7 failed / 371 total). The 7 failures are the right ones — missing `waveParams().maxConcurrentShots` ("expected undefined to be 1") and the unwired sim cap ("expected 6 to be 1").

**AC → test map:**
- **AC#1** (waveParams drives the knobs per the RE'd table) → the table-mapping block (waves 1..8 → 1 1 2 3 4 5 6 6) + the sim-wiring block (the cap actually gates fire).
- **AC#2** (later waves measurably harder) → monotonic-non-decreasing cap + "wave 7 puts strictly more fire aloft than wave 1".
- **AC#3** (wave 1 = 9-2/9-3 baseline, no regression) → wave-1 scalar baseline guard + the full 26-file suite staying green. NOTE: per the Jedi's fidelity call, wave-1 FIRE volume intentionally drops to 1 (a documented deviation); FLIGHT (9-2/9-3) is untouched.
- **AC#4** (deterministic, unit-tested, existing tests pass) → purity guard + bit-identical replay from a fixed seed + the green 364.

### Rule Coverage

Lang-review checklist: `.pennyfarthing/gates/lang-review/typescript.md` (13 checks). This is a pure-data + deterministic-sim feature, so most checks are Dev implementation-time self-review rather than unit-testable behaviors; the testable ones are pinned:

| Rule | Test(s) | Status |
|------|---------|--------|
| #4 null/undefined (`??` not `||`; no undefined leak) | `stays an integer slot count within [1, pool]` + the table-mapping test (catch an `undefined`/NaN cap) | failing (RED) |
| #8 test quality (no `as any`; meaningful assertions) | self-check: only the documented `gameRules as unknown as {...}` missing-feature probe cast (mirrors difficulty.test.ts); every test asserts a concrete value | pass |
| (type contract) integer slot COUNT, bounded [1,6] | `stays an integer slot count within [1, pool]` | failing (RED) |
| (determinism / sacred boundary) | `returns the same maxConcurrentShots…` + `replays per-wave fire bit-identically` | partial (guards green) |

**Rules checked:** 13 of 13 reviewed; 3 map to unit-testable contracts (above), the remainder (#1–3, #5–7, #9–13) are Dev self-review at GREEN.
**Self-check:** 0 vacuous tests found (no `let _ =`, no `assert(true)`, no always-undefined assertions).

### Implementation guidance for Dev (Yoda)
- Add `maxConcurrentShots: number` to `WaveParams` in `gameRules.ts`; build a 16-entry table (or a `min`-saturated lookup) from docs §8 indexed `min((wave-1) + baseDifficulty, 15)`, `baseDifficulty` default 0. Concurrency by index: `0→1,1→1,2→2,3→3,4→4,5→5,6→6,7+→6`.
- Keep the existing scalar ramp for `spawnInterval`/`enemySpeed`/`enemyFireInterval` exactly as-is (wave-1 baseline must stay byte-for-byte).
- In `sim.ts`, replace `MAX_FIREBALL_SLOTS` with `params.maxConcurrentShots` ONLY in the space-phase per-TIE fire gate (~L161). Leave the surface turret gate (~L317) on `MAX_FIREBALL_SLOTS` (the absolute pool).
- Do NOT port the cadence-mask/PRNG-threshold columns to seconds (tick rate unrecovered, §5.3) — documented fallback.

**Handoff:** To Dev (Yoda) for the GREEN phase — make the 7 failing tests pass with minimal implementation, leaving the 364 green.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/gameRules.ts` — added `maxConcurrentShots` to the `WaveParams` interface; added the `FIRE_CONCURRENCY` table (the §8 ROM:8D71 concurrency column, `[1,1,2,3,4,5,6,…]`) and the fire-aggression index `min((wave-1), 15)` (DIP=0) feeding the new field. The scalar spawn/speed/fire-interval ramp is byte-for-byte unchanged.
- `src/core/sim.ts` — the space-phase per-TIE fire gate now reads `enemyShots.length < params.maxConcurrentShots` instead of the absolute `MAX_FIREBALL_SLOTS`; the surface-phase turret gate still uses `MAX_FIREBALL_SLOTS` (the 6-slot pool). Updated the adjoining comment.

**Approach:** Minimal. Only the genuinely-new knob (simultaneous-attacker cap) was added; the other three AC#1 knobs already ramped from 8-6. The cap is a pure data table indexed by the wave, ported 1:1 from the cabinet, and wired into exactly one gate.

**Tests:** 371/371 passing (GREEN) — verified by testing-runner (`9-5-dev-green`). The 7 prior RED tests now pass; no regressions across the other 27 files. `npm run build` clean: `tsc --noEmit` no type errors, `vite build` succeeds.

**Self-review (judgment checks):**
- Wired into the sim's space-combat step (the front end consumes `state.enemyShots` unchanged). ✓
- Follows project patterns: single-sourced constant table beside the existing ramp constants; pure core, no DOM/time/RNG; faithful-port comment with the ROM citation. ✓
- All 4 ACs met (see AC→test map in the TEA Assessment; all those tests are now green). ✓
- Error handling: pure deterministic function; the index is clamped to the table bounds (`Math.max(0, Math.min(…))`), so no out-of-range access. ✓

**Branch:** `feat/9-5-tie-ai-wave-ramp` — pushed to origin (commit `bda7a0b`). No PR (SM opens it at finish).

**Handoff:** To Reviewer (Obi-Wan) for code review.

## Subagent Results

Settings (`workflow.reviewer_subagents`): only `preflight` and `rule_checker` enabled; the other seven are disabled. Disabled specialists' domains were covered by the Reviewer directly (see Rule Compliance + Observations, tagged accordingly).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1 (vestigial test cast) | confirmed 1 (LOW), dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — edges covered by Reviewer |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — silent-failure covered by Reviewer |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — test quality covered by Reviewer |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — comments covered by Reviewer |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — type design covered by Reviewer |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — security covered by Reviewer (N/A: pure core) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — simplification covered by Reviewer |
| 9 | reviewer-rule-checker | Yes | findings | 1 (same cast, rule #1) | confirmed 1 (LOW), dismissed 0, deferred 0 |

**All received:** Yes (2 enabled returned, 7 disabled pre-filled)
**Total findings:** 1 confirmed (LOW, non-blocking), 0 dismissed, 0 deferred — both enabled specialists independently surfaced the SAME finding (the vestigial test cast); no contradiction.

### Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) + star-wars/CLAUDE.md sacred-boundary rules (A/B/C). Enumerated against every changed type/constant/function/statement (38 instances, per rule-checker; cross-verified by me):

- **#1 Type-safety escapes** — source: none (no casts/assertions in gameRules.ts/sim.ts). Test: **VIOLATION** — `as unknown as { waveParams }` at `tie-wave-ramp.test.ts:192` (LOW; see assessment).
- **#2 Generic/interface** — `WaveParams` fields all concrete `number`; `FIRE_CONCURRENCY: readonly number[]` correctly readonly; no `Record<string,any>`/`object`/`Function`. COMPLIANT.
- **#3 Enums** — none introduced. N/A.
- **#4 Null/undefined** — `fireIndex = Math.max(0, Math.min(wave-1, len-1))` clamps to `[0,15]`; array access in-bounds for integer waves → `number`. No `||`-on-falsy. COMPLIANT (caveat: fractional wave → `undefined`; not reachable, see [EDGE]).
- **#5 Module/declaration** — `export interface`/`export function` correct; extensionless relative imports match the project's bundler resolution (identical to existing tests). COMPLIANT.
- **#6 React/JSX** — no `.tsx`. N/A.
- **#7 Async/Promise** — no async. N/A.
- **#8 Test quality** — no `as any` in assertions; local interface matches the exported one exactly (no mock mismatch); imports from `src/`, not `dist/`. The `as unknown as` is logged under #1. COMPLIANT (#1 owns the one issue).
- **#9 Build/config** — no config changes. N/A.
- **#10 Security input validation** — no user input / JSON.parse / API. N/A.
- **#11 Error handling** — no try/catch / error types. N/A.
- **#12 Performance/bundle** — test-only namespace import; no hot-path JSON.stringify / dynamic import / sync fs. COMPLIANT.
- **#13 Fix-introduced regressions** — the new cast is the only new escape; captured by #1. No `||`-for-`??`, no validation removed. COMPLIANT.
- **A. Core purity** — `waveParams`/`FIRE_CONCURRENCY` use only arithmetic + `Math.min/max`; no shell import, DOM, `Date.now`, `performance.now`, `Math.random`, `requestAnimationFrame`. `sim.ts` change is a scalar comparison. COMPLIANT.
- **B. Math via Math Box** — the change is 1-D scalar table/arithmetic, no geometry. COMPLIANT.
- **C. Single-sourced named constants** — `FIRE_CONCURRENCY` is a named module constant; bound uses `FIRE_CONCURRENCY.length - 1` (no magic 15); `MAX_FIREBALL_SLOTS` → named `params.maxConcurrentShots`. COMPLIANT.

### Observations

1. `[VERIFIED]` `FIRE_CONCURRENCY` transcribes docs §8 verbatim — `gameRules.ts:168` array `[1,1,2,3,4,5,6,…]` matches the table's max-concurrent column for indices 0–15 (idx 0–1→1, 2→2 … 6+→6). Complies with rule C (named constant) and rule A (pure).
2. `[VERIFIED]` Pool ceiling never breached — every `FIRE_CONCURRENCY` value ≤ 6 = `MAX_FIREBALL_SLOTS`, so the space gate `enemyShots.length < params.maxConcurrentShots` (`sim.ts:164`) can never push past the 6-slot pool; the "never exceeds pool" test (wave 50) and the unchanged surface gate confirm it.
3. `[VERIFIED]` Fire never disabled — all table values ≥ 1 and `fireIndex` is clamped to `[0,15]` (`gameRules.ts:173`), so `maxConcurrentShots ≥ 1` for every wave; wave 1 allows exactly one fireball (the cap-bite test asserts `peak === 1`, requiring ≥1 fired AND ≤1 allowed).
4. `[EDGE]` (specialist disabled — Reviewer-covered) Fractional-wave fragility: `FIRE_CONCURRENCY[1.5]` is `undefined`, which would make the gate `< undefined` always false (no fire). NOT reachable — `wave` is integer by construction (`state.ts initialState` = 1; `sim.ts clearRun` does `wave + 1`). LOW robustness note, non-blocking.
5. `[SILENT]` (Reviewer-covered) The above is the only silent-failure vector; it is gated by the integer-wave invariant. No swallowed errors, empty catches, or silent fallbacks introduced (no try/catch in the diff). VERIFIED clean.
6. `[TYPE]` (Reviewer-covered) `WaveParams.maxConcurrentShots: number` and `FIRE_CONCURRENCY: readonly number[]` match the codebase's plain-numeric WaveParams style; the table is immutable. The one type issue is the test-side `as unknown as` cast (see [RULE]/[TEST]).
7. `[DOC]` (Reviewer-covered) Comments are accurate: the §8/ROM:8D71 citations are correct, the "wave 7 → full 6-slot pool" claim matches the table (wave 7 → idx 6 → 6), and the `sim.ts` comment correctly describes the per-wave cap replacing the absolute pool. No stale/misleading comments.
8. `[SIMPLE]` (Reviewer-covered) The `Math.max(0, …)` floor is defensive (unreachable for wave ≥ 1) but guards the array access at near-zero cost — reasonable, not over-engineering. The explicit table vs. a closed-form `min(max(1,wave-1),6)` is a deliberate, documented fidelity choice (ROM bytes verbatim). No dead code.
9. `[TEST]` (Reviewer-covered) The new suite is meaningful: the cap-bite test genuinely exercises the cap, the escalation test compares wave-1 vs wave-7 peaks, and determinism/purity are pinned. No vacuous assertions. The retargeted 9-4 test preserves its per-TIE-vs-formation intent. One LOW: the vestigial cast (below).
10. `[RULE]` / `[SEC]` Rule-checker confirmed 1 violation (the test cast, rule #1) and otherwise clean across 16 rules. Security `[SEC]`: N/A by construction — pure deterministic core, no auth/input/secrets/tenant surface; VERIFIED no security-relevant code in the diff.

### Devil's Advocate

Let me argue this code is broken. The most dangerous line is `maxConcurrentShots: FIRE_CONCURRENCY[fireIndex]`. Array indexing in JavaScript silently yields `undefined` for any non-integer or out-of-range index, and `undefined` does not throw — it propagates. If `wave` were ever fractional, `FIRE_CONCURRENCY[1.5]` is `undefined`, and downstream `enemyShots.length < undefined` evaluates to `false` for all lengths (NaN comparison), so **every TIE would silently stop firing** — a gameplay-dead wave with no error, no crash, no test failure (no test passes a fractional wave). Is `wave` provably integer? I traced it: `initialState` sets `wave: 1`, and the only mutation is `clearRun`'s `wave: s.wave + 1`. There is no division, no float arithmetic, no external/serialized source feeding `wave`. So it is integer by construction today — but nothing in the *type* enforces it (`wave: number` admits 1.5), and a future story that, say, interpolates difficulty could reintroduce a float and silently break fire. The scalar ramp degrades gracefully on a float; this table does not. That asymmetry is a latent trap worth a comment, though not a present bug.

What about a confused maintainer? The test file now carries a *second* `WaveParams` interface (the local one) plus an `as unknown as` cast that bypasses the real type. A maintainer who renames `maxConcurrentShots` in the source would get a green build and green tests here — the cast hides the drift — then ship a runtime `undefined`. That is the real cost of the flagged cast: it is not cosmetic, it removes the compile-time tripwire for the very surface these tests cover. It is still LOW (test-only, mirrors a merged idiom, no current runtime risk), but the devil's-advocate pass elevates *why* it deserves the follow-up.

What about a malicious or stressed input? There is none — `core/` takes only `(state, input, dt)`, no filesystem, no network, no parsing. A "huge input" (wave = 10000) clamps to index 15 → cap 6; a negative wave clamps to index 0 → cap 1. Both safe. Concurrency cannot exceed the pool, cannot go to zero. Determinism holds (no RNG consumed in the cap path). The sacred boundary is intact. I tried to break it and could not find a Critical or High path; the worst I surfaced is the integer-wave assumption (unreachable) and the test cast (LOW). The code is sound for its contract.

## Reviewer Assessment

**Verdict:** APPROVED

Two specialists were enabled (preflight, rule-checker); both returned and **independently surfaced the same single finding** — a vestigial `as unknown as` cast in the new test file. The other seven specialists are disabled via settings, and I covered their domains directly (tagged below). No Critical or High issues exist; the lone finding is LOW and non-blocking.

**Confirmed findings (tagged by source):**
- `[RULE]` / `[TEST]` `[LOW]` Vestigial `as unknown as { waveParams }` double-cast + parallel local `WaveParams` interface at `tests/core/tie-wave-ramp.test.ts:171,186–192`. Matches lang-review #1; confirmed (not dismissed). Test-only, no runtime risk, mirrors the merged `difficulty.test.ts` idiom. Recommended (non-blocking) cleanup: direct `import { waveParams, type WaveParams }`. Recorded as a Delivery Finding for follow-up.
- `[EDGE]` / `[SILENT]` `[LOW]` Table lookup assumes integer `wave`; a fractional wave would yield `undefined` → silent no-fire. Unreachable today (`wave` integer by construction). Non-blocking robustness note.
- `[TYPE]` `[VERIFIED]` `WaveParams.maxConcurrentShots: number` + `readonly` table are consistent with codebase style; no unsafe source casts.
- `[DOC]` `[VERIFIED]` Comments accurate — ROM:8D71/§8 citations and the wave→cap claims check out.
- `[SIMPLE]` `[VERIFIED]` Minimal, no dead code; explicit table is a documented fidelity choice.
- `[SEC]` `[VERIFIED]` N/A — pure deterministic core, no input/auth/secret/tenant surface.

**Data flow traced:** `state.wave` → `waveParams(state.wave)` → `FIRE_CONCURRENCY[clamp(wave-1)]` → `params.maxConcurrentShots` → space-phase fire gate `enemyShots.length < params.maxConcurrentShots` → bounded fireball emission (≤ 6 pool, ≥ 1). Safe because the index is clamped, the table is bounded `[1,6]`, and `wave` is integer by construction.

**Pattern observed:** Single-sourced named lookup table beside the existing ramp constants, ported 1:1 from the cabinet ROM with citation — `src/core/gameRules.ts:160–179`. Good pattern; matches the repo's faithful-port convention.

**Error handling:** Pure deterministic function; index clamped to table bounds, cap can neither exceed the pool nor reach zero. No exceptions to handle in the pure core.

**ACs:** all four met — AC#1 (table drives the cap + existing scalar knobs), AC#2 (monotonic cap + sim escalation), AC#3 (flight/9-2/9-3 untouched; wave-1 fire-volume change is the Jedi-approved fidelity deviation), AC#4 (371/371 green, build clean, deterministic). Tests: GREEN (preflight-verified). Deviations: all 5 audited and ACCEPTED; no undocumented divergence.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.