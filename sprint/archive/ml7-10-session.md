---
story_id: "ml7-10"
jira_key: "ml7-10"
epic: "ml7"
workflow: "tdd"
---
# Story ml7-10: Verify + correct the DDT-bomb and POISON-mushroom sprite tiles

## Story Details
- **ID:** ml7-10
- **Jira Key:** ml7-10
- **Repos:** arcade
- **Workflow:** tdd
- **Branch:** feat/ml7-10-verify-ddt-poison-sprite-tiles
- **Stack Parent:** none
- **Branch Strategy:** gitflow (feat/ml7-10-verify-ddt-poison-sprite-tiles)

## Human-in-the-Loop Dependency
**VISUAL SMOKE TEST (owner: user)** — This story requires human eyeballing of the millipede game render on `/millipede/`. The pipeline automates: deriving correct sprite tile mappings from the ml7-6 sprite ROM decode, writing ROM-sourced tests, and correcting the constants (ddt.ts:38, conway.ts:48) if needed. DEV and REVIEWER complete the ROM-verified part before PR merge. The title's literal ask — "Stage a wave with rocks + poison mushrooms + a live DDT bomb and visually confirm each tile" — is a POST-MERGE human smoke test: the user runs the game, stages a playable wave, and eyeballs each sprite tile to confirm it matches the ROM visual. No blocking gate on the pipeline; route as a filed follow-up in the session archive if issues are found.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-14T23:06:46Z

<!-- REJECT-MISROUTE REPAIR: review returned REJECTED (round 1). `complete-phase`
     advanced to the approval gate's DEFAULT next_phase `finish` instead of honoring
     the recovery_config `reviewer-verdict → rework → target_phase: green`. Manually
     reset to `green` so Dev reworks the 6 findings before re-review. Do NOT finish. -->

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-14T22:06:26Z | 2026-08-14T22:09:41Z | 3m 15s |
| red | 2026-08-14T22:09:41Z | 2026-08-14T22:39:17Z | 29m 36s |
| green | 2026-08-14T22:39:17Z | 2026-08-14T22:41:11Z | 1m 54s |
| review | 2026-08-14T22:41:11Z | 2026-08-14T22:53:47Z | 12m 36s (REJECTED r1) |
| green | 2026-08-14T22:53:47Z | 2026-08-14T22:58:25Z | 4m 38s |
| review | 2026-08-14T22:58:25Z | 2026-08-14T23:06:46Z | 8m 21s |
| finish | 2026-08-14T23:06:46Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- **Finding (Question/Improvement, non-blocking) — VERIFY-CONFIRMS-CORRECT, no automatable mismatch.** Every
  determinable measure confirms the DDT-bomb / ROCK / POISON tile mapping was ALREADY correct before this
  story: (a) the source char codes match `MLDEF.MAC:202-208` exactly (CLOUD=$2E, DDT=$6E, ROCK=$70,
  POISON=$78, NORMAL=$7C); (b) the `charTile` bank-flip law (`tile = code ^ 0x40`) is ml7-6-proven on
  mushrooms; (c) the baked `STAMPS` sheet is byte-faithful to the picture EPROMs (`stamp-data.test.ts` AC-3b
  ran LIVE here — EPROMs `136013-106.p5`/`-107.r5` are vendored in a-1 — and all 256 tiles byte-match); (d)
  every mapped tile ($2E/$2F/$30/$38-$3B) is a non-blank, materially-distinct real graphic. So there was no
  code fix for Dev. The RED phase produced a GREEN-on-arrival regression guard, not a red→green change (the
  jt8-6 "filed behaviour becomes a green guard" shape). **User ruling (before RED): ship the green guard +
  route the visual playtest** (option A).
- **Finding (Gap, non-blocking) — the real AC5 verification is the HUMAN visual playtest, routed post-merge.**
  Whether char $6E *visually* reads as a bomb (vs. the bank law merely landing on a non-blank tile) has no
  non-visual oracle — the addressing law itself was derived by looking (ml7-6). The user renders `/millipede/`,
  stages a wave with rocks + poison + a live DDT bomb, and eyeballs each tile. Do NOT block the PR on it.
