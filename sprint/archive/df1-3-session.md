---
story_id: "df1-3"
jira_key: "df1-3"
epic: "df1"
workflow: "tdd"
---
# Story df1-3: glossary.md + subsystems.md + open-questions.md

## Story Details
- **ID:** df1-3
- **Jira Key:** df1-3
- **Workflow:** tdd
- **Branch:** feat/df1-3-glossary-subsystems-oq
- **PR:** 360
- **Repos:** arcade
- **Points:** 3

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-14T09:51:18Z
**Round-Trip Count:** 3

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-14T08:27:56Z | 2026-08-14T08:31:09Z | 3m 13s |
| red | 2026-08-14T08:31:09Z | 2026-08-14T08:47:28Z | 16m 19s |
| green | 2026-08-14T08:47:28Z | 2026-08-14T08:53:11Z | 5m 43s |
| review | 2026-08-14T08:53:11Z | 2026-08-14T09:08:26Z | 15m 15s |
| red | 2026-08-14T09:08:26Z | 2026-08-14T09:12:41Z | 4m 15s |
| green | 2026-08-14T09:12:41Z | 2026-08-14T09:13:22Z | 41s |
| review | 2026-08-14T09:13:22Z | 2026-08-14T09:23:03Z | 9m 41s |
| red | 2026-08-14T09:23:03Z | 2026-08-14T09:25:28Z | 2m 25s |
| green | 2026-08-14T09:25:28Z | 2026-08-14T09:26:15Z | 47s |
| review | 2026-08-14T09:26:15Z | 2026-08-14T09:38:56Z | 12m 41s |
| red | 2026-08-14T09:38:56Z | 2026-08-14T09:41:39Z | 2m 43s |
| green | 2026-08-14T09:41:39Z | 2026-08-14T09:42:06Z | 27s |
| review | 2026-08-14T09:42:06Z | 2026-08-14T09:51:18Z | 9m 12s |
| finish | 2026-08-14T09:51:18Z | - | - |

## Acceptance Criteria (Authoritative from sprint YAML)

