---
story_id: "df5-3"
jira_key: "df5-3"
epic: "df5"
workflow: "tdd"
---
# Story df5-3: Scoring, the men counter + the extra man

## Story Details
- **ID:** df5-3
- **Jira Key:** df5-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/df5-3-scoring-men-counter-extra-man
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-18T14:17:11Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-18T13:28:33Z | 2026-08-18T13:32:20Z | 3m 47s |
| red | 2026-08-18T13:32:20Z | 2026-08-18T13:48:49Z | 16m 29s |
| green | 2026-08-18T13:48:49Z | 2026-08-18T13:56:44Z | 7m 55s |
| review | 2026-08-18T13:56:44Z | 2026-08-18T14:07:31Z | 10m 47s |
| green | 2026-08-18T14:07:31Z | 2026-08-18T14:14:40Z | 7m 9s |
| review | 2026-08-18T14:14:40Z | 2026-08-18T14:17:11Z | 2m 31s |
| finish | 2026-08-18T14:17:11Z | - | - |

## SM Assessment

Story df5-3 set up cleanly and claimed. Summary for TEA (Tyr One-Handed):

- **Type:** cited-dossier / VALUES-FIRST story — the df4 identity-first law applied to score VALUES. The reducer `plugins/defender/src/core/score.ts` (new file) must not be named until each point value and the event that pays it is pinned from the ROM dossier, CITED. A wrong point value stated only in prose ships GREEN — so RED must verify each value against its ROM line, not merely assert it.
- **Known citations to open and pin:** P250 (OBI C25P1) `defender/DEFB6.SRC:499`; P500 (OBI C5P1) `:506`; P5000 (JSR SCORE) `:508`; spawned `LDX #P250/#P500` `:959,962`; `*BONUS COLLECT PROCESS` `defender/DEFA7.SRC:1786,1788`.
- **Dependencies LANDED and verified in-tree:** `collision.ts` (df4-1, supplies deaths) and `scheduler.ts` (df3, score pop-ups are scheduler processes) both present in `plugins/defender/src/core/`. `score.ts` does not yet exist.
- **Scope:** per-enemy points, humanoid P250/P500 pop-ups, the BONUS collect process, the men (lives) counter, the extra-man award. Pop-ups are df3 scheduler processes; colour by df2 palette index only.
- **Out of scope:** game-over. df5-6 reads this story's men counter for the men<0 condition (separate file, coherent commit) — do not implement it here.
- **Boundary:** `score.ts` is pure core — enforced by defender's purity test (no render/audio/input/storage, no wall-clock).

Sibling probe clean (no df5-3 branch or session elsewhere); claim pushed on `feat/df5-3-scoring-men-counter-extra-man`; story stamped `in_progress`.

## TEA Assessment (RED)

**RED landed. 26 failing df5-3 tests; 647 existing defender tests stay green; `npm run lint` clean.**
Commit `72df878d`. Files: `src/core/score.ts` (empty seam stub `export {}`, df5-2 precedent),
`tests/df5-3-score-identity.test.ts` (the dossier value gate), `tests/df5-3-scoring.test.ts` (the reducer).

### The ROM VALUES, pinned + decoded BEFORE the reducer is named (VALUES-FIRST)
SCORE encoding `DEFA7.SRC:474-477` — `D = A:B`, A=exponent(0-7), B=BCD mantissa; award = B(bcd) × 10^A.

| Score event | ROM label / cite | operand | Points |
|---|---|---|---|
| Lander kill | `LKILL` DEFB6.SRC:922 | `KILP 0115` | **150** |
| Mutant kill (SCZ = the arcade Mutant, df4-4) | `SCZKIL` DEFB6.SRC:625 | `KILP 0115` | **150** |
| Baiter kill (UFO = the arcade Baiter, df4-4) | `UFOKIL` DEFB6.SRC:82 | `KILP 0120` | **200** |
| Bomber kill (TIE = the arcade Bomber) | `TIEKIL` DEFB6.SRC:1120 | `KILO 0125` | **250** |
| Pod kill (PRB = the arcade Pod, df4-5) | `PRBKIL` DEFB6.SRC:118 | `KILO 0210` | **1000** |
| Swarmer kill (MSWM, df4-5) | DEFB6.SRC:190 | `LDD #$0115` | **150** |
| Bomb/mine shot | `BKIL` DEFA7.SRC:2700 | `LDD #$25` | **25** |
| Catch humanoid mid-air | `P250` DEFB6.SRC:499, value `:500` | `LDD #$0125` | **250** |
| Return humanoid to ground | `P500` DEFB6.SRC:506, value `:507` | `LDD #$0150` | **500** |
| Wave-complete bonus / surviving human | `*BONUS COLLECT` DEFA7.SRC:1786; mult `:1828` | min(wave,5)×`$10` | **wave×100 (≤500)** |
| Extra man | `REPLAY @10,000` ROMC8.SRC:801 | — | **every 10,000** |
| Starting men | `NSHIP` ROMC8.SRC:802 | `FCB $03` | **3** |
| Pop-up process type | `STYPE EQU 0` PHR6.SRC:500 | — | **0 (SYSTEM PROCESS)** |