- **Checked & cleared (not a finding):** the DDT explosion-cloud stamps (`DDT_CLOUD_FRAMES`, ddt.ts) are char
  codes written into `state.field` and rendered through `charTile` (`drawGridStamps`, main.ts:106), so cloud
  char code $30 → tile $70 while ROCK char $70 → tile $30 — cleanly separated, no tile collision. The initial
  "$30 appears in LIST_97" concern was unfounded (LIST_97 holds char codes, not tile indices).

### Dev (implementation)
- No upstream findings. Independently re-ran the full verification: no production source changed
  (`git diff develop...HEAD -- src/` empty), millipede 1233/1233, orchestrator 498/0 (no topology guard
  tripped by the new test file), lint clean. Confirms TEA's verify-confirms-correct outcome.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No design deviations

### Dev (implementation)
- No deviations from spec. No production code was written: the story is a verification whose determinable
  outcome (per the user ruling and TEA's finding) is a GREEN regression guard, and no test demanded an
  implementation change. AC1-AC3's "corrected if wrong" clause did not fire — nothing was wrong.

## Sm Assessment

**Story:** ml7-10 (3pt, p3, tdd/phased) — verify + correct the DDT-bomb and POISON-mushroom sprite-tile mappings against ml7-6's sprite-ROM decode, then eyeball a staged wave.

**Premise measured before setup (SOUND — not a stale-description case).** The title's line cites all resolve against the current tree:
- `plugins/millipede/src/core/ddt.ts:38` region — real stamp constants: `DDT_STAMP = 0x6e`, `CLOUD_STAMP = 0x2e`, `ROCK_STAMP = 0x70`. A tile decode table sits at ddt.ts:91.
- `plugins/millipede/src/core/conway.ts:48` region — real picture-code bands: `DDT = 0x6e`, `POISON = 0x78` ($78..$7B), `NORMAL = 0x7c`.
- `ml7-6` ("Decode the real ship + enemy/mushroom sprites") is a real shipped story (`sprint/archive/ml7-6-session.md`) — the sprite-ROM decode this story builds on.

The tile TARGETS the title asserts ($6E/$6F→$2E/$2F, $78-$7B→$38-$3B) are hypotheses under test, not settled facts — that is the RED-phase subject. Derived ACs frame every mapping as "confirmed against ROM; corrected if wrong," so no false ground truth was baked in. AC1 carries an honest parenthetical uncertainty about $6F's tile; TEA resolves it from the ROM decode.

**ACs derived (epic YAML had `acceptance_criteria: null`).** Five ACs in the context: DDT map, POISON map, rock ($70) tile, a ROM-sourced determinable test (RED→GREEN) locking each mapping, and the human visual playtest (AC5).

**Human-in-the-loop dependency (NON-blocking).** This is a *visual playtest*: the attract field has no rocks/poison/live-DDT, so the literal "stage a wave and eyeball each tile" needs a human on `/millipede/`. The pipeline delivers the ROM-derived correction + tests; the user runs the post-merge smoke test. Do NOT block the PR on the human eyeball — file any visual issue as a follow-up. Recorded in the "Human-in-the-Loop Dependency" section above and as AC5.

**Board / claim.** Sibling probes clear at setup (no `ml7-10` branch on origin, no sibling `.session/ml7-10`). Claim pushed: stamp + context committed on `feat/ml7-10-verify-ddt-poison-sprite-tiles` (gitflow — `develop` is protected, so the claim rides the branch), branch pushed to origin, story stamped `in_progress`.

**Handoff → TEA (Tyr One-Handed) for RED.** Derive the correct stamp→tile ground truth from the ml7-6 sprite-ROM decode, write failing tests asserting each mapping, and watch them fail. Treat the title's hex targets as hypotheses, not the answer.

## Tea Assessment

**Outcome: GREEN regression guard shipped (verify-confirms-correct).** New file
`plugins/millipede/tests/sprite-tile-fidelity.test.ts` (35 tests, all green on arrival), commit `84e20178`.

**What I verified (the title's hex targets were hypotheses; all confirmed).** I derived ground truth from the
ROM itself, not from the story text: `MLDEF.MAC:202-208` gives the char codes (CLOUD=$2E, DDT=$6E "first of 2",
ROCK=$70 "indestructible feature", POISON=$78, NORMAL=$7C), which match ddt.ts/conway.ts/mushroom.ts exactly.
`charTile` (render.ts:82, `tile = code ^ 0x40`) routes DDT→$2E/$2F, ROCK→$30, POISON→$38-$3B. The committed
`STAMPS` sheet is byte-faithful to the picture EPROMs (`stamp-data.test.ts` AC-3b ran live here). All mapped
tiles are non-blank, the flip is material, and the graphic families are mutually distinct. **No mismatch — so
no Dev fix.** Per the user ruling, this is the intended outcome (see Delivery Findings).

**Why no RED→GREEN:** there is no automatable oracle for "does $2E look like a bomb" — that is the visual
playtest (AC5, human). Manufacturing a failing test would have been dishonest. Instead the guard LOCKS IN the
verified mapping (AC4) and closes ml7-6's coverage gap (it content-checked mushrooms only). Non-vacuity proven
by two mutations, both reverted: charTile→identity reddens all 7 routing tests; a wrong ROCK_STAMP reddens the
MLDEF char-code test.

**Rule coverage (`.pennyfarthing/gates/lang-review/typescript.md` + project rules):**
- *Every test asserts something meaningful / no vacuous assertions:* all 35 assert concrete pixel/constant
  facts; the two source-text-adjacent guards (bank-flip routing, family distinctness) are proven able to fire
  by the mutation battery above (lang-review "a guard must be shown able to redden").
- *No re-implementation of the decode:* the ROM-anchored tooth calls the ml2-2 `decodeStamp` seam, never a
  hand-rolled mask walk.
- *Licence wall respected:* the raw-EPROM tooth is `skipIf(!romsPresent)` (EPROMs gitignored), so it stays
  green on a CI clone; the CI-live teeth are the committed-`STAMPS` assertions.
- *readonly-safe:* `tilesEqual` compares element-wise (no mutation of the readonly `STAMPS`).

**For Dev (Loki):** there is nothing to implement — the mapping is correct. Confirm the guard is green, run the
full millipede suite (1233 green here) + lint (clean here), and hand to review. The only "work" this story
still needs is the human visual playtest, which is routed post-merge (Delivery Findings) and is NOT a Dev task.

**State handed over:** millipede 1233/1233, lint clean, branch `feat/ml7-10-verify-ddt-poison-sprite-tiles`
(commits: claim `…`, guard `84e20178`).

## Dev Assessment

**Implementation Complete:** Yes (no implementation required)
**Files Changed:**
- None. No production source was touched — the only change on the branch is TEA's guard test
  `plugins/millipede/tests/sprite-tile-fidelity.test.ts` (commit `84e20178`).

**Why no code:** minimalist discipline — no test failed, so no production code was warranted. The story's
"correct any mismatch" clause is conditional and did not fire: every determinable check (MLDEF char codes,
ml7-6 bank law, EPROM-faithful bake, non-blank/distinct tiles) confirms the DDT/rock/poison mapping was
already correct. This is the user-ratified verify-confirms-correct outcome, not a skipped fix.

**Tests:** millipede 1233/1233 passing (GREEN); orchestrator 498/0; lint clean. Verified independently this
phase on a fresh run.

**Branch:** feat/ml7-10-verify-ddt-poison-sprite-tiles (pushed, tip `84e20178`)

**AC status:** AC1 (DDT map), AC2 (POISON map), AC3 (ROCK tile), AC4 (ROM-sourced locking test) — all met by
the guard, confirmed correct, no correction needed. AC5 (visual playtest) — HUMAN, routed post-merge.

**Handoff:** To Reviewer (Heimdall). Note for review: this is a green-on-arrival guard by design; scrutinize
the guard's teeth (mutation-proven in the TEA assessment) rather than looking for an implementation diff.

## Round 1 subagent results (superseded by Round 2 below)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1766 green (35+1233+498), lint clean, no smells; skipIf legit |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 4, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A — verified every ROM/factual claim accurate |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 4 (3 rules) | confirmed 4, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned; 5 disabled via settings)
**Total findings:** 6 confirmed (dedup across test-analyzer + rule-checker + my own catch), 0 dismissed, 0 deferred — all LOW/MEDIUM test-quality; none Critical/High.

### Cross-reference (subagents independently corroborated each other AND my own review)
- The **material-test** defect I flagged in my own pass was independently mutation-confirmed by test-analyzer (finding 1) — reverting `charTile` to identity leaves all 7 "material" tests GREEN; only the routing block reddens. So the comment claiming it catches a `charTile` regression is false.
- The **line-105 tautology** was flagged by BOTH test-analyzer (finding 2) and rule-checker (rule 26 + rule 17).
- rule-checker added **line 106** (same all-local tautology, rule 26) and the **`ink()` duplicate helper** (rule 18) that test-analyzer did not surface.
- comment-analyzer cleared every ROM/factual claim (MLDEF, charTile:82, sibling tests, the vitest interpolation note) — those are accurate.
- rule-checker cleared the GPL/citation wall (MLDEF is the non-GPL vendored source, not MAME; single-line equate quotes match committed precedent), the core/shell purity boundary (file is under tests/), type-safety (no `as any`/`!`), and error handling.

## Round 1 review — REJECTED (superseded by Round 2 approval below)

**Verdict:** REJECTED (round 1)

**Why reject a green, correct guard:** none of these block on severity (all LOW/MEDIUM), and the *mapping* this story verifies is correct. But this story's ONLY deliverable is the test file itself, so assertion quality IS the product — and finding 1 is a **false-confidence guard**: a test whose comment asserts a mechanism (catches a `charTile` regression) it provably lacks, independently mutation-confirmed by two specialists. Rule 26 (all-local-term assertions) is a lang-review rule, not style. The fixes are one-liners and this is round 1 — cheap to make the guard trustworthy rather than shipping a self-misdescribing fidelity test.

| # | Severity | Issue | Location | Fix Required |
|---|----------|-------|----------|--------------|
| 1 | [MEDIUM] [TEST] | The "bank flip is MATERIAL" test never calls `charTile` — it compares two hardcoded VERIFIED fixture indices. The comment "If charTile silently regressed to the ml7-3 identity… this fails / A pure mutation guard" is FALSE (mutation-confirmed: the 7 material tests stay green under the identity mutant; only the routing block reddens). | `sprite-tile-fidelity.test.ts:117-121` | Make it exercise production: `expect(tilesEqual(charTile(code), code)).toBe(false)` (verified: this reddens on the identity mutant). Rewrite the comment to match what it now guards. |
| 2 | [LOW] [TEST/RULE] | `expect(tile).toBe(code ^ 0x40)` — both terms are fields of the same VERIFIED literal; verifies no production behavior, subsumed by line 104. Comment "the bank-flip law, restated as an independent check" overclaims (rule 17 + rule 26). | `sprite-tile-fidelity.test.ts:105` | Delete the line and its comment. |
| 3 | [LOW] [RULE] | `expect(tile).toBeLessThan(0x40)` — checks the hardcoded fixture value, not production (rule 26). | `sprite-tile-fidelity.test.ts:106` | Change to `expect(charTile(code)).toBeLessThan(0x40)` (production-facing) — keeps the "graphics bank" intent with teeth. |
| 4 | [LOW] [TEST] | `VERIFIED.filter((v) => v.name.startsWith('DDT')).toHaveLength(2)` counts the test's own array — cannot detect any production regression. | `sprite-tile-fidelity.test.ts:94` | Replace with a production check, e.g. `expect(new Set([DDT_STAMP, DDT_STAMP + 1]).size).toBe(2)`, or drop (routing already covers both codes). |
| 5 | [LOW] [RULE] | `ink()` (line 46) is byte-identical to `charset-bank.test.ts:27` — rule 18 "extract on the second consumer." | `sprite-tile-fidelity.test.ts:46` | Extract `ink` (and optionally `tilesEqual`) to a shared `tests/helpers/` module imported by both files. If the team prefers small local helpers, record an explicit deviation instead. |
| 6 | [LOW] [DOC] | AC4's raw-EPROM tooth is `skipIf(!romsPresent)` and the EPROMs are gitignored → dormant on a CI clone; byte-fidelity for these tiles is proven only in a vendored checkout (accepted pattern, mirrors `stamp-data.test.ts` AC-3b). | `sprite-tile-fidelity.test.ts:169-181` | Add one comment line noting AC4's byte-level enforcement is local-to-a-vendored-checkout; the CI-live teeth are the committed-`STAMPS` assertions. |

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md`)
- **Rule 26 (assertion terms all-local):** VIOLATIONS at :94, :105, :106 (findings 2-4). Every other assertion traces at least one term to a production import (`charTile`, `STAMPS`, `DDT_STAMP`, `decodeStamp`, EPROM bytes) — compliant.
- **Rule 17 (comment asserts a mechanism nobody re-ran):** VIOLATION at :105/:118-120 (findings 1-2). All ROM factual claims in comments — compliant (comment-analyzer + my own MLDEF/charTile re-verification).
- **Rule 18 (one concept, two helpers):** VIOLATION — duplicate `ink()` (finding 5).
- **Rule 15 (every guard mutation-tested):** COMPLIANT — routing battery and AC4 tooth both proven able to redden by live mutation (test-analyzer + rule-checker + my own battery).
- **Rule 1/2/4/11 (type escapes, readonly, null-handling, error handling):** COMPLIANT — no `as any`/`!`, `VERIFIED`/`REP` are `readonly`, no optional-field hazards, `decodeStamp` left unguarded so a RangeError surfaces (correct for a test).
- **Rule 32 (ROM citation / GPL wall):** COMPLIANT — MLDEF.MAC is the vendored non-GPL source, quoted per committed precedent; no MAME code.
- **Rule 31 (core/shell purity):** COMPLIANT — file is under `tests/`, where fs I/O is permitted.

### Observations (≥5)
- [VERIFIED] The mapping under test is correct: `charTile(code)=code^0x40` routes DDT/rock/poison to $2E/$2F/$30/$38-$3B — evidence: render.ts:82, mutation battery reddens routing on regression.
- [VERIFIED] Char-code constants match ROM ground truth — evidence: MLDEF.MAC:202-208 re-read CRLF-safe; matches ddt.ts:38-39, conway.ts:48, mushroom.ts:28.
- [VERIFIED] Distinctness guard has real teeth — evidence: closest pair (DDT bomb vs rock) differs by 9/64 pixels; `toBe(false)` on exact equality is not near-vacuous.
- [MEDIUM][TEST] False-confidence material test (finding 1).
- [LOW][RULE/TEST] Three tautological assertions (findings 2-4) + duplicate helper (finding 5).
- [LOW][DOC] AC4 dormant on CI (finding 6).
- [VERIFIED] No production code changed — evidence: `git diff develop...HEAD -- src/` empty; the verify-confirms-correct outcome is honest, not a skipped fix.

### Devil's Advocate
Suppose this guard is worthless. The strongest case: it is a green-on-arrival test with no production diff, so it could be pure theatre — assertions arranged to pass, proving nothing. I pushed on exactly that. The routing block survives the attack: reverting `charTile` to the historical ml7-3 identity bug reddens 7 tests (mutation-confirmed thrice — TEA, test-analyzer, rule-checker), so it genuinely pins the bank flip these tiles depend on. The char-code block survives: a wrong `ROCK_STAMP` reddens it. The AC4 tooth survives where ROMs are present: a decodeStamp plane-swap reddens it. So the guard is NOT theatre overall. BUT the attack lands on three assertions: :94 counts the test's own array; :105/:106 compare fixture literals to each other. A malicious or careless future edit could rewrite `charTile` in a way these three would not notice — they contribute false breadth to the "35 tests" headline. And the material block's comment actively misleads the next reader into believing charTile is guarded there when it is not — the worst kind of test defect, because it discourages someone from adding the real check. A confused maintainer reading "35 passing, mutation-proven" would over-trust the file. None of this corrupts production (there is none to corrupt) and none blocks on severity — but for a file whose entire purpose is to be a trustworthy oracle, self-misdescription and dead assertions are precisely the defects worth one cheap round to remove. That is why this is REJECTED, not APPROVED-with-notes.

### Deviation audit
- SM/TEA/Dev logged "No deviations" and "verify-confirms-correct / no production change." → ✓ ACCEPTED by Reviewer: the no-code outcome is sound and user-ratified; the green-guard shape is correct for a verify story.

**Handoff:** To Dev (Loki) for a fix round — apply findings 1-6 (all in `sprite-tile-fidelity.test.ts`), re-run the file + `npx vitest run --project millipede` + lint, and confirm the material test now reddens under a `charTile` identity mutant before re-review.
## Dev Assessment (rework round 1)

**Implementation Complete:** Yes — all 6 review findings addressed. Commit `31e950fe`.
**Files Changed:**
- `plugins/millipede/tests/sprite-tile-fidelity.test.ts` — findings 1-4, 6.
- `plugins/millipede/tests/helpers/tile-pixels.ts` — NEW shared helper (finding 5).
- `plugins/millipede/tests/charset-bank.test.ts` — imports `ink` from the shared helper (finding 5).

**Finding-by-finding:**
1. **[MEDIUM] material test** — now routes through the real `charTile`:
   `const dest = charTile(code); expect(tilesEqual(dest, code)).toBe(false)`. Comment rewritten to match.
   **Verified with teeth:** re-ran the `charTile`→identity mutant — the 7 material tests now REDDEN (14 total
   failures vs 7 before the fix). The false-confidence claim is gone; the test now guards what it says it does.
2. **[LOW] line 105 tautology** — deleted (`expect(tile).toBe(code ^ 0x40)` and its "independent check" comment).
3. **[LOW] line 106** — changed to `expect(charTile(code)).toBeLessThan(0x40)` (production-facing graphics-bank bound).
4. **[LOW] line 94 fixture count** — replaced with production checks: `expect(ROCK_STAMP - DDT_STAMP).toBe(2)`
   (bomb occupies $6E,$6F before ROCK $70) and the existing `NORMAL - POISON === 4`.
5. **[LOW] `ink()` duplicate** — extracted `ink` + `tilesEqual` into `tests/helpers/tile-pixels.ts`; both
   `sprite-tile-fidelity.test.ts` and `charset-bank.test.ts` now import from it (rule 18 remedy applied, not deviated).
6. **[LOW] AC4 dormant note** — added a comment: byte-level enforcement is local-to-a-vendored-checkout; on a CI
   clone the tooth skips, so a green CI run is NOT proof of ROM byte-fidelity for these tiles.

**Tests:** millipede 1233/1233; orchestrator 498/0; lint clean. Mutation re-verified for finding 1.
**Branch:** feat/ml7-10-verify-ddt-poison-sprite-tiles (pushed, tip `31e950fe`)

### Dev (implementation, rework r1)
- No new deviations. Finding 5 applied the rule's prescribed extraction (did not deviate to "keep local helper").
- No upstream findings.

**Handoff:** To Reviewer (Heimdall) for round 2 — all six are in the two test files + the new helper; the
substantive one (finding 1) is mutation-re-verified.
## Subagent Results

_(Round 2 — the canonical results for this approval. Round-1 table above is superseded.)_

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1769 green (38+1233+498), lint clean, no unused imports, no smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 1 (low) | confirmed 0 blocking; 1 LOW-confidence redundancy accepted (line 98); all 4 round-1 fixes mutation-verified |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A — every changed comment verified accurate (incl. git-log ink history) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 30 checks, 0 violations; both round-1 rule findings resolved, rule-13 meta-check clean |

**All received:** Yes (4 enabled returned; 5 disabled via settings)
**Total findings:** 0 confirmed blocking; 1 LOW-confidence redundancy accepted-with-note (line 98); 0 dismissed improperly.

### Challenge check (VERIFIEDs vs subagent findings)
No subagent contradicts any VERIFIED below. The only new note (test-analyzer, line-98 redundancy, LOW conf) is explicitly ACCEPTED and is directly contradicted by rule-checker, which judged line 98 rule-26 COMPLIANT (`charTile(code)` is a live production call). I side with keeping it: it is production-facing, honest, and documents the graphics-bank invariant — not a false-confidence defect. Not worth a round 3.

## Reviewer Assessment

**Verdict:** APPROVED (round 2)

**Summary of what was reviewed:** the round-2 rework (commit `31e950fe`) addressing all six round-1 findings, across three test files (`sprite-tile-fidelity.test.ts`, the new shared `tests/helpers/tile-pixels.ts`, and `charset-bank.test.ts`). No production code changed. All four enabled specialists returned; the two substantive fixes were mutation-re-verified by three independent parties (test-analyzer, comment-analyzer, and my own Dev-phase battery).

**Round-1 findings — all resolved:**
- [TEST] Finding 1 (false-confidence material test) — FIXED and mutation-verified: the test now computes `dest = charTile(code)` and asserts `tilesEqual(dest, code) === false`; under the ml7-3 identity mutant the 7 material tests now redden (14 total failures vs 7 before). The teeth are real.
- [TEST]/[RULE] Findings 2-4 (rule-26 tautologies at old :94/:105/:106) — FIXED: :105 deleted; :106 → `expect(charTile(code)).toBeLessThan(0x40)` (production call); :94 → `expect(ROCK_STAMP - DDT_STAMP).toBe(2)` (production constants, independently declared, so a genuine cross-constant guard).
- [RULE] Finding 5 (duplicate `ink()`) — FIXED: `ink`/`tilesEqual` extracted to `tests/helpers/tile-pixels.ts`; both consumers import it; exactly one definition remains (rule-18 remedy applied, not deviated).
- [DOC] Finding 6 (AC4 dormant on CI) — FIXED: explicit note added that byte-level enforcement is local-to-a-vendored-checkout; a green CI run is not proof of byte-fidelity.

**Specialist tag coverage (8/8):**
- `[TEST]` test-analyzer: all 4 round-1 fixes confirmed with mutation teeth; one LOW-confidence redundancy (line 98, `expect(charTile(code)).toBeLessThan(0x40)` subsumed by line 97's exact match). ACCEPTED as-is — non-blocking, production-facing, documents the graphics-bank invariant; rule-checker independently judged it rule-compliant.
- `[DOC]` comment-analyzer: clean — every changed comment (material test, routing test, AC4 note, helper header) verified accurate against code and git history.
- `[RULE]` rule-checker: clean — 30 checks, 0 violations; both round-1 rule findings resolved; rule-13 meta-check confirms the fix introduced no new violation.
- `[EDGE]` edge-hunter: disabled via settings. No blocking dismissal needed — test-only diff over pure array/constant comparisons; the one bounds-relevant call (`decodeStamp(region, tile*8)`) has `tile < 0x40` guaranteed and decodeStamp range-validates.
- `[SILENT]` silent-failure-hunter: disabled via settings. No swallowed errors — no try/catch anywhere; a `decodeStamp` RangeError would surface as a hard test failure by design.
- `[TYPE]` type-design: disabled via settings. Confirmed no `as any`/`!`; `VERIFIED`/`REP` and the helper params are `readonly`/scalar (rule-checker corroborated).
- `[SEC]` security: disabled via settings. No security surface — no user input; ROM paths are fixed and built from `import.meta.url`.
- `[SIMPLE]` simplifier: disabled via settings. The rework REDUCED complexity (deleted 2 tautologies, DRY-extracted a helper); the sole residual simplification (line 98) is noted and accepted.

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md`)
- **Rule 26 (assertion terms all-local):** COMPLIANT after rework — the three round-1 violations (:94/:105/:106) are removed or rewritten to trace ≥1 term to production (`charTile(code)`, `ROCK_STAMP`, `DDT_STAMP`). rule-checker re-swept: 0 violations.
- **Rule 17 (comment asserts a mechanism nobody re-ran):** COMPLIANT — the material/routing/AC4 comments now match the code; mutation claims re-verified true by test-analyzer, comment-analyzer, and rule-checker.
- **Rule 18 (one concept, two helpers):** COMPLIANT — `ink`/`tilesEqual` have exactly one home (`tests/helpers/tile-pixels.ts`).
- **Rule 13 (fix-introduced regression):** COMPLIANT — rule-checker meta-check found no new violation from the fix.
- **Rules 1/2/5/8/11 (type escapes, readonly, module imports, test quality, error handling):** COMPLIANT — no `as any`/`!`, readonly-safe helper, no `.js`/dist imports, no swallowed errors.

### Observations (≥5)
- [VERIFIED] Material test now guards `charTile` — evidence: :109-116 computes `dest = charTile(code)`; identity mutant reddens all 7 (test-analyzer + my own run). Rule-26 compliant (production term).
- [VERIFIED] Routing test production-facing — evidence: :97-98 both call `charTile(code)`; mutant reddens the block. Rule-26 compliant.
- [VERIFIED] `ROCK_STAMP - DDT_STAMP === 2` is a real guard — evidence: ddt.ts:38-39 declares both as independent literals ($6E, $70); a drift in either reddens. Rule-26 compliant.
- [VERIFIED] Helper is DRY and correct — evidence: `tests/helpers/tile-pixels.ts` sole definition; `charset-bank.test.ts:65` still uses `STAMPS` so its import is live (lint exit 0). Rule-18 compliant.
- [VERIFIED] AC4 tooth honestly scoped — evidence: `it.skipIf(!romsPresent)` + gitignored EPROMs + the added note; comment-analyzer confirmed accurate.
- [TEST][LOW] Line 98 redundant with line 97 (accepted, non-blocking) — production-facing and documents intent; rule-checker judged it compliant.
- [VERIFIED] Suite green & clean — evidence: preflight 1769 green, lint clean, no unused imports; orchestrator 498/0.

### Devil's Advocate
Suppose the rework only papered over round 1. The strongest attack: the fixes are cosmetic — the "material" test was relabelled but still toothless, and the tautologies were shuffled rather than removed. I pushed on exactly this and it does not hold. The material test was mutation-re-tested by two independent specialists AND me: under the ml7-3 identity mutant it now reddens (14 failures, up from 7), which is only possible because the assertion now routes through the live `charTile`. The deleted tautology (:105) leaves no trace (grep-confirmed), and its former sibling (:106) now calls `charTile(code)`, so a `charTile` defect that keeps the exact-match (:97) somehow passing but violates the graphics-bank bound would still be caught — admittedly a narrow gap, since :97's exact match already dominates. The `ROCK_STAMP - DDT_STAMP` check is the one place a skeptic could still object: two consecutive constants differ by 2 somewhat trivially — but they are independently declared literals, so a real transcription error in either reddens it, which is the regression it exists to catch. The residual line-98 redundancy is the honest weak point: it cannot fail independently of line 97 within its test. But it is production-facing, not misleading, and documents the "graphics bank" invariant for a reader — the opposite of round 1's false-confidence defect. Forcing a third round to delete one honest, compliant line would be over-rounding a story whose mapping is correct and whose guard now has verified teeth. The remaining real risk — does $2E visually read as a bomb — is unchanged and is the human playtest (AC5), correctly routed post-merge. Nothing here blocks.

### Deviation audit
- SM/TEA/Dev "No deviations / verify-confirms-correct" and Dev-rework "no new deviations; applied rule-18 extraction rather than deviating." → ✓ ACCEPTED by Reviewer: sound and consistent with the findings; the green-guard shape is correct for a verify story, and the rework tightened it without changing the (correct) outcome.

**Handoff:** To SM (Baldur) for finish-story. Note: AC5 (visual playtest) remains a POST-MERGE human smoke test — carry it into the archive as a routed follow-up, do not treat it as incomplete pipeline work. Optional dormant nicety: drop or relocate line 98 (`expect(charTile(code)).toBeLessThan(0x40)`) if a future touch visits this file; non-blocking.
## Impact Summary

**Story:** ml7-10 — Verify + correct the DDT-bomb and POISON-mushroom sprite tiles
**Outcome:** VERIFY-CONFIRMS-CORRECT — no production code changed; a ROM-anchored green regression guard was shipped and hardened over two review rounds.
**Blocking findings:** 0.

- **Mapping status:** the DDT-bomb / ROCK / POISON char-code→tile mappings were verified ALREADY CORRECT — source char codes match `MLDEF.MAC:202-208` (CLOUD=$2E, DDT=$6E, ROCK=$70, POISON=$78, NORMAL=$7C); `charTile` bank flip (`tile = code ^ 0x40`) is ml7-6-proven; the baked `STAMPS` sheet byte-matches the picture EPROMs; every mapped tile is non-blank, material, and mutually distinct.
- **Deliverable:** `plugins/millipede/tests/sprite-tile-fidelity.test.ts` (guard) + `plugins/millipede/tests/helpers/tile-pixels.ts` (shared `ink`/`tilesEqual`) + `charset-bank.test.ts` (imports the helper). No `src/` change.
- **ACs:** AC1-AC4 met by the guard (routing mutation-verified); **AC5 (visual playtest) is a POST-MERGE human smoke test**, routed as a non-blocking follow-up — the user stages a millipede wave with rocks + poison + a live DDT bomb on `/millipede/` and eyeballs each tile.
- **Review:** round 1 REJECTED (6 LOW/MEDIUM test-quality findings) → all fixed in `31e950fe`, independently mutation-re-verified → round 2 APPROVED. millipede 1233, orchestrator 498/0, lint clean.
- **Merge:** PR #398 merged into `develop` (merge commit `b0732670`).
