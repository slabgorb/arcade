---
story_id: "sw7-2"
jira_key: "sw7-2"
epic: "sw7"
workflow: "tdd"
---
# Story sw7-2: R2 Wave-parity family — GM.WAV is 0-based, ours 1-based: Imperial March, Great-shot-kid and both trench voice sets fire on wrong or inverted wave sets

## Story Details
- **ID:** sw7-2
- **Jira Key:** sw7-2
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-15T16:50:13Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-15T15:33:48Z | 2026-07-15T15:37:22Z | 3m 34s |
| red | 2026-07-15T15:37:22Z | 2026-07-15T16:04:50Z | 27m 28s |
| green | 2026-07-15T16:04:50Z | 2026-07-15T16:22:43Z | 17m 53s |
| review | 2026-07-15T16:22:43Z | 2026-07-15T16:40:21Z | 17m 38s |
| green | 2026-07-15T16:40:21Z | 2026-07-15T16:45:05Z | 4m 44s |
| review | 2026-07-15T16:45:05Z | 2026-07-15T16:50:13Z | 5m 8s |
| finish | 2026-07-15T16:50:13Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): the fix's single-mutation-point seam. Dev must (a) add `'letGoLuke'` to the `SpeechLine` union — `tsc --noEmit` is RED on exactly this in two files; (b) source the trench parity (`src/core/sim.ts:613`, currently `state.wave % 2`), the greatShotKid gate (`sim.ts:758`, currently an UNCONDITIONAL push), and the `musicTrackFor` predicate (`sim.ts:893`, currently `wave >= 3 && wave % 2 === 1`) from ONE 0-based accessor (`state.wave - 1`) so AC-2's "flip the shim → a test goes red" holds; (c) add `{ timer: 16, parity: <even-human>, line: 'letGoLuke' }` to `TRENCH_VOICE_CUES`. Affects `src/core/events.ts` and `src/core/sim.ts`. *Found by TEA during test design.*
- **Conflict** (blocking, doc-fidelity): `src/core/sim.ts:905-909` (the `TRENCH_VOICE_CUES` doc) asserts "The 1983 cabinet gates on `byte_4B12` (the trench section-chain index); until that lands in sw3-7 we source parity from `wave`." The ROM refutes this — `WSMAIN.MAC:1868` gates the trench voice on `LDA BS.WAV / LSRA`, i.e. the 0-based WAVE, not `byte_4B12`; sw7-2 subsumes that deferred "sw3-7". Dev must rewrite this comment when reconciling the parity source or it re-misleads the next reader. Affects `src/core/sim.ts`. *Found by TEA during test design.*
- **Question** (non-blocking): AC-4 citations. When Dev edits `sim.ts`/`events.ts` the `ours.line` anchors for U-005/006/007/008 in `docs/audit/findings/pair-audio.json` shift — reanchor them and set `remediated_by: sw7-2` on the fix-class findings (U-005/006/007), keeping `npm test -- citations` green. U-008 is class CONFIRMED (data faithful, no data change) but its `refutation_corrections` name the parity-base inversion that sw7-2 fixes — Reviewer to rule whether U-008 also earns `remediated_by`. Affects `docs/audit/findings/pair-audio.json`. *Found by TEA during test design.*
- **Note** (non-blocking): trench parity value semantics for the shim — BS.WAV even ⟺ human ODD waves {1,3,5,...} (Luke/Yahoo); BS.WAV odd ⟺ human EVEN {2,4,6,...} (LetGo/Force). The music/speech gate is the different one: March/greatShotKid on human {4,6,8,...} = GM.WAV>=3 AND odd. *Found by TEA during test design.*

