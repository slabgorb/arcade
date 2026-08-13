---
story_id: "ml5-1"
jira_key: "ml5-1"
epic: "ml5"
workflow: "tdd"
---
# Story ml5-1: Waves + scoring core (cited): per-wave difficulty BEETLA beetles-allowed (MLDEF.MAC:370) + DELAY between waves (MLDEF.MAC:286); SCORNG scoring (MLSUB.MAC:1040) + UPSCRE update scores on screen (MLSUB.MAC:1912), scoring pinned to PTS (MLDEF.MAC:398).

## Story Details
- **ID:** ml5-1
- **Jira Key:** ml5-1
- **Workflow:** tdd
- **Branch:** feat/ml5-1-waves-scoring-core
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-13T16:59:23Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-13T16:25:36.033668+00:00 | 2026-08-13T16:28:25Z | 2m 48s |
| red | 2026-08-13T16:28:25Z | 2026-08-13T16:43:34Z | 15m 9s |
| green | 2026-08-13T16:43:34Z | 2026-08-13T16:47:51Z | 4m 17s |
| review | 2026-08-13T16:47:51Z | 2026-08-13T16:59:23Z | 11m 32s |
| finish | 2026-08-13T16:59:23Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- **[Gap, non-blocking] The BEETLA per-wave quota is unwired today.** `src/core/beetle.ts:69-70`
  declares the `allowed` field (BEETLA, MLDEF.MAC:370) and DECREMENTS it on each spawn
  (`beetle.ts:151`), but nothing in the tree ever SETS it at wave start. That set — the
  score2-driven ramp of MILLI.MAC:637-665 — is exactly ml5-1's `beetlesPerWave`. Dev should wire
  `beetlesPerWave(score2, hard)` into the wave-start reset (the consumer that resets `counts.allowed`);
  the field and its decrement already exist.
- **[Gap, non-blocking] `beetleAllowed` (concurrency 1/2/3) is a DIFFERENT variable from `beetlesPerWave`.**
  `beetle.ts:106 beetleAllowed(score2)` is the BEETLS concurrency cap (how many on screen at once,
  MILLI.MAC:272-279). ml5-1's `beetlesPerWave` is the per-wave QUOTA (BEETLA, total for the wave). A
  guard test pins that they differ at 250k (concurrency 3 vs quota 4) so Dev does not collapse them.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### Dev (implementation)
- **Deferred wiring `beetlesPerWave` into a wave-start reset of `beetle.ts`'s `counts.allowed`**
  - Spec source: session Delivery Findings (TEA), finding 1 — "Dev should wire `beetlesPerWave(score2, hard)` into the wave-start reset (the consumer that resets `counts.allowed`)"
  - Spec text: wire the new quota reducer into the consumer that resets BEETLA at wave start
  - Implementation: shipped `beetlesPerWave` as a standalone pure reducer only; did NOT add a caller
  - Rationale: there is no wave-start reset / game-loop consumer in the tree (millipede has no `sim.ts`; `src/core/` is standalone reducers). No test in this story exercises a wiring, and inventing a consumer would be untested scope creep against the minimalist-discipline rule. The reducer is ready for the later ml5 game-loop story to call.
  - Severity: minor
  - Forward impact: minor — a later ml5 story (the game loop / wave transition) must call `beetlesPerWave(score2, hard)` to reset `counts.allowed` at wave start; until then BEETLA is set only by a caller that does not yet exist. The distinction from `beetleAllowed` (concurrency) is guarded by a test so the wiring story cannot conflate them.

## Sm Assessment

**Story:** ml5-1 — Waves + scoring core (millipede), 5pt, p3, tdd. Repo: arcade (monorepo, plugin at `plugins/millipede/`).

**Premise verified before setup.** The title carries five falsifiable ROM citations. I opened each cited line in `reference/original-source/millipede/{MLDEF,MLSUB}.MAC` — all five verify exactly:
- `MLDEF.MAC:370` → `BEETLA: .BLKB 1 ;NUMBER OF BEETLES ALLOWED DURING THIS "WAVE"` (per-wave difficulty count)
- `MLDEF.MAC:286` → `DELAY: .BLKB 1 ;NON ZERO TO DELY BETWEEN WAVES`
- `MLDEF.MAC:398` → `PTS: .BLKB 16. ;NUMBER OF POINTS FOR KILLING THIS CRITTER`
- `MLSUB.MAC:1040` → `.SBTTL SCORNG-SCORING` / `;SCORNG-AWARD SCORE`
- `MLSUB.MAC:1912` → `.SBTTL UPSCRE-UPDATE SCORES ON SCREEN`