Catch/rescue ordering pinned from `ALAND`/`ALAND0` (`BLO ALAND0 "WERE ON THE GROUND"` → P500=500;
fall-through still-airborne → P250=250). The suite pins `RESCUE > CATCH` directly so a value-swap
(which passes every per-value check) is caught. Full derivation in the scratchpad ground-truth note.

### What GREEN (Loki Silvertongue / Dev) must ship
1. **`docs/rom-study/glossary.md` — a Scoring table**: one row per event above, stating the decimal
   VALUE in prose (the anti-guess tooth) and citing the ROM line the value is read at. Anchor each row
   on the token the identity test expects (`LKILL`/`SCZKIL`/`UFOKIL`/`TIEKIL`/`0210`/`SWHSND`/`BKIL`/
   `P250`/`P500`/`BONUS COLLECT`/`REPLAY`/`NSHIP`). **Do not reuse `PRBKIL` in the Pod scoring row** —
   it already appears in the df4 Enemies row (cites `:122`), and `rowCites` is `.every`, so it would
   cross-match; the Pod row is anchored on the operand `0210` instead.
2. **`docs/rom-study/claims/*.json`** — one byte-verified claim per new cited line (whole-file coverage
   sweep + the CONSTANT_LINES list + `checkClaims` byte gate). No un-cited src/core value (df1-1).
3. **`src/core/score.ts` (PURE)** implementing the contract the reducer test declares: `ENEMY_POINTS`,
   `BOMB/CATCH/RESCUE_POINTS`, `bonusPerHuman(wave)`, `EXTRA_MAN_EVERY`, `STARTING_MEN`, `POPUP_PTYPE`,
   `createScore/addPoints/loseMan` (extra man granted per 10,000 crossed, by count — exact-boundary,
   no-cross, and double-cross all pinned), and `spawnPopup(sched, points)` enqueuing exactly one STYPE
   process. Keep it clock-free/render-free (`purity.test.ts`); no hex colour literal (colour by df2 index).

### Rule Coverage (TS lang-review)
- **#15 (vacuous universal sweep):** every data-driven loop states its population first via
  `expectPopulated` before any `.every`/coverage sweep — the identity gate's first assertion.
- **#1 (`as unknown as T`):** used only as the RED-seam idiom (`scoreNS as unknown as ScoreModule`),
  identical to df5-2's `wavesNS as unknown as WavesModule` and commented — casts an empty stub's
  namespace to its future contract so the suite compiles and fails on assertions. Test-only; GREEN's
  `score.ts` carries no such cast.
