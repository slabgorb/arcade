---
story_id: "ml4-5"
jira_key: "ml4-5"
epic: "ml4"
workflow: "tdd"
---
# Story ml4-5: Spider first-wave extra-spider feature

## Story Details
- **ID:** ml4-5
- **Jira Key:** ml4-5
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/ml4-5-first-wave-extra-spider
- **PR:** https://github.com/slabgorb/arcade/pull/334

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-13T18:32:43Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-13T18:00:02Z | 2026-08-13T18:01:27Z | 1m 25s |
| red | 2026-08-13T18:01:27Z | 2026-08-13T18:18:00Z | 16m 33s |
| green | 2026-08-13T18:18:00Z | 2026-08-13T18:24:53Z | 6m 53s |
| review | 2026-08-13T18:24:53Z | 2026-08-13T18:32:43Z | 7m 50s |
| finish | 2026-08-13T18:32:43Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- **Conflict (blocking — repaired in this branch, TEA):** develop landed RED at `e6d20196`: ml3-7's ROCK census guard (`tests/audit/mushroom-claims.test.ts`, pins ROCK@MLDEF.MAC:204 = {BT-33, SC-51}) and ml4-4's DD-5 claim at the same line merged in crossed order (#331 before #328), so neither PR's CI saw the other. Repaired in commit 2379cdaf by deliberately admitting DD-5 per the guard's own update-deliberately law. Owner: resolved here; noted for Reviewer.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

## Sm Assessment

Setup complete for ml4-5 (3 pts, p3, tdd). Branch `feat/ml4-5-first-wave-extra-spider` cut from develop; story context at `sprint/context/context-story-ml4-5.md`. This is a title-only story — the title is the spec: extend `trySpawnSpider` with the first-wave extra-spider feature descoped from ml4-1 (slots 6..11 open above 100,000 on a full first wave CENTIN=0C, allowance min((SCORE2-10)/2,5)+3, reserved-slot arithmetic vs the centipede train, MILLI.MAC:2318-2345). TEA should measure the title's premise against the quarry and read ml4-1's session archive before writing RED tests. Handing off to TEA for RED.

## TEA Assessment

**RED delivered** (commit 2379cdaf, verified by testing-runner run `ml4-5-tea-red`): exactly 10 failing tests, all in `plugins/millipede/tests/spider.test.ts`; the rest of the cabinet is green (15,607 passed, 1,017 files; orchestrator 481; lint clean).

**Title premise measured against the quarry** (MILLI.MAC:2318-2345, read this session): the title's formula is confirmed with two precision notes the tests pin. (1) The gate opens AT 100,000 exactly (SBC I,10 leaves carry set at SCORE2=0x10), not strictly "above". (2) The allowance `min((SCORE2-10)>>1,5)+3` uses a BINARY subtract/LSR on the BCD SCORE2 byte; the clamp comparison is `>= 8 → 5` (the "IF BELOW 200,000" branch). The reserved-slot boundary is `NCENT+1-allowance` KEPT by the centipede (BCS refuses index ≤ boundary), which caps the feature at slot 6 arithmetically (allowance max 8 → boundary 5).

**Contract for GREEN (Dev)** — extend `src/core/spider.ts` per the header of `tests/spider.test.ts`:
- Export `NCENT = 12` (MLDEF.MAC:188, SD-52).
- Add `dead: number` to `SpiderEnv` (DEAD, MLDEF.MAC:295, SD-53 — remaining centipede segments).
- Export `extraSpiderOpen(index, env)` covering :2321-2345 (SD-54..61); index ≥ NCENT is always open.
- In `trySpawnSpider`, replace the `index < 12` descope guard with `extraSpiderOpen` — a closed gate must skip the COUNT2 decrement (the 11$ path runs before the 100$ DEC).
- MODE (attract, :2318-2319) stays an ml7 seam — do not model it.

**Claims:** SD-52..61 appended to `docs/rom-study/claims/09-beetle-spider.json`, byte-verified against the vendored tree (checkClaims: 107 claims, 0 errors). No dossier prose added, so the coverage sweep is unaffected.

**Rule Coverage:**
- Purity/core-boundary: no new module — spider.ts is already enrolled in the ml1-1 purity sweep; the feature is pure byte arithmetic on the existing env.
- Cited constants: every new literal in the suite carries an SD-52..61 claim; NCENT joins the cited-constants pin.
- Test quality (lang-review #18 / vacuous-assertion self-check): performed — every new test asserts concrete values; the slot table asserts BOTH open and closed per index (`toBe(index >= first)`), so a permissive mutant cannot pass; the closed-gate test pins the no-decrement side and its 120k counterpart pins the decrement side.
- Byte semantics: wrap/borrow paths pinned (SBC borrow at 0x0F, LSR clamp at 0x20, arithmetic floor at slot 5).

**Test-file census:** no new test file (both edits extend existing suites), so no README/count gates move.

## Dev Assessment

**GREEN delivered** (commit ad773b8b, pushed to `origin/feat/ml4-5-first-wave-extra-spider`): `src/core/spider.ts` extended exactly per the RED contract — `NCENT = 12` export (SD-52), `dead` on `SpiderEnv` (SD-53), `extraSpiderOpen(index, env)` porting MILLI.MAC:2321-2345 line-for-line (SD-54..61), and `trySpawnSpider` routing centipede entries through the gate in place of the ml4-1 descope guard, with the closed-gate path returning BEFORE the COUNT2 decrement (the ROM's 11$ ordering). Module header and docstrings updated to retire the descoped-feature language.

**Implementation notes:** pure byte arithmetic on the existing env — no new module, no new seams; the `(score2 - 0x10) & 0xff` mask mirrors the SBC-after-passed-borrow-check (the value is provably non-negative there, the mask keeps the byte-semantics house style). MODE (attract, :2318-2319) untouched — the ml7 seam, per scope.

**Verification (testing-runner, ml4-5-dev-green):** full cabinet 1,018 files / 15,617 vitest tests + 481 orchestrator = 16,098 passed, 0 failed; lint (tsc) clean. No cross-app regression.

**Design deviations:** none — the implementation is the RED contract verbatim.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1,197 tests green, 0 smells, diff scoped to 5 expected files |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by the reviewer's 6-mutant battery (M1-M4, M6: boundary/ordering mutants, all killed) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — pure boolean gates, no error paths to swallow; M4 (gate-after-DEC ordering) and M5 (gate removal) killed |
| 4 | reviewer-test-analyzer | Yes | findings | 2 | confirmed 1 (high — SD-58 clamp `>=`vs`>` mutant survived; FIXED in dc87315b, re-verified by M3 kill), dismissed 1 (low — score2 0x1A..0x1F table rows: invalid BCD, unreachable from real scoring, behaviorally identical for slots 6..13; the ROM's own arithmetic is what the module mirrors) |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A — all 10 new claims byte-verified, contract header matches exports, no stale descope language, crossed-merge narrative independently confirmed |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — reviewer checked: `Readonly<SpiderEnv>` on both new signatures, `dead` documented byte field, no casts/any (rule-checker #1/#2 corroborate) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — pure deterministic game-state arithmetic, no input/auth/tenant surface (rule-checker #10 corroborates) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — net new code is one 10-line gate + a 2-line guard swap; no abstraction added; NCENT stays module-local per the shared-extraction rule |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 34 rules × 61 instances, 0 violations; independently mutation-tested the gate (stub→true: 7/44 red) and byte-verified SD-52..61 |

**All received:** Yes (4 returned, 5 disabled pre-filled)
**Total findings:** 1 confirmed (fixed), 1 dismissed (with rationale), 0 deferred

### Rule Compliance

Lang-review `typescript.md` (30 checks) + 4 repo rules, applied by reviewer-rule-checker across every touched declaration (0 enums, 1 interface extension, 2 functions, 11 tests) — 0 violations. Reviewer spot-confirmed the load-bearing ones: **#1/#2** no type escapes, `Readonly<SpiderEnv>` on `extraSpiderOpen`/`trySpawnSpider` (spider.ts:136/176); **#15** guards are mutation-tested, not token-matched (three independent batteries this review: rule-checker's stub, test-analyzer's boundary pair, reviewer's M1-M6); **#17** every mechanism comment re-derived against the vendored MILLI.MAC/MLDEF.MAC this session; **#24** the descope retirement swept ALL sites (header, docstrings, test SCOPE block, the replaced descope-pin test); **purity** — no Date.now/Math.random/DOM in the diff, module already enrolled in the ml1-1 sweep; **citations** — every new literal carries an SD-52..61 claim, checkClaims 107/107; **byte semantics** — `(score2-0x10)&0xff` masks the SBC, boundary arithmetic provably in [5,10] needs no mask (matches the ROM's never-borrowing SBC); **shared-extraction** — NCENT stays module-local, correctly.

### Devil's Advocate

Suppose this code is wrong. Where would it hide? **The MODE seam:** SPDMV checks MODE at :2318-2319 before everything; we model none of it, so a future ml7 wiring that calls trySpawnSpider during attract would spawn spiders the ROM would not. That is a real trap — but it is the epic's declared seam (ml4-1 set the precedent, the session scope re-states it), the wiring story owns the gate, and the test-file SCOPE block documents it. **The DEAD ambiguity:** DEAD is `.BLKB 2` — per-player. Our env flattens it to one byte; if ml7 wires the wrong player's DEAD, extra spiders appear on the wrong player's wave. The reducer cannot enforce that; the claim SD-53 records per-player semantics for the wiring story to honor. **Invalid BCD:** score2=0x1A..0x1F yields allowance 10 — boundary 3 — slots 4..11 "open", and my slot-5 pin would fail at 0x1E. But those bytes are unreachable from BCD scoring, the ROM computes the identical nonsense, and fidelity means porting the arithmetic, not sanitizing it. Dismissed with eyes open. **The census repair:** could admitting DD-5 mask a real dedup regression? No — the assertion stayed exact-set-equality; a fourth claim still reds. **Concurrency:** slots are mutated in place; two calls on one slot per frame would double-decrement COUNT2 — but the caller contract (one sweep per frame, ROM loop structure) is the same one every sibling reducer carries. Nothing found that the suite, the claims gate, or a named downstream story does not already hold.

### Observations

1. [VERIFIED] `extraSpiderOpen` ports :2321-2345 branch-for-branch — evidence: spider.ts:136-145 each line carries its ROM range; re-derived against the vendored MILLI.MAC this session (CPX/BCS → `>= NCENT`, BEQ → `=== 0`, BNE → `!== 0x0c`, BCC → `< 0x10`, LSR/CMP/BCC → `>> 1` + `>= 8` clamp, ADC → `+ 3`, SBC/CMP/BCS → `NCENT+1-allowance < index`). Complies with the citation and purity rules (checkClaims 107/107; no impure calls).
2. [VERIFIED] The closed gate takes the ROM's 11$ path BEFORE the 100$ DEC — evidence: spider.ts:183-184 order, pinned by the no-decrement test and killed mutant M4.
3. [TEST] SD-58 clamp boundary was unpinned (`>=`→`>` survived) — test-analyzer, confirmed by mutation; fixed in dc87315b (slot 5 at SCORE2=0x20, the exact LSR=8 trigger); M3 re-run kills it (1 red).
4. [EDGE] Reviewer 6-mutant battery, all killed: M1 centin `!==`→`<` (1 red), M2 floor 0x10→0x0F (2 red), M3 clamp `>=`→`>` (1 red, post-fix), M4 gate-after-DEC swap (1 red), M5 dead-gate removal (1 red), M6 allowance +3→+2 (4 red). Each mutant's site confirmed by `git diff` before its run; tree restored and re-verified clean after.
5. [RULE] 34 rules, 61 instances, 0 violations (rule-checker, corroborated by reviewer spot-checks above).
6. [DOC] All ten SD-52..61 claims byte-verified twice over (comment-analyzer ran the 828-claim gate; TEA ran checkClaims at authoring); contract header matches the module's real export surface.
7. [VERIFIED] The mushroom-claims census repair is sound — evidence: DD-5 exists in 13-ddt.json at MLDEF.MAC:204 with distinct DDTS2 semantics; merge order #331-before-#328 confirmed from git history by comment-analyzer; exact-set assertion retained so the guard keeps its teeth.

## Reviewer Assessment

**APPROVED** — after one fix round, applied and re-verified (commit dc87315b; 716/716 millipede tests, full-suite spot green, lint clean, branch pushed).

The diff is a faithful, cited, mutation-hardened port of the first-wave extra-spider feature (MILLI.MAC:2318-2345) into the existing pure spider reducer. Specialist coverage: [TEST] one confirmed finding (the SD-58 clamp's exact trigger was unpinned) — fixed and its killing mutant re-run; [EDGE]/[SILENT]/[TYPE]/[SEC]/[SIMPLE] domains covered by the reviewer's own 6-mutant battery (all killed) and line-level checks recorded in the observations; [RULE] 0 violations across 34 checks; [DOC] clean with every claim byte-verified. The pre-existing develop breakage (crossed merges #331/#328) was repaired in-branch with the census guard's law preserved — noted in Delivery Findings and independently confirmed. No Critical or High findings remain. Ready for finish.