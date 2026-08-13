---
story_id: "ml5-2"
jira_key: "ml5-2"
epic: "ml5"
workflow: "tdd"
---
# Story ml5-2: Bonus life + lives + SELECT starting score (novel)

## Story Details
- **ID:** ml5-2
- **Jira Key:** ml5-2
- **Epic:** ml5
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 5
- **Priority:** p3

## Summary
BONUS life-every-XXXX selectable (MLSUB.MAC:8, DIP MLDEF.MAC:90), DLIVES lives (MLSUB.MAC:505), SELECT starting-score/difficulty (MLSUB.MAC:1404) with BONUSS max starting bonus (MLTST.MAC:8). Cited.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-13T20:05:09Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-13T19:27:12Z | 2026-08-13T19:28:39Z | 1m 27s |
| red | 2026-08-13T19:28:39Z | 2026-08-13T19:40:28Z | 11m 49s |
| green | 2026-08-13T19:40:28Z | 2026-08-13T19:49:29Z | 9m 1s |
| review | 2026-08-13T19:49:29Z | 2026-08-13T20:05:09Z | 15m 40s |
| finish | 2026-08-13T20:05:09Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->
- **Gap (non-blocking, TEA):** the COUNT3 new-head speed ramp (MLSUB.MAC:1062-1069, the 10k-boundary SCORE2 carry's sibling) was deferred by ml5-1 "to a later ml5 story" and is NOT in ml5-2's title either — after this story it remains unowned. FILED at finish as ml5-5.
- **Improvement (non-blocking, Reviewer):** repo-wide claims-test convention debt, flagged by rule-checker (#10/#18) and present identically in every sibling claims-test file (high-scores, palette, waves-scoring + this story's): `JSON.parse(...) as Claim[]` with no runtime shape check, and a locally re-declared narrower `Claim` interface shadowing the real one in `tools/audit/check-citations.d.mts`. Not this diff's regression; the byte-verify tests are the de-facto runtime check. FILED at finish as ml5-6.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->
- **Test-fixture correction (Dev, GREEN):** RED's `bonusIndex` noise fixture used `0xCF` expecting index 2, but `0xCF & 0x30 = 0` — D4-D5 are both CLEAR in 0xCF (the RED derivation error, caught by the implementation refusing to match it). Fixed to `0xDF` (D4 set amid noise → 2) with the derivation in the test comment. The spec (ROM `AND I,30` semantics) did not change; the fixture did. No implementation code was bent to a wrong test.

## Branch Information
**Branch Strategy:** gitflow (feat/ml5-2-bonus-life-lives-select)
**Branch:** feat/ml5-2-bonus-life-lives-select
**PR:** https://github.com/slabgorb/arcade/pull/342

## Sm Assessment

Setup complete for ml5-2 (5 pts, p3, tdd). Branch `feat/ml5-2-bonus-life-lives-select` cut from develop at ff0c6fa0 — note develop absorbed TWO sibling merges during this session's start (ml5-3 high-score core via #337/#338, ml3-6 OBSTAC derivation via #336), so sibling checkouts are actively racing this sprint. TEA: (1) run the millipede suite on the fresh branch FIRST — inherited failures are not this story's (the crossed-merge lesson from ml4-5); (2) the story is title-as-spec again — four cited mechanisms (BONUS selectable life-every threshold MLSUB.MAC:8 + DIP MLDEF.MAC:90, DLIVES MLSUB.MAC:505, SELECT starting-score/difficulty MLSUB.MAC:1404, BONUSS max starting bonus MLTST.MAC:8); measure each citation against the quarry before writing RED, and check whether ml5-3's just-landed highscore.ts or claims (14-high-scores.json) already touch any of these seams. Handing off to TEA for RED.

## TEA Assessment

**RED delivered** (commit 9fe00251, verified by testing-runner run `ml5-2-tea-red`): exactly 32 failing tests across three new files — `tests/bonus.test.ts` (17), `tests/select.test.ts` (9), `tests/audit/bonus-select-claims.test.ts` (6). Everything else green: millipede 762, orchestrator 481, lint clean. Fresh-branch suite was run BEFORE writing RED (762/762) — no inherited failures this round.

**Title premise measured against the quarry** (all five citations re-opened this session): all confirmed, with load-bearing findings the tests pin:
1. **The SCORNG bonus tail is the deferred ml5-1 piece** (`score.ts` docstring names :1075-1103) — this story ships it, mirroring centipede's `bonus.ts` per the ml5-1 deferral note. Millipede's comparator is `BNE` (an equality BAND [T, T+9,999] incl. a borrow leg at the page boundary), NOT centipede's `BCC` floor — fixtures hand-derived for both legs and both refusals (11,900 / 22,000).
2. **The "none" DIP option** (Y=6): `.WORD 200` — "REALLY 0" only for life/display; the threshold STILL advances 20,000 and EXTRAL is still flagged. Pinned.
3. **The OOPS-RESET trap** (:1097 `BCS 20$` self-loop at lives>6): a reducer cannot hang — contract says treat >6 as the cap, cited as the one deliberate deviation. Pinned at lives=7.
4. **BONUSS's index** merges OPTNS1 D4-D5 with OPTNS2 D2-D3 (bit-merge EOR dance, MLTST.MAC:17-21) → X = 8 + 8*bonusOpt + 2*startOpt; D7 exits X=8 (the zero word). NOTE the DIP trap: OPTNS1 D2-D3 = starting LIVES, OPTNS2 D2-D3 = max select score — same bits, different banks.
5. **Starting lives** ((OPTNS1&0x0C)>>2)+2 = 2..5 (NLIVES :274-279); game start stores NLIVES-1 for the playing player (:382-384), NLIVES for player 2 (:350-351). DLIVES's core fact is the 6 cap; the render is shell.

**Scope cuts (the ml7 seam, per the epic):** SELECT's attract machine — TIMER cadence (:1439-1453), FIRE debounce SDBNCE (:1469-1479), MESS/HILITE/CHAN7 — and the SSCORE window's PLAYH pixel mechanics (:1501-1534) are NOT modelled; the pure kernel is (BONUSS, SELEC4, MODE-at-start, the SED ladder, applying a selection, the 5*SCORE2+1 mushroom seed).

**Contract for GREEN (Dev):** ship `src/core/bonus.ts` + `src/core/select.ts` per the test headers, and GENERATE `docs/rom-study/claims/15-bonus-select.json` (BL-*/SL-* prefixes, never hand-typed — the ml5-1/ml1-2 law) covering the 14 REQUIRED_ANCHORS in the claims-arm test; floors BL≥8, SL≥8.

**Rule Coverage:**
- Purity: both new modules are pure byte/BCD arithmetic; the ml1-1 sweep auto-enrolls them.
- Cited constants: every literal in the suites carries a MLSUB/MLTST/MLDEF line; the claims arm forces the machine-verified side.
- Test quality: no vacuous assertions; every gate pinned on BOTH sides (band: two accepts + two refusals; index: all four rows + the disabled exit; ladder: populated + collapsed).
- Byte semantics: BCD carries pinned (0x50+0x50→0x00 c1; 0x0450+0x0150→0x0600), band borrow leg pinned, DIP bit-masks pinned against neighboring bits (0xcf/0xf3 fixtures).

**Deferred, still unowned (Delivery Finding below):** the COUNT3 new-head speed ramp (:1062-1069) — deferred by ml5-1, not in this title either.

## Dev Assessment

**GREEN delivered** (commit d3b1f236, pushed to `origin/feat/ml5-2-bonus-life-lives-select`): `src/core/bonus.ts` (the SCORNG tail exactly per the RED contract — band comparator via borrow-chained subtraction, `bcdAdd` SED arithmetic, threshold-before-lives ordering, EXTRAL on every hit, none-option and 6-cap paths, the OOPS trap as the cited cap-path deviation; plus BONUS1 selection, NLIVES, game-start lives, initial target) and `src/core/select.ts` (BONUSS merged index with the EOR-dance decoded to a mask-merge, max rows, SELEC4 maximum, MODE-at-start, the SED ladder walker, applyStartingScore seeding the target one increment up, the 5*SCORE2+1 seed and row band).

**Implementation notes:** `select.ts` imports `bonusIncrement` from `./bonus` rather than duplicating the increments table — same-plugin core import, one source of truth for the BONUSV words (the module-local-copy rule covers cross-GAME stamp bands, not a sibling module's own table). `bcdAdd` is duplicated module-locally in both files by that same rule — flagged for the reviewer as an extraction candidate only if a third consumer appears. Claims file GENERATED from the vendored tree (43 claims, BL-1..20 + SL-1..23), never hand-typed; `checkClaims` 0 errors; all 14 REQUIRED_ANCHORS covered.

**One RED fixture corrected** (logged in Design Deviations): `bonusIndex(0xCF)` expected 2 but 0xCF has D4-D5 clear — the fixture's own arithmetic was wrong; fixed to 0xDF with the derivation in the test comment. No implementation was bent to match a wrong test.

**Verification (testing-runner, ml5-2-dev-green):** full cabinet 16,178 passed / 0 failed (vitest 15,697 across 1,024 files + orchestrator 481); lint clean. No cross-app regression.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 832 green, 0 smells, all-additive 6-file diff |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — covered by the reviewer's 7-mutant battery (band borrow, cap off-by-one, ladder overshoot, index mask — all killed post-fix) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — pure reducers, no error paths; loader catches add context (rule-checker #7 corroborates) |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | confirmed 2 (high — dormant bcdAdd units-carry branch, missing lives 5→6 boundary; both FIXED in 3861595f, kills re-verified), dismissed 1 (low — 4×4 index grid sampling: the formula `8+8*b+2*s` is branch-free linear bit-composition, sampled at 6 points incl. both extremes and a masking case; no per-pair defect can exist without a per-pair branch) |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 2 (high — stale ml5-1 deferral comment in score.ts, FIXED in 3861595f; low — tail-extent 1101/1103 mismatch, reconciled to :1076-1103 in the same commit). All 43 claims byte-verified independently; contract headers match export surfaces |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — rule-checker #1/#2 swept type escapes and Readonly exhaustively; its one hit (stepWord's inc param) FIXED in 3861595f |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — pure deterministic game-state arithmetic, no input surface (rule-checker #10's JSON.parse findings are test-tooling convention, routed below) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — reviewer went further than flagging: the duplicated bcdAdd was consolidated (round 2, a219a9c5) after a survivor mutant proved select's copy carried a structurally dead branch |
| 9 | reviewer-rule-checker | Yes | findings | 10 | confirmed 7, all FIXED: 3 uncited citation lines (claims BL-21..25 appended, byte-checked), 2 loose claim floors (raised to shipped 25/23), 1 missing Readonly (stepWord), 1 extent mismatch (shared with #5). Routed 3 (repo-wide convention debt, not this diff's regression — rule-checker's own context note): JSON.parse-as-Claim ×2 and the local Claim interface shadow, identical in every sibling claims-test; filed as a Delivery Finding for a future convention story |

**All received:** Yes (4 returned, 5 disabled pre-filled)
**Total findings:** 11 confirmed (all fixed), 2 dismissed (with rationale), 3 routed (convention debt, filed below)

### Rule Compliance

Lang-review `typescript.md` (30 checks) + 4 repo rules, applied by reviewer-rule-checker across 97 instances. After the two fix rounds: **#2** every object-consuming signature now carries Readonly (stepWord fixed); **#10** the three JSON.parse-as-cast sites are the established sibling-file convention with the byte-verify test as the de-facto runtime check — routed, not dismissed; **#15** claim floors now sit at the shipped counts (25/23) so deletions redden, and the 14 REQUIRED_ANCHORS pin the load-bearing lines individually; **#18** the local Claim interface shadow is the same routed convention; **#32** every comment-cited ROM line now has a matching claim (BL-21..25 close the three gaps); **#31 purity** clean (0 impure hits, sweep green); **#33 BCD** the SED law now has ONE implementation with its units-carry branch pinned; **#34 extraction** — bcdAdd consolidation is intra-plugin reuse via import (the bonusIncrement precedent), NOT a src/shared lift; the second-GAME bar remains untouched.

### Devil's Advocate

Assume it's broken. **The band comparator's blind spot:** if a single award ever jumps the score across an entire 10,000-band (score leaps from below T to above T+9,999), the BNE never sees zero and the life is silently skipped — centipede's BCC would have caught it. But the largest PTS award is 1,800 (the DDT spider) and the band is 10,000 wide: unreachable, and the ROM has the identical blindness — fidelity includes the blind spot. **The award-without-attract seam:** awardBonus has no attract gate; SCORNG's BMI protects the ROM's tail. A future wiring calling awardBonus in attract would advance thresholds during demo play. The seam is documented in bonus.ts and the ml7 wiring story owns the MODE gate — same ruling as ml4-5's MODE seam. **Two-player truth:** BONUSL/BONUSM/EXTRAL/LIVES are per-player pairs in the ROM; our reducers take one player's bytes. If ml7 wires one shared record, player 2's thresholds corrupt player 1's. The interfaces force per-player values through the signature, which is the strongest a pure reducer can say. **The ladder's numeric compare:** `word < max` compares BCD words as plain numbers — sound only because BCD ordering is numeric ordering for valid BCD, and every reachable word is valid BCD (increments and rows are). An invalid-BCD max from a corrupted OPTNS byte cannot arise: the rows are a fixed table. **selectModeAtStart reads the table, not LSCORE:** the ROM reads the LSCORE variable, which SELEC3/SELEC4 may have set under EARLIER switch state; our kernel derives from current switches — steady-state faithful, transient-divergent. Documented as the kernel boundary; the ml7 attract loop owns LSCORE's lifecycle. Nothing here survives as an unrouted defect.

### Observations

1. [VERIFIED] The band comparator ports :1076-1080 exactly — evidence: bonus.ts's borrow chain (`score1 >= bonusL ? 0 : 1`, then `(score2 - bonusM - borrow) & 0xff !== 0` refuses) re-derived against the ROM twice and pinned at four fixtures (11,900 / 12,000 / 21,900 / 22,000); mutants M3 (borrow removed) killed 2 tests.
2. [VERIFIED] Threshold-advance-before-lives-test ordering (:1081-1089 before :1095) — evidence: the cap test asserts bonusM advanced while lives held; specialist mutation confirmed the ordering is pinned.
3. [TEST] Two dormant paths found by specialist mutation and fixed: the bcdAdd units-nibble adjust (now pinned at threshold 0x1950, the 15k ladder's reachable 13th rung) and the lives 5→6 boundary (the input proving the cap is 6, not 5). Kills re-verified in the round-1 battery.
4. [SIMPLE] The duplicated bcdAdd consolidated (round 2): a survivor mutant proved select's copy carried a structurally dead units-carry branch (ladder domain caps at 0x0600); one exported implementation now serves both, behind the pinned test.
5. [RULE] Claims BL-21..25 appended for comment-cited lines the JSON missed (MLSUB 1095/15/1092/38/12) — checkClaims 48/48, 0 errors; floors raised to shipped counts.
6. [DOC] score.ts's ml5-1 deferral comment updated — the bonus tail now points at bonus.ts; only the COUNT3 ramp remains deferred (its unowned status is already a Delivery Finding).
7. [EDGE] Reviewer 7-mutant battery, all killed post-fix: units-adjust disabled (1 red), cap-one-early (1), borrow removed (2), none-option-pays (1), ladder overshoot `<=` (2), index mask drops D2 (3), plus the shared-bcdAdd re-probe (1). Each site confirmed by git diff before its run; tree verified clean after.

## Reviewer Assessment

**APPROVED** — after two fix rounds, applied and re-verified (commits 3861595f, a219a9c5; 798/798 millipede, lint clean, branch pushed).

A faithful, cited, twice-mutation-hardened port of the bonus-life tail and the SELECT kernel. Specialist coverage: [TEST] two dormant branches found by empirical mutation and pinned; [DOC] the stale ml5-1 deferral and the extent mismatch fixed; [RULE] 7 confirmed violations fixed (uncited lines claimed, floors tightened, Readonly added) and 3 convention-debt items routed to a filed finding rather than dismissed; [SIMPLE]/[EDGE] the reviewer's own battery — 7 mutants, all killed — plus the bcdAdd consolidation eliminating the one structurally dead branch. The RED fixture correction (0xCF→0xDF) was independently validated as a genuine improvement. No Critical or High findings remain. Ready for finish.