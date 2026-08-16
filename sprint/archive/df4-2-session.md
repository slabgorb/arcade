---
story_id: "df4-2"
jira_key: "df4-2"
epic: "df4"
workflow: "tdd"
---
# Story df4-2: Materialize/explode effects + the ADR-0005 accessibility policy

## Story Details
- **ID:** df4-2
- **Jira Key:** df4-2
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/df4-2-materialize-explode-effects-adr0005-a11y
- **Branch Strategy:** gitflow

## Technical Approach

This story implements the effect animation lifecycle from the ROM (SAMEXAP7 APST/EXST sequences) and the accessibility policy exception for full-frame strobes (ADR-0005).

**Core implementation:**
- `plugins/defender/src/core/effects.ts` — Effect state machine animating ROM image tables (df2-4 INERT tables)
- APST ('APPEAR START') / EXST ('EXPLOSION START') lifecycle ported from SAMEXAP7.SRC:16-17
- Effect policy classifier that categorizes strobes (player death TERBLO, terrain explosion) as freeze/fade/particle substitutes
- Render-side guard: no single frame inverts the entire framebuffer

**Design Deviation:** Full-frame strobes are replaced with accessible alternatives (freeze/fade/particle), logged against docs/adr/0005-photosensitivity-accessibility-exception.md as the ONE exception to ROM-always-wins.

**Dependencies consumed:**
- df4-1 (collision detection → death trigger)
- df2-4 (INERT image tables)
- df2 (framebuffer composite by index)

**Dependent story (consumes this):**
- df5 (smart-bomb SBOMB + hyperspace HYPER, which trigger strobes and depend on this policy)

## Acceptance Criteria

- [x] Effect state machine implements SAMEXAP7 APST/EXST sequences for each animation stage
- [x] ROM trigger timing is ported and cited in source comments
- [x] Effect policy classifier renders death strobe as freeze OR fade (configurable policy)
- [x] Effect policy classifier renders terrain-explosion strobe as particle burst (non-strobing)
- [x] Render-side guard: assertion fails if any effect writes framebuffer inversion in a single frame (no flash)
- [x] Design Deviation section documents the ADR-0005 exception and link to accessibility rationale
- [x] All tests pass (red phase has full coverage; green passes all)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-16T23:32:13Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T22:38:59Z | 2026-08-16T22:42:22Z | 3m 23s |
| red | 2026-08-16T22:42:22Z | 2026-08-16T22:57:00Z | 14m 38s |
| green | 2026-08-16T22:57:00Z | 2026-08-16T23:03:41Z | 6m 41s |
| review | 2026-08-16T23:03:41Z | 2026-08-16T23:17:20Z | 13m 39s |
| green | 2026-08-16T23:17:20Z | 2026-08-16T23:23:30Z | 6m 10s |
| review | 2026-08-16T23:23:30Z | 2026-08-16T23:32:13Z | 8m 43s |
| finish | 2026-08-16T23:32:13Z | - | - |

## Delivery Findings

No upstream findings.

### TEA (test design)
- **Gap** (blocking): GREEN must file `plugins/defender/docs/rom-study/claims/14-effects.json` enrolling the effects lifecycle constants, or AC4's enrollment test stays red. Affects `plugins/defender/docs/rom-study/claims/14-effects.json` (add one claim per constant with byte-exact `verbatim`: SAMEXAP7.SRC:16 `\tJMP\tAPST\tAPPEAR START`, :17 `\tJMP\tEXST\tEXPLOSION START`, :58 `\tLDD\t#$AF00\tINTIALIZE SIZE`, :91 `\tLDD\t#$100\tINITIALIZE SIZE`, :136 `\tADDD\t#$AA\tINCREASE SIZE`, :138 `\tCMPA\t#$30\tCHECK IF FINISHED`, :163 `EXPU4\tSUBD\t#$100\tDECREASE SIZE`, and TERBLO DEFB6.SRC:434 `\tNEWP\tTERBLO,STYPE BLOW UP TERRAIN`; note :163 carries the `EXPU4` label and :58 preserves the ROM's `INTIALIZE` typo — brief-dossier byte-verifies each). *Found by TEA during test design.*
- **Gap** (blocking): GREEN must append the 6-field strobe-substitution Design Deviation citing ADR-0005 under `### Dev` when coding the safe variants — the suite cannot assert it (see Design Deviations). Affects `.session/df4-2-session.md` (Design Deviations section). *Found by TEA during test design.*
- **Question** (non-blocking): the ROM's finish conditions are expressed as signed-16-bit RSIZE arithmetic (EXPLODE done when `(size>>8) > 0x30`; APPEAR done when `size < 0x8000`, the `BPL` sign-clear as $AF00 counts down through $8000 to $7F00). If Dev prefers a frame-count or a re-normalized counter, the exported constants + done-semantics my tests pin must still hold. Affects `plugins/defender/src/core/effects.ts` (`advance` done logic). *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings during implementation. The TEA-flagged gaps are both resolved: `14-effects.json` filed (byte-verified) and the ADR-0005 strobe-substitution Design Deviation logged below. The signed-16-bit RSIZE done-semantics were implemented as-cited (no re-normalization).