- **Boundary/edge (#4-adjacent):** the extra-man award is tested at the exact 10,000 boundary, below it
  (no grant), and across two thresholds in one award (exactly two, not one/three) — count, not a flag.
- **Non-vacuity:** the 4 green-on-arrival cases are legitimate gates/guards (suite-population census,
  whole-file coverage sweep + byte-verify — green until GREEN adds uncovered rows, then red — and the
  colour-by-index source guard), not vacuous passes.

## Dev Assessment (GREEN)

**GREEN landed. defender 673/673, orchestrator 503/503, `npm run lint` clean.** Commit `d99cb6ba`
(pushed on `feat/df5-3-scoring-men-counter-extra-man`, atop the RED commit `72df878d`).

### Shipped (minimal, no scope beyond the ACs)
1. **`src/core/score.ts` (PURE)** — the reducer TEA's contract pins:
   - `ENEMY_POINTS` {lander 150, mutant 150, baiter 200, bomber 250, pod 1000, swarmer 150},
     `BOMB_POINTS 25`, `CATCH_POINTS 250`, `RESCUE_POINTS 500` — each decoded from its KILP/KILO
     operand (B(bcd) × 10^A) and carrying its ROM cite in a comment.
   - `bonusPerHuman(wave) = min(wave, 5) × 100`; `EXTRA_MAN_EVERY 10_000`; `STARTING_MEN 3`;
     `POPUP_PTYPE 0`.
   - `createScore/addPoints/loseMan` — `addPoints` grants one man per 10,000 threshold the new total
     reaches (`floor(new/10k) − floor(old/10k)`), so exact-boundary grants, no-cross doesn't, and a
     single 25,000 award grants exactly two. `loseMan` decrements men only.
   - `spawnPopup(sched, points)` — one `makeProcess(..., STYPE=0)`; the continuation presents once and
     does not reschedule, so it falls off the run-list (the test's "never multiplies" guard).
   - Clock-free / render-free / no hex colour literal — `purity.test.ts` green, colour-by-index guard green.
2. **`docs/rom-study/glossary.md`** — a Scoring table: one row per event, stating the decimal VALUE in
   prose and citing the value line. Pod row anchored on the operand `0210` (NOT `PRBKIL`, which the df4
   Enemies row already carries), per TEA's cross-match warning. Intro prose cites the SCORE encoding
   (`DEFA7.SRC:477`) and `STYPE` (`PHR6.SRC:500`).
3. **`docs/rom-study/claims/17-scoring.json`** — 14 byte-verified claims (the 12 event value-lines +
   SCORE-encoding + STYPE), each `verbatim` read straight from the vendored source. The df1-1
   `citations.test.ts` byte-gate re-opens all 14 against `reference/original-source/defender/` — green.

### Notes for the Reviewer (Heimdall)
- **Values are dossier-gated, not asserted.** Every point value flows source-line → claim (byte-verified)
  → glossary row (value in prose) → `score.ts` constant. A wrong value fails the byte gate or the value
  prose check, not just an equality assertion.
- **Catch vs rescue ordering** (`P250`=250 mid-air, `P500`=500 to-ground) is pinned both by value and by
  the `RESCUE > CATCH` invariant test, derived from `ALAND`/`ALAND0` (`BLO ... "WERE ON THE GROUND"`).
- **Out of scope, deliberately:** no game-over (df5-6 reads `ScoreState.men` for men<0), no HUD render
  (df7), no sim.ts wiring — `score.ts` is a pure island consumed later. `sim.ts` is untouched.
- The `spawnPopup` continuation carries `points` for the shell to render later but does nothing with it
  now (pure core has no renderer); `void points` marks the intent. Not dead — it is the STYPE process the
  ROM's `NEWP P500,STYPE` (DEFB6.SRC:408) creates.

## Subagent Results

**Cycle: 0**

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 673 defender + 503 orch green, lint clean, byte-gate green |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 2 (test-gap MED, neg-points LOW), dismissed 1 (loseMan<0 deferred to df5-6), noted 1 (arch, pre-existing) |
| 5 | reviewer-comment-analyzer | Yes | findings | 6 | confirmed 4 (context-regression HIGH, BONUS cite MED, SC-ENC MED, SC-BONUS MED), folded 1 (:511 into LOW), verified-clean 1 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 3 | dismissed all 3 as non-blocking precedent (as-unknown-as RED idiom; .js-ext df4 precedent under bundler resolution; 0/1 non-ROM literals outside df1-1 scope) |

**All received:** Yes (4 enabled returned, 5 disabled)
**Total findings:** 6 confirmed, 4 dismissed (rationale below), 0 deferred

## Reviewer Assessment

**Verdict:** REJECTED

Round 1. Two HIGH — one a direct AC1 fidelity miss I confirmed against the
ROM control flow, one a documentation regression that would land on `develop` — plus four citation/test
MEDIUMs squarely in this cited-dossier story's remit. The score VALUES are all byte-correct and the
pipeline is green; the defects are in event ATTRIBUTION, cite accuracy, and Architect-context loss.

### Findings (most severe first)

**[HIGH-1] The two humanoid pop-up events are mis-attributed — P250 is NOT the catch (Heimdall; ROM-verified).**
`plugins/defender/src/core/score.ts:34-40` (`CATCH_POINTS = 250` "catch a falling humanoid mid-air") and
the matching `glossary.md` Scoring rows invert which event pays which. The ROM (traced this session):
- **P500 (500)** is spawned when the PLAYER CATCHES a falling humanoid — `AKIL1` first-time player-collision
  → `NEWP P500,STYPE` `defender/DEFB6.SRC:408` — and again on carry-to-ground (`ALAND0` → `LDX #P500` `:962`).
- **P250 (250)** is spawned ONLY at `ALAND` `defender/DEFB6.SRC:959`, reached from `AFALL` when an
  **uncaught** free-falling humanoid hits the ground at survivable speed (`CMPD #$E0 FATAL? / BLS ALAND`).
  It is the humanoid surviving its own fall — the player did not catch it.
So "catch mid-air = 250" is false: catching pays **500**. `P250 = 250` is the uncaught safe-landing.
This is the AC1 deliverable ("which rescue/kill event pays which, pinned from the ROM") being wrong, and a
live trap for df5-4: a rescue-loop grabbing `CATCH_POINTS` (250) for a catch would under-pay by 250.
The design spec's own hook list already cited `NEWP P500,STYPE :408` as a humanoid-score hook — corroboration.
**Fix:** correct the P250/P500 event descriptions in `score.ts` and `glossary.md`; rename `CATCH_POINTS`
(P250) to reflect "uncaught humanoid lands safely" and let the catch attach to the 500/rescue constant; add
the spawn-site cites (`:408` catch, `:959` uncaught-land, `:962` deposit) beside the value cites (`:500`,`:507`),
with claims for any new cited line.

**[HIGH-2] [DOC] Both df5-3 context files regressed to `pf context create` placeholder (comment-analyzer; confirmed).**
`sprint/context/context-story-df5-3.md` went 73→33 lines and `context-epic-df5.md` 114→84 in the setup/claim
commit, deleting the Architect-enriched Technical Approach / Dependencies / Design Notes (story) and Build
order / Four rulings / Cross-story guardrails (epic) — and the files' own literal "⚠ DO NOT REGENERATE THIS
FILE" banners. `git show develop:...` confirms `develop` carries the richer versions; this branch would
overwrite them on merge (a real loss for df5-4/df5-6, which read this dossier). This is a setup-phase
self-inflicted clobber (the SM DO-NOT-REGENERATE-override gotcha). **Fix:** restore both files from `develop`
(`git checkout develop -- sprint/context/context-story-df5-3.md sprint/context/context-epic-df5.md`), keeping
only the legitimate epic-YAML status stamp.

**[MEDIUM-3] [DOC] `BONUS_WAVE_CAP` comment cites the wrong line (comment-analyzer; confirmed).**
`score.ts:41` comment "`CMPB #5 / LDB #5` clamps the multiplier `DEFA7.SRC:1828`" — but `:1828` is
`LDB PWAV,Y MULTIPLIER` (the load). The clamp is `:1829` (`CMPB #5`) / `:1831` (`LDB #5`). A wrong :line in a
comment manufactures false corroboration. **Fix:** cite `:1829,1831` (or the range `1828-1831`) for the cap.

**[MEDIUM-4] [DOC] Claim `SC-ENC` verbatim doesn't show the encoding it asserts (comment-analyzer; confirmed).**
`claims/17-scoring.json` `SC-ENC` asserts "A = exponent(0-7), B = BCD(0-99), award = B×10^A" but its `verbatim`
quotes `DEFA7.SRC:477` (`SCORE PSHS A,B,X,U,Y`, the entry instruction). The encoding is stated at `:475`
(`*A=0-7EXP,B=0-99`). **Fix:** point `SC-ENC` at `:475`.

**[MEDIUM-5] [DOC] Claim `SC-BONUS` is a compound claim on a single anchor line (comment-analyzer; confirmed).**
`SC-BONUS` prose asserts the cap (`:1829/:1831`), the ×16 shift (`:1832-1835`) and A=$01 (`:1826`), but its
`verbatim` quotes only `:1828`. Every other claim in the file is 1:1. **Fix:** narrow the claim to what `:1828`
shows, or split into per-line claims covering the cap/shift/exponent.

**[MEDIUM-6] [TEST] No test covers a single `addPoints` award crossing THREE thresholds (test-analyzer; confirmed by mutation).**
`df5-3-scoring.test.ts` covers no-cross, exact-boundary, and two-in-one (0→25,000) but not three. A
`men + Math.min(granted, 2)` mutant survives all 30 tests (verified in isolated worktree). The current impl is
correct; this is a coverage gap that would let a cap-at-N regression ship green. **Fix:** add
`addPoints({score:0,men:3}, 35_000)` → `men === 6`.

**[LOW-7] [TEST/DOC] `addPoints` `:511` cite uncovered + negative-points contract unspecified.**
The `SCRX DEFA7.SRC:511` cite in `addPoints`' docstring has no claim (score.ts comment cites aren't gate-swept,
so this is informal); and `addPoints` for `points < 0` is unspecified — a `Math.abs` mutant survives. **Fix
(optional, low):** add a claim for `:511` (and `:541 RCHK`) or mark the cite informal, and state the
`points ≥ 0` invariant in the docstring (or a guard test).

### Dismissed (with rationale)
- **[TEST] `loseMan` below 0 untested** — `score.ts`'s own comment and `ScoreState` doc defer men<0 game-over to
  df5-6; correctly-scoped omission, not a gap.
- **[RULE] `as unknown as ScoreModule`** — sanctioned test-only RED-seam idiom, byte-identical to df5-2/df5-1/df4
  precedent, commented; not a novel violation.
- **[RULE] `.js` extension missing on `./audit/dossier-sweep` / `./helpers/dossier-audit`** — copy of the df4
  precedent, resolves under `moduleResolution: "bundler"`; codebase is internally inconsistent but this is not a
  df5-3 regression. (Nit — worth a follow-up sweep, not a blocker.)
- **[RULE] bare `0`/`1` literals in `createScore`/`loseMan`** — zero-init and a definitional single decrement are
  not ROM-decoded magic numbers; outside the df1-1 gate's scope.
- **[TEST, informational] `checkClaims` doesn't verify claim-prose arithmetic** — architectural property shared by
  every prior `claims/*.json`, not a df5-3 regression; the per-value literal tests cover the actual risk.

### Rule Compliance (TS lang-review + project rules)
- **Purity (src/core):** `score.ts` imports only `type { Process, Scheduler }`; no clock/DOM/audio/storage;
  `spawnPopup` hands the scheduler a closure that only discards `points`. **Compliant** (purity.test.ts green).
- **No un-cited src/core value (df1-1):** all 12 point values + `EXTRA_MAN_EVERY`/`STARTING_MEN`/`POPUP_PTYPE`
  carry a cite with a matching byte-verified claim. `0`/`1` dismissed above. **Compliant** (modulo MED-4/5 cite fixes).
- **Colour by df2 index:** zero hex literals in `score.ts`, guarded. **Compliant.**
- **TS #1/#2/#3/#5/#14/#15/#18:** clean per rule-checker's exhaustive pass (union type not enum, `Record<EnemyKind,...>`,
  `import type`, unconditional threshold delta, non-vacuity before every `.every`). **Compliant.**

