---
story_id: "df4-4"
jira_key: "df4-4"
epic: "df4"
workflow: "tdd"
---
# Story df4-4: Mutants (SCZ/'SCHITZO') + the UFO pursuer

## Story Details
- **ID:** df4-4
- **Jira Key:** df4-4
- **Workflow:** tdd
- **Stack Parent:** none
- **Type:** Feature
- **Points:** 3

## Acceptance Criteria

1. **Dossier Mapping (RED gate):** The enemy-identity dossier `plugins/defender/docs/rom-study/claims/15-enemies.json` is extended with entries mapping both ROM internal labels to their arcade-marketing enemy names:
   - SCZ/'SCHITZO' (defender/DEFB6.SRC:585,592 *START SCHITZOS banner) → MUTANT (arcade name)
   - UFOST/UFOLP (defender/DEFB6.SRC:5,25 UFO PROCESS START banner) → BAITER (arcade name)
   Each entry includes all required fields (id, claim, source.file, source.line, source.verbatim) so the RED test's per-row `expectPopulated` check passes before any citation verification.

2. **Per-Enemy RED Populated Check:** The RED test phase includes a per-row `expectPopulated` assertion (prior defender df4 pattern) that verifies each enemy dossier entry has all required fields BEFORE citation byte-checks, preventing vacuous-pass on coverage/byte sweeps (the identity glossary gate).