### Reviewer (code review)
- **Conflict** (blocking): a wrong ROM citation ships in source comments — `:437` is cited as the TERBLO "label" but `:437` is the comment banner `*TERRAIN BLOW PROCESS`; the real `TERBLO` label is `DEFB6.SRC:439`. Affects `plugins/defender/src/core/effects.ts` (lines ~40, ~149) and `plugins/defender/tests/effects.test.ts` (~40, ~287, ~306) (change the prose citation; `:434` NEWP-TERBLO trigger is correct and stays). *Found by Reviewer during code review.*
- **Gap** (blocking): the ADR-0005 safety guard `assertNoFullFrameStrobe` fails OPEN — an empty `after` (zero-canvas), a NaN cell on the `number[]` path, a uniform fill to any non-`0xF` bright index, or a near-total strobe that spares one cell all pass silently. A medical-safety guard must fail CLOSED. Affects `plugins/defender/src/core/effects.ts` (`assertNoFullFrameStrobe`) and `plugins/defender/tests/effects.test.ts` (needs new RED tests for these paths). *Found by Reviewer during code review.*
- **Gap** (non-blocking): `advance()` branches on `EffectKind` with `if/else` and no `assertNever`, unlike the sibling `classify()` 9 lines below; a future third kind would silently animate as an appear. Affects `plugins/defender/src/core/effects.ts` (`advance`). *Found by Reviewer during code review.*

### Dev (rework, round 1)
- All five Reviewer findings resolved. R3/R4: `assertNoFullFrameStrobe` now FAILS CLOSED — throws on an empty `after`, a length mismatch, or a non-finite cell (with 4 new RED-then-green tests). R2: docstring rewritten to match (no more "length mismatch never a strobe"). R5/R6: `advance()` now throws on a non-finite `size` and uses an exhaustive `switch` + `assertNever(effect.kind)` (2 new tests). R1: the `:437`-as-label citation corrected to `:434` (NEWP TERBLO trigger) + `:439` (TERBLO label), `:437` described as the `*TERRAIN BLOW PROCESS` banner, across all 5 prose sites. Full defender project GREEN: 505/505, effects.test.ts 22/22, brief-dossier + purity green, `tsc` clean.
- **Improvement** (non-blocking): the guard still catches only the two literal ROM strobe forms (whole-frame `0xF` fill / `0xF^before` inversion) — a near-total strobe sparing a cell, or a uniform fill to a bright non-`0xF` index, still passes; AC3's letter ("whole-framebuffer inversion/white-fill") is met and the fail-closed hardening is done. Generalizing to a tolerance-based "no near-full-screen flash" is df7's "no strobe anywhere" assertion. Affects a future `df7` story (documented in the `assertNoFullFrameStrobe` SCOPE comment). *Recorded by Dev during rework.*

### Reviewer (re-review, round 2)
- All five round-1 findings verified RESOLVED (rule-checker mutation-lethal-confirmed each; security clean; comment-analyzer verified the citation/docstring). One LOW cosmetic residual accepted non-blocking (the test-file `EffectsModule` type-shim JSDoc omits the new fail-closed throws — non-authoritative). The df7 guard-generalization Improvement is confirmed correctly scoped (traced to a real epic, not a live gap). APPROVED — handing to SM for finish. *Found by Reviewer during re-review.*

## Impact Summary

