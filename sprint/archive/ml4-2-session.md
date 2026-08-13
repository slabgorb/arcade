---
story_id: "ml4-2"
jira_key: "ml4-2"
epic: "ml4"
workflow: "tdd"
---
# Story ml4-2: Dragonfly + mosquito reducers (cited): FLYMV enter/move dragonfly (MILLI.MAC:1004), MOSQT enter/move mosquito (MILLI.MAC:1324). PTS scoring.

## Story Details
- **ID:** ml4-2
- **Jira Key:** ml4-2
- **Epic:** ml4
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 5
- **Priority:** p3
- **Branch:** feat/ml4-2-dragonfly-mosquito-reducers
- **PR:** https://github.com/slabgorb/arcade/pull/307
- **Branch Strategy:** gitflow (feat/ml4-2-dragonfly-mosquito-reducers)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-13T10:43:09Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-13T10:01:59Z | 2026-08-13T10:03:05Z | 1m 6s |
| red | 2026-08-13T10:03:05Z | 2026-08-13T10:23:20Z | 20m 15s |
| green | 2026-08-13T10:23:20Z | 2026-08-13T10:29:44Z | 6m 24s |
| review | 2026-08-13T10:29:44Z | 2026-08-13T10:43:09Z | 13m 25s |
| finish | 2026-08-13T10:43:09Z | - | - |

## Sm Assessment

Setup complete for ml4-2 (Dragonfly + mosquito reducers, tdd workflow, 5 points). Branch `feat/ml4-2-dragonfly-mosquito-reducers` cut from develop; story claimed; context enriched at `sprint/context/context-story-ml4-2.md`. Predecessor ml4-1 (beetle + spider) established the reducer pattern — note its finding that kill scores live in SHOOT2, not PTS, so the title's "PTS scoring" premise must be verified against `reference/original-source/millipede` (CRLF files — use awk) before RED. Routing to TEA for the RED phase.

## TEA Assessment

**Tests Required:** Yes

