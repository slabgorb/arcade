---
story_id: "df1-2"
jira_key: "df1-2"
epic: "df1"
workflow: "tdd"
---
# Story df1-2: brief.md — the five rom-source-study preflight answers

## Story Details
- **ID:** df1-2
- **Jira Key:** df1-2
- **Workflow:** tdd
- **Stack Parent:** none

**Branch:** feat/df1-2-brief-dossier
**PR:** https://github.com/slabgorb/arcade/pull/358

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-14T01:32:08Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-14T00:46:24Z | 2026-08-14T00:47:32Z | 1m 8s |
| red | 2026-08-14T00:47:32Z | 2026-08-14T00:54:50Z | 7m 18s |
| green | 2026-08-14T00:54:50Z | 2026-08-14T01:02:00Z | 7m 10s |
| review | 2026-08-14T01:02:00Z | 2026-08-14T01:10:22Z | 8m 22s |
| red | 2026-08-14T01:10:22Z | 2026-08-14T01:14:04Z | 3m 42s |
| green | 2026-08-14T01:14:04Z | 2026-08-14T01:16:42Z | 2m 38s |
| review | 2026-08-14T01:16:42Z | 2026-08-14T01:30:02Z | 13m 20s |
| green | 2026-08-14T01:30:02Z | 2026-08-14T01:30:53Z | 51s |
| review | 2026-08-14T01:30:53Z | 2026-08-14T01:32:08Z | 1m 15s |
| finish | 2026-08-14T01:32:08Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- No upstream findings during test design. (One confirmation worth recording for GREEN: the INFO.SRC:30-39 file ledger lists the ten shipped .SRC files and omits BRUTSUM2.SRC — direct primary-source support for the never-shipped claim the brief must make.)

### Dev (implementation)
- No upstream findings during implementation. (Recorded in the brief itself: INFO.SRC:4 spells the third chain's file SAMEXPA7 while the shipped file is SAMEXAP7.SRC — the notes' own typo, cited as such, claim SH-2.)

### Reviewer (code review)
- **Improvement** (non-blocking): loadClaims() casts JSON.parse output with no runtime shape validation on the CI path (AC-3 only soft-checks 'line' in src; full validation runs only inside checkClaims/AC-4).
  Affects `plugins/defender/tests/audit/dossier-sweep.ts` (add a shape assertion in loadClaims or an unconditional schema test). Pre-existing from df1-1, untouched by this diff — SM should file it against the df1 hardening backlog (df8-era) or fold into df1-3's suite.
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the block-identity inferences (block 1=AMODE1, 2=MESS0, 7=BLK71) rest on runtime select sites plus module titles; df1-3's subsystems.md should pin the module-side evidence (MESS0.SRC:1 TTL MESSAGE BLOCK, BLK71.SRC terrain header, AMODE1 attract/hall-of-fame content).
  Affects `plugins/defender/docs/rom-study/subsystems.md` (df1-3 deliverable).
  *Found by Reviewer during code review.*

### Reviewer (code review — round 2)
- **Gap** (non-blocking): df1-1's citations.test.ts still asserts the retired "skipped on CI" model (lines 33/258/272) and lacks an unskipped vendored-tree presence guard.
  Affects `plugins/defender/tests/audit/citations.test.ts` (port the brief-dossier.test.ts corrections + guard). Route: fold into df1-3's suite work.
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): no MAME revision is pinned in docs/reference-sources.md, so MAME-attributed prose (sound board, exact refresh, ROM names) cannot be checked against a fixed instrument — the round-2 blocking finding is the direct consequence.
  Affects `docs/reference-sources.md` (pin a MAME SHA when df1-4 lands board-facts.md).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): AC-4's claims floor is a hand-picked 15 whose comment claims parity with AC-3's now-derived floor (17) — inert today (33 claims), fix opportunistically.
  Affects `plugins/defender/tests/audit/brief-dossier.test.ts` (derive both floors from one source). Route: df1-3.
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- No deviations from spec. The ANSWERS table pins exactly the citations the story title and epic context name; every pinned line was re-opened by hand against reference/original-source/defender/ this session before being fixed in the suite.