### Dev (implementation)
- **Resolved** (TEA's blocking byte_4B12 conflict): corrected the `TRENCH_VOICE_CUES` doc in `sim.ts` AND the `trenchTimer` field doc in `state.ts` — both now cite the 0-based BS.WAV gate (`LDA BS.WAV / LSRA`, WSMAIN:1868); the state.ts doc additionally claimed "per-step tick, not dt-scaled" (false since sw7-1), fixed while there. *Found+fixed by Dev during implementation.*
- **Question** (non-blocking, for Reviewer): U-008 was resolved by RE-POINTING its `ours` citation (line 917→939, verbatim to the new lukeTrustMe cue), NOT by `remediated_by` — it is class CONFIRMED (faithful DATA, unchanged), so the SM/spec rule "don't mark CONFIRMED-faithful as remediated" applies, matching sw7-1's precedent (it left U-008 unmarked for the timing caveat it implicitly fixed). Only the fix-class U-005/006/007 got `remediated_by: sw7-2`. Reviewer to confirm this call. Affects `docs/audit/findings/pair-audio.json`. *Found by Dev during implementation.*
- **Note** (non-blocking): no sibling-fixture ripple beyond TEA's re-seats. Per the "gating a shared mechanism breaks fixtures RED can't see" trap, I ran the FULL suite after the fix (1230/1230) — the greatShotKid gate + the parity inversion broke nothing outside TEA's re-seated/defensive suites. `reanchor-citations.mjs` also touched 5 other pair files (pair-guns/surface/tie-ai/timing/trench) for pure line-drift — 16 MOVED, 0 lost. *Found by Dev during implementation.*

### Reviewer (code review)
- **Conflict** (blocking, doc-fidelity): stale ROM comment at `src/core/sim.ts:775-777` — "so the Imperial March takes over here at wave>=3 odd (ROM sub_6838)" states the PRE-fix 1-based {3,5,7,...} semantics and directly contradicts the corrected `musicTrackFor` doc this same commit wrote at `sim.ts:907-909` (GM.WAV>=3 AND odd = human {4,6,8,...}). Code is correct (musicTrackFor applies romWave0 internally); the comment is a wrong ROM citation that could lead a future reader to "correct" the gate back to the bug. Must be rewritten to the {4,6,8,...} semantics. Affects `src/core/sim.ts`. [RULE] rule-checker, high confidence. *Found by Reviewer during code review.*
- **Question RESOLVED** (non-blocking): U-008 handling — I RULE Dev's decision to re-point (not `remediated_by`) as CORRECT per the SM "don't mark CONFIRMED-faithful as remediated" rule + sw7-1's precedent. BUT U-008's `refutation_corrections` text ("blocked on T-008 / sw3-7 … 2.93x fast") is now STALE: both caveats it names are resolved (timing→sw7-1, parity-base→sw7-2). Add a one-line clarifying note to the U-008 entry so a future reader doesn't re-investigate a closed issue. Affects `docs/audit/findings/pair-audio.json`. [SEC] security, low confidence. *Found by Reviewer during code review.*
- **Gap** (non-blocking, OUT of scope for sw7-2): the trench voice parity ignores the ROM's `BS.WAV = min(GM.WAV, 31)` clamp (`WSMAIN.MAC:1702-1707`; the trench branch reads the clamped BS.WAV at :1868). `romWave0(state.wave)` is UNCLAMPED, so for human waves ≥ 33 the trench voice-line PAIR diverges from the cabinet (cosmetic; the ROM stays on the odd branch once BS.WAV pins at 31). Unreachable in practice and NOT in the audit's U-007/U-008 scope; TEA's high-wave tests (100/101) encode the unclamped behavior. Recommend a NEW audit finding + follow-up story, not a sw7-2 change. Affects `src/core/sim.ts` (a future clamp). [EDGE] (specialist disabled — my own boundary analysis, ROM-confirmed). *Found by Reviewer during code review.*
- **Improvement** (non-blocking, optional): `tests/core/wave-parity-gates.test.ts` — the "letGoLuke is a wired SpeechLine" test does `const line: SpeechLine = 'letGoLuke'; expect(line).toBe('letGoLuke')`; the runtime `expect` is tautological (its real value is the compile-time type pin, which is legitimate and independently enforced by `tsc`). `trench-voice-timer.test.ts`'s `TRENCH_LINES` distinctness check already pins the union member more defensibly. Optional: drop the runtime expect. Affects `tests/core/wave-parity-gates.test.ts`. [TEST] test-analyzer, low confidence. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** (rebuilt manually — the auto-writer's word-wrap regex wrote "No upstream effects noted"; the Delivery Findings carry real effects)
- **Follow-up recommended (non-blocking):** the trench voice parity does NOT apply the ROM's `BS.WAV = min(GM.WAV, 31)` clamp (WSMAIN:1702), so trench voice-line pairs diverge from the cabinet at human waves ≥ 33 (cosmetic, unreachable in play). Reviewer recommends a NEW audit finding + follow-up story; explicitly OUT of scope for sw7-2.
- **Unblocks the epic's dependents:** sw7-3 (`depends_on: sw7-2`) and the S-012 0-based bonus-table indexing (sw7-4) can now build on the reconciled 0-based wave base.
- **Audit trail updated:** U-005/006/007 marked `remediated_by: sw7-2`; U-008 re-pointed + clarifying note (stays CONFIRMED-faithful, not remediated); 16 `ours` citations reanchored across 6 `pair-*.json` files (0 lost, `npm test -- citations` green).
**Blocking:** None

### Deviation Justifications

5 deviations

- **Re-seated music-cue.test.ts's Imperial March block to the ROM {4,6,8,...} set**
  - Rationale: those assertions encoded the exact defect U-005 names; left unchanged they go RED under Dev's fix, and Dev cannot move goalposts.
  - Severity: minor
  - Forward impact: Reviewer diff-check that only wave→track expectations changed; the edge-firing / one-shot / only-space-theme intents are untouched.