**Upstream Effects:** 4 findings (3 Gap, 0 Conflict, 1 Question, 0 Improvement)
**Blocking:** 2 BLOCKING items — see below

**BLOCKING:**
- **Gap:** GREEN must file `plugins/defender/docs/rom-study/claims/14-effects.json` enrolling the effects lifecycle constants, or AC4's enrollment test stays red. Affects `plugins/defender/docs/rom-study/claims/14-effects.json`.
- **Gap:** GREEN must append the 6-field strobe-substitution Design Deviation citing ADR-0005 under `### Dev` when coding the safe variants — the suite cannot assert it (see Design Deviations). Affects `.session/df4-2-session.md`.

- **Question:** the ROM's finish conditions are expressed as signed-16-bit RSIZE arithmetic (EXPLODE done when `(size>>8) > 0x30`; APPEAR done when `size < 0x8000`, the `BPL` sign-clear as $AF00 counts down through $8000 to $7F00). If Dev prefers a frame-count or a re-normalized counter, the exported constants + done-semantics my tests pin must still hold. Affects `plugins/defender/src/core/effects.ts`.
- **Gap:** `advance()` branches on `EffectKind` with `if/else` and no `assertNever`, unlike the sibling `classify()` 9 lines below; a future third kind would silently animate as an appear. Affects `plugins/defender/src/core/effects.ts`.

### Downstream Effects

Cross-module impact: 4 findings across 3 modules

- **`plugins/defender/src/core`** — 2 findings
- **`.session`** — 1 finding
- **`plugins/defender/docs/rom-study/claims`** — 1 finding

### Deviation Justifications

3 deviations

- **The strobe-substitution Design Deviation itself is NOT asserted by the suite**
  - Rationale: the logging is a process artifact enforced by the `deviations-logged` exit gate + Reviewer, not by a unit test; testing it in-suite would couple game tests to session plumbing.
  - Severity: minor
  - Forward impact: GREEN (Dev) MUST append the 6-field strobe-substitution Design Deviation under `### Dev` citing ADR-0005 at the moment the safe variant is coded; Reviewer confirms its presence. Flagged in Delivery Findings.
