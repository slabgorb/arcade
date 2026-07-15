---
story_id: "sw7-1"
jira_key: "sw7-1"
epic: "sw7"
workflow: "tdd"
---
# Story sw7-1: R1 Timebase reconcile — kill TICK_HZ=30; the cabinet game frame is 20.508 Hz and everything routed through 30 runs 1.46x-2.93x fast

## Story Details
- **ID:** sw7-1
- **Jira Key:** sw7-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** gitflow (feat/sw7-1-timebase-reconcile)
- **Assigned To:** Keith Avery

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-15T14:48:19Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-15T13:50:56Z | 2026-07-15T13:54:34Z | 3m 38s |
| red | 2026-07-15T13:54:34Z | 2026-07-15T14:21:19Z | 26m 45s |
| green | 2026-07-15T14:21:19Z | 2026-07-15T14:34:50Z | 13m 31s |
| review | 2026-07-15T14:34:50Z | 2026-07-15T14:48:19Z | 13m 29s |
| finish | 2026-07-15T14:48:19Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

No upstream findings during setup.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (blocking): the audit rig merged via PR #90 breaks `tsc --noEmit`, so `npm run build` AND `npm run lint` fail — `pf check` (Dev's GREEN gate) is red for a reason unrelated to the timebase. `tests/audit/citations.test.ts:5` imports `checkFindings` from `../../tools/audit/check-citations.mjs`, a JS module with no `.d.ts`, and `tsconfig.json` (`include: ["src","tests"]`) has no `allowJs`/`checkJs` → error TS7016. `npm test` (vitest/esbuild) is green, which hides it. Affects `tools/audit/check-citations.mjs` / `tsconfig.json` / `tests/audit/citations.test.ts` (Dev must add a declaration, enable allowJs, or adjust the import so `tsc --noEmit` passes). *Found by TEA during test design.*
- **Improvement** (non-blocking): `src/core/state.ts:211-219` and `:225-229` justify `TICK_HZ = 30` / `ENEMY_SHOT_TTL` as "PROVISIONAL — playtest-tuned, not unit-tested … NOT pinned by the disassembly." The primary source refutes that (WSINT.MAC:147 pins 20.508 Hz; T-007), and sw7-1 now unit-tests it. Affects `src/core/state.ts` (Dev must rewrite these comments when setting `TICK_HZ`). *Found by TEA during test design.*
- **Improvement** (non-blocking): `tests/core/homing-fireball.test.ts:22-25` still calls `TICK_HZ` "unpinned … PROVISIONAL feel." Now stale. Affects `tests/core/homing-fireball.test.ts` (comment refresh only — its assertions are TICK_HZ-agnostic and still pass). *Found by TEA during test design.*
- **Question** (non-blocking): when Dev fixes, set `remediated_by: sw7-1` on **T-007** & **T-008** (`docs/audit/findings/pair-timing.json`) and **G-003** (`docs/audit/findings/pair-guns.json`), and keep `npm test -- citations` green. **G-001** is CONFIRMED-faithful (the 7/8 ratio, no code change) — its cadence is corrected implicitly by the TICK_HZ fix; it is not a fix-class finding, so no `remediated_by`. Affects the two findings JSON files. *Found by TEA during test design.*