- **Rewrote trench-voice-timer.test.ts for the un-inverted 0-based parity + restored "Let go Luke"**
  - Rationale: U-008 proved the parity base inverted and U-007 that `letGoLuke`@16 is absent; the suite's parity labels were all wrong relative to the ROM.
  - Severity: minor (large, mechanical diff)
  - Forward impact: Reviewer verify the rewrite kept every sw3-4/sw7-1 coverage class (the timer-rate tests are unchanged and stay green); the exhaustive wave map now lives in wave-parity-gates.test.ts.
- **Swapped rom-timebase.test.ts trench fixture waves for the corrected parity**
  - Rationale: sw7-2 inverts which wave carries each line; this timing suite is parity-agnostic but its fixtures assumed the old mapping.
  - Severity: minor
  - Forward impact: none beyond the diff — the frame-rate-independence intent is preserved.
- **Defensively re-seated the greatShotKid payoff tests (speech-cues + exhaust-port-outcome) onto wave 4**
  - Rationale: greatShotKid becomes wave-gated to {4,6,8,...}; wave 1 goes silent after the fix, so the wave-independent payoff smoke-tests must kill on a speaking wave.
  - Severity: minor
  - Forward impact: none — verify each is a pure wave re-seat.
- **Corrected the `state.ts` trenchTimer field comment beyond the strict parity change**
  - Rationale: the dt-scaling half is sw7-1's leftover, strictly outside sw7-2; but it sits in the same comment I was editing for parity and directly contradicts the code, which in a fidelity epic invites re-introduction of the bug. Folded in rather than left as a known lie next to my change.
  - Severity: minor
  - Forward impact: none — doc-only.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Re-seated music-cue.test.ts's Imperial March block to the ROM {4,6,8,...} set**
  - Spec source: context-story-sw7-2.md AC-2; finding U-005 (docs/audit/findings/pair-audio.json)
  - Spec text: "The gated wave SETS match the ROM's 0-based GM.WAV gates ... no remaining ad-hoc `wave % 2` on a 1-based wave for these cues."
  - Implementation: sw3-5's block asserted the March on 1-based {3,5,7,...} (wave 3→March, wave 4→plain, wave 5→March) and even titled it "the gate needs ODD". Flipped those four cases + the "emits every MusicTrack" reachability seed (trenchAtWave 2→3) to the ROM map (wave 4→March; waves 3/5→plain).
  - Rationale: those assertions encoded the exact defect U-005 names; left unchanged they go RED under Dev's fix, and Dev cannot move goalposts.
  - Severity: minor
  - Forward impact: Reviewer diff-check that only wave→track expectations changed; the edge-firing / one-shot / only-space-theme intents are untouched.
- **Rewrote trench-voice-timer.test.ts for the un-inverted 0-based parity + restored "Let go Luke"**
  - Spec source: context-story-sw7-2.md AC-1/AC-2; findings U-007, U-008 (pair-audio.json)
  - Spec text: "the even-wave trench cues are un-inverted per U-008's correction ... both trench voice-line sets all read wave parity through [the shim]."
  - Implementation: sw3-4's suite mapped "even wave→Luke/Yahoo, odd wave→Force" off 1-based parity — the exact inverse of the ROM. Rewrote to the ROM map (human ODD→Luke@16+Yahoo@24; human EVEN→LetGo@16+Force@22), added the restored `letGoLuke` cue + bumped the union check 3→4 lines, and swapped every fixture wave so each block's orthogonal intent (rate/one-shot/reset/return-path/determinism) is preserved.
  - Rationale: U-008 proved the parity base inverted and U-007 that `letGoLuke`@16 is absent; the suite's parity labels were all wrong relative to the ROM.
  - Severity: minor (large, mechanical diff)
  - Forward impact: Reviewer verify the rewrite kept every sw3-4/sw7-1 coverage class (the timer-rate tests are unchanged and stay green); the exhaustive wave map now lives in wave-parity-gates.test.ts.
- **Swapped rom-timebase.test.ts trench fixture waves for the corrected parity**
  - Spec source: finding U-008; the sw7-1 timing suite (T-008)
  - Spec text: context-story-sw7-2.md — "No timebase changes (sw7-1 is done)."
  - Implementation: the sw7-1 wall-clock tests keyed Luke/Yahoo to wave 2 and Force to wave 1; swapped to wave 1 / wave 2 so each line's timing assertion survives the corrected parity. Timing constants and intent are unchanged.
  - Rationale: sw7-2 inverts which wave carries each line; this timing suite is parity-agnostic but its fixtures assumed the old mapping.
  - Severity: minor
  - Forward impact: none beyond the diff — the frame-rate-independence intent is preserved.