**RED delivered** (commit bbef119f): `tests/dragonfly.test.ts` (39 tests) + `tests/mosquito.test.ts` (25 tests) + `docs/rom-study/claims/10-dragonfly-mosquito.json` (91 byte-anchored claims, DF-1..60 / MQ-1..31) under `plugins/millipede/`. Both title citations verified against the vendored tree before writing: MILLI.MAC:1004 (FLYMV) and :1324 (MOSQT). The title's "PTS scoring" premise was measured per the SM's flag: PTS (MLDEF.MAC:398) is the 16-entry kill-points STAMP array (BEEOFF clears this module's entry, DF-56); the VALUES live in SHOOT2's dispatch — dragonfly 500/1500-by-DDT (:2121/:2124), mosquito 400/1200-by-DDT plus INC SCROLC, the playfield scrolling UP (:2127-2131) — the ml4-1 finding confirmed again. The claims JSON was GENERATED from the vendored lines (scratchpad script), never hand-transcribed, and `checkClaims` reports 0 errors over it.

**Contract for Dev (GREEN):** `src/core/dragonfly.ts` and `src/core/mosquito.ts`, pure cited reducers in the conway.ts house style — in-place mutation, byte semantics (0..255, -1 is 0xFF), upright cabinet (CKF8/CKFF/CKIND clear, the ml3-4/ml4-1 precedent). Full export contracts sit at the top of each test file. Load-bearing traps the suites pin: BEEMV1's cap path exits with CARRY SET, so FLYMV's ADC threshold ceiling is 0x60 while an uncapped 0x2f gives 0x5f (a port that always or never adds the carry fails one of the paired tests); FLYMV1's triangle wave is 8.8 fixed point through BEEHL with the fractional carry riding into BEEH; the dragonfly's mushroom mask HALVES probability outside the player area (1 vs 7) on the POST-move V with 0x48 counted as above; attract mode zeroes the score for motion AND bypasses the NOCENT no-plant rule; the mosquito keeps its wall-bounce OVERSHOOT position and only negates dh; mosquito kill scrolls UP where the beetle's scrolled down; the spawn-tick mask 0x7f applies only from SCORE2 0x07.

**RED verification (testing-runner, ml4-2-tea-red):** millipede 64 failed / 332 passed, failures confined to the two new files, every failure the self-describing module-absent loader error (no collect crashes); full cabinet 998 files, 15,150 passing / 64 RED, no cross-app regression; `npm run lint` clean. The byte gate (brief-dossier.test.ts checkClaims over loadClaims) already sweeps the 91 new claims and passes.

### Rule Coverage

Per `.pennyfarthing/gates/lang-review/typescript.md` (the ml4-1 rubric):
| Rule | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes | module shims are typed interfaces; loaders runtime-guard `Partial<Module>` with `instanceof Error` narrowing (the ml4-1 review fix, applied from the start) | failing (RED by module absence) |
| #2 interfaces | `Readonly<>` on every non-mutated param; discriminated-union move results (`'idle' | 'offscreen' | 'moved'`) instead of stringly booleans | failing (RED) |
| #4 null handling | `spawnH` returns typed `null` (the modelled reroll); loaders throw self-describing errors rather than optional-chaining past absent exports | failing (RED) |
| #14 derived edges | every ROM branch boundary pinned two-sided: 0x0e/0x0f/0x10 and 0x1d/0x1e/0x20 pic bands, CENTIN 9/10 and 8/9, thresholds 0x35/0x36 and 0x60/0x61, walls 0x0b/0x0c and 0xf4/0xf5, v 3/4, score2 4/5, 0x14/0x15, 8/9, 6/7 | failing (RED) |
| #18 test quality | exact byte literals with cited justification strings; negative cases throughout (off-tick frames, closed gates, taken slots, even-frame no-flap, mask-blocked plants); mutation-direction: restrictive expectations (`toEqual` on whole results, identity checks on untouched slots) | self-checked, no vacuous assertions |
| Purity | the ml1-1 scanner sweep auto-enrolls both core modules the moment Dev lands them | armed |

**Scope notes:** CHAN4/CHAN5/AUDC1/AUDF1 sound writes are ml6 seams (only FLYMV1's audio *offset*, a pure motion by-product, crosses the contract as DF-16); attract sequencing is ml7; cocktail is ml8-3; the MOSQT3 SECURA copy-protection block is anti-piracy, not game behaviour — documented in the test header, not modelled. The two Delivery Findings route the ml3 seam inversion and the bee-story claim reuse; the one Design Deviation (deferred spawn reroll) is logged in 6-field format.

**Status:** RED (failing — ready for Dev)

## Dev Assessment

**GREEN delivered** (commit 67a77ef1, pushed to `origin/feat/ml4-2-dragonfly-mosquito-reducers`): `src/core/dragonfly.ts` (FLYMV — spawn gates with the BEEMV1+carry threshold, FLYMV3 speed tiers, the FLYMV1 triangle-wave 8.8 fixed-point weave with edge bounces, BEEMV0 dive + mushroom-plant decision, BEEOFF, 500/1500 kill) and `src/core/mosquito.ts` (MOSQT — masked-frame spawn tick, MOSQT3 diagonal spawn by RND1 bit 7, wall-bounce-keeps-overshoot movement, BEEOFF, 400/1200 kill + scrollUp). Both pure, in-place, byte semantics, conway.ts house style, every constant cited to a DF-*/MQ-* claim in claims/10-dragonfly-mosquito.json.

**Implementation notes:** the BEEMV2 spawn bytes (V=0xF8, RND0-masked column, colour 0x79) and the shared `comp`/`spawnH` helpers are module-local copies in each file — one standalone subsystem per file, the ml4-1 rule; extraction waits for a third consumer. BEEMV1's exit-carry is modelled explicitly in `flySpawnThreshold` (the capped path adds 1 — ceiling 0x60), matching the paired 0x5f/0x60 tests. The ASL/ROL chains in `moveDragonfly` mirror the ROM's carry propagation bit-for-bit rather than using wide arithmetic, so the audio offset (TEMP2+1 after the first ASL) falls out at the cited point. No test was modified; minimal code beyond the contract.

**Verification (testing-runner, ml4-2-dev-green):** millipede 18/18 files, 398/398 tests (the ml1-1 purity sweep auto-enrolled both new core modules); full cabinet 998 files, 15,216 passed + 1 todo, 0 failures (no cross-app regression); orchestrator 478/478; `npm run lint` clean.

**Design deviations:** none beyond TEA's logged spawn-reroll deferral, which the implementation follows exactly.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by the reviewer's 8-mutant battery (MB-1/2/3/5/6/8, all killed) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — discriminated-union returns leave no swallowable path; MB-4 (dropped BEEOFF pts write) and MB-7 (dropped plant frame gate) killed |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 4, fixed 4 |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A — independently re-diffed all 91 claim verbatims (0 mismatches) and hand-traced every behavioral citation against the 6502 source |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — rule-checker's #1/#2 pass covered the surface (0 violations; `Readonly<>`/mutable split verified per function) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — pure byte math, no I/O or input boundary (rule-checker #10 n/a) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — the comp/spawnH/BEEMV2-bytes duplication is the documented one-subsystem-per-file choice; rule-checker verified the copies byte-identical |
| 9 | reviewer-rule-checker | Yes | clean | 0 | N/A — 30-rule checklist exhaustive (13 applicable, 0 violations) + 4 repo rules compliant |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled)
**Total findings:** 4 confirmed, 0 dismissed, 0 deferred — all 4 fixed in-round

### Rule Compliance

Per `.pennyfarthing/gates/lang-review/typescript.md`, checked exhaustively by reviewer-rule-checker (30 rules over the 4 .ts files) and spot-verified by the reviewer:
- **#1 type-safety escapes** — compliant; no `as any`/`@ts-ignore`/non-null `!`; loader `Partial<Module>` runtime-guarded (house ml1-1 pattern).
- **#2 interfaces** — every read-only param `Readonly<>`; mutated slot params deliberately unmarked (in-place house style); `Partial<>` only as builder overrides.
- **#4 null handling** — all 5 `||` are boolean-logic; `spawnH`'s `null` is a typed, documented contract value.
- **#5 modules** — src modules import nothing (purity sweep green over both, 19/19); test dynamic-import is the documented computed-specifier pattern under `moduleResolution: bundler`.
- **#7 async** — only the two loaders are async, genuinely awaiting `import()`; the catch-and-rethrow ADDS context.
- **#11 error handling** — both loaders narrow `catch (e)` with `instanceof Error` (the ml4-1 precedent, applied from the start).
- **#14/#17/#18/#26** — single-point discriminants; header prose cross-checked against code (including the "16 invalid bytes" arithmetic); no self-referential fixtures; every expected value an independent hand-derived literal.
- **#3/#6/#9/#10/#13/#15/#16/#19-25/#27-30** — not applicable to this diff (verified per rule, not assumed; see rule-checker output).
- **Repo rules (purity / one-subsystem-per-file / claim-cited constants / catch narrowing)** — all compliant; every DF-*/MQ-* reference resolves (0 dangling).

## Reviewer Assessment

**APPROVED** — after one fix round, applied and re-verified (commits 76f5bb5e + 1f1d69a4; millipede 18 files / 400 tests green, full cabinet 998 files / 15,218 passed + 1 todo, orchestrator 478/478, `npm run lint` clean, branch pushed).

**Verification performed beyond the specialists:** the reviewer ran an 8-mutant battery covering the disabled specialists' domains — every mutant's site confirmed by `git diff` before the run and restored by `git checkout` after, all 8 killed: [EDGE] MB-1 triangle-fold window `>= 0x40` → `> 0x40` (killed by the new fold-edge test); [EDGE] MB-2 BEEMV1 exit-carry dropped from the spawn threshold (killed by the 0x60-ceiling pair); [EDGE] MB-3 plant-mask boundary `>= 0x48` → `> 0x48` (SURVIVED round 1 — see below — killed after the fix); [SILENT] MB-4 BEEOFF `pts` write dropped (killed); [EDGE] MB-5 mosquito wall bounce undoing the overshoot position (killed); [EDGE] MB-6 spawn-tick 0x7f mask applied below 70k (killed); [SILENT] MB-7 every-4th-frame plant gate dropped (killed); [EDGE] MB-8 mosquito right wall `< 0x0c` → `<= 0x0c` (killed).

**Confirmed findings and dispositions (all resolved this round):**
1. [TEST] `startDragonfly` dh-reset assertion was a fixture blind spot (freeSlot already defaults dh 0) — seeded `dh: 0xaa` so the DF-37 write is real.
2. [TEST] the left-edge pass-through branch (rightward wave at h≥0xf4) was the one untested edge path — test added, mirroring the right-edge pair.
3. [TEST] the BEEMV1 cap/carry flip was pinned only at distant inputs (0x52 vs 0x99) — the adjacent 0x53/0x54 pair added, both landing on need 0x2f split only by the carry.
4. [TEST] the triangle-fold window was tested only at interior points — edge tests added at wave 0x40 (folds, audio 0x7e) and 0xc0 (does not fold, audio 0x80).
5. [TEST] (reviewer's own, via MB-3) the 0x48 plant-boundary test used `rnd1: 0x01`, which blocks under BOTH masks — rewritten with the discriminating byte `rnd1: 0x02` (plants under mask 1, blocked under mask 7); the re-run mutant now dies.

**Verified good (observations):** (1) the FLYMV1 8.8 fixed-point chain reproduces the ROM's ASL/ROL carry propagation bit-for-bit, with the audio offset falling out at the cited TEMP2+1 point — golden values re-derived independently for all seven weave cases; (2) [DOC] the claims file is generated from the vendored lines and byte-gated on every run — comment-analyzer's independent re-diff of all 91 verbatims found 0 mismatches, every DF-*/MQ-* reference resolves, and every hand-traced behavioral citation (spawn gates, weave, plant decision, SHOOT2 scoring, SCROLC direction, radix notes) matches the 6502 source — 0 [DOC] findings; (3) [RULE] the 30-rule typescript checklist came back 0 violations across 13 applicable rules, and all four repo rules (core purity, one-subsystem-per-file with byte-identical copies, claim-cited constants, `instanceof Error` catch narrowing) are compliant — 0 [RULE] findings; (4) the cross-subsystem seams (OBSTAC/DDTEXP/PLAY/MUSHER/SCROLC application) are cleanly caller-side with pure decision returns, matching the ml4-1 Delivery-Findings routing; (5) both new core modules entered the ml1-1 purity sweep automatically and pass; (6) the mosquito's no-mushroom contract is structural — the move result deliberately carries no plant field, so a future dev cannot silently wire one in without a contract change.

**Residual risk (non-blocking):** the ROM's same-frame spawn-reroll spin is modelled as a one-tick deferral (TEA's logged deviation — 6.25% of spawn ticks); frame-exact parity, if ml7 wiring ever wants it, is achievable caller-side per the deviation's forward-impact note. The FLYMV/MOSQT/BEEMV sequencing order within a full game tick is the ml7 wiring story's concern, as with ml4-1.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Gap (non-blocking, TEA):** the ml4-1 seam inversion carries over unchanged — ml3-1/2/3/5 are still backlog, so the OBSTAC cell lookup, DDTEXP, PLAY player collision, MUSHER and the scroll application (SCROLC writes) stay caller-side; dragonfly/mosquito expose pure decisions instead (`plantMushroom` on the move result, `scrollUp` on the kill result). Wiring order lands with ml3/ml7.
- **Improvement (non-blocking, TEA):** FLYMV leans on the BEE's shared helpers (BEEMV0 vertical+plant :120-164, BEEMV1 mushroom curve :179-194, BEEMV2 spawn init :225-240, BEEOFF :166-171), which this story cites INTO dragonfly.ts as module-local ports (the one-subsystem-per-file rule). The bee story (BEEMV, MILLI.MAC:56 — ml4's remaining roster) will re-port the same lines with its own claims: its TEA should crib the DF-33..52 claim set and keep the copies module-local until a third consumer triggers the extraction rule. Owner: the bee story's TEA.