### Dev (implementation)
- **Resolved** (TEA's blocking tsc finding): added `tools/audit/check-citations.d.mts` declaring `checkFindings`, so `tests/audit/citations.test.ts`'s `.mjs` import type-resolves under `moduleResolution: bundler`. `tsc --noEmit` is now 0 errors and `npm run build` passes. Chose a colocated declaration over `tsconfig allowJs` (surgical, typed, no project-wide compiler change). *Found+fixed by Dev during implementation.*
- **Improvement** (non-blocking, heads-up for Reviewer): `reanchor-citations.mjs --write` re-serialized the 8 findings files it touched, normalizing `\uXXXX` escapes to literal UTF-8 (`—`, `→`). That inflates the textual diff (~560 lines) but a parsed semantic diff confirms the ONLY field changes are 34 `ours.line` reanchors + 3 `remediated_by` marks — no `verbatim`/`claim`/`title`/`source` content changed. Affects `docs/audit/findings/*.json` (nothing to change — recorded so the diff size isn't mistaken for content churn). *Found by Dev during implementation.*
- No other upstream findings during implementation.

### Reviewer (code review)
- **Improvement** (non-blocking): stale doc comment — `src/core/state.ts` `trenchTimer` field doc (the `/** The trench voice-line timer … */` block, ~lines 615-621) still reads "An integer tick counter that advances by 1 each trench step … A per-step tick, not dt-scaled." That describes the EXACT model sw7-1 reversed; the sim.ts logic comment was updated but this field doc was missed. Actively misleading (a reader could re-introduce the `=== ` bug). Affects `src/core/state.ts` (rewrite the field doc to "advances by dt·TICK_HZ game-frames; cues fire on threshold crossing"). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `tests/core/rom-timebase.test.ts:146` `expect(ENEMY_SHOT_TTL * TICK_HZ).toBeCloseTo(64, 3)` is tautological for the T-007/G-003 defect (mutation-proven GREEN at TICK_HZ=30) — it sits in the "…3.12 s (G-003)" block implying it guards the seconds fix, but only catches a numerator 64→63 regression. Not vacuous (it CAN fail), just mislabeled/redundant — the two assertions above it already mutation-provenly pin the fix. Affects `tests/core/rom-timebase.test.ts` (relabel to its own "64-frame count" block or delete). *Found by Reviewer + [TEST] subagent during code review.*
- **Gap** (non-blocking): no test exercises `dt=0` or a huge single `dt` that crosses multiple same-parity trench thresholds in one step (behaviour is correct-by-construction — each cue checked independently — but unverified; never occurs under the fixed 1/60 loop). Affects `tests/core/rom-timebase.test.ts` (optional huge-dt coverage). *Found by [TEST] subagent, confirmed by Reviewer.*

## Impact Summary

**Upstream Effects:** 3 findings (0 Gap, 0 Conflict, 0 Question, 3 Improvement)
**Blocking:** None

- **Improvement:** `src/core/state.ts:211-219` and `:225-229` justify `TICK_HZ = 30` / `ENEMY_SHOT_TTL` as "PROVISIONAL — playtest-tuned, not unit-tested … NOT pinned by the disassembly." The primary source refutes that (WSINT.MAC:147 pins 20.508 Hz; T-007), and sw7-1 now unit-tests it. Affects `src/core/state.ts`.
- **Improvement:** `tests/core/homing-fireball.test.ts:22-25` still calls `TICK_HZ` "unpinned … PROVISIONAL feel." Now stale. Affects `tests/core/homing-fireball.test.ts`.
- **Improvement:** stale doc comment — `src/core/state.ts` `trenchTimer` field doc (the `/** The trench voice-line timer … */` block, ~lines 615-621) still reads "An integer tick counter that advances by 1 each trench step … A per-step tick, not dt-scaled." That describes the EXACT model sw7-1 reversed; the sim.ts logic comment was updated but this field doc was missed. Actively misleading (a reader could re-introduce the `=== ` bug). Affects `src/core/state.ts`.

### Downstream Effects

Cross-module impact: 3 findings across 2 modules

- **`src/core`** — 2 findings
- **`tests/core`** — 1 finding

### Deviation Justifications

4 deviations

- **Rewrote sw3-4's trench tick-model contract**
  - Rationale: the story explicitly reverses the sw3-4 deviation; the old contract can't coexist with the fix. Word_4B0E thresholds (16/22/24) and parity semantics are unchanged — only the counter's RATE.
  - Severity: minor (expected by the story)
  - Forward impact: none beyond sw7-1 — the corrected timing is the new baseline.
- **Assumed the float game-frame-accumulator seam for `trenchTimer`**
  - Rationale: "accumulate dt·20.508" is T-008's primary recommendation and the faithful port of word_4B0E (a timer, not a position).
  - Severity: minor
  - Forward impact: if Dev instead drives the clock off `trenchScrollZ` and drops/renames the `trenchTimer` field, those field-level tests in trench-voice-timer.test.ts must be updated (the authoritative rom-timebase.test.ts contract still holds unchanged).
- **Implemented the float game-frame-accumulator seam (matching TEA's assumption)**
  - Rationale: word_4B0E is a frame timer; the faithful port is a frame accumulator, not a scroll-position derivation. TICK_HZ now IS the game-frame rate, so the timer, the fireball TTL, and the homing decay all ride the ONE corrected constant.
  - Severity: minor (the story's intended approach)
  - Forward impact: none — the corrected timing is the new baseline.
- **Cleared the blocking tsc finding with a declaration file, not `allowJs`**
  - Rationale: most surgical, keeps the checker typed at the call site, no cascade to the other `tools/audit/*.mjs`.
  - Severity: minor
  - Forward impact: none — future `.mjs` tools imported by tests will each want their own `.d.mts`.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No deviations recorded.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Rewrote sw3-4's trench tick-model contract**
  - Spec source: docs/audit/findings/pair-timing.json, T-008; epic-sw7 (sw7-1 subsumes T-008)
  - Spec text: "trenchTimer advances per 60 Hz step, not per 20.508 Hz game frame (2.93x too fast) … Fix: advance the trench clock on the game-frame rate"
  - Implementation: `tests/core/trench-voice-timer.test.ts` previously pinned the per-step INTEGER counter (+1/step, "independent of dt") as golden — itself a logged sw3-4 deviation. I rewrote those assertions to the frame-true model (advances at 20.508 Hz; cues fire at their wall-clock times 0.78/1.07/1.17 s) and re-expressed the parity/once/reset/return-path/determinism coverage against sim-time.
  - Rationale: the story explicitly reverses the sw3-4 deviation; the old contract can't coexist with the fix. Word_4B0E thresholds (16/22/24) and parity semantics are unchanged — only the counter's RATE.
  - Severity: minor (expected by the story)
  - Forward impact: none beyond sw7-1 — the corrected timing is the new baseline.
- **Assumed the float game-frame-accumulator seam for `trenchTimer`**
  - Spec source: docs/audit/findings/pair-timing.json, T-008 ("accumulate dt·20.508, OR drive the trench off trenchScrollZ")
  - Spec text: T-008 permits two fix seams.
  - Implementation: the seam-AGNOSTIC contract (cue wall-clock timing + frame-rate independence) lives in `tests/core/rom-timebase.test.ts` and reads ONLY emitted speech events — it passes under either seam. But `tests/core/trench-voice-timer.test.ts` reads/seeds `trenchTimer` as a float field (4 field-level tests + 2 return-path fixtures seeded at `F_LUKE - 0.1`), which assumes the accumulator seam.
  - Rationale: "accumulate dt·20.508" is T-008's primary recommendation and the faithful port of word_4B0E (a timer, not a position).
  - Severity: minor
  - Forward impact: if Dev instead drives the clock off `trenchScrollZ` and drops/renames the `trenchTimer` field, those field-level tests in trench-voice-timer.test.ts must be updated (the authoritative rom-timebase.test.ts contract still holds unchanged).

### Dev (implementation)
- **Implemented the float game-frame-accumulator seam (matching TEA's assumption)**
  - Spec source: docs/audit/findings/pair-timing.json, T-008 ("accumulate dt·20.508, OR drive off trenchScrollZ"); TEA Design Deviation (assumed accumulator seam)
  - Spec text: "advance the trench clock on the game-frame rate — accumulate dt*20.508"
  - Implementation: `sim.ts` `const trenchTimer = state.trenchTimer + dt * TICK_HZ` (float game-frames), and the cue fires on threshold CROSSING (`state.trenchTimer < cue.timer && trenchTimer >= cue.timer`) instead of the old exact per-step equality (`=== trenchTimer`). Kept the `trenchTimer` field. This is T-008's primary recommendation and matches TEA's seam assumption, so both the seam-agnostic (rom-timebase) and field-level (trench-voice-timer) suites pass.
  - Rationale: word_4B0E is a frame timer; the faithful port is a frame accumulator, not a scroll-position derivation. TICK_HZ now IS the game-frame rate, so the timer, the fireball TTL, and the homing decay all ride the ONE corrected constant.
  - Severity: minor (the story's intended approach)
  - Forward impact: none — the corrected timing is the new baseline.
- **Cleared the blocking tsc finding with a declaration file, not `allowJs`**
  - Spec source: TEA Delivery Finding (blocking): the rig's `.mjs` import breaks `tsc --noEmit`
  - Spec text: "Dev must add a declaration, enable allowJs, or adjust the import so `tsc --noEmit` passes."
  - Implementation: added `tools/audit/check-citations.d.mts` (typed `checkFindings` signature). Did NOT enable `tsconfig` `allowJs` (would change project-wide compile semantics and pull the `.mjs` body into the program).
  - Rationale: most surgical, keeps the checker typed at the call site, no cascade to the other `tools/audit/*.mjs`.
  - Severity: minor
  - Forward impact: none — future `.mjs` tools imported by tests will each want their own `.d.mts`.

### Reviewer (audit)
- **TEA: Rewrote sw3-4's trench tick-model contract** → ✓ ACCEPTED by Reviewer: the story explicitly subsumes T-008; the old per-step contract cannot coexist with the fix. Mutation-proven — reverting `trenchTimer` to `+ 1` reds 10 tests, and the rewrite preserved all 22 sw3-4 `it`-blocks (44 vs 42 `expect()` — coverage grew, not shrank; confirmed by [TEST] subagent via `git show develop:`).
- **TEA: Assumed the float game-frame-accumulator seam** → ✓ ACCEPTED by Reviewer: the authoritative contract (`rom-timebase.test.ts`) is seam-agnostic (observable speech events, mutation-proven); the field-level coupling in `trench-voice-timer.test.ts` is honestly disclosed and matches Dev's implementation. Sound.
- **Dev: Implemented the float game-frame-accumulator seam** → ✓ ACCEPTED by Reviewer: `state.trenchTimer + dt * TICK_HZ` with crossing detection is T-008's primary recommendation and keeps core purity (rule-checker: 0 violations, all `dt`-driven). Crossing check mutation-proven (reverting to exact-equality reds 13 tests).
- **Dev: Cleared the blocking tsc finding with a declaration file, not `allowJs`** → ✓ ACCEPTED by Reviewer: `check-citations.d.mts` is a type-only declaration matching the `.mjs` export (security + rule-checker both verified: no `declare global`, no runtime change); surgical, no project-wide compiler change. `tsc --noEmit` 0 errors.
- No UNDOCUMENTED deviations: the implementation matches the audit findings (T-007/T-008/G-003) exactly; the semantic findings diff shows only `line` + `remediated_by` changes (no laundering, triple-confirmed).

## Sm Assessment

**Story:** sw7-1 — R1 Timebase reconcile. Foundational story of epic sw7 (the 2026-07-15 primary-source ruling sheet). MUST land before any other numeric sw7 story — all later constants re-bake on this timebase.

**Target (from the audit):** `TICK_HZ = 30` in `star-wars/src/core/state.ts` is wrong; the cabinet game frame is **20.508 Hz** (WSINT.MAC:147 — 12 IRQs @ 246.094 Hz). Everything routed through 30 runs **1.46×–2.93× fast**. Two named symptoms: `trenchTimer` counts 60 Hz steps (2.93× fast) and fireball lifetime is 2.13 s vs the ROM's 3.12 s. Scope requires verifying **every** `TICK_HZ` consumer, not just the constant. Subsumes findings **T-007, T-008, G-003** (+ G-001 cadence correction).

**Base branch — resolved before setup:** star-wars is gitflow (base = `develop`). The audit rig (findings JSON, `tests/audit/citations.test.ts`, ruling sheet, reanchor tooling) lived only on draft PR #90 and was **not** on develop. Per the user's decision, PR #90 was marked ready and squash-merged to develop (commit `3580752`), so the rig is now the permanent baseline. Story branched off develop.

**Evidence / citations contract (for TEA + Dev):**
- Evidence JSON: `star-wars/docs/audit/findings/pair-timing.json` (finding ids T-007, T-008, G-003, G-001).
- Audit doc: `star-wars/docs/2026-07-15-star-wars-primary-source-audit.md`, section **Timing**.
- Fixing a finding = set its `remediated_by: sw7-1` **and** keep `npm test -- citations` green (`tests/audit/citations.test.ts`). Do not let the citations gate go red.

**Routing:** tdd (phased). Setup complete, verified on disk (session + context + branch + in_progress status). Handing off to **TEA (Furiosa)** for the RED phase — write failing tests that pin the 20.508 Hz game-frame cadence and the derived durations (trench timer, fireball lifetime) before any implementation. Witness me.

## Tea Assessment

**Tests Required:** Yes
**Reason:** A pure-core timing correction with concrete, machine-checked target values (T-007/T-008/G-003). Not a chore-bypass candidate — the whole point is to pin numbers that were previously "provisional."

**Test Files:**
- `tests/core/rom-timebase.test.ts` (NEW) — the sw7-1 golden suite. Pins: `TICK_HZ` = 246.094/12 ≈ 20.508 Hz (T-007); `ENEMY_SHOT_TTL` = 64 frames ÷ 20.508 ≈ 3.12 s (G-003) + the 64-frame-count invariant; homing decay rides the 20.508 cadence not 30 (G-001 ratio faithful, T-007 basis); and the trench voice cues fire at their ROM **wall-clock** times (0.78/1.07/1.17 s) and are **frame-rate independent** (T-008). The trench tests read only emitted speech events — **seam-agnostic**, so they hold under either T-008 fix (accumulate dt·20.508 or drive off trenchScrollZ).
- `tests/core/trench-voice-timer.test.ts` (REWRITTEN) — reconciled sw3-4's suite to the frame-true model (see Design Deviations). Keeps parity / once-per-run / reset / return-path / determinism / union coverage; now asserts wall-clock cue timing instead of the per-step integer counter.

**Tests Written:** 8 new (rom-timebase) + 15 reconciled (trench-voice-timer). RED = **16 failing** across the two files (7 rom-timebase + 9 trench-voice-timer), pinning T-007, T-008, G-003, G-001-cadence.
**Status:** RED (verified) — full suite **16 failed | 1190 passed (1206)**; every failure is in these two files, zero collateral. Citations gate green (12/12). Both files type-clean (`tsc --noEmit`).

**RED failures verified for the right reason (not vacuous):**
- `TICK_HZ` reads 30, expected 20.508 → fail.
- `ENEMY_SHOT_TTL` reads 2.13 s, expected 3.12 s → fail.
- homing 0.2 s decay reads (7/8)^6 = 0.449, expected (7/8)^4.1 = 0.578 → fail.
- trench cues fire at step-index time (Luke 0.267 s = 16/60) vs ROM 0.780 s → fail; and at 30 Hz vs 120 Hz the per-step counter fires 0.40 s apart → frame-rate-independence fail.
- return-path fixtures (trenchTimer 15.9) don't fire under exact-equality `=== 16` → fail (the fix's crossing detection will fire them).

### Rule Coverage

| Rule source | Applies? | Coverage |
|-------------|----------|----------|
| `.pennyfarthing/gates/lang-review/typescript.md` | **absent in this install** | N/A — no checklist file exists (`.pennyfarthing/gates/` not present). |
| `.claude/rules/*.md`, `SOUL.md` | absent | N/A — none present. |
| `star-wars/CLAUDE.md` — pure dt-based core, frame-rate independence | **yes** | Actively **enforced**: the dt-scaling test + the 30 Hz/120 Hz test fail loudly on a per-step (frame-rate-dependent) counter; all tests drive the pure `stepGame` with seeded RNG, no DOM/clock. |
| Project convention — colour-family/topology not pixels; don't over-couple tests to one seam (sidecar) | yes | The authoritative trench contract (rom-timebase.test.ts) reads only observable speech events, agnostic to the T-008 fix seam. |

**Rules checked:** the project's real rules live in `star-wars/CLAUDE.md`; no formal lang-review rubric ships here. **Self-check:** 0 vacuous tests — every assertion discriminates the fix (the one always-green test, `TTL × frame-rate = 64`, is a deliberate structural guard on the 64-frame count; mutation-checked: it fails if Dev decouples TTL from the count).

**Handoff:** To Dev (The Word Burgers) for GREEN. The fix: set `TICK_HZ` to the game-frame rate (246.094/12 ≈ 20.508) — this auto-corrects `ENEMY_SHOT_TTL` and the homing cadence — and make `trenchTimer` advance at that rate with crossing-based cue detection (accumulate dt·TICK_HZ). Then mark T-007/T-008/G-003 `remediated_by: sw7-1`, keep `npm test -- citations` green, refresh the stale state.ts comments, and clear the **blocking** tsc/build finding (Delivery Findings) so `pf check` passes.

## Dev Assessment

**Implementation Complete:** Yes — every RED test is GREEN, minimal change, no scope creep.

**Files Changed:**
- `src/core/state.ts` — `TICK_HZ = 30` → `246.094 / 12` (20.508 Hz, WSINT.MAC:147). `ENEMY_SHOT_TTL` (= 64/TICK_HZ) and the homing decay (`pow(7/8, dt·TICK_HZ)`) auto-correct off the one constant. Rewrote the stale "PROVISIONAL / not pinned by the disassembly" comments on both consts + the `ENEMY_SPEED` "(30)" reference.
- `src/core/sim.ts` — trench voice timer is now frame-true: `trenchTimer += dt · TICK_HZ` (game frames) with crossing-based cue detection, replacing the per-step `+1` / exact-equality (T-008).
- `docs/audit/findings/pair-timing.json` (T-007, T-008) + `pair-guns.json` (G-003) — `remediated_by: sw7-1`.
- `docs/audit/findings/*.json` (8 files) — `reanchor-citations.mjs --write`: 34 `ours.line` drift fixes (my edits shifted state.ts +1 / sim.ts +3), 0 lost. The tool also normalized `\u`→UTF-8 (cosmetic; semantic diff = line/remediated_by only).
- `tools/audit/check-citations.d.mts` (NEW) — declaration clearing the blocking tsc error.

**Tests:** **1206/1206 passing (GREEN)** — the 16 sw7-1 tests pass, zero sibling regressions across 101 files.
**Gates:** `tsc --noEmit` 0 errors · `npm run build` ✓ (tsc + vite build) · `npm test -- citations` 12/12.
**Branch:** feat/sw7-1-timebase-reconcile (to be pushed).

**Self-review:**
- [x] Wired: `TICK_HZ` is consumed by the sim (TTL, homing, trench timer) — verified via full-suite behavior, not just the constant.
- [x] Minimal: no new abstractions; the two symptom fixes fall out of the one constant + one counter change.
- [x] All ACs met: TICK_HZ 20.508 (T-007), fireball 3.12 s (G-003), homing cadence (G-001), trench cues frame-true + frame-rate independent (T-008).
- [x] Ran the FULL suite (per sidecar) — the TICK_HZ/TTL/trench changes touched no sibling fixture.

**Handoff:** To the verify/review phase.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1206/1206, tsc 0, build ✓, citations 12/12, 0 code smells, tree clean |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — Reviewer covered: crossing-detection edges (first step, huge-dt multi-threshold, exact-landing, float drift, reset) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — Reviewer covered: pure arithmetic, no error handling to swallow |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | confirmed 3 (F1 tautological LOW, F2 coupling LOW, F3 missing-edge MED — all non-blocking); 4/4 required mutation proofs RED-confirmed |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — Reviewer covered: found 1 stale comment (state.ts trenchTimer doc) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — Reviewer covered: number types unchanged, `.d.mts` appropriate, no unsafe casts |
| 7 | reviewer-security | Yes | clean | none | N/A — no non-determinism in core/, `.d.mts` type-only, no laundering, no secrets |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — Reviewer covered: minimal change, no dead code / over-engineering |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations | N/A — 22 instances across 4 rules (core purity, single-definition, gitflow, audit-fidelity) all compliant |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled per settings)
**Total findings:** 4 confirmed (all non-blocking LOW/MED — 3 from [TEST], 1 [DOC] Reviewer-found), 0 dismissed, 0 deferred.

## Reviewer Assessment

**Verdict:** APPROVED

No Critical or High severity issues. The fix is correct and — decisively for a self-authored review — **mutation-proven** by both the [TEST] subagent and my own serial reversions. All confirmed findings are LOW/MEDIUM test-quality and doc clarity.

**Observations:**
- `[VERIFIED]` **TICK_HZ = 246.094 / 12 (20.508 Hz)** is the pinned game frame — state.ts:221, WSINT.MAC:147. Mutation-proven: reverting to `30` reds 6/8 `rom-timebase` tests (my own serial check + [TEST]). Tolerance sweep (18→25 Hz) confirms only ~20.508 passes — no loose-tolerance false-pass.
- `[VERIFIED]` **trenchTimer is frame-true** — sim.ts:612 `state.trenchTimer + dt * TICK_HZ`, cue on crossing (sim.ts:615). Reverting to `+ 1` reds 10 tests; reverting crossing→exact-equality reds 13 ([TEST] + my serial). ENEMY_SHOT_TTL and homing decay auto-ride the one corrected constant.
- [RULE] **0 violations / 22 instances** — core purity intact (no DOM/Date.now/Math.random/rAF; all time via `dt`; deterministic), TICK_HZ single-defined + imported, audit-fidelity respected. Independently re-verified by rule-checker's own JSON diff.
- [SEC] **clean** — no non-determinism introduced into core/; `check-citations.d.mts` is type-only (no `declare global`/augmentation/runtime); no secrets/leakage; findings diff is not laundered.
- [TEST] **F1 (LOW):** `ENEMY_SHOT_TTL * TICK_HZ ≈ 64` (rom-timebase:146) is tautological for T-007/G-003 (green at TICK_HZ=30) — mislabeled inside the "3.12 s" block; catches only a numerator regression. Not the sole guard (the two assertions above are mutation-proven), so verification integrity is intact — logged as a non-blocking cleanup, not a blocker.
- [TEST] **F3 (MEDIUM):** no `dt=0`/huge-dt multi-threshold test. Behaviour is correct-by-construction (each cue checked independently → all crossed same-parity cues fire) and never occurs under the fixed 1/60 loop. Non-blocking coverage gap.
- [TEST] **F2 (LOW):** return-path `F_LUKE - 0.1` margin coupled to `dt·TICK_HZ`; documented, non-vacuous (mutation-proven). Non-blocking.
- [DOC] **stale comment (LOW):** state.ts:615-621 `trenchTimer` field doc still says "per-step tick, not dt-scaled" — the reversed model. Misleading but tests guard the behavior. Reviewer-found (comment-analyzer disabled).
- [TYPE] no issues — `TICK_HZ`/`trenchTimer` stay `number`; the new `CitationFinding` interface is appropriately open for the finding shape. (type-design disabled — Reviewer-covered.)
- [SIMPLE] minimal — two symptom fixes fall out of one constant + one counter change; no abstractions, no dead code. (simplifier disabled — Reviewer-covered.)
- [EDGE] crossing-detection edges hold — first step (0 < T), a single huge dt fires every crossed same-parity cue (correct), exact-threshold landing fires once then `< T` blocks re-fire, float drift (~1e-10) is negligible vs integer thresholds, reset-on-entry re-arms. (edge-hunter disabled — Reviewer-covered.)
- [SILENT] N/A — pure arithmetic, no error paths to swallow. (silent-failure disabled — Reviewer-covered.)

**Data flow traced:** `dt` (input) → `stepGame` → `trenchTimer += dt·TICK_HZ` → crossing check → `speech` GameEvent → shell plays. Safe: deterministic, pure, no external state; the same input always yields the same cue timing.

**Pattern observed:** the "one corrected constant cascades" pattern — TICK_HZ drives TTL + homing + trench timer, so the fix is a single source-of-truth edit (state.ts:221) plus the one non-dt-scaled counter (sim.ts:612). Good.

### Devil's Advocate

Assume this is broken. **Timing overflow:** a tab-switch produces a huge `dt` — could `trenchTimer` skip a cue? No: the crossing check `prev < T && now >= T` fires whenever the accumulator *passes* T, however far it jumps, and each cue is tested independently, so even a jump from 10→30 fires both 16 and 24. And in real play `createLoop` clamps elapsed at 0.25 s and sub-steps at 1/60, so `dt` is never huge. **Float rot:** over a long trench `trenchTimer` accumulates float error — but ~1e-10 over thousands of steps is nothing against integer thresholds; no missed or doubled crossing. **The tautological test hides a regression?** It would, if it were the *sole* guard — but reverting TICK_HZ to 30 still reds six other assertions, so the fix is covered; F1 is dead weight, not a blind spot. **Longer fireball life (3.12 s vs 2.13 s):** surface fireballs now travel ~1.46× farther before expiring and homing shots arrive slightly later — could that break a sibling? The full 1206-test suite is green and no fixture assumed the old life; and 3.12 s IS the authentic ROM value (64 frames ÷ 20.508 Hz), so this is *more* faithful, not a regression. **The stale comment:** a future Dev reading "per-step, not dt-scaled" could write `trenchTimer === 16` and re-introduce T-008 — but the wall-clock + frame-rate-independence tests would red immediately (mutation-proven). **The reanchor laundered a finding?** Triple-verified (my semantic diff + security + rule-checker, all independent) that only `line` and `remediated_by` changed — no `verbatim`/`claim`/`source` drift. **The `.d.mts` lies about the checker's types?** It types `checkFindings` permissively and doesn't check the `.mjs` body — but the checker is runtime-verified by the 12/12 citations gate, so a type-only shim can't mask a behavioral break. Nothing here rises above LOW/MEDIUM; the correctness core is sound and adversarially confirmed.

**Handoff:** To SM (The Organic Mechanic) for finish-story. The four non-blocking findings (stale comment, tautological/mislabeled test, huge-dt coverage, margin coupling) are captured as Delivery Findings for a trivial follow-up — none gates the merge.