- **Defensively re-seated the greatShotKid payoff tests (speech-cues + exhaust-port-outcome) onto wave 4**
  - Spec source: finding U-006; context-story-sw7-2.md AC-2
  - Spec text: "'Great shot kid!' ... fire on wrong or inverted wave sets."
  - Implementation: both suites killed the port on wave 1 and asserted greatShotKid fires; re-seated to wave 4 (a speaking wave), and updated exhaust-port's post-kill wave assertion 2→5. Both PASS on BOTH the shipped (unconditional) and fixed (gated) code, so they never block Dev; U-006's RED coverage lives in wave-parity-gates.test.ts. The clean/dirty Force-bonus contract (wave-independent) is unchanged.
  - Rationale: greatShotKid becomes wave-gated to {4,6,8,...}; wave 1 goes silent after the fix, so the wave-independent payoff smoke-tests must kill on a speaking wave.
  - Severity: minor
  - Forward impact: none — verify each is a pure wave re-seat.

### Dev (implementation)
- **Corrected the `state.ts` trenchTimer field comment beyond the strict parity change**
  - Spec source: TEA delivery finding (Conflict, blocking, doc-fidelity); context-story-sw7-2.md AC-1
  - Spec text: "both trench voice-line sets all read wave parity through [the shim]" (and TEA: "the cabinet gates trench voice on BS.WAV, not byte_4B12")
  - Implementation: rewrote the `sim.ts` TRENCH_VOICE_CUES doc (byte_4B12 → BS.WAV, my scope) AND the `state.ts` `trenchTimer` field doc, which additionally said "advances by 1 each trench step ... per-step tick, not dt-scaled" — false since sw7-1. Fixed both the parity reference and the dt-scaling claim in one pass.
  - Rationale: the dt-scaling half is sw7-1's leftover, strictly outside sw7-2; but it sits in the same comment I was editing for parity and directly contradicts the code, which in a fidelity epic invites re-introduction of the bug. Folded in rather than left as a known lie next to my change.
  - Severity: minor
  - Forward impact: none — doc-only.