### TEA (test design — rework round 1)
- No new deviations. The rework implements the Reviewer's three [TEST] findings verbatim (section-scoped checks, width cap 20, unskipped presence guard) plus the derived floor; the two new pins (BRUTSUM2.SRC:1, williams.cpp attribution) encode review findings [MEDIUM DOC]/[LOW DOC] as tests. BRUTSUM2.SRC:1 re-opened from numbered output before pinning (line 1 is tab-indented ORG $8000).

### Dev (implementation)
- **File-to-BLOCK map shipped; chip-level ROM numbering left to df1-4**
  - Spec source: story title (session file), "(1) what shipped — the file-to-chip/block map incl. RASM chains INFO.SRC:3-9"
  - Spec text: "the file-to-chip/block map"
  - Implementation: brief.md maps each source file to its banked BLOCK (1=AMODE1, 2=MESS0, 3=ROMC0/ROMC8, 7=BLK71, resident=DEFA7/DEFB6/ROMF8/SAMEXAP7) with cited runtime evidence, plus the INFO.SRC:15-23/30-39 ledgers; it does not map files to individual ROM chip numbers (ROM1..ROM12)
  - Rationale: the primary source never states a file-to-ROM-chip assignment — the ledger names ROM revisions per release colour, not per module; chip-level facts (locations, per-set checksums) are MAME board facts, which the epic scopes to df1-4 and forbids copying
  - Severity: minor
  - Forward impact: minor — df1-4 (board-facts.md) should record the chip-level mapping from williams.cpp in prose if needed
  - → ✓ ACCEPTED by Reviewer: verified against the tree — the INFO.SRC ledgers name ROM revisions per release colour and per-file line counts, never a module-to-chip assignment; chip-level facts are MAME board facts, which the epic explicitly scopes to df1-4 and forbids copying. The block map with cited runtime evidence is the correct primary-source deliverable.

### Dev (implementation — green rework round 1)
- No new deviations. All four fixes implement the review findings as written; no spec surface changed.
  - → ✗ FLAGGED by Reviewer (round 2): the sound-gap attribution fix introduced a NEW factual claim ("ROM_START lists defend.snd") that was not run against the MAME driver it names — current ROM_START(defender) names the sound ROM video_sound_rom_1.ic12, and the M6808 comes from the machine config. Not a spec deviation but a fact error in the fix; carried as the round-2 blocking finding.

### Dev (implementation — green rework round 2)
- No new deviations. One-sentence reword per the round-2 finding; no new factual structure-level claims introduced — the wording now asserts only what needs no pinned MAME revision to stand.
  - → ✓ ACCEPTED by Reviewer (round 3): verified against the round-2 evidence — every assertion in the reworded paragraph is independently established (M6808 per driver, defend.snd as the historical name with the rename acknowledged, tree-grep negative), and the missing-pin limitation is now stated in the text itself.

### Reviewer (audit)
- TEA "No deviations" entry → ✓ ACCEPTED by Reviewer: the ANSWERS table pins match the story title's named sources one-for-one; spot-re-opened INFO.SRC:15/19, PHR6.SRC:11/15/20, DEFA7.SRC:5/6/9/629/1085/1190/1937/1963/2006/2024/2030/3048/3070, AMODE1.SRC:33/311, ROMC8.SRC:783/797 against the vendored tree during this review — all verbatims and line numbers correct.

## TEA Assessment

**Tests Required:** Yes
**Reason:** df1-2 is the first dossier story; the brief must land already machine-verified under the df1-1 citation gate, or the gate stays vacuously green.