## Impact Summary

**Upstream Effects:**
- **ml4-1 seam inversion carry-over (TEA/Gap, non-blocking):** OBSTAC cell lookup, DDTEXP, PLAY player collision, MUSHER, and scroll application (SCROLC writes) remain caller-side wiring concerns. Dragonfly and mosquito reducers expose pure decisions (`plantMushroom` on move result, `scrollUp` on kill result) to support deferred wiring. Resolution: ml7 (sequencing) and ml3 backlog stories.
- **Bee-helper claim reuse (TEA/Improvement, non-blocking):** FLYMV shares BEEMV helpers (vertical+plant, mushroom curve, spawn init, BEEOFF) with dragonfly as module-local ports per one-subsystem-per-file rule. Bee story (ml4 remaining roster) will re-port same lines with own claims. Action: bee story TEA should adopt DF-33..52 claim set and defer extraction to third consumer.

**Blocking Issues:** None

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **RND0 spawn-column reroll modelled as a deferred spawn**
  - Spec source: MILLI.MAC:228-232 (BEEMV2), claims DF-34/35 and MQ-21
  - Spec text: "LDA RND0 … AND I,0F8 / BEQ 10$ (reroll) … CMP I,10 / BCC 10$ (reroll)" — the ROM SPINS on fresh POKEY bytes until a valid column arrives, always spawning the same frame
  - Implementation: `spawnH(rnd0)` returns `null` for the 16 invalid bytes (rnd0 < 0x10) and `trySpawn*` returns false — the spawn defers to the next tick instead of spinning
  - Rationale: the house reducer contract is deterministic over a single env (rnd bytes come in as values, the ml4-1 precedent); a pure function cannot loop on fresh hardware entropy. 6.25% of spawn ticks defer by one tick; no other behaviour changes
  - Severity: minor
  - Forward impact: if ml7 wiring wants frame-exact spawn parity it can reroll caller-side by feeding successive rnd bytes through `spawnH` until non-null