- **The lifecycle is modelled as a size counter + classifier + guard, NOT a scaled per-frame blit of the picture**
  - Rationale: "modelling the lifecycle over the tables" is satisfied by the referenced-picture + RSIZE model (no pixel re-transcription, AC1's actual concern); a scaled-blit renderer is a shell/later-render concern and would over-scope a 3-pt core story.
  - Severity: minor
  - Forward impact: if a later story needs the on-screen scaled explosion sprite, it adds a `paintEffect` render seam consuming this lifecycle; df4-2 core stays pure (lifecycle + classify + guard).
- **The ROM full-frame strobe PRESENTATION is substituted by seizure-safe variants (the ONE exception to ROM-always-wins)**
  - Rationale: the owner has photosensitive epilepsy; a faithful full-screen strobe is a seizure trigger they cannot safely playtest or ship. ADR-0005 rules this the single standing override of ROM-always-wins, decided at the df4 kickoff so df5/df7 cite it rather than re-litigate.
  - Severity: major (it knowingly overrides the cabinet's spine fidelity rule — but pre-authorized and narrowly scoped by ADR-0005)
  - Forward impact: df5 (smart-bomb SBOMB, hyperspace HYPER) and df7 (attract/no-strobe assertion) CONSUME this policy and guard — they cite ADR-0005 and do not re-decide. Any new effect must route its presentation through `classify()` and its frame through `assertNoFullFrameStrobe()`.

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **The strobe-substitution Design Deviation itself is NOT asserted by the suite**
  - Spec source: context-story-df4-2.md, AC2
  - Spec text: "the substitution is logged as a 6-field Design Deviation in the session file citing docs/adr/0005-photosensitivity-accessibility-exception.md"
  - Implementation: `effects.test.ts` verifies the CODE substitutes the strobe (AC2 classifier: player-death→freeze/fade, terrain-blow→particle; AC3 guard forbids whole-frame inversion) but cannot read the private `.session/` file to assert the deviation-logging obligation. A vitest suite reading the session markdown would be brittle and out of the core's reach.
  - Rationale: the logging is a process artifact enforced by the `deviations-logged` exit gate + Reviewer, not by a unit test; testing it in-suite would couple game tests to session plumbing.
  - Severity: minor
  - Forward impact: GREEN (Dev) MUST append the 6-field strobe-substitution Design Deviation under `### Dev` citing ADR-0005 at the moment the safe variant is coded; Reviewer confirms its presence. Flagged in Delivery Findings.
- **The lifecycle is modelled as a size counter + classifier + guard, NOT a scaled per-frame blit of the picture**
  - Spec source: context-story-df4-2.md, AC1
  - Spec text: "modelling the SAMEXAP7 appear (APST) and explode (EXST) lifecycle over the df2-4 INERT image tables — no re-transcription of the pictures"
  - Implementation: the contract holds the referenced `ObjectImage` and animates the ROM's RSIZE counter (start/advance/done); it does NOT require `effects.ts` to render a pixel-scaled blit of the growing/shrinking picture each frame. The AC3 guard is exercised against a planted full-frame inversion/white-fill and a real localized `blitObject`, not against a bespoke effect renderer.
  - Rationale: "modelling the lifecycle over the tables" is satisfied by the referenced-picture + RSIZE model (no pixel re-transcription, AC1's actual concern); a scaled-blit renderer is a shell/later-render concern and would over-scope a 3-pt core story.
  - Severity: minor
  - Forward impact: if a later story needs the on-screen scaled explosion sprite, it adds a `paintEffect` render seam consuming this lifecycle; df4-2 core stays pure (lifecycle + classify + guard).

### Dev (implementation)
- **The ROM full-frame strobe PRESENTATION is substituted by seizure-safe variants (the ONE exception to ROM-always-wins)**
  - Spec source: docs/adr/0005-photosensitivity-accessibility-exception.md (§Decision); context-story-df4-2.md AC2/AC3
  - Spec text: "Full-screen strobe/inversion effects are replaced by seizure-safe equivalents — freeze, fade, or localized particle — cabinet-wide. This is the one deliberate, permanent exception to ROM-always-wins. The exception is scoped to the strobe, not to the event … only the rendering of the flash changes."
  - Implementation: `classify()` tags the player death `full-frame-strobe → fade` and the terrain explosion (TERBLO, DEFB6.SRC:434,437) `full-frame-strobe → particle` instead of the ROM's full-screen white/inverse flash; `assertNoFullFrameStrobe()` mechanically forbids any effect path from writing a whole-framebuffer inversion/white-fill in one frame. The effect TRIGGER and TIMING are ported and cited unchanged (SAMEXAP7 $AF00/$0100/$AA/$30/$100, enrolled byte-exact in claims/14-effects.json); only the pixel presentation deviates.
  - Rationale: the owner has photosensitive epilepsy; a faithful full-screen strobe is a seizure trigger they cannot safely playtest or ship. ADR-0005 rules this the single standing override of ROM-always-wins, decided at the df4 kickoff so df5/df7 cite it rather than re-litigate.
  - Severity: major (it knowingly overrides the cabinet's spine fidelity rule — but pre-authorized and narrowly scoped by ADR-0005)
  - Forward impact: df5 (smart-bomb SBOMB, hyperspace HYPER) and df7 (attract/no-strobe assertion) CONSUME this policy and guard — they cite ADR-0005 and do not re-decide. Any new effect must route its presentation through `classify()` and its frame through `assertNoFullFrameStrobe()`.

### Reviewer (audit)
- **TEA: strobe-substitution deviation not asserted by the suite** → ✓ ACCEPTED by Reviewer: correct scoping — a unit suite cannot read the private session file; the logging obligation is enforced by the `deviations-logged` gate and this review, and Dev did log it (Dev deviation above). Agrees with author reasoning.
- **TEA: lifecycle modelled as size counter + classifier + guard, not a scaled per-frame blit** → ✓ ACCEPTED by Reviewer: AC1's actual requirement is "modelling the lifecycle over the tables — no re-transcription of the pictures," which the referenced-`ObjectImage` + RSIZE model satisfies (verified: `startExplode(UFOP1).picture === UFOP1`). A scaled-blit renderer is a later render seam; deferring it does not under-deliver AC1.
- **Dev: ROM full-frame strobe PRESENTATION substituted by seizure-safe variants** → ✓ ACCEPTED by Reviewer: this IS the story's core purpose and is pre-authorized by ADR-0005 (§Decision), correctly scoped to the presentation with the trigger/timing ported and cited (byte-verified). The deviation is sound. NOTE: the *mechanical robustness* of the guard that enforces this deviation is FLAGGED separately as review findings R3/R4 below — the deviation is accepted; the guard's fail-open behaviour is the rework.

## Sm Assessment

Story is free and actionable — verified before setup: no remote branch for df4-2, no open PRs (merge gate clear), and the ADR to cite (`docs/adr/0005-photosensitivity-accessibility-exception.md`) already exists on disk. `plugins/defender/src/core/effects.ts` does not yet exist, matching the story's intent to create it; upstream deps df4-1 (collision→death trigger), df2-4 (INERT image tables) and df2 (framebuffer) are landed. This is a 3pt TDD phased story; workflow field is explicitly `tdd`, so despite the embedded ADR-0005 decision the deliverable is cited code + tests, not an architecture doc. Routing to TEA (Han Solo) for the RED phase.

**Fidelity note for TEA/Dev:** ROM trigger + timing (SAMEXAP7 APST/EXST, TERBLO strobe triggers) must be ported faithfully and cited to line. Only the strobe *presentation* is substituted (freeze/fade/particle) under ADR-0005 — log it as a Design Deviation, do not "fix" the ROM timing. The render-side no-full-frame-inversion guard is the accessibility invariant, not an optimization.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 3-pt TDD story creating a new pure core module (`effects.ts`) with ROM-cited timing, an ADR-0005 policy classifier, and an accessibility guard — all four ACs are testable behavior.

**Test Files:**
- `plugins/defender/tests/effects.test.ts` — 16 failing tests across AC1–AC4: the APST/EXST lifecycle over INERT tables (pure reducer), the localized-vs-full-frame-strobe classifier, the no-single-frame-inversion render guard (mutation-proven), and the ROM timing constants + claims enrollment.

**Tests Written:** 16 tests covering 4 ACs
**Status:** RED (failing — ready for Dev). Verified via `testing-runner` (`npx vitest run --project defender`): 16 failed / 482 passed, **0 regressions** in the existing 27 files. Every effects failure is the self-describing "src/core/effects.ts not built yet …" feature-absent error (or, for AC4 enrollment, "no effects claim yet") — never a compile/collection crash.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #15 source-text guard anchors to the CLAIM, not a token | AC4 `GREEN enrols a claim…` (matches citation LOCATION window SAMEXAP7:[15,180]/DEFB6:[420,460], not a keyword; verified no existing claim in-window) | failing |
| #18 apparatus must distinguish a broken impl (no fail-by-passing) | AC1 `advance is a pure reducer…` (real advance, distinct UFOP1/TEREX fixtures) + AC3 `PASSES a real localized object blit` (asserts `after !== before` before guarding) | failing |
| #21 degenerate-but-not-nullish numeric input | AC3 inversion/white-fill/one-cell guard tests exercise index `0` inside a varied frame; guard must handle a whole-frame of present-but-zero cells | failing |
| #26 assertion terms not all test-local | AC4 `constants equal the SAMEXAP7 values` imports the constants FROM the module and compares to ROM literals (0xAF00/0x0100/0xAA/0x30/0x100), not to each other | failing |
| #3/#34 union exhaustiveness (classify over EffectEvent) | AC2 `classes are DISTINCT…` exercises all three events; a missing `classify` case reddens | failing |
| #2 `readonly` on params not mutated | AC1 `pure reducer` asserts `advance` mutates neither state nor the INERT picture bytes | failing |

**Rules checked:** 6 of the 30 lang-review checks are directly applicable to a pure numeric/classifier/guard module + citation gate; each has ≥1 covering test. React (#6), async (#7), input-validation (#10), error-handling (#11) are N/A to a pure synchronous core reducer.
**Self-check:** 0 vacuous tests found — every assertion draws a value from the module under test or the real OBJECTS tables; the localized-blit case guards against its own vacuity (`not.toEqual(before)`).

**Handoff:** To Dev (Yoda) for GREEN implementation.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/defender/src/core/effects.ts` (NEW) — pure core module: the SAMEXAP7 APPEAR/EXPLODE lifecycle (`startAppear`/`startExplode`/`advance` over a referenced INERT `ObjectImage`, the ROM's signed-16-bit RSIZE arithmetic), the ADR-0005 `classify()` policy (enemy-explode→localized/raster, player-death→full-frame-strobe/fade, terrain-blow→full-frame-strobe/particle), and the `assertNoFullFrameStrobe()` render guard. Type-only import (`ObjectImage`); purity sweep green.
- `plugins/defender/docs/rom-study/claims/14-effects.json` (NEW) — 8 ROM citation claims (EF-1..EF-8) enrolling the effect vectors (SAMEXAP7.SRC:16-17), the $AF00/$0100 seeds (:58/:91), the $AA/$30/$100 lifecycle constants (:136/:138/:163) and the TERBLO trigger (DEFB6.SRC:434). Byte-verified by brief-dossier.

**Minimalism:** no code beyond what the RED suite demands — the death presentation is a fixed `fade` (the AC allows freeze OR fade; no test requires runtime configurability, so none was added); no scaled-blit renderer (see the TEA scoping deviation).

**Tests:** 499/499 passing (GREEN) — full `--project defender` run via `testing-runner`: 16/16 effects tests, brief-dossier byte-check of the new claims, and purity all green; 0 regressions. `npm run lint` (repo-wide `tsc --noEmit`) clean.
**Branch:** feat/df4-2-materialize-explode-effects-adr0005-a11y (to be pushed)

**Handoff:** To Reviewer (Obi-Wan) for code review.

## Subagent Results

_(Round 2 re-review, after rework. Round 1 dispatched the same 4 enabled subagents and produced the 5 findings + df7 deferral now recorded in Delivery Findings `### Reviewer (code review)` and resolved in `### Dev (rework, round 1)`.)_

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (505 defender + 505 orchestrator green, tsc clean, 0 smells; the 1 `as unknown as` cast is the documented exhaustiveness-guard test fixture) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — reviewer + security self-covered the guard boundary paths, now fail-closed |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — the round-1 fail-OPEN silent pass is the finding that was FIXED; verified fail-closed this round |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — rule-checker #18/#26 confirmed the 6 new tests are mutation-lethal and non-vacuous |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 (LOW) | confirmed 1 (accepted, non-blocking); R1 citation + R2 docstring verified RESOLVED against DEFB6.SRC |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — rule-checker #2/#3 confirmed readonly fields + `assertNever` now present in `advance` |
| 7 | reviewer-security | Yes | clean | none | R3/R4/R6 verified RESOLVED fail-closed; no over-throw/DoS regression; residual correctly deferred to df7 |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — reviewer self-covered: implementation minimal, no dead code |
| 9 | reviewer-rule-checker | Yes | clean | none (33 checks, 0 violations) | all 3 prior violations (#3, #17, #21) mutation-lethal-confirmed FIXED |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 1 LOW confirmed (accepted, non-blocking), 0 dismissed, 1 deferred to follow-up (df7); all 5 round-1 findings resolved.

## Reviewer Assessment

**Verdict:** APPROVED

**Round history:** Round 1 REJECTED with 5 findings (1 HIGH fail-open safety guard, 2 MEDIUM doc/citation, 2 LOW `advance` guards) + 1 df7 deferral. Rework resolved all 5. Round 2 (this pass) re-dispatched the four enabled subagents against the rework diff: **security clean, rule-checker clean (0/33 violations, all three prior violations mutation-lethal-confirmed fixed), comment-analyzer verified R1/R2 resolved with one LOW cosmetic residual, preflight green.** No Critical/High remains — APPROVED.

**Data flow traced:** `effects.ts` is a PURE core module (only `import type { ObjectImage }`, erased at runtime; purity 30/30). `advance(EffectState)→EffectState` (pure reducer; throws on non-finite `size`, exhaustive `switch`+`assertNever` on `EffectKind`). `classify(EffectEvent)→EffectPolicy` (exhaustive). `assertNoFullFrameStrobe(before,after)` now FAILS CLOSED — throws on empty/length-mismatched/non-finite frames, then on whole-frame white-fill/inversion; a valid non-strobe frame passes. No shell caller consumes it yet (dormant), so the stricter contract lands before any consumer exists.

**Pattern observed:** ROM-fidelity port with cited constants — all 8 claims in `14-effects.json` byte-verified against `SAMEXAP7.SRC`/`DEFB6.SRC` (`brief-dossier` 15/15); the signed-16-bit RSIZE done-semantics (`(size>>8)>0x30` / `size<0x8000`) match `CMPA #$30/BLS` and `BPL`. Corrected TERBLO citation verified: `:434` trigger, `:439` label, `:437` banner.

**Error handling:** the safety guard and `advance` fail CLOSED (throw) on uncertifiable/corrupted input — the correct direction for the ADR-0005 medical-safety mechanism; verified no over-throw on legitimate `Uint8Array` frames (`effects.ts:206-250`).

### Confirmed finding (accepted, non-blocking)
| Severity | Tag | Issue | Location | Decision |
|----------|-----|-------|----------|----------|
| [LOW] | [DOC] | The test-file's local `EffectsModule` type-shim JSDoc (the pre-rework RED seam contract) still documents only the inversion/white-fill throws for `assertNoFullFrameStrobe` / doesn't mention `advance`'s new throws. It is a COMPILE-ONLY shim, not the authoritative docstring (the real `effects.ts` docstrings are correct and were verified), so it misleads no consumer. | `effects.test.ts` (local `EffectsModule` shim) | ACCEPTED non-blocking — cosmetic test-scaffold prose; not worth a third round-trip on a 3pt story. Optional cleanup a future toucher can fold in. |

### Deferred to follow-up (non-blocking, df7)
- **[SEC] Generalize the guard beyond the two literal ROM strobe forms** (near-total / uniform-bright-non-`0xF` flash). AC3's letter ("whole-framebuffer inversion/white-fill") is met and catches the ROM's actual strobe forms; the tolerance-based "no strobe anywhere" generalization is df7's job — traced to the real df7 epic and documented in the `assertNoFullFrameStrobe` SCOPE comment. Security confirmed this is correctly scoped, not a live gap (the module is dormant).

### Subagent dispatch tags
- **[DOC]** (comment-analyzer): R1 citation + R2 docstring verified RESOLVED (byte-checked DEFB6.SRC:434/437/439); one LOW cosmetic residual (test type-shim JSDoc) accepted non-blocking.
- **[SEC]** (security): R3/R4 guard fail-open + R6 advance non-termination verified RESOLVED fail-closed; no regression; residual deferred to df7 — status CLEAN.
- **[RULE]** (rule-checker): prior #3/#17/#21 violations all FIXED and mutation-lethal; 0/33 violations this pass; the `as unknown as` test cast judged justified under #1's own exception — status CLEAN.
- **[EDGE]** — subagent disabled; the boundary paths (empty/mismatch/NaN frames, unknown kind) are now covered by 6 new tests and verified fail-closed.
- **[SILENT]** — subagent disabled; the round-1 silent fail-open is exactly what the rework closed — no silent pass remains.
- **[TEST]** — subagent disabled; rule-checker #18/#26 confirmed the 22 tests (incl. 6 rework tests) are mutation-lethal, non-vacuous, real-fixture-based.
- **[TYPE]** — subagent disabled; rule-checker #2/#3 confirmed readonly invariants and the now-present `assertNever` exhaustiveness.
- **[SIMPLE]** — subagent disabled; implementation remains minimal; the fail-closed guards add O(1)/cell, no complexity-class change.

### Deviation audit (round 2)
No NEW Design Deviation was introduced by the rework — the fail-closed hardening STRENGTHENS AC3, and the df7 generalization is logged as a Delivery-Findings Improvement (not a spec deviation). The three logged deviations (TEA×2, Dev×1) remain ACCEPTED as stamped in round 1; the round-1 note that the guard's robustness was FLAGGED is now resolved.

### Rule Compliance
Mapped to `.pennyfarthing/gates/lang-review/typescript.md`: **all 30 checks compliant** this pass (rule-checker 0/33 violations). The three round-1 violations are fixed and mutation-lethal: #17 (citation corrected + byte-verified), #21 (`advance` + guard now throw fail-closed on degenerate/non-finite input), #3/#34 (`advance` now `default: assertNever(effect.kind)`). Purity 30/30; citations byte-verified 8/8.

**Handoff:** To SM for finish-story.