**Test Files:**
- `plugins/defender/tests/audit/brief-dossier.test.ts` — the df1-2 RED suite, sibling of millipede's ml1-2 suite. AC-1 existence + DOSSIER_FILES enrolment; AC-2 the five preflight answers as a data table (21 pinned [file,line] citations + prose/literal signatures per answer); AC-3 coverage (citation floor 15, malformed=[], no unbackticked citations, uncoveredCitations=[]); AC-4 byte-verification of claims against the vendored tree (skipped on CI).

**Tests Written:** 12 tests covering 4 ACs (10 failing RED, 2 green-on-empty coverage teeth that arm at GREEN — the same designed shape as ml1-2)
**Status:** RED (failing — ready for Dev). testing-runner run df1-2-tea-red: defender project 53 passed / 10 failed, all failures feature-absent, no harness errors; scaffold/purity/citations suites all green.

**Fixture provenance:** every pinned citation re-opened by hand this session against reference/original-source/defender/ — INFO.SRC:3-9 (RASM chains), :11 (DR J. 1/21/81), :15-23 (colour ledger), :30-39 (file ledger, BRUTSUM2 absent); PHR6.SRC:11 (MAPC $D000), :15 (WDATA $38/$39), :20 (YMAX 240); DEFA7.SRC:5 (CKBYT $4A), :6 (RAM!>8), :9 (16MSEC), :629 (LCOINV!.$FF), :1190-1193 (COCKTAIL?), :2006-2008 (inverted IRQ), :3048-3050 (EXEC0 spin), :3056-3070 (overload); AMODE1.SRC:33 (NAPP MACRO \0,\1), :311 (NAPP 60); ROMC8.SRC:783-797 (credits FCC 'DRJ'…'TMH').

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #15 populated sweeps (no vacuous loops) | `expectPopulated` floors on the answer table, per-answer cites/prose, citation count, claims count | failing (armed) |
| #18 coverage over empty set is vacuously green | AC-1 enrolment test + AC-3 floor test force a non-empty sweep | failing |
| #18 apparatus that fails by passing | unbackticked-citation trap test (pays the debt dossier-sweep.ts documents) | failing (arms at GREEN) |
| test quality (no vacuous assertions) | self-checked: every `it` carries value-bearing expects with failure messages | n/a |

**Rules checked:** 3 of 3 applicable lang-review rules for a prose-gate suite have test coverage (this story ships docs + JSON + one enrolment line — no runtime TS surface to test beyond the gate itself)
**Self-check:** 0 vacuous tests found