### Reviewer (audit)
- **TEA: re-seated music-cue Imperial March block** → ✓ ACCEPTED: only the wave→track expectations flipped to the ROM {4,6,8,...} set; edge-firing/one-shot/only-space intents intact. Corroborated by [TEST] mutation test (42 red on shim flip).
- **TEA: rewrote trench-voice-timer for un-inverted parity + letGoLuke** → ✓ ACCEPTED: [TEST] independently diffed the rewrite's describe/it headers against origin/develop and confirmed EVERY coverage class survives (rate, dt-scaling, out-of-trench silence, one-shot, reset/re-arm, silence windows, parity-stability, union exhaustiveness, both return-paths, determinism) plus the new letGoLuke case — nothing dropped.
- **TEA: swapped rom-timebase trench fixture waves** → ✓ ACCEPTED: parity-agnostic timing intent preserved; the wall-clock assertions survive the corrected parity.
- **TEA: defensively re-seated greatShotKid payoff tests to wave 4** → ✓ ACCEPTED: [TEST] mutation-tested these three fixtures — they are NOT vacuous (all fail under an identity-romWave0 mutant), i.e. they correctly depend on the fix; the exhaustive gate map lives in wave-parity-gates.test.ts.
- **Dev: corrected the state.ts trenchTimer comment beyond strict scope** → ✓ ACCEPTED: folding the dt-scaling correction (sw7-1's leftover) into the parity-comment fix is sound doc hygiene; leaving "per-step tick, not dt-scaled" next to the corrected code would have been a fidelity hazard.
- **Dev: U-008 re-pointed, not remediated_by** → ✓ ACCEPTED (with a non-blocking follow-up): the re-point honors the SM/spec rule for CONFIRMED-faithful findings and matches sw7-1's precedent; the only residue is U-008's now-stale refutation text (filed as a non-blocking Delivery Finding).
- **UNDOCUMENTED (Reviewer-found):** Dev's doc-correction pass corrected several comments but LEFT the `sim.ts:775-777` comment stating the pre-fix "wave>=3 odd" ROM semantics, now self-contradicting the corrected comment at `sim.ts:907-909`. Severity: Medium (misleading ROM documentation with regression potential in a fidelity epic). This is the REJECT blocker — see the severity table.

## Sm Assessment
Triage: clean pickup. p1 bug, 2 pts, star-wars only, tdd. Merge gate clear (no open
PRs). Prerequisite sw7-1 (timebase → 20.508 Hz) is merged to origin/develop (#91);
branched `feat/sw7-2-r2-wave-parity` off it.

One root cause, one root fix: the ROM music/speech gates read the 0-based `GM.WAV`
(`CMPA #4-1` → 1-based waves {4,6,8,...}); ours tests `wave % 2` on a 1-based wave →
disjoint/inverted sets. Fix = one 0-based wave accessor (or -1 shim) that Imperial
March, "Great shot, kid!", and both trench voice sets read through. U-008 correction:
even-wave trench cues are INVERTED, not mismatched. Citations U-005/006/007/008 live in
`docs/audit/findings/pair-audio.json` — set `remediated_by: sw7-2`, keep
`npm test -- citations` green.

Guardrail for TEA/Dev: bonus-table 0-based indexing (S-012) is **sw7-4**, OUT of scope
here — do not pull it in. No timebase changes (sw7-1 done). Make the shim the single
mutation point so the wave→cue map is mutation-provable.

Handing to Imperator Furiosa (TEA) for the RED phase. Witness me.

## Tea Assessment

**Tests Required:** Yes
**Reason:** A wave-parity gating bug (U-005..U-008) — a behavioral contract (which wave
fires which cue) plus a compile-time contract (the restored `letGoLuke` union member).

**Test Files:**
- `tests/core/wave-parity-gates.test.ts` (NEW) — the authoritative, mutation-proof ROM
  wave→cue maps for all four cue families, pinned as exact wave SETS with an explicit
  refutation of the shipped predicate:
  - U-005 Imperial March opens human {4,6,8,10} (`WSMAIN:1421`), not 1-based {3,5,7}.
  - U-006 "Great shot kid" spoken only on {4,6,8} (`WSMAIN:1919`), never unconditional.
  - U-007/U-008 trench voice on 0-based BS.WAV parity (`WSMAIN:1868`): human ODD →
    Luke@16 + Yahoo@24; human EVEN → LetGo@16 (restored) + Force@22.
- `tests/core/music-cue.test.ts` — re-seated the Imperial March block to the ROM set.
- `tests/core/trench-voice-timer.test.ts` — rewritten for the un-inverted parity + `letGoLuke`.
- `tests/core/rom-timebase.test.ts` — swapped trench fixture waves (timing intent unchanged).
- `tests/core/speech-cues.test.ts`, `tests/core/exhaust-port-outcome.test.ts` — defensive
  greatShotKid re-seats onto speaking wave 4 (green in both regimes).
- `tests/shell/audio.test.ts` — `letGoLuke` added to `REQUIRED_SPEECH` (new core cue's shell coverage).

**Tests Written:** wave-parity-gates carries ~39 assertions across the 4 cue families.
**Status:** RED — verified by direct vitest + tsc (NOT via the confabulating testing-runner):
- `npx vitest run` → **39 failed / 1191 passed** (1230), the 39 confined to exactly the 4
  target core suites; the other 98 suites stay green (no collateral damage).
- `npx tsc --noEmit` → **2 errors**, both `'letGoLuke' is not assignable to type 'SpeechLine'`
  (the compile-time RED for U-007's union addition; `audio.test.ts` typed `SpeechName[]` is fine).
- Every failure was hand-audited against the ROM gate — no typos, no import/helper breakage.

### Rule Coverage

| Rule (ts-review / sidecar) | Test(s) | Status |
|----------------------------|---------|--------|
| Union exhaustiveness / no silent renames | `letGoLuke` typed `SpeechLine` (wave-parity-gates + trench-voice-timer) | RED (tsc) |
| Meaningful, non-vacuous assertions | exact wave-SET equalities {4,6,8}/{4,6,8,10}; presence AND absence asserted per wave | RED |
| Mutation-proof (flip the shim → red) | boundary waves 3/4/5 (music), wave 1 silent (speech), wave-2 inversion (trench) | RED |
| Test PAST the set boundary (sidecar) | March/greatShot SETS pinned across waves 1..10 / 1..8, not just inside | RED |

**Rules checked:** the applicable ts-review rules for a union-extending behavioral change
(exhaustiveness, meaningful assertions); the tests introduce no new `as any` / `||`-default /
nullable surface.
**Self-check:** 0 vacuous tests — every assertion checks a value (set membership or wall-clock
time), and each cue family carries a refutation case that fails on the shipped code (the 39 RED
failures prove it).

**Handoff:** To Dev (The Word Burgers) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/sim.ts` — added the single `romWave0(wave1Based) = wave1Based - 1` shim; the
  Imperial March gate (`musicTrackFor`), the "Great shot kid" gate (now conditional, was
  unconditional), and the trench voice parity all read through it. Added the restored
  `letGoLuke`@16 cue to `TRENCH_VOICE_CUES`. Corrected the stale byte_4B12 doc → BS.WAV.
- `src/core/events.ts` — added `'letGoLuke'` to the `SpeechLine` union; corrected the
  inverted parity comments on the trench lines + the Imperial March wave range.
- `src/core/state.ts` — corrected the doubly-stale `trenchTimer` field doc (dt-scaled + BS.WAV).
- `docs/audit/findings/pair-audio.json` — `remediated_by: sw7-2` on U-005/006/007;
  re-pointed U-008's confirmed-faithful citation (917→939).
- `docs/audit/findings/{pair-guns,pair-surface,pair-tie-ai,pair-timing,pair-trench}.json`
  — 16 pure line-drift citations reanchored (my sim.ts edits shifted their `ours.line`).

**AC coverage:**
- AC-1 single 0-based accessor read by all three cue families ✓
- AC-2 wave sets match ROM, mutation-proven — flipping `romWave0` to identity turns **18**
  wave-parity tests RED (verified), confirming it is the single mutation point ✓
- AC-3 S-012 bonus table untouched (out of scope) ✓
- AC-4 `remediated_by: sw7-2` on the fix-class findings; `npm test -- citations` green
  (12/12); reanchor reports 130 correct / 0 lost ✓
- AC-5 `npm test` (1230/1230), `npm run build`, `npm run lint` all green ✓

**Tests:** 1230/1230 passing (GREEN). tsc clean; vite build clean.
**Branch:** feat/sw7-2-r2-wave-parity (pushed).

**Handoff:** To the next phase (verify / review).

### Rework 1 (green) — Reviewer reject resolved
**Round-trip:** 1 (Reviewer REJECTED on a single doc-fidelity finding; logic was approved).
**Fixed (the blocker):** `src/core/sim.ts:775-777` stale ROM comment — rewrote "the Imperial
March takes over here at wave>=3 odd (ROM sub_6838)" to the corrected human {4,6,8,...}
(GM.WAV>=3 AND odd, WSMAIN.MAC:1421) semantics. Comment-only — no logic change.
**Fixed (non-blocking, same pass):** appended a clarifying UPDATE note to U-008's
`refutation_corrections` (both caveats it named are resolved — timing→sw7-1, parity→sw7-2;
it stays CONFIRMED, NOT remediated_by, per the confirmed-faithful rule). Reanchored 14
citations that drifted +1 from the added comment line (0 lost).
**Deferred per Reviewer:** the BS.WAV clamp (OUT of scope — a new audit finding + follow-up
story, not a sw7-2 change) and the tautological letGoLuke test assertion (optional, TEA's
domain) were intentionally NOT changed.
**Verified:** `npm test` 1230/1230, `npm run build` + `npm run lint` clean, citations 12/12,
reanchor 116 correct / 0 lost.
**Branch:** feat/sw7-2-r2-wave-parity (pushed, commit 5d16e20).
**Handoff:** Back to Reviewer (Immortan Joe) for re-review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — all mechanical gates green (1230/1230, build/lint/citations pass, reanchor 0 lost, no smells, tree left clean) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — I performed the boundary analysis myself: negative-modulo (unreachable, wave≥1 invariant) VERIFIED; BS.WAV-clamp deep-wave divergence CONFIRMED (non-blocking, out of scope) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — I verified no swallowed errors/silent fallbacks; the only "silent" path is the ROM-correct silent explode on non-gated waves (intended) |
| 4 | reviewer-test-analyzer | Yes | findings | 1 | confirmed 1 (tautological letGoLuke runtime assert, LOW, non-blocking); independently mutation-proved the shim (42 red) and re-seat integrity |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — the rule-checker's ROM-fidelity pass caught the stale `sim.ts:776` comment; I confirmed it |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — I verified type design via the rule-checker + tsc (SpeechLine union extension, ReadonlyArray preserved, no unsafe casts) |
| 7 | reviewer-security | Yes | findings | 1 | confirmed 1 (U-008 audit-note gap, LOW, non-blocking); verified U-005/006/007 remediation marks are honest, no exploitable surface |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — I verified no over-engineering: the shim is a one-line pure function, no dead code |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 (stale ROM comment `sim.ts:775-777` — the reject blocker); 0 violations across all other checks (core purity, union exhaustiveness, type-safety all clean) |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents` settings, pre-filled Skipped)
**Total findings:** 3 confirmed from subagents + 1 confirmed from my own edge analysis (BS.WAV clamp); 0 dismissed; 0 deferred. 1 blocking (doc-fidelity), 3 non-blocking.

**Re-review (Rework 1):** the rework delta is doc-only (`sim.ts` comment + U-008 note + line reanchors) — no code/test/type change — so the 3 analysis specialists' Round-1 results stand and their domains are unaffected by the delta; the rule-checker blocker is RESOLVED. Reviewer independently re-ran the mechanical gates (preflight-equivalent): npm test 1230/1230, build/lint/citations green, reanchor 0 lost. **All received:** Yes (Round-1 specialists + Reviewer round-2 mechanical re-verify).

## Reviewer Assessment

**Verdict:** APPROVED (re-review after Rework 1 — the Round-1 blocker is resolved)

Round 1 REJECTED on ONE doc-fidelity finding: the comment at `sim.ts:775-777` stated the pre-fix "wave>=3 odd" ROM semantics, self-contradicting the corrected `musicTrackFor` doc. Dev's Rework 1 rewrote it to the correct human {4,6,8,...} phrasing — COMMENT-ONLY (verified `git diff fcb8209..HEAD`: the `musicTrackFor('space', state.wave + 1)` call is byte-identical). The code LOGIC was approved on correctness in Round 1 (ROM-verified + mutation-proven) and is UNCHANGED by the rework. No blocking findings remain.

**Round-1 blocker — RESOLVED:**

| Severity | Issue | Location | Status |
|----------|-------|----------|--------|
| [MEDIUM] [RULE] | Stale ROM comment stated pre-fix "wave>=3 odd" {3,5,7,...}, contradicting the corrected doc | src/core/sim.ts:775-777 | ✓ RESOLVED in Rework 1 — rewritten to human {4,6,8,...} (GM.WAV≥3 AND odd, WSMAIN:1421); stale phrase grep-confirmed gone; now consistent with `sim.ts:910` |

**Re-review (Rework 1) — independent verification:**
- Delta since the reject (`git diff fcb8209..HEAD`): `src/core/sim.ts` COMMENT-ONLY + 6 findings JSON (the U-008 clarifying note + 14 line reanchors from the added comment line). No code logic, no test logic, no type changes.
- `npm test` **1230/1230**; `npm run build` + `npm run lint` clean; citations **12/12**; reanchor **130 correct / 0 lost**.
- [SEC] U-008 clarifying note now ADDED (both caveats resolved noted); U-008 correctly left NOT `remediated_by` (my Round-1 ruling upheld).
- [EDGE] BS.WAV-clamp deep-wave divergence remains a recommended follow-up (out of scope, correctly deferred — do NOT expand sw7-2). [TEST] the tautological letGoLuke assert left as-is (optional, non-blocking).

**Non-blocking findings (record, do not block; address in the same green pass or a follow-up):**
- [SEC] U-008 (`pair-audio.json`) is left CONFIRMED with a now-stale `refutation_corrections` ("blocked on T-008 / sw3-7"); both caveats are resolved (timing→sw7-1, parity→sw7-2). Add a one-line note. Dev's choice NOT to mark it `remediated_by` is ACCEPTED (correct per the CONFIRMED-faithful rule + sw7-1 precedent).
- [EDGE] Trench parity ignores the ROM `BS.WAV = min(GM.WAV,31)` clamp (WSMAIN:1702); cosmetic divergence at human waves ≥ 33 (unreachable). OUT of scope for sw7-2 (not in U-007/U-008); recommend a new audit finding + follow-up story. Do NOT expand sw7-2 to cover it.
- [TEST] `wave-parity-gates.test.ts` letGoLuke union-member test's runtime `expect` is tautological (compile-time pin is the real, independently-enforced guarantee). Optional cleanup.

**Observations (tagged; VERIFIED items carry line + rule evidence):**
1. [VERIFIED] All three gates match the ROM exactly — I read `WSMAIN.MAC` directly: music `gm>=3 && gm%2===1` (sim.ts:912) = `CMPA #4-1/IFGE/ANDA #1/IFNE` (WSMAIN:1421); "Great shot kid" (sim.ts:763-764) = the identical gate (WSMAIN:1919); trench parity `romWave0()%2===0?'even':'odd'` (sim.ts:616) = `LDA BS.WAV/LSRA/IFCC` carry-clear-even (WSMAIN:1868). Complies with the ROM-fidelity rule.
2. [VERIFIED] Single mutation point (AC-2) — `romWave0` (sim.ts:903-904) is the sole 0-based conversion; all three predicates route through it (rule-checker grep-confirmed no leftover raw `state.wave % 2`). [TEST] flipping it to identity turns 42 assertions red. Complies with the mutation-proof rule.
3. [VERIFIED] core/ purity (star-wars hard boundary) — `romWave0`/gates are pure integer arithmetic; no `shell/` import, no `Date.now`/`Math.random`/DOM. Evidence: [RULE] check 14; sim.ts imports lines 14-87. Complies.
4. [VERIFIED] SpeechLine union exhaustiveness — `letGoLuke` added; `main.ts:212` speech arm speaks `event.line` generically (no per-line switch to extend), and the two census pins (`audio.test.ts` REQUIRED_SPEECH, `trench-voice-timer.ts` TRENCH_LINES) were both extended. [TYPE]/[RULE] check 16; `tsc` 0 errors. Complies.
5. [VERIFIED] Gate scope — only the greatShotKid speech push is inside the new `if (gmKill…)` (sim.ts:765); force-bonus (758), death-star-destroyed (770), level-clear (774), and music (778) still fire unconditionally, matching the ROM (only SPKGRE is wave-gated). Evidence: sim.ts:756-778.
6. [SILENT] No swallowed errors or silent fallbacks introduced — the gate is an explicit `if`; the non-gated-wave silence is the ROM's intended behavior (`BRA 80$` empty else), not a swallowed failure. VERIFIED.
7. [SIMPLE] No over-engineering — the shim is a one-line function; no dead code, no speculative abstraction. VERIFIED.
8. [DOC] Comment accuracy — most comments correctly updated to the 0-based model; the `sim.ts:775-777` comment is the exception (the [RULE] blocker above).
9. [MEDIUM] [RULE] the stale comment (blocker, see table).
10. [SEC]/[EDGE]/[TEST] the three non-blocking findings above.

### Rule Compliance

| Rule | Instances checked | Verdict |
|------|-------------------|---------|
| ts-review #1 type-safety escapes (as any / ts-ignore / non-null on nullable) | `romWave0`, gates, all test fixtures | Compliant — none introduced (the `exhaustPort!` in the new fixture mirrors the established repo idiom, invariant-guarded by the preceding `enterPhase(…,'trench')`) |
| ts-review #3 enum/union exhaustiveness | SpeechLine (+letGoLuke), main.ts switch | Compliant — generic speech pump; census pins extended |
| ts-review #4 `??` vs `||` | `at['x'] ?? null` in tests | Compliant — correct `??` on possibly-0 timestamps |
| ts-review #8/#13 test quality / fix-regressions | new + re-seated suites | Compliant — no `as any`, no skips; one tautological-but-compile-valid assert (non-blocking) |
| PROJECT: core/ purity | romWave0, gates | Compliant — pure, deterministic, no shell/DOM/clock/RNG |
| PROJECT: ROM fidelity | 3 gates + trench cue table | 3/4 compliant (gates match WSMAIN exactly); 1 VIOLATION — stale ROM comment sim.ts:776 (the blocker) |

### Devil's Advocate

Assume this fix is broken and hunt for it. First attack: the shim `romWave0(w) = w - 1` has no lower guard. In JavaScript `-1 % 2 === -1`, not `1`, so if `state.wave` were ever `0`, the music gate `gm % 2 === 1` and the parity `gm % 2 === 0` would silently misclassify. I chased this: `wave` initializes to `1` (state.ts:675) and is only ever `wave: s.wave + 1` (sim.ts:1062) — grep-confirmed no decrement anywhere — so `wave ≥ 1` is an invariant and `gm ≥ 0` always. Real, but unreachable; not a live bug, and the invariant is solid enough that a guard would be dead code. Second attack: the wave numbering is inconsistent — the speech gate reads `state.wave` (current) while the music gate reads `state.wave + 1` (upcoming). Is one wrong? No: the ROM reads GM.WAV at the winning shot for SPKGRE (current wave) and chooses the next wave's theme at wave start (incremented GM.WAV) — the two-value split is faithful, and the tests pin both (`speechOnPortKill` on the kill wave, `musicEnteringWave` on the entered wave). Third attack: the re-seated sibling suites could be hiding a regression — flip a fixture wave and the suite passes for the wrong reason. The test-analyzer mutation-tested exactly this: an identity-`romWave0` mutant turns 42 assertions red, including the three "defensive" wave-4 re-seats, so none are vacuous with respect to the shim. Fourth attack, and the one that landed: deep waves. The ROM clamps `BS.WAV = min(GM.WAV, 31)` and reads that clamped value for the trench voice parity — but `romWave0` is unclamped, so at human waves ≥ 33 the wrong voice-line pair plays. That is a genuine divergence; it is cosmetic, unreachable in normal play, outside the audit's named findings, and TEA's own wave-100/101 tests encode the unclamped behavior — so I file it as a non-blocking follow-up rather than expand this story. Fifth: does the JSON bookkeeping lie? The security subagent traced every `remediated_by` to real code + passing tests — honest; the only gap is U-008 understating (not overstating) progress. Net: the logic survives adversarial scrutiny; the one thing that must change before merge is the misleading ROM comment.

**Data flow traced:** `state.wave` (1-based, sim-owned integer) → `romWave0()` → three gate predicates → `MusicEvent`/`SpeechEvent` on the deterministic `events` list → shell audio pump (`speak`/`startLoop`). No external input; safe.
**Pattern observed:** single-shim/single-mutation-point gating — good pattern, at `src/core/sim.ts:903`.
**Error handling:** N/A — pure deterministic sim, no failure paths; non-gated-wave silence is intended ROM behavior.
**Handoff:** To SM for finish-story (Rework 1 resolved the sole blocker; re-review APPROVED).