3. **Mutant Reducer (Core):** A PURE `plugins/defender/src/core/mutants.ts` reducer implements the SCZS0 schizoid process (defender/DEFB6.SRC:585,592), modeling the lander→mutant transform that df4-3 triggers; all constants cited in claims/*.json; purity.test.ts green (no fetch/canvas/Date/Math.random); tested against SYNTHETIC process snapshots.

4. **UFO Reducer (Core):** A PURE `plugins/defender/src/core/ufo.ts` reducer implements the UFOST/UFOLP UFO process (defender/DEFB6.SRC:5,25) including velocity behavior (defender/DEFB6.SRC:48) and shoot logic; each constant gated by a claims/*.json entry; consumes df4-1's COLIDE box pre-test for UFO collision queries; purity.test.ts green; tested against SYNTHETIC processes (no scheduler integration yet).

5. **Synthetic Test Coverage:** Both mutant and UFO reducers are exercised against SYNTHETIC process state (cloned from templates, no live enemy); critical behavior mutation-proven (e.g., UFO timeout threshold, pursuit velocity math, mutant appearance on lander-top trigger).

## Workflow Tracking
**Workflow:** tdd
**Repos:** arcade
**Phase:** finish
**Phase Started:** 2026-08-17T11:08:44Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-17T09:58:43Z | 2026-08-17T10:01:54Z | 3m 11s |
| red | 2026-08-17T10:01:54Z | 2026-08-17T10:20:38Z | 18m 44s |
| green | 2026-08-17T10:20:38Z | 2026-08-17T10:30:58Z | 10m 20s |
| review | 2026-08-17T10:30:58Z | 2026-08-17T10:46:41Z | 15m 43s |
| green | 2026-08-17T10:46:41Z | 2026-08-17T10:53:39Z | 6m 58s |
| review | 2026-08-17T10:53:39Z | 2026-08-17T11:03:31Z | 9m 52s |
| green | 2026-08-17T11:03:31Z | 2026-08-17T11:04:54Z | 1m 23s |
| review | 2026-08-17T11:04:54Z | 2026-08-17T11:08:44Z | 3m 50s |
| finish | 2026-08-17T11:08:44Z | - | - |

## Delivery Findings

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Improvement** (non-blocking): the identity MAPPING (arcade names SCZ→Mutant, UFO→Baiter) belongs in `docs/rom-study/glossary.md`'s Enemies table, NOT in `15-enemies.json`, per the shipped df4-3 convention. Affects `plugins/defender/docs/rom-study/glossary.md` (add two rows, cited) and `plugins/defender/docs/rom-study/claims/*.json` (add covering claims — the enemy claims naturally extend `15-enemies.json`, which the claim globber sweeps as one set). The SM context named the claim FILE (`15-enemies.json`) but the arcade-name mapping the RED gate checks lives in glossary.md; the byte gate + coverage sweep already watch glossary rows. *Found by TEA during test design.*
- **Question** (non-blocking): the mutant's SHOOT (SCZ0 :897) is included in RED alongside the baiter's, though the story title names "shoot logic" explicitly only for the UFO. Both are the same injected `fire` seam, so the marginal cost is low — but if GREEN finds the mutant shoot pushes the 3-pt budget, the mutant-shoot suite (`df4-4-mutants.test.ts` → "the MUTANT SHOOTS…") is the cleanest thing to FILE forward rather than bloat. Affects `plugins/defender/tests/df4-4-mutants.test.ts`. *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): TEA's glossary-vs-15-enemies.json finding is RESOLVED — the two identity rows landed in `docs/rom-study/glossary.md`'s Enemies table and the covering claims (EN-16..EN-26) extend `claims/15-enemies.json`; both byte-reopen green. The mutant shoot was kept (cheap — same `fire` seam), so nothing was filed forward. *Found by Dev during implementation.*
- **Improvement** (non-blocking): a follow-up WIRING story is needed to connect these synthetic reducers to the live sim — watch df4-3's `reachedTop` and call `transformLander`; inject the ship pose (sim.ts ShipView) as `player`; run `collision.ts` COLIDE + call `killMutant`/`killUfo`; connect `fire` to the df4-5/df5 projectile system; and spawn the baiter off the DEFA7 timeout. Affects `plugins/defender/src/core/sim.ts` (+ a df4-5/df5 story). This is the deliberate synthetic-only boundary of df4-4, not a gap in it. *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (non-blocking): the WIRING story that injects a real `ShipView`-backed `player()` must guarantee it returns FINITE coords (or the enemy reducers must guard the per-tick read — rework finding F7 fixes the latter here). A ShipView that reports NaN before the ship spawns / during a degenerate camera frame would silently corrupt every enemy's position. Affects `plugins/defender/src/core/sim.ts` (the future `player` provider). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): when the baiter is spawned off the DEFA7 `UFOTMR` timeout (df5 wave logic), enforce the ROM's 12-UFO cap (`CMPA #12`, DEFA7.SRC:1688) — `spawnUfo` is currently uncapped (correct for this synthetic story; the cap is the spawner's job). Affects the df5 wave-spawn story. *Found by Reviewer during code review.*

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Player-seek and shooting modeled as INJECTED seams (`player()` + `fire()`), synthetic-only**
  - Spec source: context-story-df4-4.md, AC-3/AC-4/AC-5 ("PURE core reducer … shoot logic … without scheduler integration")
  - Spec text: "PURE `core/ufo.ts` UFO reducer (velocity :48, shoot logic …)"; "Synthetic-process test coverage … no scheduler integration this story"
  - Implementation: Both banks take `deps = { rand, player, fire }`. `player()` supplies PLABX/PLAYC (world.ts stores no player pose); `fire(fromX,fromY,toX,toY)` is the SHOOT sink (JSR SHOOT, :35/:897). The projectile ENTITY is NOT built — tests assert the shot DECISION, cadence, and aim only.
  - Rationale: keeps the core pure and the story synthetic; a later story wires `player` to the live ShipView (sim.ts) and `fire` to the df4-5/df5 projectile system. Mirrors landers.ts's injected `rand`.
  - Severity: minor
  - Forward impact: GREEN implements against these seams; the wiring story must connect both. `fire` is required (not optional) so RED can prove shooting works.

- **Enemy velocities / shot intervals asserted as DIRECTION + CADENCE, not exact magnitudes (df4-4 placeholders)**
  - Spec source: context-story-df4-4.md, AC-3/AC-4; DEFB6.SRC:845,862,883,613; PHR6.SRC:396-405
  - Spec text: "velocity DEFB6.SRC:48, shoot logic"
  - Implementation: SZXV/SZYV/SZRY/SZSTIM/UFSTIM/UFOSK are wave-table RAM (`RMB`, PHR6.SRC:396-405) with no fixed ROM magnitude. Tests assert the mutant/baiter SEEK the player (X/Y direction closes) and SHOOT on a re-arming timer — not exact speeds. Only genuinely FIXED bytes are pinned: UFO_SHOT_TIMER_INIT=8 (:21), UFO_NAP=6 (:46), SCHIZO_NAP=3 (:901).
  - Rationale: identical to df4-3's LNDYV/DESCEND_STEP placeholder decision — a fixed value would fabricate fidelity the ROM does not have until df5's wave logic runs.
  - Severity: minor
  - Forward impact: df5 supplies the exact wave magnitudes; these tests keep passing as GREEN picks any faithful placeholder ≥ the asserted floors.

- **The lander→mutant transform is tested via a `reachedTop`-gated `transformLander(lander)`, not a live abduction**
  - Spec source: context-story-df4-4.md, AC-3 ("lander→mutant transform (df4-3 trigger)")
  - Spec text: "the mutant a lander becomes on reaching the top … the lander->mutant transform trigger is set up by df4-3"
  - Implementation: `transformLander({x,y,reachedTop})` creates a mutant at the lander's position and REJECTS (returns null, spawns nothing) a lander whose `reachedTop` is false — encoding "only AT the top" (SCZ00, :828). It does not import the live landers bank or drive a 20k-tick abduction.
  - Rationale: synthetic scope; `reachedTop` is df4-3's already-shipped latch (landers.ts Lander.reachedTop), so a narrowed lander shape is sufficient and keeps the two modules decoupled.
  - Severity: minor
  - Forward impact: the wiring story watches df4-3's `reachedTop` and calls `transformLander` at the lander's pose.

- **Identity MAPPING placed in glossary.md's Enemies table (not `15-enemies.json` prose), per the df4-3 convention**
  - Spec source: context-story-df4-4.md ("extend `15-enemies.json` with the mappings"); vs the established df4-3 pattern
  - Spec text: SM context said "The enemy-identity dossier this story must extend … is 15-enemies.json"
  - Implementation: the RED identity gate requires the arcade-name ROWS (SCZ→Mutant, UFO→Baiter) in `docs/rom-study/glossary.md`'s Enemies table (where df4-3 put Lander/Humanoid), with COVERING CLAIMS in `docs/rom-study/claims/*.json` (which the claim globber sweeps as one set; the enemies claims naturally extend 15-enemies.json). GREEN edits glossary.md + claims/, not 15-enemies.json's shape directly.
  - Rationale: the byte gate + coverage sweep already watch glossary.md rows (df4-3-enemy-identity.test.ts); putting the mapping anywhere else would be uncovered. The SM context named the claim FILE, not the mapping location — see the Delivery Finding below.
  - Severity: minor
  - Forward impact: recorded as a non-blocking Delivery Finding so GREEN and the context are aligned; the epic YAML is unaffected (it names neither file).

### Dev (implementation)

- **Enemy X/Y speeds and shot intervals implemented as df4-4 PLACEHOLDERS (direction/cadence, not exact bytes)**
  - Spec source: context-story-df4-4.md, AC-3/AC-4; PHR6.SRC:396-399,404-405
  - Spec text: "velocity DEFB6.SRC:48, shoot logic"
  - Implementation: `SEEK_X_STEP=0x20`, `Y_HOP=4`, `SHOT_TIMER=8` (mutant); `SEEK_X_STEP=0x20`, `SEEK_Y_STEP=0x10`, `SHOT_RELOAD=8` (baiter). SZXV/SZYV/SZRY/SZSTIM/UFSTIM/UFOSK are wave-table RAM (`RMB`) with no fixed magnitude to port. Only the genuinely fixed bytes are exported/claim-pinned: `SCHIZO_NAP=3`, `UFO_SHOT_TIMER_INIT=8`, `UFO_NAP=6`.
  - Rationale: identical to landers.ts's LNDYV/DESCEND_STEP placeholder disclosure; a fixed value would fabricate fidelity the ROM lacks until df5's wave logic runs. Baiter SEEK_Y is half of SEEK_X, honoring the ASRA "DIVIDE BY 2" (:76).
  - Severity: minor
  - Forward impact: df5 supplies the exact wave magnitudes; the tests keep passing as they assert direction + re-arming cadence, not speed.

- **Extracted `approach` + the injection types to a shared `core/enemy-motion.ts` (lang-review #18, extract-at-2nd-consumer)**
  - Spec source: TEA contract `df4-4-enemies-contract.ts` (`EnemyDeps`/`PlayerPos`/`Fire`); lang-review #18
  - Spec text: "one concept must not grow two helpers; extract at the second consumer"
  - Implementation: `PlayerPos`/`Fire`/`EnemyDeps`/`approach` live in `core/enemy-motion.ts`, imported by both `mutants.ts` and `ufo.ts`. landers.ts's own private `approach` is left untouched (it hunts an in-bank humanoid, not the injected player, and predates this story).
  - Rationale: the two new seek-the-player enemies genuinely share the pursuit seam; a third copy would be the exact duplication #18 forbids. Refactoring landers.ts's private copy is out of this story's scope.
  - Severity: minor
  - Forward impact: none — a future cleanup could route landers.ts through the shared helper too.

- **Mutant Y motion is the RANDOM HOP only; UFO seek is always-on — the OYV seek/avoid + probability/close-window gating are deferred**
  - Spec source: context-story-df4-4.md, AC-3/AC-4; DEFB6.SRC:857-879 (mutant AVOID/SEEK Y), :50-52,:59-72 (UFO seek probability + close windows)
  - Spec text: "reducers for the SCZS0/SCZ0 schizoid process … and the UFOST/UFOLP process (velocity :48, shoot logic)"
  - Implementation: the mutant moves Y purely by the ±SZRY hop (SCZ10, :883-891); the ROM's OYV SEEK/AVOID-Y (SCZ6/SCZ2-5) integrates via APVCT each frame, which the synthetic model (no APVCT) does not run. The baiter seeks the player every dispatch, without the UFOSK seek-probability gate (:50-52) or the X/Y "close, don't seek" quit windows (:59-72).
  - Rationale: those layers are all wave-RAM-gated (UFOSK) or APVCT-integration refinements with no fixed magnitude; the tested, load-bearing behavior is the hop (the "schizo") and net pursuit direction. Adding them now would fabricate un-ported wave values.
  - Severity: minor
  - Forward impact: df5's wave logic adds UFOSK/close-window gating and the OYV integration; the synthetic tests remain valid (they assert direction + on-strip, which both refinements preserve).

- **df4-1 COLIDE consumption is NOT wired in this story (no test requires it; killMutant/killUfo are the collision call sites)**
  - Spec source: context-story-df4-4.md, AC-4 ("consumes df4-1's COLIDE box pre-test for UFO collision queries")
  - Spec text: "consumes df4-1's COLIDE box pre-test for UFO collision queries"
  - Implementation: neither reducer imports `core/collision.ts`. Each exposes `killMutant`/`killUfo` (SCZKIL/UFOKIL) for the collision system to call once it detects a hit — the enemy owns the death outcome, not the hit detection.
  - Rationale: this story is synthetic-only (TEA's standing decision — no scheduler/collision integration); wiring COLIDE to the live laser/collision path is the integration story's job, exactly as landers.ts's `killLander` is called by the (not-yet-wired) collision path.
  - Severity: minor
  - Forward impact: the wiring story runs `collision.ts`'s COLIDE box pre-test against the enemy bank and calls `killMutant`/`killUfo` on a hit.

### Reviewer (audit)

- **Player-seek + shooting as injected `player()`/`fire()` seams (TEA)** → ✓ ACCEPTED by Reviewer: sound seam, matches landers.ts's injected `rand`. NOTE: the seam's per-tick `player()` read is not finiteness-guarded (rework finding F7) — the DEVIATION is accepted; the IMPLEMENTATION of it needs the guard.
- **Velocities/shot-intervals as df4-4 placeholders (TEA + Dev)** → ✓ ACCEPTED by Reviewer: PHR6.SRC:396-405 confirms SZXV/SZYV/SZRY/SZSTIM/UFSTIM/UFOSK are wave RAM — the placeholder disclosure is true, not an excuse (hand-verified). Baiter SEEK_Y = half SEEK_X honours the ASRA at :76.
- **`reachedTop`-gated `transformLander` instead of a live abduction (TEA)** → ✓ ACCEPTED by Reviewer: faithful to SCZ00 (:828); the narrowed lander shape keeps the modules decoupled and the "only at the top" latch is correctly enforced (rejects reachedTop:false).
- **Identity mapping in glossary.md, not 15-enemies.json (TEA + Dev)** → ✓ ACCEPTED by Reviewer: correct per the df4-3 convention; the coverage sweep + byte gate watch glossary rows, and the claims extend 15-enemies.json as one swept set.
- **`approach`/deps extracted to `core/enemy-motion.ts`, landers.ts left alone (Dev)** → ✓ ACCEPTED by Reviewer: correct extract-at-2nd-consumer (#18); leaving landers.ts's private copy (different target) out of scope is right.
- **Mutant Y = hop-only; UFO seek always-on; COLIDE deferred (Dev)** → ✓ ACCEPTED by Reviewer as scope, with one caveat: the deferrals are honestly disclosed and consistent with the wave-RAM story, BUT the contract's `rand` JSDoc still advertises the deferred "UFO seek gate" as if wired (rework finding F4) — accept the deferral, fix the doc.

## SM Assessment

**Setup by:** Grand Admiral Thrawn (SM), 2026-08-17. Story df4-4 (3pt, p2, defender, tdd).

**Premise verified before setup (falsifiable-claim rule):** every ROM cite in the story
title was opened against `reference/original-source/defender/DEFB6.SRC` and matched exactly:
`:5` UFOST NEWP, `:25` *UFO PROCESS, `:48` *UFO VELOCITY, `:585` *START SCHITZOS, `:592`
SCZS0 NEWP. No stale-description hazard. Dependencies df4-1/df4-2/df4-3 are landed
(df4-3 merged PR #499). No park banner, no either/or AC — no user ruling needed.

**ACs derived** (epic YAML `acceptance_criteria` was null): 5 ACs above. Two load-bearing
emphases carried from the story text: (1) the FIRST deliverable is the CITED dossier mapping
in `plugins/defender/docs/rom-study/claims/15-enemies.json`, and the **UFO→BAITER mapping is
a claim to be sourced, not assumed**; (2) RED teeth must run the per-row `expectPopulated`
check BEFORE citation byte-checks (identity-glossary anti-vacuous gate, prior df4 convention).

**Sibling probes clean:** no remote branch for df4-4 at setup; only sibling session was
a-1/mc12-2 (unrelated). Claim pushed as `feat/df4-4-mutants-schizoid-ufo-pursuer` (commit
3aa17ac4: context + in_progress stamp) so the branch probe lights up for concurrent checkouts.

**Corrections applied to setup output:** `sm-setup` omitted the Repos field (added
`arcade`) and left the context file as a generic stub (enriched it with the verified premise,
technical approach, scope, and an AC summary pointing at the session's authoritative ACs).

**Handoff:** → TEA (Han Solo) for RED. Reducers are PURE, in `plugins/defender/src/core/`;
tested against synthetic process snapshots (no scheduler integration this story).
---

## TEA Assessment

**Tests Required:** Yes
**Reason:** Two brand-new pure core reducers (mutant + baiter) with cited constants — the RED phase defines the contract and proves the feature absent.

**Test Files:**
- `plugins/defender/tests/helpers/df4-4-enemies-contract.ts` — shared injection types (`PlayerPos`/`Fire`/`EnemyDeps`), the `Mutant`/`MutantBank`/`MutantsModule` + `Ufo`/`UfoBank`/`UfoModule` contracts, and the self-describing `loadMutants()`/`loadUfo()` "not built yet" loaders.
- `plugins/defender/tests/df4-4-enemy-identity.test.ts` — the identity gate: SCZ→**Mutant** (DEFB6.SRC:585,592) and UFO→**Baiter** (:5,25) glossary rows, arcade-name-in-prose, cited, coverage-swept, byte-reopened; plus a "fixed constants are claim-backed" tooth (lines :21,:46,:48,:592,:828,:901).
- `plugins/defender/tests/df4-4-mutants.test.ts` — the mutant reducer: SCHIZO_NAP=3, spawn-as-process, the `reachedTop`-gated transform, SEEK-X pursuit, the on-strip RANDOM-Y HOP, SHOOT-at-player + re-arm, death, boundary guard.
- `plugins/defender/tests/df4-4-ufo.test.ts` — the baiter reducer: UFO_SHOT_TIMER_INIT=8 / UFO_NAP=6, spawn-as-process, SEEK-X + SEEK-Y pursuit, timer-gated + re-arming SHOOT-at-player, death, boundary guard.
- `plugins/defender/src/core/mutants.ts`, `plugins/defender/src/core/ufo.ts` — empty `export {}` RED stubs (the sanctioned brand-new-module seam; GREEN replaces them).

**Tests Written:** 24 tests covering 5 ACs (8 UFO + 10 mutant + 6 identity). RED verified by `testing-runner` (RUN_ID df4-4-tea-red): 28 df4-4 assertions failing across the 3 suites, **zero regressions** in 532 pre-existing defender tests, **no collect/import/module-resolution errors** — every failure reads as an ABSENT FEATURE ("not built yet" / missing glossary row / uncovered constant). `npm run lint` (tsc --noEmit) is clean.
**Status:** RED (failing — ready for Dev)

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #15 vacuous loop / assert count first | identity `expectPopulated(rows,1)` before `.every` rowCites; mutant on-strip loop asserts bounds each tick | failing (RED) / guarding |
| #21 input-boundary guard | `spawnMutant`/`spawnUfo`(NaN/Infinity) → null, leaks no process | failing |
| #29 pin the exact value, not the sign | `SCHIZO_NAP===3`, `UFO_SHOT_TIMER_INIT===8`, `UFO_NAP===6` (not "positive") | failing |
| #14 one-shot transition at the common exit | transform fires only when `reachedTop` latched; a mid-carry lander → null | failing |
| #4 `\|\|` vs `??` / value-from-rest | SHOOT is timer-GATED (baiter "does NOT shoot before the timer expires") not fire-every-tick | failing |
| #18 apparatus fails by passing | `loadMutants()`/`loadUfo()` throw self-describing "not built yet" so RED is absent-feature, not a false green | failing (proves absence) |
| #17 comment cite re-run, not re-anchored | every DEFB6.SRC line cited was OPENED against the vendored source before writing; the claim-backed-constants tooth forces byte-reopen | failing (forces GREEN claims) |

**Rules checked:** 7 of the applicable TS/JS lang-review checks have test coverage (the identity/citation checks reuse the shipped df1-1/df4-3 byte gate).
**Self-check:** 0 vacuous tests. Every `.every`/loop is preceded by an `expectPopulated` count assertion or a per-iteration bound; every constant test pins an exact ROM byte; the SHOOT tests assert the aimed target equals the player and require ≥2 shots (not a one-shot).

**ROM ground truth established (all opened against `reference/original-source/defender/`):**
- UFO→BAITER is corroborated IN the 1981 source: `MESS0.SRC:337 BAITER FCC "BAITER/"` + `DEFA7.SRC:1690 JSR UFOST` (timeout-spawn, capped 12) — the "timeout pursuer" is real, not a guess.
- All enemy velocities/intervals are wave RAM (`PHR6.SRC:396-405`) → placeholders, exactly like df4-3's LNDYV.
- Fixed bytes pinned: `LDA #8`(:21), `NAP 6`(:46), `NAP 3`(:901); transform `SCZ00 DEC LNDCNT/INC SCZCNT`(:828-9); process starts `SCZS0`(:592)/`UFOST`(:5).

**Handoff:** To Dev (Yoda) for implementation (GREEN).
---

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/defender/src/core/enemy-motion.ts` (NEW) — the shared pursuit seam: `PlayerPos`/`Fire`/`EnemyDeps` injection types + `approach()` (extract-at-2nd-consumer, lang-review #18).
- `plugins/defender/src/core/mutants.ts` — `createMutantBank(sched, deps)` + `SCHIZO_NAP=3`: SCZS0 spawn, the `reachedTop`-gated transform (SCZ00), SEEK-X pursuit, the on-strip RANDOM-Y hop, SHOOT-at-player + re-arm, SCZKIL death, boundary guard.
- `plugins/defender/src/core/ufo.ts` — `createUfoBank(sched, deps)` + `UFO_SHOT_TIMER_INIT=8`/`UFO_NAP=6`: UFOST spawn, SEEK-X + half-rate SEEK-Y pursuit, timer-gated re-arming SHOOT, UFOKIL death, boundary guard.
- `plugins/defender/docs/rom-study/glossary.md` — two Enemies rows: SCZS0/*START SCHITZOS → **Mutant** (DEFB6.SRC:585,592); UFOST/*UFO PROCESS → **Baiter** (:5,25) with the DEFA7:1690 timeout-spawn + MESS0:337 `BAITER "BAITER/"` corroboration that SOURCES the UFO→Baiter identity.
- `plugins/defender/docs/rom-study/claims/15-enemies.json` — claims EN-16..EN-26 (identity + fixed constants + the two corroborating citations), each byte-reopening against the 1981 source.

**Tests:** 554/554 passing (GREEN) — full defender project. The three df4-4 suites (identity 6, mutants 10, ufo 8 = 24) all green; purity green with the 3 new pure core files; the citation byte-reopen (vendored source available) green; **zero regressions**. `npm run lint` (tsc --noEmit) clean.
**Branch:** feat/df4-4-mutants-schizoid-ufo-pursuer (pushed)

**Self-review (judgment):**
- Wired: the reducers are complete pure cores driven by the shared df3 scheduler; the sim-level wiring is deliberately deferred (synthetic-only story) and filed as a Delivery Finding.
- Patterns: mirrors landers.ts (factory + injected deps + placeholder-velocity disclosure + boundary guard); the identity/claims follow the df4-3 glossary+claims convention.
- ACs: AC-1 (cited identity mapping) ✓, AC-2 (per-row expectPopulated RED teeth) ✓, AC-3 (mutant core) ✓, AC-4 (UFO core; COLIDE consumption deferred per deviation) ✓, AC-5 (synthetic coverage, behavior mutation-proven) ✓.
- Error handling: non-finite spawn coords rejected (leak no process); killMutant/killUfo idempotent on a dead/foreign handle.

**Handoff:** To Reviewer (Obi-Wan Kenobi) for code review.
---

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (554/554 green, lint clean, 0 smells, tree clean/pushed) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings (assessed by Reviewer + rule-checker) |
| 5 | reviewer-comment-analyzer | Yes | findings | 5 | confirmed 5, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings (assessed by Reviewer + rule-checker) |
| 7 | reviewer-security | Yes | clean | none (no purity breach, no proto-pollution, no unbounded loop, no injection surface) | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings (assessed by Reviewer below) |
| 9 | reviewer-rule-checker | Yes | findings | 4 (2 overlap comment-analyzer) | confirmed 4, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled)
**Total findings:** 8 confirmed (comment-analyzer 5 + rule-checker 4, with F1 counted once across both), 0 dismissed, 0 deferred

## Rule Compliance

Exhaustive pass over the TS lang-review checklist (#1-#30) + CLAUDE.md core rules (#31-#36), cross-checked with the rule-checker's mechanical sweep:

- **#1 Type-safety escapes:** the RED-seam casts (`m as Partial<MutantsModule>` → `as MutantsModule`) are the sanctioned df4-3 precedent (guarded by a runtime `typeof` check) — COMPLIANT. **VIOLATION:** two non-null `!` on `Mutant|null`/`Ufo|null` (F8, LOW).
- **#4 Null/undefined:** all `?.` results are `?? default`ed; the two `||` are boolean guards, not falsy-defaults — COMPLIANT.
- **#15 Vacuous source/loop guards:** every `.some`/`.every` is preceded by `expectPopulated` — COMPLIANT, EXCEPT the strip-clamp loop's unasserted `break` (F6, MEDIUM).
- **#17 Comments assert an un-re-run mechanism:** most ROM cites are byte-accurate (I + both subagents hand-verified :5,:21,:25,:46,:48,:76,:585,:592,:828-829,:883-891,:892-897,:901; PHR6:396-405; DEFA7:1690; MESS0:337). **VIOLATIONS:** ufo.test.ts:17 `:1687`→`:1690` (F1); mutants.test.ts NAP-2 attribution (F2); contract `rand` JSDoc (F4); EN-19 "faster than the Lander" (F5); mutants.ts hop-sign contradicts its own cited lines (F3, the worst — code≠citation).
- **#21 Degenerate numeric input:** spawn coords are `Number.isFinite`-guarded — COMPLIANT at spawn. **VIOLATION:** per-tick `player()` read is unguarded (F7, MEDIUM) though the header claims the discipline.
- **#29 Ordering-vs-magnitude:** `stepUntil(...) > 0` is a reachability check and the story explicitly disclaims exact speed (placeholder velocities) — COMPLIANT.
- **#31 core purity:** enemy-motion/mutants/ufo pass the live purity sweep — COMPLIANT.
- **#32 enemies are scheduler processes:** `makeProcess` + `s.sleep(NAP, step)`, never a private tick — COMPLIANT.
- **#33 injected entropy:** `deps.rand()` only; no `Math.random` — COMPLIANT (UFO's unused `rand` is a disclosed df5 deferral, not minted entropy).
- **#34 no colours in core:** no hex/named colour literals — COMPLIANT.
- **#35 constants cited + FIXED ones claim-pinned:** SCHIZO_NAP=3/UFO_SHOT_TIMER_INIT=8/UFO_NAP=6 all claim-pinned + byte-verified; placeholders correctly left unpinned with true PHR6 RAM disclosure — COMPLIANT.
- **#36 test guards non-vacuous:** COMPLIANT except F6.

## Devil's Advocate

Argue this code is broken. First, the mutant's random-Y hop reads `(rand() & 0x80) ? -Y_HOP : Y_HOP` — the exact OPPOSITE of the `BMI SCZ11`/`NEGB` polarity at the DEFB6.SRC:884-886 lines the comment cites. For a project whose SOUL is "the video IS the game" and deterministic replay, a seeded sequence now hops the wrong way at every tick relative to the real machine: a future seeded-replay fingerprint of the mutant will diverge from the cabinet, and the citation beside it lies about that. Second, `player()` is trusted blindly every tick. The moment a real `ShipView`-backed provider returns NaN — before the ship spawns, during a hyperspace/teleport frame, a degenerate camera — `approach(rec.x, NaN, step)` yields NaN, and from that tick the enemy's x/y are permanently NaN with no throw, no log, no recovery; the render then draws a ghost at NaN. The spawn guard the header brags about never sees this path. Third, a stressed test: the strip-clamp loop `break`s the instant `bank.mutants[0]` is undefined and asserts nothing about completion — so a regression that evicts the mutant on tick 1 (a bad `indexOf`, a double-remove, a scheduler eviction) turns this "guard" GREEN while proving nothing. A confused maintainer reading `:1687` for the baiter spawn, or "faster than the Lander" for a NAP-3 enemy that is actually slower than the ported NAP-1 lander, will re-derive wrong. None crash the suite — which is precisely why they are dangerous: they ship green. The one saving grace is gameplay: symmetric-random hop makes F3 invisible to a player today, and `player()` is finite in the current synthetic tests. But "invisible today" is not "correct," and this is a fidelity project.

---

## Reviewer Assessment

**Verdict:** REJECTED

Single-session authorship (SM+TEA+Dev+Reviewer) makes independent rigor mandatory — the enabled subagents surfaced 8 real defects on my own code, including a behavioral inversion that contradicts its cited ROM lines and four false citations, on a project whose entire discipline is citation fidelity. None is Critical/High, but the cluster is substantive and the fixes are cheap; approving here would be rubber-stamping.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] `[DOC]` | Random-Y-hop SIGN inverted vs cited ROM (`BMI SCZ11` → bit7 SET = **+**SZRY; code does `-Y_HOP`) — code contradicts its own citation | `plugins/defender/src/core/mutants.ts:109` | Flip ternary to `(rand() & 0x80) !== 0 ? Y_HOP : -Y_HOP`; add a TEA test pinning hop direction per SEED bit7 |
| [MEDIUM] `[RULE]` | `player()` read every tick, `x`/`y` feed `approach()`/`fire()` with no `Number.isFinite` guard (#21) — a NaN pose corrupts position permanently/silently | `plugins/defender/src/core/mutants.ts:104`, `plugins/defender/src/core/ufo.ts:93` | Guard the per-tick `player()` read (skip seek/fire on non-finite); add a NaN-player TEA test |
| [MEDIUM] `[TEST]``[RULE]` | Strip-clamp loop `break`s silently with no completion assertion (#15) — a mutant-vanishes-early defect passes GREEN | `plugins/defender/tests/df4-4-mutants.test.ts:148-154` | Capture ticks run and assert the loop completed (or assert the mutant stayed present) |
| [LOW] `[DOC]``[RULE]` | Scope-fence cites `DEFA7.SRC:1687` (`LDA UFOCNT`) for the baiter spawn; the spawn is `:1690` (`JSR UFOST`) — as EN-25/glossary/ufo.ts header all correctly say | `plugins/defender/tests/df4-4-ufo.test.ts:17` | `:1687` → `:1690` |
| [LOW] `[DOC]` | "copying the lander's NAP 2" — NAP 2 is the Humanoid/ASTRO's (DEFB6.SRC:359); landers.ts uses NAP 1 | `plugins/defender/tests/df4-4-mutants.test.ts:71` | Say "the humanoid's NAP 2" or "the lander's NAP 1" |
| [LOW] `[DOC]` | `EnemyDeps.rand` JSDoc claims a "UFO seek gate (:50)" but `ufo.ts` never calls `rand` (disclosed df5 deferral) | `plugins/defender/tests/helpers/df4-4-enemies-contract.ts` (rand JSDoc) | Drop the seek-gate clause or mark it deferred/unused |
| [LOW] `[DOC]` | EN-19 claim "faster-ticking than the Lander" — false vs the ported landers.ts NAP 1 | `plugins/defender/docs/rom-study/claims/15-enemies.json` (EN-19) | Drop the parenthetical or make it precise |
| [LOW] `[TYPE]``[RULE]` | Non-null `!` on `Mutant|null`/`Ufo|null` returns | `plugins/defender/tests/df4-4-mutants.test.ts:186`, `plugins/defender/tests/df4-4-ufo.test.ts:141` | Replace with an explicit non-null assertion (`expect(x).not.toBeNull()` then use) |

**Subagent dispatch tags:** `[DOC]` comment-analyzer — 5 confirmed (F1-F5). `[RULE]` rule-checker — 4 confirmed (F1/F3-alt, F6, F7, F8), 2 overlapping comment-analyzer. `[SEC]` security — clean, no purity/proto/DoS/injection surface. `[TEST]` (disabled subagent; assessed by Reviewer + rule-checker) — F6 vacuous loop, F8 non-null assertion. `[TYPE]` (disabled; assessed by Reviewer) — F8; otherwise clean (readonly data fields, no `any`, no stringly-typing). `[EDGE]` (disabled; assessed by Reviewer) — F7 is the boundary case (per-tick NaN player); no other unhandled path found (spawn guards present, kill idempotent). `[SILENT]` (disabled; assessed by Reviewer) — F3/F7 are silent-failure shaped (wrong-but-quiet, NaN-but-quiet); no swallowed catches (there are none). `[SIMPLE]` (disabled; assessed by Reviewer) — mutants.ts/ufo.ts share a record/remove/kill skeleton but the `step` bodies genuinely differ; extracting a generic bank factory would over-couple two different behaviors — NO simplification finding (the shared `approach`/deps ARE extracted into enemy-motion.ts).

**Data flow traced:** injected `player()` → `approach()` → `rec.x/rec.y` → `fire(...,p.x,p.y)`. SAFE for finite inputs; the per-tick unguarded path (F7) is the one break in the chain.
**Pattern observed:** faithful mirror of landers.ts (factory + injected deps + placeholder-velocity disclosure) at `plugins/defender/src/core/mutants.ts`, `ufo.ts` — good pattern, correctly followed, except the boundary discipline is applied only at spawn (F7).
**Handoff:** Back to TEA for rework (red) — the fixes need failing tests first (hop-sign pin, loop-completion, NaN-player guard), then Dev applies the code + citation fixes.
---

## Dev Assessment (rework round 1)

**Rework of the Reviewer's 8 findings — all fixed.**

**Code fixes:**
- **F3 (MEDIUM, fidelity):** flipped the inverted Y-hop sign in `plugins/defender/src/core/mutants.ts` — now `(rand() & 0x80) !== 0 ? Y_HOP : -Y_HOP`, matching DEFB6.SRC:884-886 (bit7 SET → BMI taken → NEGB skipped → +SZRY). Comment updated to spell out the polarity. **Added a regression test** (`df4-4-mutants.test.ts` → "hops in the ROM sign direction") pinning bit7-SET→+ / bit7-CLEAR→−, and **mutation-verified** it: re-inverting the sign reddens exactly that test (1 failed), restoring → green.
- **F7 (MEDIUM, #21):** guard the per-tick `deps.player()` read in `mutants.ts` and `ufo.ts` — `const seekable = Number.isFinite(p.x) && Number.isFinite(p.y)`; SEEK and `fire` only run when seekable, so a NaN pose can no longer permanently corrupt the enemy. **Added NaN-player regression tests** to both suites (position stays finite over 200 ticks under a NaN player).

**Test-quality fixes:**
- **F6 (MEDIUM, #15):** replaced the strip-clamp loop's silent `break` with a per-tick `expect(m).toBeDefined()` + a `ticksChecked === STRIP_TICKS` completion assertion — a vanished mutant now reddens instead of passing vacuously.
- **F8 (LOW, #1):** removed the non-null `!` in the mutant + baiter kill tests (explicit `.not.toBeNull()` + a narrowing `if (!x) return`).

**Citation/doc fixes:**
- **F1 (LOW):** `df4-4-ufo.test.ts` scope-fence `DEFA7.SRC:1687` → `:1690` (the actual `JSR UFOST` spawn).
- **F2 (LOW):** `df4-4-mutants.test.ts` "copying the lander's NAP 2" → "the humanoid's NAP 2 (DEFB6.SRC:359)".
- **F4 (LOW):** the `EnemyDeps.rand` JSDoc (both `df4-4-enemies-contract.ts` and `enemy-motion.ts`) no longer claims a wired "UFO seek gate"; it discloses UFOSK as a df5 deferral and that `ufo.ts` doesn't consume `rand` yet.
- **F5 (LOW):** claim `EN-19` dropped the false "faster-ticking than the Lander" parenthetical.

**Files changed (rework):** `src/core/mutants.ts`, `src/core/ufo.ts`, `src/core/enemy-motion.ts`, `docs/rom-study/claims/15-enemies.json`, `tests/df4-4-mutants.test.ts`, `tests/df4-4-ufo.test.ts`, `tests/helpers/df4-4-enemies-contract.ts`.

**Tests:** 557/557 defender green (554 + 3 new regression tests: hop-sign pin, mutant NaN-player, baiter NaN-player). `npm run lint` clean. Sign-pin test mutation-verified non-vacuous.
**Deviations:** no new deviations — every change tightens fidelity/robustness toward the existing spec.
**Handoff:** Back to Reviewer (Obi-Wan) for round 2.
---

## Subagent Results (review round 2 — rework re-review)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (557/557 green, lint clean, tree clean, 2 `!` removed) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings (assessed by Reviewer + rule-checker) |
| 5 | reviewer-comment-analyzer | Yes | clean | none (all 5 round-1 comment/doc fixes verified accurate) | N/A |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none (pure guards, fire gated, no new surface/loop) | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 NEW (F9); all 4 round-1 rule findings RESOLVED | confirmed 1, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled)
**Total findings:** 1 new confirmed (F9); 8 round-1 findings all verified RESOLVED

## Reviewer Assessment (round 2)

**Verdict:** REJECTED

All 8 round-1 findings are verified fixed (comment-analyzer + rule-checker independently re-opened the ROM lines and mutation-probed the guards): F3 hop-sign now matches DEFB6.SRC:884-886 in code AND comment (sign-pin test mutation-confirmed non-vacuous); F6 loop asserts presence-per-tick + completion; F7 guard gates both seek and fire; F8 the `!`s are replaced by narrowing null-checks; F1/F2/F4/F5 citations corrected and swept repo-wide (no stale survivors).

One NEW finding blocks approval — and it is the project's own rule #15 ("every guard must be mutation-tested: delete the mechanism and require red"), on a guard added THIS rework:

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] `[TEST]``[RULE]` | The NaN-player tests assert only position finiteness (the SEEK half of the F7 guard). The rule-checker mutation-proved the FIRE half is unverified: deleting only `if (seekable)` around `deps.fire(...)` leaves both tests GREEN while NaN `toX`/`toY` reach the shot sink. A guard added this story must be fully mutation-tested (#15). Code is correct; the test is incomplete. | `plugins/defender/tests/df4-4-mutants.test.ts` (NaN-player test), `plugins/defender/tests/df4-4-ufo.test.ts` (NaN-player test) | Destructure `shots` from the rig and assert the fire sink never emits under a persistently-NaN player — e.g. `expect(shots.every(s => Number.isFinite(s.toX) && Number.isFinite(s.toY))).toBe(true)` across the loop (and/or `shots.length === 0` while unseekable) |

**Subagent dispatch tags:** `[DOC]` comment-analyzer — clean (5 round-1 fixes verified). `[RULE]` rule-checker — 4 round-1 RESOLVED, 1 new (F9). `[SEC]` security — clean. `[TEST]` (disabled; assessed by Reviewer + rule-checker) — F9 is the finding (guard's fire-half unverified). `[TYPE]` (disabled; assessed by Reviewer) — clean (new `Rig` interface proper; `!`s removed). `[EDGE]` (disabled; assessed by Reviewer) — the NaN-player edge is now handled in code; only its fire-half test is missing (F9). `[SILENT]` (disabled; assessed by Reviewer) — F9 is silent-failure-shaped (a NaN shot would fire quietly); the code prevents it, the test doesn't prove it. `[SIMPLE]` (disabled; assessed by Reviewer) — clean; the rework added no unnecessary complexity (the `seekable` flag is computed once, used twice — the correct shape).

**Handoff:** Back to Dev for a 2-line test strengthening (green rework). No code change required — the shipped guard is correct; the test must prove its fire-half.
---

## Dev Assessment (rework round 2)

**Rework of the Reviewer's round-2 finding F9 — fixed (test-only, no code change).**

- **F9 (MEDIUM, #15):** the two NaN-player tests now destructure `shots` from the rig and assert `shots.length === 0` — no shot fires at a non-finite player, exercising the FIRE half of the F7 guard (the 200-tick loop spans several shot-timer expiries). **Mutation-verified:** removing only the `if (seekable)` guard around `deps.fire(...)` in `mutants.ts` + `ufo.ts` now reddens BOTH NaN-player tests (2 failed); restoring → 557 green. The guard is now fully mutation-tested on both halves (seek + fire).

**Files changed (rework r2):** `tests/df4-4-mutants.test.ts`, `tests/df4-4-ufo.test.ts` (test assertions only — the shipped guard code was already correct per round-2 review).
**Tests:** 557/557 defender green. Lint clean.
**Handoff:** Back to Reviewer (Obi-Wan) for round 3.
---

## Subagent Results (review round 3 — F9 re-review)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (557/557 green, lint clean, tree clean) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings (assessed by Reviewer + rule-checker) |
| 5 | reviewer-comment-analyzer | Yes | clean | none (new comments accurate, assertion non-vacuous) | N/A |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none (test-only, no surface) | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none; F9 RESOLVED (independently mutation-confirmed in an isolated worktree) | N/A |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled)
**Total findings:** 0 new; F9 verified RESOLVED — every finding across all 3 rounds is closed

## Reviewer Assessment

**Verdict:** APPROVED

Three rounds, all findings resolved and independently verified:
- **Round 1 (8 findings):** F3 hop-sign inversion, F7 unguarded per-tick `player()`, F6 vacuous strip loop, F1/F2/F4/F5 false citations, F8 non-null `!`. All fixed in rework r1; verified round 2 (comment-analyzer + rule-checker re-opened the ROM lines and mutation-probed the guards).
- **Round 2 (1 finding):** F9 — the NaN-player tests covered only the SEEK half of the F7 guard. Fixed in rework r2 (`shots.length === 0` asserts the FIRE half); verified round 3 by an independent isolated-worktree mutation (both tests redden when `if (seekable)` around `deps.fire()` is removed).
- **Round 3:** clean — 0 new findings.

The shipped code is faithful to the ROM: the Y-hop sign matches DEFB6.SRC:884-886 (mutation-pinned), the fixed constants (SCHIZO_NAP=3, UFO_SHOT_TIMER_INIT=8, UFO_NAP=6) are byte-verified against the source, the placeholder velocities are honestly disclosed as wave-table RAM (PHR6.SRC:396-405), and the two enemy identities (SCZ→Mutant, UFO→Baiter) are cited — the UFO→Baiter mapping SOURCED via DEFA7.SRC:1690 + MESS0.SRC:337, not assumed. Pure core (purity green), enemies are scheduler processes, entropy/player/fire injected, per-tick numeric inputs guarded.

**Subagent dispatch tags:** `[DOC]` comment-analyzer — clean (rounds 2+3). `[RULE]` rule-checker — clean; F9 mutation-confirmed resolved. `[SEC]` security — clean. `[TEST]` (disabled; assessed by Reviewer + rule-checker) — the F7 guard is now fully mutation-tested (seek + fire halves); no vacuous guards remain. `[TYPE]` (disabled; assessed by Reviewer) — clean (readonly data fields, no `any`, `!`s removed, proper `Rig` interface). `[EDGE]` (disabled; assessed by Reviewer) — spawn + per-tick NaN boundaries handled and tested; kill idempotent. `[SILENT]` (disabled; assessed by Reviewer) — no swallowed errors; the two silent-failure-shaped risks (wrong sign, NaN shot) are both fixed and mutation-guarded. `[SIMPLE]` (disabled; assessed by Reviewer) — clean; `approach`/deps shared via `enemy-motion.ts`, the two `step` bodies justifiably distinct, no over-engineering.

**Data flow traced:** injected `player()` → `seekable` finite-guard → `approach()`/`fire()` → enemy pose / shot sink. SAFE end-to-end (the per-tick NaN break is now guarded and tested on both halves).
**Pattern observed:** faithful mirror of landers.ts (factory + injected deps + placeholder disclosure + boundary guards) at `plugins/defender/src/core/mutants.ts`, `ufo.ts`.
**Error handling:** non-finite spawn coords rejected (leak no process); non-finite per-tick player suppresses seek+fire without corrupting state; kill idempotent on dead/foreign handle.
**Handoff:** To SM for finish-story.