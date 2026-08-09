---
story_id: "mc7-1"
jira_key: "mc7-1"
epic: "mc7"
workflow: "tdd"
---
# Story mc7-1: High-score table in core (pure), reusing @shared/highscore

## Story Details
- **ID:** mc7-1
- **Jira Key:** mc7-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 5
- **Priority:** p2
- **Repos:** arcade
- **Branch:** feat/mc7-1-highscore-table-core
- **PR:** none

## Story Context

### Technical Approach
This story implements the high-score table core module for Missile Command, reusing the existing `@shared/highscore` library. The work is scoped to pure core logic only — no storage (deferred to mc7-3) and no render (deferred to mc7-4).

**Key Constraints:**
- Ladder depth must be pinned to the ROM default (W3DSUP.MAC:3724), not hard-coded to 10
- Every new constant requires citation backed by ROM quarry
- Core module stays pure — all storage I/O deferred to shell (mc7-3)
- Reuse pattern already proven in asteroids, battlezone, centipede, joust (mc7 is a consumer, not a new mechanism)

### Acceptance Criteria
1. **MC-HISCORE-DEPTH:** Ladder depth pinned to ROM default table length (W3DSUP.MAC:3724 INIT HI SCORE). If length ≠ 10, parameterize @shared/highscore's depth rather than forking. Verify via citation gate.
2. **MC-HISCORE-DEFAULTS:** Initial ladder seeded from W3DSUP.MAC:3724 SCOINI table (.BYTE 50,69,0, 05,70,0, 30,73,0, 95,74,0, 0,75,0). Derive BCD→decimal and verify against ROM. Gate via purity.test.ts.
3. **MC-HISCORE-QUALIFY:** `qualifiesForHighScore(score)` correctly gates entry into the ladder. Qualifies when score > 10th place (or depth < 10 and table not full). Gated by test coverage + citations.test.ts.

### ROM Ground Truth
- **Source:** REV-01 (035820-01), display processor W3DSUP.MAC
- **Key anchors:**
  - W3DSUP.MAC:3724 — INITIALIZE HIGH SCORE TABLE (LDX I,14. decimal 14; SCOINI default seed table)
  - W3DSUP.MAC:3780 — UPDATE HIGH SCORE LADDER (search-then-insert algorithm)
- **Citation format:** FILE.MAC:LINE (RADIX 16 for ROM literals, trailing '.' for decimal)

### Open Questions
- **O-7a (RED to resolve):** Is REV-01 ladder depth exactly 10 (shared default) or does it vary? Will confirm via ROM audit at RED phase.