**Handoff:** To Dev (Loki Silvertongue) for GREEN — author brief.md, claims/*.json, and the DOSSIER_FILES enrolment.

### Rework Round 1 (red)

All three [TEST] review findings landed as tightened tests in `brief-dossier.test.ts` (commit 7a43cbaf):
- Per-section resolution: every answer's prose/contains/cites checks now run against its own `## n.` section via `answerSection()` — the Reviewer's scramble mutation can no longer pass.
- Range-width cap: any citation range wider than 20 lines fails (the widest legitimate span is 15) — closes the `DEFA7.SRC:5-3070` bypass.
- Loud dormancy guard: an UNSKIPPED test asserts the vendored tree is present; the false "absent on CI" comments corrected (the tree is tracked, teeth run on CI).
- [LOW] floor now derived from ANSWERS (distinct pins − collapse budget 6) instead of hand-picked 15.
- Two new pins force the [DOC] fixes: `BRUTSUM2.SRC:1` citation and a `williams.cpp` attribution in section 1's sound-gap paragraph.

**Status:** RED — exactly 1 failing test (answer (1): BRUTSUM2 cite + sound attribution absent from brief.md), 64 passing. Remaining Dev work beyond the failing test: rewrite dossier-sweep.ts's stale "WHY DOSSIER_FILES IS EMPTY HERE" header; soften the "every chain opens with PHR6" overclaim; add the covering claim for BRUTSUM2.SRC:1.
**Handoff:** To Dev (Loki) for green rework.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/defender/docs/rom-study/brief.md` — the five preflight answers, 26 distinct backticked citations (`defender/`-prefixed vocabulary), millipede ml1-2 layout/tone
- `plugins/defender/docs/rom-study/claims/00-revision.json` (7), `01-shipped-map.json` (12), `02-dialect.json` (4), `03-timebase.json` (6), `04-authorship.json` (3) — 32 claims total, verbatims READ from the vendored tree by a generator script (never typed), so byte-exact by construction; two prose-only MAME corroborations (ROM_START CRC leg, set_raw 60.09615 Hz)
- `plugins/defender/tests/audit/dossier-sweep.ts` — enrolled 'brief.md' in DOSSIER_FILES (the one-line arming of df1-1's real-dossier gate)

**Tests:** 63/63 defender passing (GREEN, run df1-2-dev-green); orchestrator suite 494/494; repo-wide lint clean
**Branch:** feat/df1-2-brief-dossier (pushed)

**Evidence gathered beyond TEA's pins** (each re-opened from numbered tool output this session): block-1 evidence `ATTR JSR MAPCH1` DEFA7.SRC:1085-1086; block-2 `LDA #2 SELECT CHARS` DEFA7.SRC:2030-2031; block-7 DEFA7.SRC:2024-2025; resident ORG $D000 DEFA7.SRC:4; SAMEXAP7.SRC:2 INCLUDE PHR6.SRC; TIMER increment site DEFA7.SRC:1963 under the sub-128 beam dispatch DEFA7.SRC:1937-1939.

**Handoff:** To review (Heimdall)

### Green Rework Round 1

All four Dev-side review findings closed (commits 66b374fa, 5d4c46eb):
- brief.md §1: BRUTSUM2 `ORG $8000` now cited (`defender/BRUTSUM2.SRC:1`) with covering claim SH-13 (verbatim read from the tree — 33 claims total now).
- brief.md §1: sound-gap paragraph now attributes M6808/defend.snd to the MAME driver (williams.cpp) in prose, matching the file's own attribution discipline.
- brief.md §1: PHR6 wording softened to what the citations show — chains open with the PHR-series module; only SAMEXAP7 textually INCLUDEs it.
- dossier-sweep.ts: stale "WHY DOSSIER_FILES IS EMPTY HERE" header rewritten as "ENROLMENT MODEL", describing the enrolled state.
- Housekeeping: reviewer's story-update round-trip artifact in epic-ml6.yaml reverted (key-reorder noise touching a sibling checkout's story); legitimate df1 verdict bookkeeping committed.

**Tests:** run df1-2-dev-green-r1 — defender 65/65, orchestrator 494/494, lint clean, tree clean.
**Handoff:** To review (Heimdall), round 2.

### Green Rework Round 2

The round-2 blocking finding closed (commit 7a3c688b): the sound-gap paragraph no longer claims any MAME structure "lists" defend.snd — it states the verifiable facts (separate M6808; sound program historically distributed as defend.snd, renamed in current MAME sets; neither named anywhere in the vendored tree), attributes them to williams.cpp in prose, and explicitly notes the repo pins no MAME revision yet (df1-4 pins one before board facts become claims). Test pins (/M6808/i, /defend\.snd/i, /williams(_m)?\.cpp/) still hold in section 1. Defender 65/65, lint clean, tree clean.
**Handoff:** To review (Heimdall), round 3 — single-finding verification.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — compensated by Reviewer's 6-mutation battery |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — no error-swallowing surface in a doc+test diff; loadClaims/readDossier paths read directly |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 4 (F1 high, F2 high, F3 medium, F4 low), dismissed 0 |
| 5 | reviewer-comment-analyzer | Yes | findings | 5 | confirmed 4 (C1, C2, C3, C5), dismissed 1 (C4: directory-level count, verified true, citation grammar cannot express a directory listing) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — rule-checker covered type checks #1-#12 exhaustively (0 violations in df1-2 code) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — no auth/input/tenant surface; rule-checker #10 covered the one boundary cast (pre-existing) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — diff is a test suite + docs; rule-checker #12/#18 found no over-engineering |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 as non-blocking (R1: pre-existing df1-1 line, untouched by this diff — routed as delivery finding) |

**All received:** Yes (4 spawned returned, 5 disabled pre-filled)
**Total findings:** 9 confirmed, 1 dismissed (with rationale), 0 deferred

### Rule Compliance

Rule-checker ran all 30 lang-review typescript checks plus 3 project rules across 61 instances: **1 violation, and it is pre-existing df1-1 code this diff does not touch** (dossier-sweep.ts:146 `JSON.parse(...) as Claim | Claim[]`, no runtime shape validation on the CI path — routed below). df1-2-authored code: 0 violations. Highlights re-verified by me: #15 (source-text assertions anchor the claim, not a token — plus my own 6 mutations), #18 (no fixture-is-the-expectation; the suite reads the real brief.md), #19 (loadClaims globs all *.json, no filtering), #31 (no src/ files touched — pure-core rule holds by construction), #32 (MAME cited in prose only, no GPL text pasted anywhere — grep-confirmed no fenced code blocks in brief.md), #33 (all 32 claims match the Claim shape, ids unique).

### Devil's Advocate

Suppose this dossier is subtly wrong and everything still passes. How? First: the prose checks are document-global — test-analyzer proved by mutation that Answer 0's CRC leg can be deleted wholesale so long as the word "CRC" survives anywhere in the file. A future edit that moves, garbles, or half-deletes an answer keeps the gate green while the dossier stops answering its questions. Second: citation ranges are width-unbounded — a lazy `defender/DEFA7.SRC:5-3070` "citation" satisfies every per-line pin into that file at once, and the coverage sweep is equally satisfied by one claim anywhere inside the range. The precision the ANSWERS table advertises ("this exact source") is enforceable only while authors stay honest. Third: the byte teeth stand on `describe.skipIf(!vendoredAvailable)` — today the vendored tree is tracked so they run everywhere, but the suite's own comments claim the opposite ("absent on CI"), and this repo has already once lost a reference tree to an unanchored .gitignore; if that recurs, AC-4 goes dormant as a silent "1 skipped" — the exact ROM-less-tooth failure recorded in this project's history. Fourth: the diff itself ships a file whose header says DOSSIER_FILES "starts EMPTY" thirty lines above the enrollment it contradicts — in a project whose stated doctrine is that unverified prose is the attack surface, the PR's own prose is already drifted at merge time. Fifth: two content claims about the tree (BRUTSUM2's ORG $8000; the M6808/defend.snd gap) are stated without citation or attribution — true today, unguarded tomorrow. None of this makes the shipped dossier false today — my spot re-opens and six mutations confirm the current content is accurate and the guards bite on the defect classes they claim — but the story's deliverable IS the verification machinery, and two proven bypass classes in it are defects in the deliverable.

## Reviewer Assessment — round 1 (superseded by the round-2 assessment below)

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [TEST] | Per-answer prose/contains checks test the WHOLE brief.md, not the answer's own section — mutation-proven: an answer's fact deleted from its section passes if the keyword appears anywhere | plugins/defender/tests/audit/brief-dossier.test.ts:277-282 | TEA: split brief.md on its `## N.` headers and run each answer's prose/contains signatures against that answer's section text only |
| [MEDIUM] [TEST] | Citation range width unbounded — mutation-proven: widening one citation to `defender/DEFA7.SRC:5-3070` satisfies every DEFA7 pin and the coverage sweep | plugins/defender/tests/audit/brief-dossier.test.ts:270 (via dossier-sweep.ts claimCovers) | TEA: add a width-cap test over briefCitations() (current widest real range is 15 lines; cap ≤ 20) |
| [MEDIUM] [TEST] | AC-4 skipIf dormancy trap: comments claim the vendored tree is "absent on CI" but it is tracked (so teeth DO run); if the tree is ever gitignored/lost, AC-4 degrades to a silent skip | brief-dossier.test.ts:79-84, 337-340 | TEA: add an unskipped test asserting the vendored defender tree exists (fail loud, not skip silent) and correct the comments |
| [MEDIUM] [DOC] | dossier-sweep.ts self-contradicts: the "WHY DOSSIER_FILES IS EMPTY HERE" header block still says the list "starts EMPTY" 30 lines above the `['brief.md']` enrollment this diff added | plugins/defender/tests/audit/dossier-sweep.ts:9-18 | Dev: rewrite the header block to describe the enrolled state |
| [MEDIUM] [DOC] | Uncited content claim: BRUTSUM2's `ORG $8000` / "sums 2K ROMs" is a fact about vendored bytes with no citation and no covering claim — unguarded prose | plugins/defender/docs/rom-study/brief.md:63-65 | Dev: cite `defender/BRUTSUM2.SRC:1` (and the summing loop if desired) and add a covering claim |
| [LOW] [DOC] | Sound-gap paragraph names M6808/defend.snd with no source attribution at all, unlike every other MAME-derived fact in the file | plugins/defender/docs/rom-study/brief.md:79-83 | Dev: add the prose attribution (MAME williams.cpp — the design doc cites :1540/:2002) |
| [LOW] [DOC] | "PHR6 is the shared header every chain opens with" overclaims the single INCLUDE citation — only SAMEXAP7 textually INCLUDEs it; the chains list PHR-series first in the RASM invocations | plugins/defender/docs/rom-study/brief.md:57-58 | Dev: soften to what the citations show (chains open with the PHR-series module; SAMEXAP7 INCLUDEs it textually) |
| [LOW] [TEST] | Citation-count floor 15 vs 27 actual — a brief that lost a third of its citations passes this check | brief-dossier.test.ts:299 | TEA (optional in rework): derive the floor from ANSWERS or raise it |

Tag coverage: [EDGE] disabled — boundary paths exercised by my mutation battery (uncovered/unbackticked/malformed/reversed-range all redden). [SILENT] disabled — no swallowed-error surface; readDossier's empty-string fallback is deliberate and documented. [TEST] four findings above. [DOC] four findings above (one dismissed). [TYPE] disabled — rule-checker #1/#2/#5 clean. [SEC] disabled — no security surface; #32 GPL hygiene verified. [SIMPLE] disabled — no over-engineering found. [RULE] one pre-existing finding, routed non-blocking.

**Verified positives:** [VERIFIED] All 32 claims byte-exact and semantically faithful — spot re-opened ~20 lines against the vendored tree during review; `!.`/`!>` operator glosses match the Motorola dialect (AND / shift-high-byte), TB-3's sub-128-arm reading confirmed at DEFA7.SRC:1937-1963; complies with epic citation vocabulary and the no-GPL-copy rule. [VERIFIED] The enrollment genuinely armed df1-1's gate — mutation M3 reddened citations.test.ts's real-dossier gate as well as this suite. [VERIFIED] 6/6 reviewer mutations + 3/3 rule-checker mutations + 2/2 test-analyzer mutations killed or exposed exactly as designed; tree restored clean after each (git status clean, final run 63/63 green).

**Data flow traced:** brief.md backticked citation → scanProseCitations (parser, malformed reported) → coveredBy against claims/*.json (identity: file basename + line-in-range) → checkClaims re-opens verbatim byte-for-byte against reference/original-source/defender with containment + isFile gates (df1-1). Safe because every stage was mutation-tested this review.
**Pattern observed:** good — the ANSWERS-as-data table with expectPopulated floors (brief-dossier.test.ts:126-259) mirrors ml1-2 and states every population it sweeps.
**Error handling:** readDossier returns '' for a missing dossier (deliberate, documented — feature-absent failures instead of harness ENOENT, brief-dossier.test.ts AC-1 catches the empty case).

**Handoff:** Back to TEA (Tyr One-Handed) for red rework — findings are testable; the three [TEST] fixes land as failing/tightened tests, then Loki closes them plus the four [DOC] fixes in green.

## Subagent Results (round 2)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — lint/65-65/494-494/clean tree/0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — bypass mutations re-run independently by test-analyzer AND rule-checker this round |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — no error-handling surface in the rework diff |
| 4 | reviewer-test-analyzer | Yes | findings | 1 | confirmed round-1 fixes CLOSED (both bypasses re-mutated → red; presence guard fails loud; floor math verified); 1 low residual confirmed (AC-4 floor-15 comment drifted from AC-3's derived 17) — routed |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 | C1/C2/C3/C5 all verified FIXED; 2 high stale-CI comments in df1-1's citations.test.ts (outside diff) — routed; 1 low PHR2→PHR6 revision-identity framing — dismissed (editorial framing around two cited facts, hedging optional) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — rule-checker #1/#2/#4 clean on the new helpers |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — no security surface in rework |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — rework adds two small helpers, both minimal |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 1 BLOCKING (#17: wrong MAME attribution introduced by the round-1 fix); confirmed 1 as routed (#24: citations.test.ts carries the retired skipped-on-CI model — same as comment-analyzer's) |

**All received:** Yes (4 returned, 5 disabled pre-filled)
**Total findings:** 5 confirmed (1 blocking, 4 routed), 1 dismissed (with rationale), 0 deferred

## Reviewer Assessment — round 2 (superseded by the round-3 approval below)

**Verdict:** REJECTED (round 2 — one finding, introduced by the round-1 fix itself)

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [RULE][DOC] | The sound-gap attribution added in green rework is checkable-and-wrong: it claims "williams.cpp's defender sound-board machine and ROM_START list the M6808 and defend.snd", but current MAME's ROM_START(defender) names the sound ROM video_sound_rom_1.ic12 (defend.snd is the pre-rename historical name), and the M6808 is declared by the machine config, not ROM_START — the attribution was reasoned, not run against the instrument it names (rule #17; the correction-is-itself-a-transcription failure) | plugins/defender/docs/rom-study/brief.md:81-84 | Dev: reword to what is actually verifiable — the M6808 sound CPU comes from the MAME driver's machine configuration; the sound program (historically distributed as defend.snd; named video_sound_rom_1.ic12 in current MAME sets) ships in the ROM set, and the vendored tree names none of it. Avoid claiming which MAME structure "lists" what, since no MAME SHA is pinned in this repo |

Round-1 disposition — all seven findings verified CLOSED this round by independent re-mutation (test-analyzer re-ran the scramble and wide-range mutants → both red; rule-checker re-ran both plus a decoy-heading variant and `## 1.` vs `## 10.` anchor check → correct; presence guard verified fail-loud under DEFENDER_SOURCE_DIR=/nonexistent; C1/C2/C3/C5 doc fixes verified against the tree, SH-13 byte-exact via od -c).

Routed non-blocking (for SM at finish — every item needs a filed home, none blocks this story):
1. [DOC] df1-1's citations.test.ts still carries the retired "skipped on CI" model (lines 33/258/272) and has no unskipped presence guard — fold into df1-3's suite work.
2. [TEST] AC-4's claims floor is a hand-picked 15 with a comment claiming parity with AC-3's now-derived 17 — inert (actual 33); fix opportunistically in df1-3.
3. [TYPE] loadClaims() JSON.parse cast without runtime shape validation on the CI path (round-1 routing stands) — df1-3 or hardening.
4. [DOC] No MAME SHA is pinned in docs/reference-sources.md — df1-4 (board-facts) should pin one so MAME-attributed prose is checkable against a fixed revision.

Tag coverage: [EDGE] disabled — bypass boundary cases re-mutated by two independent specialists this round. [SILENT] disabled — no surface. [TEST] one low residual routed. [DOC] blocking finding above + routed items. [TYPE] routed item 3. [SEC] disabled — none. [SIMPLE] disabled — none. [RULE] the blocking #17 finding + #24 routed.

**Data flow traced:** unchanged from round 1 (citation → sweep → claims → byte re-open), now with the section-scope stage in front — re-verified end-to-end by two specialists' mutations this round.
**Pattern observed:** good — answerSection() is bounded by structure on both sides and anchor-safe (`## 1.` cannot match `## 10.` — verified by direct execution).
**Error handling:** answerSection returns '' on a missing heading and the test asserts the section exists before scanning — feature-absent failure, not a silent pass.

**Handoff:** Back to Dev (Loki) for green rework — one sentence in brief.md; tests already green and must stay green (the /williams(_m)?\.cpp/ and /defend\.snd/i pins still hold under the corrected wording).

## Reviewer Assessment

**Verdict:** APPROVED (round 3)

**Round-3 scope:** one sentence (commit 7a3c688b, brief.md sound-gap paragraph) plus verdict bookkeeping — verified directly by the Reviewer against the round-2 evidence; the round-2 Subagent Results table above (All received: Yes) covers the specialist ceremony for this diff, and no code changed since those four specialists ran except the single reworded paragraph.

**The blocking finding is closed:** the paragraph no longer claims any MAME structure "lists" defend.snd. Every remaining assertion is verifiable without a pinned MAME revision (separate M6808 — attributed to williams.cpp in prose; sound program historically distributed as defend.snd and renamed in current sets — exactly the rename evidence rule-checker produced; the vendored tree names neither — grep-verified in round 2), and the paragraph now states its own epistemic status (no MAME SHA pinned; df1-4 pins one before board facts become claims). Test pins (/M6808/i, /defend\.snd/i, /williams(_m)?\.cpp/) hold in section 1: defender 65/65, lint clean, tree clean, no new backticked or unbackticked citations introduced.

**Cumulative record across three rounds:** 33 claims byte-exact against the vendored tree (AC-4 runs unskipped everywhere, guarded loud); every round-1 finding closed and independently re-mutation-tested by two specialists; 13+ mutations killed across four independent batteries (Reviewer round 1, rule-checker rounds 1-2, test-analyzer rounds 1-2); all deviations audited (ACCEPTED ×3, FLAGGED ×1 — resolved by this round's fix); routed non-blocking findings all carry named homes in Delivery Findings (df1-3 ×3, df1-4 ×1, df1-1-era hardening ×1).

**Data flow traced:** brief.md citation → section-scoped answer checks → sweep (malformed reported, width-capped) → claims coverage by identity → byte re-open with containment/isFile — every stage mutation-verified this story.
**Pattern observed:** good — the gate-first dossier shape (df1-1 gate, df1-2 first enrolment) worked as designed: the coverage gate reddened the moment an uncovered citation appeared (mutation M3, round 1).
**Error handling:** feature-absent failures throughout (readDossier '', answerSection '', self-describing loadChecker errors) — verified in RED.

Tag coverage: [EDGE][SILENT][TYPE][SEC][SIMPLE] disabled this session (compensated per table); [TEST][DOC][RULE] adjudicated across rounds 1-3 as recorded above.

**Handoff:** To SM (Baldur the Bright) for finish-story.

## Sm Assessment

Setup complete. Session file, story context (`sprint/context/context-story-df1-2.md`) and branch `feat/df1-2-brief-dossier` (cut from develop) are in place. Story df1-2 is a 5-point tdd story: author `plugins/defender/reference/brief.md` with the five rom-source-study preflight answers, each claim cited to `defender/<FILE>.SRC:<line>` and enrolled under the df1-1 citation gate. Routing to TEA for the RED phase.