## Dev Assessment (rework round 1)

**All 6 confirmed findings addressed.** Commit `f64f18f2`. defender 674/674, orchestrator 503/503, lint clean.

- **HIGH-1 (P250/P500 attribution):** ROM-verified the control flow — P500 (500) spawns at the player
  CATCH (`NEWP P500,STYPE` DEFB6.SRC:408, AKIL1) and at ground deposit (`LDX #P500` ALAND0 :962);
  P250 (250) spawns only at `ALAND` :959 (an UNCAUGHT humanoid landing safely, non-fatal `AFALL`).
  Renamed `CATCH_POINTS`(250)→`SAFE_LANDING_POINTS`; `RESCUE_POINTS`(500) now documents the catch.
  Corrected the two glossary Scoring rows + `score.ts` comments + both tests; added byte-verified claims
  `SC-P250-LAND` (:959), `SC-P500-CATCH` (:408), `SC-P500-DEPOSIT` (:962), and 3 CONSTANT_LINES entries.
- **HIGH-2 (context regression):** `git checkout develop --` restored `context-story-df5-3.md` (73L) and
  `context-epic-df5.md` (114L) to the Architect-enriched versions; `git diff develop` on both is now empty.
- **MED-3:** `BONUS_WAVE_CAP` comment now cites `:1829` (`CMPB #5`), not `:1828` (the load).
- **MED-4:** `SC-ENC` claim now cites `:475` (`*A=0-7EXP,B=0-99`); CONSTANT_LINES + glossary intro updated.
- **MED-5:** narrowed `SC-BONUS` to the multiplier load (:1828); added `SC-BONUS-CAP` (:1829); glossary
  bonus row cites both.