No correction block was needed — the story's citations are accurate as written. Note for TEA/Dev: the ROM sources live under `reference/original-source/millipede/`, NOT under `plugins/millipede/docs/`.

**Acceptance criteria were null in the epic YAML** — sm-setup DERIVED them from the title + verified citations. TEA should treat the derived ACs as the starting spec and refine against the ROM.

**Sibling contention probe (clean):** `git branch -r | grep ml5-1` → no branch before setup. Session sweep across `~/Projects/a-*/.session/` → only a-1 running ml4-4 (different story, different epic). No open PRs — merge gate clear. develop synced ff-only before setup.

**Core/shell boundary applies:** `plugins/millipede/src/core/` is pure deterministic sim (a purity test scans its source text); render/scoring-display seams belong in `src/shell/`. UPSCRE (update scores *on screen*) is a shell concern; SCORNG/BEETLA/DELAY/PTS are core. Existing core files: bee, beetle, conway, dragonfly, earwig, inchworm, millipede, mosquito, mushroom, palette.

**Claim pushed:** commit `472229ec` (in_progress stamp + context) on `feat/ml5-1-waves-scoring-core`, pushed to origin so the sibling branch probe lights up.

**Routing:** tdd/phased → next owner TEA for the RED phase.

## Tea Assessment

**RED committed** on `feat/ml5-1-waves-scoring-core` (`test(ml5-1): RED …`). Full millipede
project verified by testing-runner (RUN_ID `ml5-1-tea-red`): **27 failed / 597 passed / 5 skipped**,
the 27 being exactly the three new files; no regression; `npm run lint` (tsc --noEmit) clean.

**Structural decision (from the centipede-pattern study).** Millipede has NO `sim.ts`/`SimState`
yet — `src/core/` is standalone per-critter reducers with explicit `Env`/`Counts` records (the
beetle.ts house style). So ml5-1 ships **standalone pure functions in two new modules**, NOT a
state-field addition. Scoring is split the way centipede splits it (a `score.ts` BCD dial + an
accumulator); the SCORNG **bonus-life tail and the COUNT3 head-speed ramp are deferred** (a later
ml5 story, mirroring centipede/bonus.ts) and cited-forward in the test headers, not implemented here.
UPSCRE (MLSUB.MAC:1912) is **shell** (score-on-screen render) and is out of core scope by the
core/shell boundary — the title names it as the shell seam, not a core deliverable.

**Acceptance criteria (I DEFINED these — the story YAML shipped `acceptance_criteria: null`; the
failing tests are the executable spec):**
1. **AC1 — BEETLA per-wave quota** (`beetlesPerWave(score2, hard)`, MILLI.MAC:637-665): the score2
   ladder 1 (<70k) → 2 (<140k) → 3 (<210k) → 4 (<400k) → easy 4/hard 6 (<500k) → 6 (<700k) → 255
   (≥700k). Terminal band is 255 (LDY 0FD + two INY = 0xFF), NOT 253. Comment-trap guarded: ROM
   comments describe the next tier, tests pin the ACTUAL stored count.