### Dependencies
- **Blocks:** mc7-2, mc7-3, mc7-4 (all depend on this table)
- **Blocked by:** none (mc4 is done, mc7-1 is mc6-independent)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-09T17:24:30Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-09T16:40:48Z | 2026-08-09T16:43:08Z | 2m 20s |
| red | 2026-08-09T16:43:08Z | 2026-08-09T16:52:05Z | 8m 57s |
| green | 2026-08-09T16:52:05Z | 2026-08-09T17:10:31Z | 18m 26s |
| review | 2026-08-09T17:10:31Z | 2026-08-09T17:24:30Z | 13m 59s |
| finish | 2026-08-09T17:24:30Z | - | - |
| red | - | 2026-08-09T16:52:05Z | unknown |
| green | 2026-08-09T16:52:05Z | 2026-08-09T17:10:31Z | 18m 26s |
| review | 2026-08-09T17:10:31Z | 2026-08-09T17:24:30Z | 13m 59s |
| finish | 2026-08-09T17:24:30Z | - | - |
| green | - | 2026-08-09T17:10:31Z | unknown |
| review | 2026-08-09T17:10:31Z | 2026-08-09T17:24:30Z | 13m 59s |
| finish | 2026-08-09T17:24:30Z | - | - |
| review | - | 2026-08-09T17:24:30Z | unknown |
| finish | 2026-08-09T17:24:30Z | - | - |
| finish | - | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): O-7a is RESOLVED at RED — the ROM ladder is **5 deep, not 10**. `HSCORL: .BLKB 3*5` (W3DSUP.MAC:125 — 3 BCD score bytes × 5) and `DSPHI: LDA HSCORL+<3*4>` (W3DSUP.MAC:3754 — BEST is index 4, the 5th rung). Update the epic-design open question / claim note accordingly. *Found by TEA during test design.*
- **Improvement** (non-blocking): GREEN requires editing the **fleet-wide** `src/shared/highscore.ts` — `qualifiesForHighScore` and `insertHighScore` currently hard-code `MAX_HIGH_SCORES = 10` and take no depth argument. Add an **optional `depth` param defaulting to `MAX_HIGH_SCORES`** (so asteroids/battlezone/centipede/joust/tempest/star-wars stay identical) and thread `MC_HIGH_SCORE_DEPTH = 5` from MC. This is the design's explicit ruling — *parameterize, do not fork*. Affects `src/shared/highscore.ts` (+ add a shared test case for the depth arg so the fleet-wide change is covered). *Found by TEA during test design.*
- **Question** (non-blocking): the MC row's **domain field** is left open by RED — the ROM `HSCORL`/`INITAL` seed carries name + BCD score only, no wave. The tests assert name+score and leave `MissileCommandHighScore`'s domain field to Dev (asteroids/joust precedent is `HighScoreEntry<'wave'>` with `null` for rows lacking domain data; seed defaults would carry `wave: null`). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the fleet-wide depth parameterization is DONE — `src/shared/highscore.ts` `qualifiesForHighScore`/`insertHighScore` now take an optional `depth` (default `MAX_HIGH_SCORES`), covered by new cases in `src/shared/tests/highscore.test.ts`. No consumer change needed (asteroids/joust/etc omit the arg). *Found by Dev during implementation.*
- **Gap** (non-blocking): pre-existing fleet test failures on `develop`, UNRELATED to mc7-1 — 54 tests in `plugins/star-wars/tests/**` (exhaust-port/trench/hitscan geometry) and `plugins/joust/tests/difficulty-wiring.test.ts` (sprint-id mutation). Proven present on clean `origin/develop` (HEAD 449bc388) at the same 14 files / 54 tests; my diff imports none of them. Not this story's to fix, but flagged so review/finish does not attribute them to mc7-1. Affects `plugins/star-wars/**`, `plugins/joust/tests/difficulty-wiring.test.ts`. *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **MC high-score row uses the shared BASE row (no domain field), not `HighScoreEntry<'wave'>`**
  - Spec source: mc7 design doc, "New / changed core modules" (`highscore.ts` — "the MC `HighScoreEntry` row type"); TEA Delivery-Findings Question (domain field left open)
  - Spec text: "the MC `HighScoreEntry` row type" (domain field unspecified)
  - Implementation: `export type MissileCommandHighScore = HighScoreEntryBase` — name + score only
  - Rationale: the ROM ladder (`HSCORL`/`INITAL`) stores initials + BCD score ONLY, no wave/level, so the base row is the most ROM-faithful AND the minimal type that passes RED (which asserts name+score). asteroids/joust use `<'wave'>`, but MC's ROM has no such field.
  - Severity: minor
  - Forward impact: minor — mc7-2 (name entry) / mc7-4 (render) can widen to `HighScoreEntry<'wave'>` with seed rows carrying `wave: null` if a domain field is later wanted; nothing here blocks that.

### Reviewer (audit)
- **MC row uses the shared BASE row (no domain field)** → ✓ ACCEPTED by Reviewer: the ROM ladder (`HSCORL`/`INITAL`) genuinely stores initials + BCD score only, so `HighScoreEntryBase` is both the minimal type that passes RED and the most ROM-faithful; the shared generic `insertHighScore<E extends HighScoreEntryBase>` rides through unchanged, and the widening path to `<'wave'>` is left open for mc7-2/mc7-4. Sound.
- No undocumented deviations found. The seed table, depth, and qualify/insert semantics all match the cited ROM (hand-verified BCD decode + purity boundary intact).

## Sm Assessment

**Setup complete — routing to TEA (Leeloo) for RED.** Story mc7-1 is the first story of epic mc7, `tdd`/phased, 5pt. Dependency mc4 is done; mc7-1 is explicitly mc6-independent, so nothing blocks it. Branch `feat/mc7-1-highscore-table-core` cut from `develop` (gitflow), story claimed to `in_progress`.