- **MED-6:** added `addPoints({score:0,men:3}, 35_000)` → `men === 6` (kills the `Math.min(granted,2)` mutant).
- **LOW-7:** added `SC-REPLAY-CHECK` (:511); documented the `points ≥ 0` caller invariant on `addPoints`.

Test count 30→31 (defender 673→674). No new un-cited value; every score cite now has a byte-verified claim.

## Subagent Results

**Cycle: 1**

**Method:** targeted re-verification of the 6 characterized round-1 findings against the current tree
(the gate rates this stronger than a fresh generalist sweep), plus a full preflight re-run. Every fix was
confirmed by reading the changed file and, for the ROM-attribution fix, re-tracing the source control flow.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (re-run) | clean | none | defender 674/674, orch 503/503, lint clean, byte-gate green (19 claims) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes (targeted) | clean | none | MED-6 (3-threshold test) + LOW-7 (points≥0 invariant) verified fixed |
| 5 | reviewer-comment-analyzer | Yes (targeted) | clean | none | HIGH-2 (context restored), MED-3/4/5 (cite fixes) all verified fixed |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes (targeted) | clean | none | HIGH-1 re-traced against ROM (:408 catch=P500, :959 uncaught=P250); no new rule violation in rework diff |

**All received:** Yes (4 enabled re-verified, 5 disabled)
**Total findings:** 0 new; all 6 round-1 findings confirmed fixed