2. **AC2 — inter-wave DELAY countdown** (`stepWaveDelay`, CHKEND MLSUB.MAC:52-59; `WAVE_DELAY`=0x40
   MILLI.MAC:1904-1905): decrements only on a clear frame; HOLDS while mushrooms restore / player
   explodes / beetles present; the `waveReady` edge fires on exactly the frame DELAY reaches 0. The
   edge is computed at the single return (lang-review ts #14).
3. **AC3 — SCORNG accumulator** (`awardScore({score, points, attract})`, MLSUB.MAC:1049-1055): adds
   points to the running score; NO-OP in attract mode (MODE<0, :1050); a legitimate 0-point award is
   distinct from the attract guard (ts #4 `??`-not-`||`); monotonic.
4. **AC4 — SCORE2 BCD dial** (`score2Of`, `bcdByte`): points → the ten-thousands BCD byte the wave
   ladders compare (70k→0x07, 700k→0x70), wrapping at the 3-byte BCD ceiling. Crossing a 10K boundary
   bumps the tier (the automatic model of SCORNG :1061-1074).
5. **AC5 — scoring pinned to PTS** (MLDEF.MAC:398): a REAL critter PTS (beetle's 300, imported from
   the shipped `beetle.ts`) flows through `awardScore` — proves the pinning is live, not a literal.
6. **AC6 — cited claims gate** (`docs/rom-study/claims/13-waves-scoring.json`, WV-*/SG-* prefixes):
   the new constants are byte-verifiable claims against the vendored `.MAC` files; self-enrolling via
   the loadClaims glob; palette-claims.test.ts pattern (population floors + required anchors +
   vendored-only + byte-reopen).

**What GREEN (Dev) must ship** (contracts are at the top of each test file):
- `src/core/waves.ts` — `WAVE_DELAY`, `beetlesPerWave`, `stepWaveDelay` (+ `WaveBlockers`).
- `src/core/score.ts` — `bcdByte`, `score2Of`, `awardScore` (+ `ScoreInput`).
- `docs/rom-study/claims/13-waves-scoring.json` — WV-*/SG-* claims, verbatim GENERATED from the
  vendored source (never hand-typed — the ml1-2 sidecar lesson), then wire `beetlesPerWave` into the
  wave-start reset of `beetle.ts`'s `counts.allowed` (see Delivery Findings).

**Test inventory (RED):** `tests/waves.test.ts` (12 cases), `tests/scoring.test.ts` (9 cases),
`tests/audit/waves-scoring-claims.test.ts` (6 cases). Loader pattern: COMPUTED specifier keeps tsc
lint-clean while the module is absent; a self-describing throw names the contract on RED.

## Rule Coverage

Rules surface = `.pennyfarthing/gates/lang-review/typescript.md` (no `.claude/rules`, no `SOUL.md`).
Applicable checks and their guarding tests:
- **#4 null/undefined — `||` vs `??` on a valid 0:** `scoring.test.ts` "zero points is a clean no-op"
  pins that a legitimate `points: 0` is added (0), not swallowed by a `points || default`.
- **#14 derived EDGE computed in one branch:** `stepWaveDelay`'s `waveReady` is a transition edge;
  the "fires ONLY on the frame DELAY reaches 0" + the full-countdown "exactly once" tests force it to
  the single exit so no caller path misses it. Contract note in the test header mandates the design.
- **#2 readonly on non-mutated params:** the `WaveBlockers`/`ScoreInput` contracts are `Readonly<>`;
  the module interfaces mark fields `readonly`, matching the codebase's Segment idiom.
- **#8 test quality (meaningful, non-vacuous):** every `it` carries claim ids; every `expect` a
  `FILE:LINE (ID)` message; the attract test asserts BOTH the no-op AND the in-play landing (a real
  discriminator, not a coincidental zero); the PTS test uses a real imported value, not a literal.
- **Purity (project rule, `tests/purity.test.ts`):** the new modules are pure reducers (no clock, no
  DOM, no Math.random) — `purity.test.ts` globs `src/core/` and will cover them once shipped.

**Deviations:** none. **Next owner:** Dev (GREEN).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/millipede/src/core/waves.ts` (new) — `WAVE_DELAY` (0x40), `beetlesPerWave(score2, hard)`
  (the BEETLA per-wave quota ramp, MILLI.MAC:637-665), `stepWaveDelay(delay, blockers)` (the CHKEND
  inter-wave countdown, MLSUB.MAC:52-59) + `WaveBlockers`. Pure, cited, `waveReady` edge at the single return.
- `plugins/millipede/src/core/score.ts` (new) — `bcdByte`, `score2Of` (the SCORE2 BCD dial),
  `awardScore({score, points, attract})` (the SCORNG accumulator, attract no-op, MLSUB.MAC:1049-1055)
  + `ScoreInput`. Pure, cited.
- `plugins/millipede/docs/rom-study/claims/13-waves-scoring.json` (new) — 11 byte-verifiable claims
  (7 WV-*, 4 SG-*), GENERATED from the vendored source (not hand-typed), self-enrolling via the
  loadClaims glob. All required anchors present (MLDEF.MAC:370/286/398, MILLI.MAC:665, MLSUB.MAC:1050).

**Minimalism:** implemented exactly what the tests demand — three files, no consumer wiring (see the
Dev deviation: no wave-start reset consumer exists yet, so wiring `beetlesPerWave` into `beetle.ts`
would be untested scope creep, deferred to the later ml5 game-loop story). The SCORNG bonus-life tail
and COUNT3 ramp were already scoped out by TEA and remain unimplemented.

**Tests:** GREEN. Verified by direct run + full suites:
- Target files: 27/27 passing (`tests/waves.test.ts` 12, `tests/scoring.test.ts` 9, `tests/audit/waves-scoring-claims.test.ts` 6).
- Full millipede project: **626 passed / 5 skipped / 0 failed** (purity scan of the new core files
  passes; the full citations gate byte-verifies the 11 new claims).
- Orchestrator suite: **481 passed / 0 failed**.
- `npm run lint` (tsc --noEmit, repo-wide): clean.

**Branch:** `feat/ml5-1-waves-scoring-core` (pushed, commit `ff89a208`).

**Next owner:** Reviewer.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — full suite GREEN (1107 pass / 0 fail / 5 skip), lint clean, no smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 | confirmed 2, downgraded/merged 1 (all comment-citation accuracy) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A — pure reducers, `||`-vs-`??` compliance verified |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 8 (19 instances, mostly one systematic issue) | confirmed 3 distinct issues, dismissed 0 |

**All received:** Yes (4 enabled returned, 2 with findings; 5 disabled pre-filled)
**Total findings:** 4 confirmed (1 MEDIUM systematic + 3 LOW), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict: APPROVED after one rework round.** Initial verdict was REJECTED on a citation-integrity
cluster (all findings comments/labels — zero behavior or machine-verified-claim impact — but a named
project-rule breach that cannot be dismissed). All findings were fixed in commit `029364e0` and
re-verified (lint clean, `--project millipede` 626 pass / 0 fail). Resolution log at the bottom of
this section.

**What is CORRECT (independently verified against the vendored ROM this session):**
- All 11 machine-verified claims in `13-waves-scoring.json` (WV-1..7, SG-1..4) byte-match their `.MAC` lines exactly — confirmed by comment-analyzer AND the audit suite's own byte-reopen test.
- `beetlesPerWave` matches MILLI.MAC:640-665 exactly: the 1→2→3→4→(easy 4/hard 6)→6→255 ladder, the 0x40–0x49 DIP split, and the terminal 255 (LDY 0FD + INY INY, NOT 253). I re-traced the branch structure myself.
- `WAVE_DELAY`=0x40 (MILLI.MAC:1904-1905), `stepWaveDelay`/CHKEND hold-and-countdown (MLSUB.MAC:52-59), `awardScore` attract no-op (MLSUB.MAC:1050), `score2Of` BCD dial + wrap — all faithful.
- Purity: both new core files are import-free, no clock/Math.random/DOM. `||`-vs-`??`: `awardScore` uses `if (attract)`, `stepWaveDelay` uses `delay === 0` — a valid 0 is never swallowed (rule #4 clean, with an explicit regression test). `readonly` on both param interfaces.
- Test quality: table-driven boundary coverage, real-constant PTS pin (not a magic literal), floor-not-exact claim counts, byte-reopen anchors. No vacuous assertions.

**Confirmed findings (required rework):**

1. **[RULE] Fabricated citation tags break the ROM-citation convention** — MEDIUM (systematic, ~19 instances).
   `waves.ts:8` (`WV-DELAY-ARM`), `score.ts:12/19/34` (`SG-BCD`, `SG-SCORE2`, `SG-SCORE2-WRAP`, `SG-ATTRACT`), and the `it`-titles across `waves.test.ts` / `scoring.test.ts` cite tags in the claim-id namespace (`WV-`/`SG-`) that do NOT exist — the real claims are numeric `WV-1..7`/`SG-1..4`. Verified the fleet convention: `beetle.ts`'s `BT-N` source tags and `beetle.test.ts`'s `(BT-2/18/19/...)` it-titles are 1:1 with real claims in `09-beetle-spider.json`. My descriptive suffixes masquerade as claim ids and resolve to nothing (rule_checker #32/#17). Cannot dismiss — it matches the project's own citation rule.
   **Fix:** cite the REAL claim id where a test/const exercises a claimed ROM line (`WV-DELAY-ARM`→`WV-6`, `SG-ATTRACT`→`SG-2`, quota tests→`WV-3/4/5`, terminal→`WV-4`, PTS→`SG-4`, award→`SG-1/3`); for derived-property cases with no single claim (BCD encoding, monotonicity, zero-handling, wrap), DROP the parenthetical pseudo-id and keep a plain-words label (do NOT invent an id in the claim namespace).

2. **[DOC] `scoring.test.ts:27` line-extent overshoots into a different routine** — LOW-MEDIUM.
   Cites SCORNG's bonus-life tail as `:1075-1120`, but SCORNG ends at `MLSUB.MAC:1103` (`30$: RTS`); `:1104` is `.PAGE`, `:1105` is `.SBTTL SCROLL` — the range runs ~17 lines into the unrelated SCROLL routine. Verified myself. (The named symbols BONUS1/EXTRAL/INC LIVES are correctly within 1075-1103.) The jt8-6 lesson: line-extents drift — prefer naming the routine's RTS.
   **Fix:** `:1075-1103`.

3. **[DOC] `score.ts:35` open-ended companion + `waves.ts:45` "single return" wording + `waves.test.ts:52` `:52-81`** — LOW.
   `score.ts:35` `(:1075-)` → make explicit `(:1075-1103)`. `waves.ts:45` docstring says `waveReady` is "computed at the SINGLE return" but `stepWaveDelay` has 3 returns — behaviourally fine (rule #14 satisfied: the two early paths cannot produce a transition and hard-code `false`), but reword to "every return sets `waveReady`; no branch can drop the edge." `waves.test.ts:52` CHKEND header `:52-81` → `:52-82` (the `1$: RTS` is at :82).

4. **[TYPE] `waves.ts:52` `stepWaveDelay` return type omits `readonly`** — LOW.
   My own contract at `tests/waves.test.ts` documents `{ readonly delay; readonly waveReady }`; the impl returns a non-`readonly` literal. (Sibling `beetle.ts` uses non-`readonly` return literals, so this is house-style-defensible — but since MY contract specified `readonly`, align them.)
   **Fix:** add `readonly` to the return type to match the documented contract.

**Clean specialist results:**
- **[SEC]** reviewer-security: clean — pure deterministic reducers with no network/auth/filesystem-write/user-string surface. The one applicable rule (`||`-vs-`??` on legitimately-zero numerics) was verified compliant on both `awardScore` (`if (attract)`) and `stepWaveDelay` (`delay === 0`); the test-time `readFileSync` reads repo-committed JSON, not attacker-controllable paths. No security findings.

**Rework target:** Dev (green). No behavior changes — comments, citation labels, and one return-type annotation only. Re-verify lint + `--project millipede` green after; the claims JSON needs no change (it is already correct).

### Rework resolution (commit `029364e0`)
- **[RULE] Fabricated citation tags — FIXED.** Replaced every `WV-*`/`SG-*` pseudo-id in `waves.ts`, `score.ts`, `waves.test.ts`, `scoring.test.ts` with the real numeric claim id where a test/const exercises a claimed line (`WV-6`, `WV-3/4/5`, `WV-7`, `SG-1/2/3/4`); dropped the parenthetical id on derived-property tests (BCD helper, SCORE2 dial, monotonic, zero-guard) keeping a plain-words label. Verified: `grep -E '(WV|SG)-[A-Z]'` → none; every referenced id (SG-1..4, WV-3/4/6/7) exists in `13-waves-scoring.json`.
- **[DOC] `scoring.test.ts:27` — FIXED.** `:1075-1120` → `:1075-1103` (ending at the 30$ RTS; no longer overshoots into SCROLL). `score.ts:35` companion → `:1075-1103`.
- **[DOC] `waves.ts` docstring — FIXED.** "computed at the SINGLE return" reworded to "every return sets `waveReady` explicitly … no caller path can miss the edge."
- **[DOC] `waves.test.ts:52` — FIXED.** CHKEND header `:52-81` → `:52-82`.
- **[TYPE] `waves.ts` `stepWaveDelay` — FIXED.** Return type now `{ readonly delay; readonly waveReady }`, matching the documented contract.
- **Re-verification:** `npm run lint` clean; `npx vitest run --project millipede` → 626 pass / 5 skip / 0 fail. Claims JSON untouched (already byte-correct).

**Final verdict: APPROVED.** Code + all 11 cited claims correct; citation-integrity cluster resolved.