**Blocker cleared at setup:** the stranded mc5-3 sprint-archive PR (#158) was merged by the user before this story started, so the merge-ready gate is clear (no open non-draft PRs). mc5-3 is now `status: done`.

**Scope fence for TEA/Dev — pure core module ONLY:**
- New file `plugins/missile-command/src/core/highscore.ts` — an MC-typed wrapper over `@shared/highscore` (`qualifiesForHighScore`, `insertHighScore`, `highScoreKey`, `MAX_HIGH_SCORES`). mc7 is a **consumer**, not a new mechanism (asteroids/battlezone/centipede/joust already consume it).
- OUT OF SCOPE here: localStorage persistence (mc7-3), the name-entry `'entry'` phase + initials buffer (mc7-2), ladder render (mc7-4). Do not pull those forward.

**RED-phase must-dos (fidelity contract):**
- **O-7a is the RED question to settle:** pin ladder **depth** to the ROM (`W3DSUP.MAC:3724` INIT HI SCORE — anchors `LDX I,14.` and `HSCORL+<3*4>`), NOT hard-coded 10. If depth ≠ 10, parameterize `@shared/highscore`'s depth rather than forking the shared module. AC-3 prose says "> 10th place" as shorthand — the real depth is whatever the ROM pins; do not bake 10.
- Each new `src/core` constant carries a claim gated by `citations.test.ts`; `purity.test.ts` must stay green (table + qualify are pure, seeded, clock-free).
- Three claims to introduce: `MC-HISCORE-DEPTH`, `MC-HISCORE-DEFAULTS` (the `SCOINI` `.BYTE` seed table — derive BCD→decimal and assert the **whole table**, not one row), `MC-HISCORE-QUALIFY`.
- **Citation hygiene** (`[[mc-citations-jsdoc-leak]]`): citations must be `//` line comments, NOT `/** */` (the scanner leaks the numbers otherwise). A `.BYTE` table needs a derived + whole-table consistency check.
- Test the qualify **boundary** (one point below / at / above the lowest ladder score), insert ordering, and depth truncation at the ROM depth.
- Catalogue any REV-01↔REV-03 ladder delta (default names/scores, depth) in the claim note if REV-03 source is available (shared blocker with mc5-4; REV-03 not vendored — note as deferred if so).

**Ground truth:** REV-01 (035820-01), `W3DSUP.MAC`. RADIX 16 — bare literals HEX, trailing `.` DECIMAL, scores BCD (`SED`). Citation form `FILE.MAC:LINE`.

Handoff: TEA writes the failing RED suite; next in the `tdd` chain is Dev (Korben) → Reviewer (Zorg).

## TEA Assessment

**Tests Required:** Yes
**Reason:** New pure core module + ROM-pinned constants — behavioural and fidelity coverage both needed.

**Test Files:**
- `plugins/missile-command/tests/highscore.test.ts` — the MC high-score table over `@shared/highscore`: depth, seed table, qualify + insert at depth 5, and the shared-parameterization ruling.

**Tests Written:** 16 tests covering the story's 3 claims (MC-HISCORE-DEPTH, MC-HISCORE-DEFAULTS, MC-HISCORE-QUALIFY).
**Status:** RED (module `src/core/highscore.ts` absent → import fails; shared functions take no depth arg). Verified honest by an independent source-decode (below), so the RED is not a mere missing-import.

### Claim / AC Coverage

| Claim | Test(s) | Status |
|-------|---------|--------|
| MC-HISCORE-DEPTH | `pins the depth to the ROM`, `is NOT silently the shared default of 10`, `default ladder has exactly that many rungs` | failing (RED) |
| MC-HISCORE-DEFAULTS | `matches the decoded default table`, `sorted strictly descending`, `BEST is 7500 (DFT) … lowest 6950 (MJP)`, `re-derived from the vendored ROM source` (×2, source-gated) | failing (RED) |
| MC-HISCORE-QUALIFY (qualify) | `non-positive never qualifies`, `open rungs (<5)`, `FULL 5-rung board must STRICTLY beat lowest` | failing (RED) |
| MC-HISCORE-QUALIFY (insert) | `new best keeps ladder 5 deep & drops lowest`, `losing score does not enter`, `tie places newcomer after`, `does not mutate input` | failing (RED) |
| shared parameterized (design ruling) | `default depth unchanged for other consumers`, `shared qualify accepts explicit depth`, `shared insert truncates to depth` | failing (RED) |

**ROM ground truth pinned (REV-01, `.RADIX 16`, BCD scores):**
- Depth **5** — `HSCORL: .BLKB 3*5` (W3DSUP.MAC:125); BEST at `HSCORL+<3*4>` (`DSPHI`, W3DSUP.MAC:3754).
- Seed ladder (best-first) decoded from `SCOINI` (W3DSUP.MAC:3748) + `STRINI /MJPRDASRCDLSDFT /` (W3DSUP.MAC:3746): **DFT 7500 · DLS 7495 · SRC 7330 · RDA 7005 · MJP 6950**. Independently re-derived from source in-test and via a scratch decode — transcription-proof.

**RED-honesty check:** the module-under-test import aborts the whole file (module absent) — the expected first RED. The intended per-assertion failures were separately confirmed: shared `qualifiesForHighScore`/`insertHighScore` today take only `(table, score)` / `(table, entry)` (src/shared/highscore.ts:80,91), so the depth-5 pins fail for the right reason once the module lands.

**Self-check:** no vacuous tests — every default/boundary value is a distinct ROM fact or a distinct depth-5 branch; the qualify/insert crux (full 5-board rejects ≤ lowest, insert truncates to 5) is exactly what a naive shared-at-10 usage gets wrong.

**For Dev (GREEN):** create `plugins/missile-command/src/core/highscore.ts` (pure — it will be swept by `purity.test.ts`), add the 3 claims JSON (`//` line-comment citations, whole-`.BYTE`-table derive+consistency per `[[mc-citations-jsdoc-leak]]`), and parameterize `src/shared/highscore.ts`'s depth (default 10). Keep the shared change additive so `npx vitest run` stays green fleet-wide.

**Handoff:** To Dev (Korben) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/missile-command/src/core/highscore.ts` (new, pure) — `MC_HIGH_SCORE_DEPTH = 5`, `DEFAULT_HIGH_SCORES` (best-first seed ladder), `qualifiesForHighScore`/`insertHighScore` (thin wrappers threading depth 5), `type MissileCommandHighScore = HighScoreEntryBase`.
- `src/shared/highscore.ts` (fleet-wide) — added optional `depth` param (default `MAX_HIGH_SCORES`) to `qualifiesForHighScore` and `insertHighScore`; comments updated. Additive/backward-compatible: every other consumer is unchanged.
- `plugins/missile-command/docs/rom-study/claims/highscore.json` (new) — 8 claims: `MC-HISCORE-DEPTH` (5, HSCORL:125), `MC-HISCORE-DEFAULT-{DFT,DLS,SRC,RDA,MJP}` (7500/7495/7330/7005/6950, SCOINI:3748), `MC-HISCORE-INITIALS` (cite, STRINI:3746), `MC-HISCORE-QUALIFY` (anchor, UPDATE LADDER:3780).
- `plugins/missile-command/tests/citations-source.test.ts` — registered `HSCORL`+`SCOINI` in the `DERIVED` exemption and added the mc7-1 decode-consistency block (depth from `.BLKB 3*5`; each SCOINI value a real little-endian BCD triple). Standard GREEN machinery for cited `.BYTE`/`.BLKB` constants (same shape as mc5-1/mc8-2/mc9-3).
- `src/shared/tests/highscore.test.ts` — added depth-param coverage (default 10 unchanged; explicit depth-5 full-board + truncation).

**Claim realization note:** the design's single "MC-HISCORE-DEFAULTS" is realized as five per-rung claims (one per cited score value) + an initials claim, because the §4 un-cited-literal guard is value-based (each score literal needs a claim carrying that value). Honest citation over hiding the scores in a string to dodge the guard.

**Tests:** GREEN.
- `plugins/missile-command` project: **972/972** (highscore.test.ts 18/18, citations/citations-source/spawn-claims byte-checker, purity — all pass).
- `shared` project highscore suite: green incl. the new depth cases.
- `npm run lint` (tsc --noEmit, repo-wide): clean.
- `npm run test:orchestrator`: 455/455.
- Full `npx vitest run`: only the 54 PRE-EXISTING star-wars/joust failures (proven on clean `origin/develop`); zero new failures from mc7-1.

**Branch:** feat/mc7-1-highscore-table-core (pushed)

**Handoff:** To Reviewer (Zorg) for code review.
## Reviewer Assessment

**Verdict:** APPROVED

**Reviewer:** Jean-Baptiste Emanuel Zorg. Three enabled subagents (preflight, security, rule-checker) ran; the six disabled ones (edge, silent-failure, test-analyzer, comment-analyzer, type-design, simplifier) I hand-covered. Two real findings surfaced — both mutation-confirmed, both LOW/MEDIUM (non-blocking), and BOTH FIXED in review rework (commit a70e7c42) and re-verified. No Critical/High. MC project 972/972, lint clean, orchestrator 455/455.

**Dispatch tags:**
- [RULE] TWO findings (rule-checker + my hand-review), both FIXED:
  1. [RULE]/[DOC] core/highscore.ts:54 — wrapper JSDoc carried the digit 5 ("5-deep") in a /** */ block, which the AC3 un-cited-literal scanner (citations.test.ts gameLiterals) cannot strip from a multi-line block comment ([[mc-citations-jsdoc-leak]], documented in core/abm.ts:62 + core/mirv.ts:35-37). Green only because 5 is claim-covered — a latent trap. MEASURED: injecting an unclaimed 999 into that block reddened §4; a // comment does not. FIXED: converted both wrapper docs to // line comments (commit a70e7c42). Re-verified green.
  2. [RULE]/[TEST] citations-source.test.ts:590 — the SCOINI consistency loop used .toContain() (bag membership), so a claim cross-wired onto the wrong rung passed. MUTATION-CONFIRMED: swapping MC-HISCORE-DEFAULT-DLS(7495) and -SRC(7330) values stayed green. FIXED: strengthened to per-rung IDENTITY, deriving the rung↔score pairing from STRINI+SCOINI; the swap mutant now reddens (I re-ran the exact mutant post-fix: "expected 7330 to be 7495"). Re-verified.
- [SEC] clean — reviewer-security found no findings; the only behavioral change (optional depth param) is never fed externally-controlled data; the localStorage/cookie seam is untouched. I concur: traced depth's every call site (MC passes literal 5; all other consumers omit → default 10).
- [EDGE] hand-covered, clean — degenerate depth (0/negative/NaN) would misbehave in shared (out.slice(0,-1), table.length<NaN), but is UNREACHABLE: every call site passes a compile-time constant. Noted as defense-in-depth only, not a finding (a future non-constant depth should be validated). qualify boundary (below/at/above lowest) and insert truncation are exhaustively tested.
- [SILENT] hand-covered, clean — pure functions, no error handling to swallow; the test-side regex `!` assertions throw loudly on source-format drift.
- [TEST] hand-covered — coverage is strong (boundary, ordering, ties, no-mutation, depth, whole-table defaults, source re-derivation). The one gap (guard bag-membership) was finding #2, now fixed.
- [DOC] hand-covered — the shared doc comment was correctly updated for the depth param; the MAX_HIGH_SCORES "single source of truth" comment stays true (MC adds MC_HIGH_SCORE_DEPTH, does not redeclare MAX_HIGH_SCORES). The one stale-risk (finding #1 JSDoc) is fixed.
- [TYPE] hand-covered, clean — MissileCommandHighScore = HighScoreEntryBase is a sound alias; readonly params present; `export type`/inline `type` imports correct; no `as any`.
- [SIMPLE] hand-covered, clean — minimal thin wrappers, no over-engineering; the 8 claims are the honest citation cost, not bloat.

**Data flow traced:** a player final score → `qualifiesForHighScore(table, score)` (MC wrapper, depth 5) → if true, `insertHighScore(table, {name, score})` → shared insert, descending order, truncated to 5. Pure and total; no I/O, no external input reaches the depth param. Safe.

**Pattern observed:** consumer-of-@shared/highscore pattern (joust/asteroids/battlezone/centipede precedent) at plugins/missile-command/src/core/highscore.ts:19-25 — good; MC joins an already-cross-game module rather than forking.

**Error handling:** N/A by design (pure, total functions over validated shapes); non-positive scores rejected, empty/partial/full boards all handled.

**Handoff:** To SM for finish-story.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | 972+455 green, lint clean, 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered [EDGE] clean |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered [SILENT] clean |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered [TEST], finding #2 fixed |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered [DOC], finding #1 fixed |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered [TYPE] clean |
| 7 | reviewer-security | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered [SIMPLE] clean |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2 (both FIXED), dismissed 0, deferred 0 |

**All received:** Yes
**Total findings:** 2 confirmed (both fixed in review rework, commit a70e7c42), 0 dismissed, 0 deferred

### Rule Compliance

- **Core/shell purity (CLAUDE.md):** plugins/missile-command/src/core/highscore.ts imports ONLY `@shared/highscore` (path alias, not a relative `../shell/*`); purity-scanner's SHELL_SPECIFIER matches only relative `/shell` specifiers. No Date/Math.random/browser globals. VERIFIED — purity.test.ts sweep passes; matches asteroids/joust/etc precedent.
- **Every new src/core numeric constant carries a committed claim (§4):** literals in the module are MC_HIGH_SCORE_DEPTH=5 and the five scores 7500/7495/7330/7005/6950. Claims present: MC-HISCORE-DEPTH (5), MC-HISCORE-DEFAULT-{DFT,DLS,SRC,RDA,MJP}. VERIFIED — mutation: dropping a score claim reddens §4 (rule-checker confirmed via 7495).
- **[[mc-citations-jsdoc-leak]] (// not /** */ for numbers in core):** was VIOLATED at :54 (finding #1) — now FIXED (converted to //). Re-verified.
- **.BYTE table needs derived + whole-table consistency (RADIX 16/BCD):** SCOINI carries the whole-table derive in highscore.test.ts + the per-rung-identity consistency block in citations-source.test.ts (strengthened, finding #2). VERIFIED.
- **Kind-tag machinery for non-EQU claims (M6):** MC-HISCORE-INITIALS="cite", MC-HISCORE-QUALIFY="anchor"; HSCORL/SCOINI joined DERIVED with a decode block. VERIFIED — citations-source M6 green.
- **"Extract into shared only once a second game proves duplication" (CLAUDE.md):** not triggered — MC CONSUMES the already-shared, already-cross-game module; the diff only adds a backward-compatible optional depth param. VERIFIED — full 1558-test cross-project run stays green for all 7 other consumers.
- **TS lang-review (typescript.md #1–#26):** readonly params present (#2), .js extensions on relative imports + export type (#5), no `as any`/ts-ignore (#1/#8), `??` not `||` (#4), guarded `!` matching file idiom (#1). VERIFIED — rule-checker enumerated 61 instances, 0 TS violations.

### Devil's Advocate

Suppose this code is broken. Where would it hurt? The most dangerous change is the fleet-wide one: `src/shared/highscore.ts` now takes an optional `depth`. Seven other games call these primitives. If the default were wrong, every other cabinet's high-score board would silently mis-truncate — a data-loss bug across the whole arcade. Is the default safe? `depth: number = MAX_HIGH_SCORES` — omitted-arg callers get exactly the old constant, and the body substitutes `depth` for the former literal one-for-one (`table.length < depth`, `out.slice(0, depth)`). The 1558-test cross-project run passing is the proof, not the argument. Next: could a malicious or corrupt localStorage table reach `depth`? No — `depth` is only ever a source literal; the persisted table flows into `table`, never into `depth`. But what if a future author threads a player-influenced value into `depth`? Then `depth=0` makes `qualifiesForHighScore` read `table[table.length-1]` on a board it deems "full at 0" and `insertHighScore` does `slice(0,0)` (empty) — or `depth=-1` truncates from the end. That is a real latent hazard, but it is NOT in this diff and no call site approaches it; I logged it as defense-in-depth. What would a confused reader misunderstand? The seed table is presented DESCENDING while the ROM stores ASCENDING — a maintainer could "fix" the order and break the display contract; the header comment and the source-derivation test both guard against that. What about the citation guards themselves — the subtlest failure mode here, since a guard that passes while wrong is worse than no guard? Finding #2 was exactly that: the SCOINI check certified bag-membership, not identity, so a mislabeled citation shipped green. That is now closed and mutation-proven. The BCD decode is the last worry: get endianness or nibble order wrong and every default score is plausibly-but-subtly off. I hand-recomputed all five triples ([50,69,00]→6950 … [00,75,00]→7500) and they match the claims, the module, and the independent in-test derivation. Conclusion: the reachable surface is safe; the one unreachable hazard is documented.