1. AC1: plugins/defender/docs/rom-study/glossary.md exists and translates the author vocabulary to plain English — at minimum PHRED (SAMEXAP7.SRC:9 ASSEMBLE WITH PHRED), MAPC (PHR6.SRC:11), MLJSR (AMODE1.SRC:39), NAPP (AMODE1.SRC:33), CKBYT (DEFA7.SRC:5) — and documents the per-author message-vector blocks (EUGENE and SAM vector blocks, MESS0.SRC:165 and MESS0.SRC:175). Every ROM assertion is a citation covered by a claims/*.json entry under the df1-1 gate.

2. AC2: plugins/defender/docs/rom-study/subsystems.md exists mapping each subsystem to owning file + routine + line — DEFA7 (scheduler/IRQ/collision/sound-sequencer), DEFB6 (enemy processes + vectors), AMODE1 (attract/hall-of-fame/scanner), MESS0 (text writers), BLK71 (terrain/waves), SAMEXAP7 (materialize/explode), ROMF8 (reset/CMOS/pricing), ROMC0+ROMC8 (diagnostics) — deepening the design spec section-1 skeleton, and pinning the MODULE-SIDE block-identity evidence (MESS0 own TTL header line, BLK71 terrain header, AMODE1 attract/hall-of-fame content) per the df1-2 review improvement.

3. AC3: plugins/defender/docs/rom-study/open-questions.md exists carrying OQ-1..OQ-5 from the design spec (CB1-vs-CB2 IRQ wiring, COUNT240/CA1 enablement, defend.3 upper-half packing, WDOG decode model, the $D000 2716-split ledger wording), each with its evidence cited and a disposition stating which later epic or story resolves it.

4. AC4: all three new files are ENROLLED in DOSSIER_FILES (plugins/defender/tests/audit/dossier-sweep.ts) so the coverage sweep and byte re-open run over them; every prose citation in the three files is covered by a claims JSON entry that verifies byte-for-byte against reference/original-source/defender/.

5. AC5 (routed from df1-2): citations.test.ts retired skipped-on-CI comment model (currently lines 33/248/272) is corrected to the shipped always-on model, and an unskipped presence guard asserts the vendored tree exists so the byte teeth can never silently skip.

6. AC6 (routed from df1-2): brief-dossier.test.ts hand-picked claims floor of 15 (inert — actual claims census is 33) is derived from the same single source as the already-derived answers floor, so the two floors cannot drift apart; the derived floor is mutation-proven (dropping a claims file reddens it).

## Story Context

This is the third dossier story in the df1 epic, following df1-1 (citation gate) and df1-2 (brief.md). It enrolls three new documentation files into the defender ROM study:

- **glossary.md** — translates author vocabulary (PHRED, MAPC, MLJSR, NAPP, CKBYT) and documents the Eugene/Sam vector blocks
- **subsystems.md** — maps each subsystem to owning file, routine, and line, deepening the design spec skeleton
- **open-questions.md** — carries OQ-1..OQ-5 from the design spec with evidence and disposition

All citations must be covered by byte-verified claims entries under the df1-1 gate.

The TDD shape for this docs story (same as df1-2):
- **RED phase:** Suite-side enrollment of the three filenames in DOSSIER_FILES, fixing the skipped-on-CI comment model in citations.test.ts, deriving the AC6 floor from a single source
- **GREEN phase:** Authoring the three docs + claims JSONs until the citation gate's coverage sweep and byte re-open pass

Routed findings from df1-2 (verified live 2026-08-14):
- AC5 tracks the skipped-on-CI comment model issue in citations.test.ts (lines 33/248/272)
- AC6 tracks the hand-picked floor (15) that is inert against the actual census (33)
- loadClaims shape validation is NOT in df1-3's scope; it is routed to df1-6

## Delivery Findings

### TEA (test design)

- **Improvement** (non-blocking): the design spec's OQ-2 names COUNT240, which appears NOWHERE in the vendored source — it is MAME's name for the CA1 240th-line interrupt (measured: a grep across all twelve .SRC files returns zero hits). The in-tree anchors are `PHR6.SRC:131` (the *CA1 IRQ pin comment) and `ROMF8.SRC:64` (the RESET PIA setup the spec says to decode). Affects `docs/superpowers/specs/2026-08-13-defender-cabinet-roadmap-and-df1-design.md` (no edit needed — recorded so df1-4 does not grep the tree for a symbol that is not there; open-questions.md should carry COUNT240 as a MAME-side prose term with the in-tree citations). *Found by TEA during test design.*
- **Improvement** (non-blocking): the spec's OQ-3 names "SAMEXAP7 ($FC60)" — the $FC60 origin is actually `APVCT EQU $FC60` at `PHR6.SRC:100`; `SAMEXAP7.SRC:15` is `ORG APVCT`. Affects `plugins/defender/docs/rom-study/open-questions.md` (Dev should cite the PHR6 equate if OQ-3's prose quotes $FC60 as a number; the suite requires only INFO.SRC:8 + ROMF8.SRC:63). *Found by TEA during test design.*

## Design Deviations

### TEA (test design)
- **DOSSIER_FILES enrolment left to GREEN, pinned by red assertions**
  - Spec source: .session/df1-3-session.md, Story Context TDD-shape ("RED phase: Suite-side enrollment of the three filenames in DOSSIER_FILES")
  - Spec text: "Suite-side enrollment of the three filenames in DOSSIER_FILES"
  - Implementation: the RED suite asserts `DOSSIER_FILES` contains each of the three names (failing today); the one-line enrolment edit in dossier-sweep.ts is left as a GREEN deliverable
  - Rationale: both siblings of this exact story shape (defender df1-2, millipede ml1-3) pin enrolment as a red assertion and have GREEN ship the edit — enrolment stays load-bearing in the diff and the red proves it happened
  - Severity: minor
  - Forward impact: Dev must add the three filenames to DOSSIER_FILES in tests/audit/dossier-sweep.ts; three tests stay red until then
  - → ✓ ACCEPTED by Reviewer: sibling precedent (df1-2, ml1-3) is exactly this shape; the red assertions kept enrollment load-bearing and Dev shipped it (verified in dossier-sweep.ts:47, D1 mutant kills)
- **open-questions.md heading format pinned to `## OQ-n` / `### OQ-n`**
  - Spec source: sprint/context/context-story-df1-3.md, AC3
  - Spec text: "open-questions.md exists carrying OQ-1..OQ-5 from the design spec ... each with its evidence cited and a disposition"
  - Implementation: per-question checks are SECTION-scoped on a `## OQ-n` (or `### OQ-n`) heading grammar the AC never specified
  - Rationale: the df1-2 review proved document-global content checks are bypassable (a keyword planted anywhere satisfies them); section scoping needs a heading contract, so the suite pins one
  - Severity: minor
  - Forward impact: Dev must use those headings; any other layout reds the section-presence test with a message naming the format
  - → ✓ ACCEPTED by Reviewer: the heading contract is what makes the OQ checks the only swap-proof table in the suite (rule-checker's OQ-1↔OQ-4 swap mutant reds 2 tests); the review's HIGH asks for MORE of this pattern, not less

### Reviewer (audit)
- No undocumented deviations found: the diff's only spec divergences are the two logged above, and the OQ-2 citation width is filed as a review finding (Medium), not a silent deviation.
## SM Setup Assessment (2026-08-14)

**Board state at setup.** Merge gate clean (zero open PRs on slabgorb/arcade). Sibling probes both run and both read: no remote branch matched df1-3 before the claim (only stale df1-1/df1-2 claim/complete branches and the df1-5/df1-defender chore branches), and the cross-checkout session sweep found a-2 on ml7-5 and a-3 on jt11-15 — neither touches defender. The claim branch was pushed with the claim commit (9ee093c2), so the sibling probe lights up for df1-3 from now on.

**The title was the spec (YAML description and acceptance criteria were both null until today), and every falsifiable premise in it was measured, not trusted.** All held: the EUGENE and SAM vector-block comments sit exactly at MESS0.SRC lines 165 and 175; the five author symbols were located (PHRED as the assembler per SAMEXAP7.SRC:9, MAPC at PHR6.SRC:11 with runtime writes at DEFA7.SRC:562-566, MLJSR at AMODE1.SRC:39 with the line-38 comment explaining the rename, NAPP at AMODE1.SRC:33, CKBYT at DEFA7.SRC:5); all twelve .SRC files exist in reference/original-source/defender/; OQ-1..OQ-5 are defined in the design spec (docs/superpowers/specs/2026-08-13-defender-cabinet-roadmap-and-df1-design.md, lines 210-224) with exactly the five topics the title names. A no-corrections measurement result, recorded per the standing rule so the next reader does not re-run the sweep.

**Predecessor audit (df1-2's archived session) — three routed findings, each re-verified live in the current tree before being carried forward.** The retired skipped-on-CI comment model survives in citations.test.ts at lines 33, 248 and 272 (the archive cited 258; the file has since shifted — cite current numbers). The hand-picked claims floor of 15 survives near brief-dossier.test.ts:439 against an actual census of 33. Both became ACs (AC5, AC6). The third — loadClaims shape validation — was left by df1-2 as "df1-3 or hardening"; ruled today: it goes to df1-6, whose title already owns the same function's malformed-JSON path fleet-wide (defender, millipede, centipede). One edit per game closes both halves, so extending beat filing or folding. df1-6's description now carries both halves plus a WHY-THIS-IS-NOT-df1-3 paragraph, and its points moved 1 to 2. TEA should not re-adopt that finding.

**Setup mechanics.** ACs were written to the epic YAML first and both files generated from it — parse-verified byte-identical (six of six in session and context). sm-setup stamped in_progress with started 2026-08-14 itself this run and produced real context content (no filler strings, verified by grep). The labelled-token audit passed on both passes including after this assessment was written. pf story commands round-trip epic-jt11.yaml with a benign key reorder each run — reverted each time; the claim commit touches only epic-df1.yaml and the context file.

**For TEA (RED phase).** The RED is the suite side: enroll the three filenames in DOSSIER_FILES (dossier-sweep.ts:45, currently brief.md only), the unskipped presence guard, the derived floors, plus whatever per-file dossier test you judge necessary — brief-dossier.test.ts is the pattern and plugins/millipede/docs/rom-study/ is the layout precedent for the three docs. The module-side evidence pointers in the context (MESS0's own TTL line, BLK71's terrain header near the top of the file, AMODE1's attract content) are pointers, not final citations — cite exact lines under the gate. No dev-server or visual surface is involved in this story.
## TEA Assessment

**Tests Required:** Yes

**Test Files:**
- `plugins/defender/tests/audit/glossary-subsystems-oq.test.ts` — NEW: the df1-3 RED suite (52 tests), ported from millipede's ml1-3 sibling and carrying defender's brief-dossier hardening (unbackticked-citation sweep, 25-line width cap, derived floors, section-scoped OQ checks)
- `plugins/defender/tests/audit/citations.test.ts` — EDITED (AC5): retired "skipped on CI" comment model corrected at all four sites (header, vendoredRoot comment, degradation section, byte-teeth section); an UNSKIPPED presence guard added defending this file's own vendoredRoot computation (its skipIfs read a path a stale `..` would silently falsify)
- `plugins/defender/tests/audit/brief-dossier.test.ts` — EDITED (AC6): both floors now derive from the hoisted `BRIEF_FLOOR = DISTINCT_PINS - 6` (one source, the ANSWERS table); the hand-picked 15 and its false parity comment are gone, and the "loadClaims() is therefore brief.md's claims" comment (which this story's own claims would have falsified) is corrected

**Tests Written:** 52 in the new file covering all 6 ACs; 43 failing, 9 deliberate green guards
**Status:** RED (verified by testing-runner: defender 75 pass / 43 fail, the one failing file is the new suite; citations.test.ts, brief-dossier.test.ts, purity, scaffold all green; orchestrator suite unaffected, 0 failures; repo-wide lint clean)

**Every pinned [file, line] was read this session from numbered tool output against `reference/original-source/defender/`** — among them: EUGENE'S/SAM'S vector blocks MESS0.SRC:165/175, SLEEP :12 / MKPROC :72 / IRQ :1931 / COLIDE :2907 / SNDOUT :696 in DEFA7, UFOST DEFB6:2-5, MAPCH7 :1292, HALLOF/SCNR AMODE1:114-115, WTEXTB/WTEXTC MESS0:721-732, BLK71 terrain header :6 + BGINIT :83 + WVTAB :89, SAMEXAP7 header :7, RESET ROMF8:63-64, CMOS ledger :16-18, ROMC0/ROMC8 TTLs :1, WDOG EQU $C3FC PHR6:14, *CB2 IRQ PHR6:135, *CA1 IRQ PHR6:131, GREEN 2716 ledger INFO:17-18, BEWARE OF ORDER OF LOADING INFO:8.

**Mutation battery (7 mutants, all killed; battery restores verified by git status + ls):**
| # | mutant | guard that bit |
|---|--------|----------------|
| M1 | stub glossary.md with malformed `PHR6.SRC:11-` | malformed-citation guard |
| M2 | stub with unbackticked PHR6.SRC:11 | unbackticked sweep |
| M3 | stub with `DEFA7.SRC:5-3070` | width cap |
| M4 | stub with valid-but-uncovered `MESS0.SRC:165` | coverage sweep |
| M5 | claims file with drifted verbatim | byte-verification gate |
| M6 | DEFENDER_SOURCE_DIR=/nonexistent | BOTH unskipped presence guards, loud, while byte teeth skip |
| M7 | claims/ dir moved aside | derived claims floor + coverage |

The four table-population tests that pass on arrival are self-measuring guards on the suite's own data tables (lang-review #15); the five gate guards that pass on arrival are the M1-M7 subjects above.

### Rule Coverage

| Rule | Coverage | Status |
|------|----------|--------|
| #15 token-vs-claim | every content check pairs author token + plain-English signature + covering citation; OQ checks section-scoped | enforced by design |
| #17 unre-run mechanism comments | the retired "skipped on CI" comments were exactly this defect — corrected, and the correction sentences quote the retired phrase only to disown it | fixed in AC5 edit |
| #18 apparatus fails by passing | expectPopulated guards every loop; 7-mutant battery proves the green guards bite | mutation-proven |
| #25 search-scope | OQ checks scoped to their own `## OQ-n` section (df1-2 document-global-bypass lesson) | enforced by design |
| #26 test-local terms | assertions anchor to the shared sweep module + the vendored tree, never test-local copies | enforced by design |
| #23 re-runnable mutants | battery script at scratchpad/mutation-battery.py; mutant list recorded above | recorded |

**Rules checked:** 6 of the applicable lang-review checks drove the design; no React/async/enum surface in this diff
**Self-check:** 0 vacuous tests found (every test asserts; the `continue` in the unbackticked sweep is presence-guarded by the exists tests, red today)

**Handoff:** To Dev (Loki Silvertongue) for GREEN — author the three docs + covering claims JSONs, enrol the three filenames in DOSSIER_FILES. The suite's failure messages name every required token, citation and heading; the millipede trio docs are the layout sibling. The routed loadClaims shape-validation finding is df1-6's, not this story's.
### Dev (implementation)

- No upstream findings.

## Dev Assessment

**Status:** GREEN — defender 118/118 (was 75/43 at RED), orchestrator 494/494, repo-wide lint clean, working tree clean.
**Landed on:** feat/df1-3-glossary-subsystems-oq, GREEN commit c8870a8f, pushed.

**What shipped:**
- `plugins/defender/docs/rom-study/glossary.md` — tools/machinery + macros tables (PHRED, MAPC, CKBYT, MLJSR, NAPP) and the per-author message-vector blocks section (EUGENE MESS0:165, SAM MESS0:175), millipede glossary layout. The PHRED entry states what the tree supports (an assembler named by SAMEXAP7's header) and explicitly leaves the RASM-vs-PHRED identity question as unstated in the tree rather than inventing an answer.
- `plugins/defender/docs/rom-study/subsystems.md` — the file-to-subsystem index: resident DEFA7 (SLEEP/MKPROC/IRQ/COLIDE/SNDOUT), DEFB6 (UFOST exemplar + MAPCH bank helpers), block 1 AMODE1 (vectors 113-115 + HALLOF), block 2 MESS0 (TTL + WTEXTB/WTEXTC), block 7 BLK71 (terrain header + BGINIT + WVTAB), SAMEXAP7 header, ROMF8 (RESET/CMOS/pricing), block 3 ROMC0+ROMC8 TTLs. Module-side block-identity evidence pinned per the df1-2 review improvement.
- `plugins/defender/docs/rom-study/open-questions.md` — `## OQ-n` sections per TEA's heading contract, each with in-tree citations and a disposition (OQ-1/2/4 to df1-4; OQ-3 unproven without assembling, provenance caveat; OQ-5 provenance note only, closed). OQ-2 carries COUNT240 as a MAME-side prose term with the in-tree CA1/RESET anchors, and OQ-3 cites the APVCT $FC60 equate at PHR6:100 — both exactly as TEA's delivery findings prescribed.
- `claims/05-glossary.json` (8), `claims/06-subsystems.json` (22), `claims/07-open-questions.json` (8) — GENERATED from the vendored tree by a table-driven scratchpad script (the ml1-2 house pattern: verbatim == source line by construction, zero hand-typing). Checker CLI: 71/71 claims verified.
- `tests/audit/dossier-sweep.ts` — DOSSIER_FILES enrolls all four dossier files (the one-line GREEN deliverable TEA's red assertions pinned).

**Delivered-code mutation battery (re-run against the SHIPPED docs, not the RED-phase stubs — the battery-scored-a-different-program rule):** D1 de-enrolling glossary.md, D2 emptying a claims file, D3 dropping the EUGENE citation from the shipped doc, D4 drifting a shipped citation to an uncovered line (DEFA7:12→13). All four killed; restores verified by byte-compare from cp backups (the docs were untracked — git checkout could not have restored them).

**Why first-pass green is credible rather than suspicious:** TEA's 43 failure messages named every required token, citation and heading, and the RED-phase battery had already proven the guards bite on stubs; the delivered battery re-proved them on the real docs. No test was weakened, renamed or skipped; the only test-side edit in GREEN is the DOSSIER_FILES enrollment line, which is itself pinned by three of TEA's assertions.

**Handoff:** To Heimdall (Reviewer). Diff is docs + claims + the one-line enrollment against origin/develop; the AC5/AC6 suite edits landed in TEA's RED commit c79feb28.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — all suites green (defender 118/118, orchestrator 494/494, lint 0, checker 71/71) |
| 2 | reviewer-edge-hunter | Yes | Skipped / disabled | none | N/A (disabled in workflow.reviewer_subagents) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped / disabled | none | N/A (disabled) |
| 4 | reviewer-test-analyzer | Yes | findings | 1 | confirmed 1 (the doc-global row-check gap, mutation-proven) |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1 (OQ-2 range over-covers by one line), downgraded to Medium |
| 6 | reviewer-type-design | Yes | Skipped / disabled | none | N/A (disabled) |
| 7 | reviewer-security | Yes | Skipped / disabled | none | N/A (disabled) |
| 8 | reviewer-simplifier | Yes | Skipped / disabled | none | N/A (disabled) |
| 9 | reviewer-rule-checker | Yes | findings | 5 rule hits over 30 rules / 71 instances | confirmed 3 (row-scope ×2 converging with test-analyzer; helper duplication), confirmed-as-LOW 1 (#26 table self-guards, established convention), noted 1 (#17 epic-AC6 parenthetical, routed to SM) |

**All received:** Yes (4 live specialists returned; 5 disabled rows pre-filled)
**Total findings:** 4 confirmed, 0 dismissed, 1 routed to SM as a non-blocking note

### Rule Compliance

Rule-by-rule enumeration delegated to reviewer-rule-checker (30 rules × 71 instances, full table in its report) and spot-re-verified: #15/#25 VIOLATION on the AC-1/AC-2 check loops (see finding 1); #18 VIOLATION on the byte-identical `expectPopulated`/`loadChecker` duplicates (finding 3); #26 flagged on the four table-population self-guards (established df1-2 convention, disclosed by TEA — LOW, no action); #17 checked five "measured" comments and all verified true against the tree/CI config; #1/#2/#4/#5/#7/#8/#10/#11/#13/#19/#20/#24/#28/#30 compliant; remainder not applicable (no enums, no JSX, no src/ code). CLAUDE.md purity rule: the diff touches no `plugins/defender/src/` file (stat-verified). Citation-gate convention: every one of the 38 new claims independently re-opened byte-for-byte by the rule-checker with awk, and 71/71 verified by the checker CLI.

### Devil's Advocate

Assume this story is broken. The most damaging version: the dossier LOOKS machine-verified — 71 byte-verified claims, 118 green tests, three mutation batteries — so every later df* story will cite it with total confidence, and the gate's own thoroughness becomes camouflage for whatever it cannot see. What can it not see? Exactly one class survived three batteries: ASSOCIATION. The byte gate proves each cited line exists and reads as quoted; the coverage gate proves each citation has a claim; nothing proves a citation sits in the row that leans on it. I swapped PHRED's and CKBYT's citations in the shipped glossary and ran the FULL suite: 118/118 green. A df3 engineer reading the glossary table would be sent to DEFA7.SRC:5 for the assembler note and SAMEXAP7.SRC:9 for the checksum byte — both lines real, both quotes verified, both wrong — and the dossier's whole authority would vouch for the error. That is the df1-2 review's document-global bypass reborn one story later, in the two tables that hold 27 of the trio's 30-odd associations, while only the five OQ sections got the fix. Second angle: the OQ-2 citation quietly annexes the *CA2 SLAM line, teaching a reader that line 130 supports a CA1 claim. Third: a stressed maintainer deleting a term from the test file's own table is caught only by the self-measuring floors — which TEA disclosed, and which the fleet convention accepts. The first angle is disqualifying on its own: a verification dossier whose verification cannot see mis-attribution must not be handed to df2-df8 as ground truth. REJECT.

### Round 1 Reviewer Assessment (REJECTED — superseded by round 2)

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [TEST][RULE] | AC-1/AC-2 per-row checks are document-global: symbol, plain-English phrase and citation are each matched against the WHOLE doc, so a citation misattributed to the wrong sibling row ships green. Mutation-proven three times independently (test-analyzer, rule-checker, and Reviewer's own FULL-suite run: PHRED↔CKBYT citation swap in the shipped glossary.md → 118/118 green). The OQ checks already carry the fix (`oqSection`/`oqCites` — rule-checker proved an OQ-1↔OQ-4 swap reds 2 tests). | `plugins/defender/tests/audit/glossary-subsystems-oq.test.ts:92-99` (cites/citesAny) as used by the AC-1 loop (~:181-192 region) and AC-2 loop (~:206-217 region) | Row-scope the glossary and subsystems checks the way the OQ checks are section-scoped: resolve each term/subsystem to its own markdown table row (or a bounded window around the symbol match) and require the citation INSIDE that scope. Add a cross-row swap mutant to the battery and record it killed. TEA (red rework). |
| [MEDIUM] [DOC] | OQ-2's citation `defender/PHR6.SRC:130-131` over-covers: line 130 is `*CA2 SLAM`, unrelated to the CA1 claim; only :131 (`*CA1 IRQ`) supports the sentence. The claims JSON and the suite already pin only :131. | `plugins/defender/docs/rom-study/open-questions.md` (OQ-2) | Narrow the citation to `defender/PHR6.SRC:131`. Dev (green, after TEA's rework lands). |
| [LOW] [RULE] | `expectPopulated()` and `loadChecker()` are byte-for-byte duplicates of brief-dossier.test.ts's copies — the second consumer has arrived (lang-review #18 one-concept-one-helper). Downgraded from the raw rule hit: same-plugin test-support duplication mirroring the millipede sibling convention, semantics identical today. | `plugins/defender/tests/audit/glossary-subsystems-oq.test.ts` (helpers near top) | Extract both into a shared test helper (tests/helpers/ exists) consumed by brief-dossier and the trio suite, in the same rework since both files are open. |
| [LOW] [RULE] | Four `expectPopulated(<table>.length, N, …)` self-guards assert the test file's own literals (#26) — can only fail against an edit to the test file itself. Established df1-2/millipede convention, disclosed by TEA as self-measuring guards. | same file, the four "none dropped" tests | No action required; recorded so the convention is a decision, not an accident. |

[EDGE] [SILENT] [TYPE] [SEC] [SIMPLE] — specialists disabled in workflow.reviewer_subagents; their domains were covered by my own pass: no boundary/numeric code in the diff (docs + test tables), no swallowed errors introduced (the one `continue` in the unbackticked sweep is presence-guarded by a sibling test, verified), no type escapes added (rule-checker #1/#2 clean), no security surface (static docs, no input paths), and the only complexity added is the duplication already flagged [RULE].

**Verified good (evidence):**
- [VERIFIED] All 71 claims re-open byte-for-byte — checker CLI 71/71 AND the rule-checker's independent awk re-open of all 38 new claims, including tab-exact verbatims. Complies with the citation-gate convention.
- [VERIFIED] AC5's corrected comments are TRUE, not merely different — `git ls-files reference/original-source/defender/` lists all 12 .SRC files, nothing gitignores them, and the deploy workflow checks out with fetch-depth 0; the new unskipped presence guard reds loud under DEFENDER_SOURCE_DIR=/nonexistent (TEA battery M6).
- [VERIFIED] AC6's floors derive from one source — `BRIEF_FLOOR = DISTINCT_PINS - 6` = 17 feeds both the AC-3 citation floor and the AC-4 claims floor (brief-dossier.test.ts, hoisted const), against a census of 33 claims / 28 citations; the whole-claims-dir drop reds it (TEA battery M7).
- [VERIFIED] Enrollment is load-bearing — de-enrolling glossary.md reds the membership test (Dev battery D1), and my own COLIDE-drift mutant (`DEFA7.SRC:2907`→`:2908` in the shipped doc) reds TWO independent layers (the per-entry pin and the coverage sweep), full-file run, restored byte-exact.
- [VERIFIED] The OQ sections are swap-proof — rule-checker's OQ-1↔OQ-4 citation swap reds exactly the two affected sections via `oqSection` scoping.
- [VERIFIED] No `plugins/defender/src/` file is touched (purity rule) — diff stat enumerates tests/, docs/, sprint/ only.
- [VERIFIED] Data flow traced end-to-end: prose citation → `scanProseCitations` grammar → coverage sweep demands a claim → claim's verbatim byte-reopened at the vendored line — each link's failure mode exercised by a named killed mutant (M1-M7, D1-D4, Reviewer's two).

**Data flow traced:** dossier prose citation → sweep → claims JSON → vendored .SRC byte re-open (every link mutation-exercised; the missing link — citation-to-ROW association — is the HIGH above).
**Pattern observed:** the `oqSection`/`oqCites` section-scoping at glossary-subsystems-oq.test.ts:101-127 is the correct pattern, applied to one of three tables; the finding is its non-application to the other two.
**Error handling:** `readDossier` returns '' on a missing enrolled file BY DESIGN (harness-error avoidance, dossier-sweep.ts:116-125) — compensated by unskipped presence tests; verified red when a doc is absent.
**Handoff:** Back to TEA (red rework) for the row-scoping fix + helper extraction; Dev narrows the OQ-2 citation in the green that follows.

### Reviewer (code review)

- **Improvement** (non-blocking): the epic's AC6 parenthetical "the derived floor is mutation-proven (dropping a claims file reddens it)" overreaches — a SINGLE claims-file drop reds the COVERAGE sweep, while the derived floor itself reds only when the whole claims/ dir goes (TEA's M7 moved the dir; census 71 minus any one file stays ≥ 17). The suite is correct; the AC's parenthetical attributes the kill to the wrong guard. Affects `sprint/epic-df1.yaml` (SM should annotate at finish — do not rewrite the AC, per the mg1-2 convention). *Found by Reviewer during code review.*
## TEA Assessment — rework round 1

**Scope:** the review's [HIGH] (row-scope the AC-1/AC-2 association checks) and [LOW] (extract the duplicated helpers). Commit 957941e8, pushed.

**What changed:**
- `glossary-subsystems-oq.test.ts` — new `rowWindows`/`rowCites`: every glossary term's plain-English signature AND covering citation, and every subsystems entry's covering citation, must now sit in a two-line window anchored at a line matching the entry's own symbol (two lines = wrap slack for the vector-block PROSE entries, per the markdown line-wrap lesson; far too narrow to reach a sibling row). Test names now say "IN ITS OWN ROW" so the contract is visible in the failure list.
- `tests/helpers/dossier-audit.ts` — NEW: `expectPopulated` + `loadChecker` (+ the CheckClaims type), extracted at the second consumer; both dossier suites now import them, local copies deleted.

**Swap battery (all five KILLED, full-suite runs, restores byte-verified):**
| # | mutant | result |
|---|--------|--------|
| S1 | the review's exact glossary mutant — PHRED↔CKBYT citations swapped | KILLED (both row tests red) |
| S2 | the review's exact subsystems mutant — SLEEP↔MKPROC citations swapped | KILLED |
| S3 | regression: OQ-1↔OQ-4 citation swap | still KILLED (section scoping untouched) |
| S4 | plain-phrase migration: CKBYT's row loses "checksum", word planted elsewhere in doc | KILLED (the round-1 shape would have passed this) |
| S5 | regression: COLIDE drift :2907→:2908 in the shipped doc | still KILLED (row pin + coverage sweep) |

**Suite state:** defender 118/118 green on the shipped (correct) docs, repo-wide lint clean — the rework strengthens guards without moving any baseline; no test weakened, renamed-away, or skipped.

**Left for Dev (green rework):** the [MEDIUM] doc fix — narrow OQ-2's citation `defender/PHR6.SRC:130-131` to `:131` in open-questions.md (line 130 is *CA2 SLAM; the claims JSON and suite already pin :131 only). No suite change needed for it: the OQ-2 checks pass with either spelling, which is exactly why it stays a prose correction.
## Dev Assessment — green rework round 1

**Status:** GREEN — defender 118/118, checker 71/71, working tree clean.
**Landed on:** feat/df1-3-glossary-subsystems-oq, commit a42f97b3, pushed.

One deliverable, the review's [MEDIUM]: open-questions.md OQ-2's citation narrowed from `defender/PHR6.SRC:130-131` to `defender/PHR6.SRC:131` — line 130 is the *CA2 SLAM comment and never supported the CA1 sentence. Prose-only: claims/07-open-questions.json's OQ-2 entry already pinned line 131 with the *CA1 IRQ verbatim, and the suite's OQ-2 checks pass under both spellings (which is why the review classed it a doc fix, not a coverage gap). TEA's rework (row-scoping + helper extraction, 957941e8) arrived committed and green; this round adds nothing else — no test touched, no scope widened.

**Handoff:** To Heimdall (Reviewer) for round 2. Round-1 findings status: [HIGH] row-scoping fixed by TEA with the review's own swap mutants killed five-for-five; [LOW] helper extraction shipped; [MEDIUM] this commit; [LOW #26 convention] no action required per the review's own disposition.
## Subagent Results — round 2

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — rework delta all green (defender 118/118, orchestrator 494/494, lint 0, checker 71/71) |
| 2 | reviewer-edge-hunter | Yes | Skipped / disabled | none | N/A (disabled) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped / disabled | none | N/A (disabled) |
| 4 | reviewer-test-analyzer | Yes | findings | 2 | confirmed 2 (adjacent-row bleed HIGH incl. a 4-of-5-pass cyclic shift; 2-line prose window spuriously fails legitimate 3-line wrap MEDIUM) |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1 (the rowWindows comment's "far too narrow to reach any sibling row" is mutation-refuted — lying docstring); all other rework claims re-verified TRUE incl. the round-1 118/118-swap claim reproduced in a scratch worktree at the pre-fix SHA |
| 6 | reviewer-type-design | Yes | Skipped / disabled | none | N/A (disabled) |
| 7 | reviewer-security | Yes | Skipped / disabled | none | N/A (disabled) |
| 8 | reviewer-simplifier | Yes | Skipped / disabled | none | N/A (disabled) |
| 9 | reviewer-rule-checker | Yes | findings | 3 (#25/#15/#17, one site) + 1 note | confirmed 3 (same adjacent-row site); note on citations.test.ts's third loadChecker DISMISSED as a separate concept (RED-phase harness-error wrapper vs green byte-loader — semantics differ, its own report says so), with a one-sentence soften of the helper header folded into the rework |

**All received:** Yes (4 live specialists returned; 5 disabled rows pre-filled)
**Total findings:** 4 confirmed (converging on one mechanism site + one comment + one prose-window trap), 1 dismissed with rationale, 0 deferred

### Round 2 Reviewer Assessment (REJECTED — superseded by round 3)

**Verdict:** REJECTED (round 2)

The round-1 HIGH is genuinely narrowed — the review's exact swap mutants now red, the helper extraction is clean (byte-diffed), and the OQ-2 narrowing verified correct against the source. But the fix's core primitive fails its own safety claim: FOUR independent mutation runs (Reviewer's one-row-down displacement; test-analyzer's adjacent swap and 5-row cyclic shift where 4 of 5 wrong rows pass; comment-analyzer's blank-and-plant; rule-checker's SLEEP/MKPROC and PHRED/MAPC swaps) prove the 2-line window reads the NEXT table row, because every table row is one physical line and `slice(i, i+2)` reaches the sibling.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [TEST][RULE] | `rowWindows` bleeds one row down: for any two same-file neighbours, a citation displaced onto the following row still satisfies the row above (4 independent mutation proofs; worst case the 5-row DEFA7 cyclic shift passes 4 of 5 wrong entries). | `glossary-subsystems-oq.test.ts` rowWindows/rowCites (~:99-111) | Bound the window at the row: a symbol line starting a markdown table row (`^\|`) gets a ONE-line window. Restructure the glossary vector-block citations into table rows too (Dev: a small two-row table for the EUGENE/SAM blocks; the explanatory paragraph stays as uncited prose), then DELETE the prose window path entirely — every cited entry lives on a single table-row line. Prove with: the adjacent swap (both sides must red), the one-row-down displacement, and the 5-row cyclic shift (all five must red). |
| [MEDIUM] [TEST] | The fixed 2-line prose window spuriously FAILS legitimate content that wraps to 3 lines (reproduced: a factually-correct EUGENE paragraph rewrap reds its test) — a brittleness round 1 did not have. | same site | Resolved by the same all-table design: no prose windows remain to be too short. |
| [HIGH→fold] [DOC][RULE] | The rowWindows comment claims the window is "far too narrow to reach any sibling row" — refuted by mutation in the same commit that added it (the claim was reasoned, not run — this story's recurring disease). | `glossary-subsystems-oq.test.ts:96-97` | Rewrite the comment to state the REAL boundary (one line for table rows, why, and the mutants that pin it), after the mechanism actually has that boundary. |
| [LOW] [RULE] | `dossier-audit.ts`'s header reads as though loadChecker now has one home; `citations.test.ts` keeps a third, semantically DIFFERENT loadChecker (RED-phase "not built yet" wrapper). Dismissed as duplication (separate concept, per the rule-checker's own analysis) — but the header sentence overreaches. | `tests/helpers/dossier-audit.ts` header | Add one clause noting citations.test.ts's wrapper is a distinct concept, deliberately not unified. |

[EDGE] [SILENT] [TYPE] [SEC] [SIMPLE] — disabled; domains covered by my pass and the rule-checker's 30-rule sweep of the delta (no type escapes, no swallowed errors, no security surface, extraction reduced complexity).

**Verified good this round (evidence):** the round-1 mutants stay killed (S1 re-run full-suite by me: both affected rows red, restore → 118/118); helper extraction byte-faithful (comment-analyzer diff, exit 0); OQ-2 `PHR6.SRC:131` = `*CA1 IRQ` re-opened; the round-1 claim "118/118 under the swap at the pre-fix SHA" independently reproduced in a scratch worktree — every historical claim in the rework's comments survived the exact-string re-run except the one flagged above.

**Handoff:** Back to TEA (red rework round 2): single-line row windows + delete the prose path + rewrite the comment + soften the helper header; Dev (green): restructure the glossary vector-block citations into a table. The three named mutants are the acceptance bar.
## TEA Assessment — rework round 2

**Scope:** the round-2 [HIGH] (adjacent-row bleed), [MEDIUM] (prose-window brittleness), [DOC] (false boundary claim) and [LOW] (helper header). Commit pushed on the story branch.

**The mechanism now:** `rowWindows` returns only markdown TABLE-ROW lines (leading pipe) matching the entry's symbol; the window is exactly that one physical line, and the prose path is deleted — a cited entry must live on a table row. This resolves the [MEDIUM] too: there is no fixed-width prose window left to spuriously fail a legitimate re-wrap; prose may explain but cannot carry an entry's citation. The comment now states this boundary and the mutants that pin it (the round-2 [DOC] fix); dossier-audit.ts's header now names citations.test.ts's RED-phase loadChecker as a deliberately distinct concept (the [LOW]).

**Designed red for Dev:** glossary.md's vector-block section is PROSE, so the EUGENE and SAM AC-1 tests are RED (2 of 118) until Dev restructures those two citations into table rows. Everything else green; repo-wide lint clean.

**Acceptance battery (the Reviewer's three named mutants, full-suite runs, restores byte-verified):**
| # | mutant | result |
|---|--------|--------|
| A1 | adjacent SLEEP↔MKPROC swap | KILLED — BOTH sides red (round 2's leak reddened only one) |
| A2 | pure one-row-down displacement (citation moves, symbol does not) | KILLED |
| A3 | five-row cyclic shift across the DEFA7 block | KILLED — ALL FIVE red (round 2's window passed four of five) |

**One boundary recorded, not chased (the equivalent-mutant discipline):** a displaced citation whose new row ALSO names the symbol (e.g. a MKPROC row saying "`DEFA7.SRC:12` for SLEEP") satisfies the guard — by design, because that line genuinely states the association the guard exists to verify. The guard's unit is "a table row naming X cites X's line"; where that row sits in the table is layout, not association. Recorded here so no later round re-derives it as a gap.

**Handoff:** To Dev (green rework round 2): restructure glossary.md's vector-block citations into a small table — each of EUGENE'S/SAM'S VECTORS on its own row carrying the author name, a plain-English "message-vector table grouped by author" signature, and its `MESS0.SRC` citation (165 / 175). The explanatory paragraph stays as uncited prose. The two red tests' failure messages carry the contract.
## Dev Assessment — green rework round 2

**Status:** GREEN — defender 118/118, checker 71/71, orchestrator 494/494, working tree clean.
**Landed on:** feat/df1-3-glossary-subsystems-oq, commit f0135868, pushed.

One deliverable, per TEA's round-2 handoff: glossary.md's vector-block section restructured from cited prose into a two-row table — each of `* EUGENE'S VECTORS` / `* SAM'S VECTORS` on its own single-line row carrying the author name, the plain-English "message-vector table grouped by author" signature with its member list, and its `defender/MESS0.SRC` citation (165 / 175). The explanatory paragraph survives below the table as uncited prose (prose explains; rows carry citations — the round-2 contract). No claims change needed: GL-7/GL-8 already pin lines 165/175 and re-verify. No test touched.

**Handoff:** To Heimdall (Reviewer) for round 3. Round-2 findings status: [HIGH] one-line row windows shipped by TEA (c2a2c23b) with all three acceptance mutants killed (adjacent swap BOTH sides, pure displacement, five-row cyclic shift); [MEDIUM] resolved structurally (no prose windows exist); [DOC] boundary comment rewritten; [LOW] helper header softened; this commit closes the designed red (the table restructure).
## Subagent Results — round 3

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — all green (defender 118/118, orchestrator 494/494, lint clean, checker 71/71) |
| 2 | reviewer-edge-hunter | Yes | Skipped / disabled | none | N/A (disabled) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped / disabled | none | N/A (disabled) |
| 4 | reviewer-test-analyzer | Yes | findings | 1 HIGH + 3 lower | confirmed HIGH (CMOS/pricing same-file multi-match swap stays 52/52 green, byte-verified); confirmed MEDIUM (AC-2 lacks any window-count assertion — the structural enabler); confirmed LOW (pricing row unguarded by any entry); noted LOW-latent (pipe lines inside future code fences), no action now |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed MEDIUM (AC-2 loop comment still carries round-1 two-line-window language — stale beside its rewritten AC-1 twin); every claim in the NEW docstring/header/table verified true incl. MESS0 member attribution re-opened at :160-181 |
| 6 | reviewer-type-design | Yes | Skipped / disabled | none | N/A (disabled) |
| 7 | reviewer-security | Yes | Skipped / disabled | none | N/A (disabled) |
| 8 | reviewer-simplifier | Yes | Skipped / disabled | none | N/A (disabled) |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed HIGH (#15/#25 residue: CMOS pair full escape + DIAG ROM pair falsifying ROMC0's own-row assertion; reproduced against the ROUND-1 file in a worktree — pre-existing, not fix-introduced) and MEDIUM (#17: the docstring's "nowhere else" is universal wording for a case-specific truth); #13/#18 clean, the round-2 fix itself verified real |

**All received:** Yes (4 live specialists returned; 5 disabled rows pre-filled)
**Total findings:** 5 confirmed (one mechanism class + two comments + one unguarded row + one latent note), 0 dismissed, 1 noted-no-action (latent code-fence case)

### Round 3 Reviewer Assessment (REJECTED — superseded by round 4)

**Verdict:** REJECTED (round 3)

The round-2 fix is real and verified: my own re-runs killed the adjacent swap (both sides), the pure displacement, and the new glossary table's EUGENE/SAM swap; the rewritten comments' claims all survived exact-string re-verification. What remains is a PRE-EXISTING residue neither round targeted, found by probing symbol multi-matches: when an entry's symbol regex matches a SECOND row citing the SAME file, that sibling row can satisfy the entry.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [TEST][RULE] | Symbol-ambiguity evasion: the CMOS entry's /\bCMOS\b/ also matches the pricing row (its Role prose says "the CMOS ledger persists"); both cite ROMF8, so swapping their citations leaves the FULL suite green (two independent byte-verified reproductions; present since round 1). The /DIAG ROM/i pair is the partial twin: ROMC0's own-row assertion is satisfiable by ROMC8's row (suite still reds via ROMC8's different-file entry, but the assertion's claim is false). | glossary-subsystems-oq.test.ts rowCites .some() over multi-matched windows; subsystems.md rows 67-69, 75-76 | TWO layers. (1) Make every symbol regex row-unique where uniqueness is intended: CMOS → anchor on its own cell ("CMOS allocation"); ROMC0 → /DIAG ROM AT C000/i; and reword the pricing row's Role prose to drop the bare "CMOS". (2) Add a per-entry expected-row-count assertion (default 1; HALLOF legitimately 2 — record it as data) so any FUTURE wording drift that creates a new multi-match reds loudly instead of silently widening the scope — the evasion requires a silent multi-match, so the census closes the class, not just the instance. TEA (red rework), Dev rewords the doc cell (green). |
| [MEDIUM] [TEST] | AC-2 never asserts window count at all (AC-1 has only a ≥1 floor) — the structural enabler of the above. | AC-2 loop | Closed by fix layer (2): the exact-count assertion goes in BOTH loops. |
| [MEDIUM] [DOC][RULE] | The rowWindows docstring's "symbol, plain-English signature and covering citation all on the entry's own row, NOWHERE ELSE" is universal wording for a case-specific truth — false today for the CMOS and DIAG ROM pairs. | glossary-subsystems-oq.test.ts docstring | Reword: the property holds FOR A SYMBOL UNIQUE TO ONE ROW, and the census assertion is what enforces that uniqueness. Fix after the mechanism makes it true. |
| [MEDIUM] [DOC] | The AC-2 loop comment still describes round 1's two-line "row window" model — stale beside its rewritten AC-1 twin. | glossary-subsystems-oq.test.ts AC-2 loop comment | Mirror the AC-1 comment's rounds-1-3 language. |
| [LOW] [TEST] | The pricing-equates row is a real cited subsystem with no SUBSYSTEMS_MAP entry — exactly what made it available as an unguarded rescue row. | SUBSYSTEMS_MAP | Add the entry (symbol anchored to "pricing equates", ROMF8.SRC:12-14 → line 12); bump the set-count floor 20→21 and its comment. |
| [LOW-latent] [TEST] | rowWindows treats any leading-pipe line as a table row; a future fenced code block containing pipe lines could smuggle a row. No fence exists in either doc today. | rowWindows | Note only — recorded here so a later dossier story that adds code fences knows to close it; not this story's to build. |

[EDGE] [SILENT] [TYPE] [SEC] [SIMPLE] — disabled; domains covered by my pass and the rule-checker's 30-rule sweep (no new escapes, comment-only helper change, no security surface).

**Verified good this round (evidence):** the round-2 mechanism is correctly scoped (rule-checker: the filter anchors to physical rows, "a real fix, not a re-anchor"); all seven glossary terms map to exactly one row (scripted census, two independent runs); the glossary member-attribution re-opened against MESS0.SRC:160-181 is correct block-for-block; the dossier-audit header's distinct-concept claim verified by side-by-side read; no assertion deleted or loosened across the rework (diffed); the CMOS residue reproduced at the round-1 SHA in an isolated worktree — pre-existing, so the rounds have been strictly narrowing, not churning.

**Acceptance bar for round 4:** the CMOS↔pricing swap must red; the ROMC0↔ROMC8 swap must red ROMC0's OWN test; the census assertion must red when a symbol is made to multi-match by a planted wording drift; and the round-2/3 mutants must stay killed (adjacent swap both sides, displacement, cyclic shift, EUGENE/SAM swap).

**Handoff:** Back to TEA (red rework round 3): row-unique symbol regexes + per-entry expected-row-count census + the two comment fixes + the pricing entry; Dev (green): reword the pricing row's Role cell.
## TEA Assessment — rework round 3

**Scope:** the round-3 [HIGH] (symbol-ambiguity evasion) + both [MEDIUM] comment findings + the [LOW] unguarded row. Commit pushed.

**What changed:** CMOS's symbol regex anchored to its own cell ("CMOS allocation"); ROMC0's anchored to its full TTL phrase ("DIAG ROM AT C000"); every Term/Subsystem entry gained a `rows` census field (default 1; HALLOF declares its legitimate 2 — vector row + routine row) asserted EXACTLY in both AC-1 and AC-2 loops, so any future wording drift that widens a symbol's scope — the evasion's precondition — reds loudly with the count named. The pricing-equates row became its own guarded entry (map 20→21, floor + arithmetic comment updated). The docstring's "nowhere else" universal narrowed to the census-conditioned truth; the stale AC-2 round-1 comment rewritten to rounds-1-3 language.

**Acceptance battery (the Reviewer's named bar, seven for seven, full-suite runs, byte-verified restores):** B1 CMOS↔pricing swap KILLED (both rows red); B2 ROMC0↔ROMC8 swap KILLED (ROMC0's OWN test red, and ROMC8's); B3 planted census widening ("CMOS allocation" phrase in the pricing prose) KILLED; regressions B4-B7 all still KILLED (adjacent swap both sides, pure displacement, five-row cyclic shift, EUGENE↔SAM table swap). Suite 119/119 green on the shipped docs; repo-wide lint clean.

**For Dev (green rework round 3):** the review also asked for the pricing row's Role prose to drop the bare word "CMOS" (defense-in-depth against regex drift). NOTE HONESTLY: no test forces this — with the anchored regex the suite is green either way, and the census guards the class — so it is a review-mandated prose change with no red driver. Make the one-word edit (e.g. "the coin/pricing state the ledger persists"), verify 119/119, and say in the assessment that it landed.
## Dev Assessment — green rework round 3

**Status:** GREEN — defender 119/119, checker 71/71, working tree clean.
**Landed on:** feat/df1-3-glossary-subsystems-oq, pushed.

One deliverable: the pricing row's Role prose reworded to drop the bare "CMOS" token ("the coin/pricing state the ledger above persists") — the review's defense-in-depth against regex drift. As TEA's handoff states honestly, no test forces this edit (the anchored regex plus the uniqueness census guard the class); it is review-mandated hygiene, now landed. TEA's round-3 rework (b4777102: row-unique symbols, exact census, pricing entry) arrived committed with its seven-mutant acceptance battery all killed; this round adds nothing else.

**Handoff:** To Heimdall (Reviewer) for round 4. All round-3 findings closed: [HIGH] anchored regexes + census (B1-B3 killed); [MEDIUM] both comments rewritten; [LOW] pricing entry added; [LOW-latent] code-fence note recorded in the round-3 assessment for a future dossier story; this commit is the prose reword.
## Subagent Results — round 4

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — defender 119/119, orchestrator 494/494, lint 0, checker 71/71 |
| 2 | reviewer-edge-hunter | Yes | Skipped / disabled | none | N/A (disabled) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped / disabled | none | N/A (disabled) |
| 4 | reviewer-test-analyzer | Yes | findings | 1 + 3 clean sweeps | confirmed MEDIUM (HALLOF rows:2 — .some() masks a wrong-but-claim-backed citation on the second row; proven with AMODE1:311, 53/53 green); census sweep 28/28 matches declared values; census-zero reds correctly; no assertion weakened |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 low | noted LOW (docstring understates the ROMC0↔ROMC8 blast radius — deliberate echo of the acceptance bar, not misleading; no action); all arithmetic and prose verified incl. the 21-entry breakdown element-for-element and "ledger above" row order |
| 6 | reviewer-type-design | Yes | Skipped / disabled | none | N/A (disabled) |
| 7 | reviewer-security | Yes | Skipped / disabled | none | N/A (disabled) |
| 8 | reviewer-simplifier | Yes | Skipped / disabled | none | N/A (disabled) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 30 rules / 19 instances | round-3 closures independently mutation-re-run and confirmed; census terms verified non-self-referential (#26) with an out-of-band recount of all 28 rows; one LOW stylistic nit (sentence order in the docstring), no action |

**All received:** Yes (4 live specialists returned; 5 disabled rows pre-filled)
**Total findings:** 1 confirmed (routed as a mandatory pre-finish chore, fix verified by the Reviewer), 2 noted-no-action LOW prose nits, 0 dismissed

## Reviewer Assessment

**Verdict:** APPROVED

Round 4 on a 3-point story, and the rounds strictly narrowed: document-global → two-line bleed → symbol ambiguity → one existential quantifier on the single multi-row entry. Everything the three rejections demanded is verified shipped: I re-ran the CMOS↔pricing swap, the ROMC0↔ROMC8 swap and the census-widening drift myself this round (all red as required), the rule-checker re-ran them independently plus a round-2 regression mutant, and the full lang-review sweep of the final delta is 30 rules, zero violations.

**The one confirmed remaining finding is approved-with-chore, not another round** (the mg1-5/sw8-18 exit): HALLOF — the only `rows: 2` entry — has `.some()` semantics that let its correctly-cited vector row mask a wrong-but-claim-backed citation on its routine row. The fix and its proof are already verified BY ME: changing `rowCites`'s outer quantifier from `.some((w) =>` to `.every((w) =>` is 119/119 green on the shipped docs and reds HALLOF under the specialist's exact mutant (`defender/AMODE1.SRC:117-119` → `defender/AMODE1.SRC:311` on subsystems.md's HALLOF row). Nothing needs re-deriving; a fifth round would re-spawn four specialists to watch a one-token edit. **SM MUST apply this chore before `pf sprint story finish`, re-run the mutant proof (red, restore, 119/119), and commit it; if the chore does not land, this finding is re-raised as blocking.**

**Data flow traced:** dossier prose citation → single-row window (census-enforced uniqueness) → coverage sweep → claims JSON → vendored byte re-open; every link now carries at least one named, re-runnable killed mutant, and the association link — absent entirely in round 1 — is enforced row-exactly with a census.
**Pattern observed:** the census pattern (declare the expected match count as per-entry data, assert exactly) is the durable close for token-ambiguity: it converts silent scope-widening into a named red. Worth porting when the millipede trio suite next gets touched.
**Error handling:** readDossier's ''-on-missing stays compensated by presence tests (verified red on doc deletion in round 1's battery); the checker's malformed-JSON path is df1-6's, routed at setup.
**Tags:** [TEST] the HALLOF chore above; [DOC] two LOW prose nits recorded, no action; [RULE] clean sweep; [EDGE] [SILENT] [TYPE] [SEC] [SIMPLE] disabled — domains covered by my pass and the rule-checker (no boundary/numeric code, no swallowed errors, no type escapes, no security surface, complexity reduced by the extraction).
**Round-trip observation for the record:** all four rounds' rejections were about the VERIFICATION APPARATUS (association scoping) and its claim prose, never about the dossier content itself — the docs' 71 claims byte-verified from round 1 and every content citation survived every round's re-open. The story's real deliverable turned out to be teaching the citation gate what association means, and the archived battery (19 distinct named mutants across the rounds, every one re-runnable) is that lesson's proof.
**Handoff:** To SM for finish — apply the mandatory chore first, then the finish ceremony.
## Impact Summary

*(Hand-written by SM before `story finish` — the generator has four recorded failures on this repo; this is the durable record.)*

**What shipped (branch feat/df1-3-glossary-subsystems-oq, 11 commits claim→chore):** the defender dossier trio — `glossary.md` (author vocabulary → plain English: PHRED/MAPC/CKBYT/MLJSR/NAPP + the EUGENE/SAM message-vector blocks, all table-rowed), `subsystems.md` (21 guarded rows mapping every module to owning file + routine + verified line, with module-side block-identity evidence per the df1-2 review), `open-questions.md` (OQ-1..OQ-5, section-scoped, each with in-tree citations and a disposition: OQ-1/2/4 → df1-4, OQ-3 unproven-without-assembling, OQ-5 provenance-note-only) — plus 38 new byte-verified claims (05/06/07, generated from the vendored tree, checker 71/71), DOSSIER_FILES enrollment of all three files, and the AC5/AC6 suite hardening (citations.test.ts comment-model correction + unskipped presence guard; brief-dossier.test.ts floors derived from one source).

**The four review rounds, honestly:** every rejection targeted the VERIFICATION APPARATUS, never the dossier content (the 71 claims byte-verified from round 1 and survived every re-open). Round 1: association checks were document-global — a citation swap shipped green. Round 2: the two-line row window read the adjacent table row. Round 3: symbol ambiguity — a same-file sibling row whose prose echoed an entry's symbol could satisfy it (pre-existing, reproduced at the round-1 SHA). Round 4: APPROVED, with the last narrowing applied as this finish's chore (rowCites `.some`→`.every`, gap re-verified before fixing, mutant killed after, commit 2b00b740). Net: the suite now enforces row-exact association with a per-entry uniqueness census; 19 distinct named mutants were killed across the rounds and each is re-runnable from the assessments.

**Finding dispositions (all closed or owned):** the loadClaims shape-validation finding → df1-6 (extended at setup, 1→2pt, WHY-NOT-df1-3 paragraph). TEA's COUNT240-absent and APVCT-$FC60 measurements → recorded in the round-1 findings and carried into the shipped open-questions.md. The Reviewer's round-1 AC6 note → **annotation, per the ruling that the AC text itself is not rewritten:** AC6's parenthetical "dropping a claims file reddens it" attributes the kill to the floor; measured truth: a SINGLE claims-file drop reds the COVERAGE sweep, while the derived floor reds when the claims dir empties (TEA's M7) — the suite is correct, the parenthetical's attribution is loose, recorded here as the permanent correction. The round-3 LOW-latent code-fence gap → routed into df1-4's description (written at this finish, with the extend-and-prove instruction). Two round-4 LOW prose nits → recorded no-action in the round-4 table. The round-4 HALLOF finding → CLOSED by this finish's chore, not routed.

**Suite state at finish:** defender 119/119, orchestrator 494/494, repo-wide lint clean, checker 71/71 — all four numbers re-measured after the chore commit, not carried forward.

**Process notes for the archive:** sm-setup behaved fully this run (in_progress stamped, real context, byte-verbatim ACs — the spawn prompt named the authoritative ACs and filler strings explicitly). The round-4 comment-analyzer observed a transient working-tree edit mid-review — that was the concurrently-running test-analyzer's mutation probe on the shared tree (the documented parallel-mutator hazard; both restored byte-exact, no damage — but diff-specialists that mutate should be serialized or worktree'd next time). pf story commands round-trip epic-jt11.yaml with a benign key reorder on every invocation — reverted each time; none rode any commit.