## Reviewer Assessment

**Verdict:** APPROVED

Round 2 — re-review of rework `f64f18f2`. All six round-1 findings are fixed and independently re-verified;
no new issues; suites green (defender 674/674, orchestrator 503/503), lint clean, byte-gate green.

- **[HIGH-1] [RULE] FIXED & re-traced.** `CATCH_POINTS`(250) renamed `SAFE_LANDING_POINTS`; the glossary P250 row
  now reads "an UNCAUGHT humanoid falls and lands safely" (cites `:500`,`:959`) and the P500 row "the player
  CATCHES … and/or returns" (cites `:507`,`:408`,`:962`). Re-confirmed against source: P500 spawns at the
  catch (`NEWP P500,STYPE` DEFB6.SRC:408) and deposit (`:962`); P250 only at the uncaught safe landing
  (`:959`). New claims `SC-P250-LAND`/`SC-P500-CATCH`/`SC-P500-DEPOSIT` byte-verify. The df5-4 trap is closed.
- **[HIGH-2] [DOC] FIXED.** `git diff develop` on both context files is empty — the Architect content (73L story,
  114L epic, DO-NOT-REGENERATE banners) is restored.
- **[MED-3] [DOC] FIXED.** `BONUS_WAVE_CAP` now cites `DEFA7.SRC:1829` (`CMPB #5`).
- **[MED-4] [DOC] FIXED.** `SC-ENC` cites `:475` (`*A=0-7EXP,B=0-99`); CONSTANT_LINES + glossary intro updated.
- **[MED-5] [DOC] FIXED.** `SC-BONUS` narrowed to the multiplier load; `SC-BONUS-CAP` (`:1829`) added; both cited.
- **[MED-6] [TEST] FIXED.** `addPoints({score:0,men:3}, 35_000)` → `men === 6` present and green (kills the cap-at-2 mutant).
- **[LOW-7] [TEST] FIXED.** `SC-REPLAY-CHECK` (`:511`) added; `points ≥ 0` invariant documented on `addPoints`.

Rule Compliance unchanged from round 1 (purity, df1-1 citation coverage now complete, colour-by-index, TS
checklist). The `as unknown as` RED idiom and the `.js`-extension nit remain accepted precedent, unchanged by
the rework. Ready to merge.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

None