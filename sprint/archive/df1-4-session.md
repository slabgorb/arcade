---
story_id: "df1-4"
jira_key: "df1-4"
epic: "df1"
workflow: "tdd"
---
# Story df1-4: Secondary source MAME williams.cpp/williams_m.cpp board facts as claims

## Story Details
- **ID:** df1-4
- **Jira Key:** df1-4
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/df1-4-mame-board-claims
- **PR:** 364
- **Repos:** arcade
- **Points:** 3

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-14T11:01:04Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-14T10:13:03Z | 2026-08-14T10:14:29Z | 1m 26s |
| red | 2026-08-14T10:14:29Z | 2026-08-14T10:36:13Z | 21m 44s |
| green | 2026-08-14T10:36:13Z | 2026-08-14T10:43:32Z | 7m 19s |
| review | 2026-08-14T10:43:32Z | 2026-08-14T10:54:44Z | 11m 12s |
| red | 2026-08-14T10:54:44Z | 2026-08-14T10:58:14Z | 3m 30s |
| green | 2026-08-14T10:58:14Z | 2026-08-14T10:59:49Z | 1m 35s |
| review | 2026-08-14T10:59:49Z | 2026-08-14T11:01:04Z | 1m 15s |
| finish | 2026-08-14T11:01:04Z | - | - |

<!-- REJECT-misroute repair (Reviewer, 2026-08-14): complete-phase walked the round-1 REJECT
into `finish`; phase hand-edited back to `red` per the standing fix (the phase machine cannot
go backward). The round-1 verdict is REJECTED — see Reviewer Assessment. -->

## Sm Assessment

Setup complete for df1-4 (tdd workflow, 3 points). Session file created, branch
`feat/df1-4-mame-board-claims` cut from develop, story and epic context validated.
Story context carries the routed df1-3 round-3 LOW-latent finding: if this story adds
fenced code blocks to any DOSSIER_FILES doc, `rowWindows()` in
`plugins/defender/tests/audit/glossary-subsystems-oq.test.ts` must strip fenced blocks
first, mutation-proven. Handing off to TEA for the RED phase.

## TEA Assessment

**Tests Required:** Yes

**Test Files:**
- `plugins/defender/tests/audit/board-facts.test.ts` — NEW: the df1-4 RED suite (43 tests): SHA-pin
  cross-check (reference-sources.md ↔ board-facts.md), eight row-exact board facts (df1-3 census
  contract via the shared helpers), GPL/prose-only discipline, corroborated-claims census +
  path-exactness, the citation gate aimed at board-facts.md, OQ-1/2/4 resolution records, the
  local-clone pin teeth (git show at the pinned SHA), and the fence-smuggling fixtures.
- `plugins/defender/tests/helpers/dossier-audit.ts` — EDITED: rowWindows/rowCites/oqSection/oqCites
  extracted here at the second consumer (the df1-3 helper-extraction precedent), and made
  FENCE-AWARE via a new stripFencedBlocks (the routed df1-3 round-3 LOW-latent finding — closed
  here, not carried: board-facts.test.ts consumes the same helpers, so the latent became live).
- `plugins/defender/tests/audit/glossary-subsystems-oq.test.ts` — EDITED: local helper copies
  deleted, imports the shared ones; behaviour unchanged (regression mutants M6/M7 below).

**Tests Written:** 43 in the new file; 34 failing, 9 deliberate green guards (2 table-population
self-guards, 3 fence fixtures, 1 already-covered-anchors guard, 3 early-return-on-absence sweeps
whose presence tests are red).
**Status:** RED (defender 131 pass / 34 fail, the one failing file is the new suite; trio, brief,
citations, purity, scaffold all green; orchestrator 494/494; repo-wide lint clean). RED commit
fa4da3ef, pushed with the branch.

**Measurement ledger — every pinned line read this session from numbered tool output:**
- MAME at the LOCAL clone ~/Projects/mame @ aaac1f637a8cbf23724b61ea578d70a32f2cf4fe (clean,
  master, 2026-08-05): williams.cpp 29-31 (decoder-PROM 1-vs-2 cocktail note), 499
  (watchdog_reset_w at $C3FF only), 500 (video_control_w at $C010, mirror $03E0 — folds $C3FC),
  505 (bank_select_w at $D000), 1531 (MASTER_CLOCK 12 MHz), 1537 (MC6809E /3/4 = 1.0 MHz), 1556
  (set_raw 8 MHz/512/260 = 60.09615 Hz), 1601 (set_visarea → 292x240); williams_m.cpp 27-28
  (VA11→CB1), 36-37 (COUNT240→CA1). EVERY line number in the story title is exact at this SHA —
  it is the SHA Dev should pin.
- In-tree: the RESET PIA setup ROMF8.SRC:64-81 decodes to CRA=$14 (CA1/COUNT240 interrupt
  DISABLED, CA2 armed for SLAM per the line-80 comment) and CRB=$04; the IRQ handler writes
  CRB=$04 on entry (DEFA7.SRC:1934-1935) and re-arms CRB=$05 on exit (DEFA7.SRC:1997-1998). The
  $04/$05 writes are CRB — OQ-1 resolves to CB1 (the *CB2 IRQ comment PHR6.SRC:135 is the slip),
  OQ-2 resolves to "never interrupt-enabled; phases by polling VERTCT".

**Mutation battery (7 runs, all behaved; restores verified by git status after each):**
| # | mutant | result |
|---|--------|--------|
| M1 | stripFencedBlocks removed from rowWindows | KILLED — both fence fixtures red |
| M3 | ref pins true SHA, doc pins deadbeef123 | KILLED — SHA-equality test red, names both |
| M4 | both pin abc1234def99 (not a commit) | KILLED — cat-file tooth red |
| M5 | both pin 5739ba1368 (real, pre-reorg) | KILLED — all 8 probe tests red |
| CTRL | both pin aaac1f637a8 (the true SHA) | all 9 pin teeth GREEN — acceptance window non-empty |
| M6 | shipped glossary PHRED↔CKBYT citation swap | KILLED — trio row tests red THROUGH the extracted helpers |
| M7 | shipped OQ-1↔OQ-4 citation swap | KILLED — trio section tests AND the new resolution tests red |

### Rule Coverage

| Rule | Coverage | Status |
|------|----------|--------|
| #15 population guards | expectPopulated on the facts table, resolution table, tokens, citations floor; early-return sweeps guarded by red presence tests | enforced by design |
| #18 one concept one helper | rowWindows/rowCites/oqSection/oqCites extracted at the second consumer; no local copies remain | fixed this RED |
| #25 search scope | every fact check row-scoped with an EXACT census; OQ resolutions section-scoped; SHA extraction line-scoped to the mamedev/mame line | enforced by design |
| #23 re-runnable mutants | battery commands recorded above; stubs were planted files + python swaps, restores git-verified | recorded |
| #17 mechanism comments | the suite header states the skip model for the GPL-walled clone (absence is normal, unlike the vendored tree) so nobody adds a false presence guard | enforced by design |
| mutation-direction | M3/M4/M5 are wrong-value mutants (not stale-spelling); CTRL proves the pass window exists | enforced |

**Self-check:** 0 vacuous tests (every test asserts; the three early-return sweeps are
presence-guarded by red siblings, the trio convention).

**Handoff:** To Dev (GREEN). Deliverables the failure messages name: (1) pin mamedev/mame @
aaac1f637a8cbf23724b61ea578d70a32f2cf4fe in docs/reference-sources.md as a SECONDARY source row
(not vendored — GPL, cited in prose); (2) author board-facts.md — eight table rows, tokens + MAME
prose pointers + backticked in-tree anchors per row, naming the same SHA, stating the GPL
discipline; (3) flip OQ-1/2/4 to Resolved records (capital R, still naming df1-4, citing
DEFA7.SRC:1934-1935/1997-1998, ROMF8.SRC:80-81, PHR6.SRC:14-15); (4) claims for every new
citation — GENERATED from the tree, never hand-typed (house pattern), one MAME corroboration
per anchored fact; (5) re-path RV-7 and TB-3 corroborations to src/mame/williams/; (6) enrol
board-facts.md in DOSSIER_FILES.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking, fixed by this story's RED teeth): the two PRE-EXISTING MAME
  corroborations — RV-7 (00-revision.json) and TB-3 (03-timebase.json) — cite
  `src/mame/midway/williams.cpp`, the pre-reorg path that does not exist at any pinnable modern
  SHA (the drivers live at `src/mame/williams/` — verified against the local clone). Their LINE
  numbers (1985, 1556) are already exact at aaac1f637a8. The path-exactness test reds until GREEN
  re-paths them — the df1-2 round-2 checkable-and-wrong class, caught by the pin this story adds.
  *Found by TEA during test design.*
- **Improvement** (non-blocking): `sprint/context/context-story-df1-4.md` is untracked in the
  working tree (sm-setup created it but nothing committed it). SM should sweep it into the story's
  bookkeeping commit at finish. *Found by TEA during test design.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

2 deviations

- **The routed code-fence finding is CLOSED unconditionally, not carried forward**
  - Rationale: board-facts.test.ts consumes the same rowWindows for its eight fact rows, and a derivation-heavy doc is exactly where a fence appears next; hardening the helper once at extraction time beats re-routing the note a third time
  - Severity: minor
  - Forward impact: none for Dev — fences in any dossier doc are now inert to the row and section checks; the fixtures pin the behaviour
- **OQ resolutions pinned to a capital-R "Resolved" token**
  - Rationale: the pre-df1-4 text already contains lowercase "resolves" (the routing sentence), so a case-insensitive check would pass on the QUESTION; the capital-R token is the cheapest spelling that cannot be satisfied by the unresolved state
  - Severity: minor
  - Forward impact: Dev writes "**Resolved (df1-4):** ..." (or equivalent) in the three sections; the df1-3 disposition regex /df1-4/ stays satisfied

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **The routed code-fence finding is CLOSED unconditionally, not carried forward**
  - Spec source: sprint/context/context-story-df1-4.md (the routed df1-3 round-3 LOW-latent row)
  - Spec text: "If this story ... introduces code fences, extend rowWindows ...; if no fences are added, carry this note forward."
  - Implementation: stripFencedBlocks ships in the shared helper NOW, fixture- and mutation-proven (M1), with no requirement that any doc actually contain a fence
  - Rationale: board-facts.test.ts consumes the same rowWindows for its eight fact rows, and a derivation-heavy doc is exactly where a fence appears next; hardening the helper once at extraction time beats re-routing the note a third time
  - Severity: minor
  - Forward impact: none for Dev — fences in any dossier doc are now inert to the row and section checks; the fixtures pin the behaviour
- **OQ resolutions pinned to a capital-R "Resolved" token**
  - Spec source: story title ("resolve OQ-1/OQ-2", "WDOG $C3FC decode (OQ-4)")
  - Spec text: the title says the OQs are resolved but specifies no document format
  - Implementation: each resolved section must contain /Resolved/ (case-sensitive), a /board-facts/ cross-reference, and its decode-evidence citation
  - Rationale: the pre-df1-4 text already contains lowercase "resolves" (the routing sentence), so a case-insensitive check would pass on the QUESTION; the capital-R token is the cheapest spelling that cannot be satisfied by the unresolved state
  - Severity: minor
  - Forward impact: Dev writes "**Resolved (df1-4):** ..." (or equivalent) in the three sections; the df1-3 disposition regex /df1-4/ stays satisfied

### Dev (implementation)
- No undocumented deviations: the only mid-green discovery is the F7/F8 row-layout constraint
  recorded in the Dev Assessment (a MAME pointer must not sit between two backticked citations
  on one row); content is unchanged, only clause order moved.

## Dev Assessment

**Status:** GREEN — defender 165/165 (was 131/34 at RED), orchestrator 494/494, repo-wide lint
clean, checker CLI 78/78 claims verified, working tree clean.
**Landed on:** feat/df1-4-mame-board-claims, GREEN commit e08c6adb, pushed.

**What shipped:**
- `docs/reference-sources.md` — new "Secondary sources — pinned, never vendored" section pinning
  mamedev/mame @ aaac1f637a8cbf23724b61ea578d70a32f2cf4fe (the SHA TEA verified every title line
  number against), with the verify-against-the-object recipe and the GPL discipline stated on the
  row itself.
- `plugins/defender/docs/rom-study/board-facts.md` — the eight facts as single table rows (clocks,
  exact refresh, visible area, banked ROM, VA11→CB1, COUNT240→CA1, WDOG decode, decoder PROMs),
  MAME pointers in prose, in-tree anchors backticked, the same SHA named, GPL discipline stated.
  One layout constraint discovered mid-green: a MAME pointer must not sit BETWEEN two backticked
  citations on a row, or the disguised-backtick scan reads the inter-backtick span as a backticked
  .cpp citation — F7/F8 rows were reordered so MAME pointers precede the first backtick.
- `plugins/defender/docs/rom-study/open-questions.md` — OQ-1/2/4 flipped to **Resolved (df1-4)**
  records: CB1 (CRB $04/$05 evidence, DEFA7 1997-1998); CA1 never enabled, CRA=$14 (ROMF8 80-81),
  phases by polling VERTCT; $C3FC = the $03E0-mirrored video-control write, watchdog at $C3FF
  only (PHR6 14-15). All df1-3 tokens and /df1-4/ dispositions intact.
- `claims/08-board-facts.json` — 7 claims (BF-1..7) GENERATED from the tree by a table-driven
  script (verbatims read, never typed — the house pattern), each carrying a src/mame/williams/
  corroboration with the pinned-SHA prefix in its note.
- `claims/00-revision.json` + `claims/03-timebase.json` — RV-7 and TB-3 corroborations re-pathed
  midway→williams (lines 1985/1556 already exact at the pin, per TEA's ledger).
- `tests/audit/dossier-sweep.ts` — board-facts.md enrolled in DOSSIER_FILES (the one-line GREEN
  deliverable TEA's red assertions pinned).

**Delivered-code mutation battery (re-run against the SHIPPED docs; restores git-verified):**
D1 de-enrol board-facts.md — KILLED. D2 drift a shipped MAME pointer (1556→1557) — KILLED.
D3 swap F4↔F7 in-tree citations (both columns) — KILLED (both row tests red). D4 drift the doc's
SHA one hex digit from the reference-sources pin — KILLED. D5 empty 08-board-facts.json — KILLED
(3 tests). D6 revert one corroboration to the midway path — KILLED. D7 delete OQ-2's board-facts
cross-reference — KILLED. TEA's RED battery (M1, M3-M7 + positive control) proved the apparatus
on stubs; this battery re-proves it on the delivered program.

**Why first-pass green is credible:** TEA's 34 failure messages named every token, pointer, SHA
and citation; the only unforeseen work was the F7/F8 reordering above. No test was weakened,
renamed or skipped; the only test-side edit in GREEN is the DOSSIER_FILES enrollment line, itself
pinned by TEA's membership assertion.

**Handoff:** To the Reviewer. Diff against origin/develop: the RED suite + helper extraction
(fa4da3ef, TEA) and docs + claims + pin + enrollment (e08c6adb, this commit).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — all suites green (defender 165/165, orchestrator 494/494, lint 0, checker 78/78, purity untouched) |
| 2 | reviewer-edge-hunter | Yes | Skipped / disabled | none | N/A (disabled in workflow.reviewer_subagents) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped / disabled | none | N/A (disabled) |
| 4 | reviewer-test-analyzer | Yes | findings | 3 + 1 note | confirmed 1 by executed mutant (T3, disguised-backtick scope), downgraded 1 (T1 killed by accidental coverage — latent), accepted 1 as latent (pin-discipline decoy, structurally reproduced), note recorded |
| 5 | reviewer-comment-analyzer | Yes | clean | none | every prose claim re-verified against both trees, incl. the CRB/CRA decodes and the re-pathed corroboration lines |
| 6 | reviewer-type-design | Yes | Skipped / disabled | none | N/A (disabled) |
| 7 | reviewer-security | Yes | Skipped / disabled | none | N/A (disabled) |
| 8 | reviewer-simplifier | Yes | Skipped / disabled | none | N/A (disabled) |
| 9 | reviewer-rule-checker | Yes | findings | 2 violations over 8 rule categories | confirmed 2 (GPL near-verbatim notes BF-2/BF-3 — converging with my own independent pass); all 7 new claims re-opened byte-exact; house conventions all compliant |

**All received:** Yes (5 live specialists returned; 4 disabled rows pre-filled)
**Total findings:** 4 confirmed (1 rule violation + 3 apparatus gaps), 1 downgraded to latent-defended, 2 notes

### Rule Compliance

Rule-by-rule enumeration delegated to reviewer-rule-checker (30 lang-review checks + CLAUDE.md +
house conventions, full table in its report) and spot-re-verified: purity untouched (0 src/
files), citation vocabulary compliant (46/46 gate tests + manual sweep), row-exact census /
.every / expectPopulated / derived floors / one-helper all compliant, 7/7 new claim verbatims
byte-exact including tabs. The one rule VIOLATION: the GPL never-copied line (finding 1 below).
My own serial mutation runs: R1 (corroboration line drift) SURVIVED — finding 2; T1 (OQ-1
entry/exit citation relabel) KILLED by the claims-coverage sweep, so downgraded; T3 (backticked
MAME pointer in open-questions.md) SURVIVED — finding 3. All restores git-verified.

### Devil's Advocate

Assume the story is broken. Its whole thesis is "an unpinned MAME attribution was
checkable-and-wrong, so pin it and check it." The teeth it grew verify the DOC's pointers at the
pin — and my R1 mutant proved the CLAIMS' corroboration pointers, the ones every later df* story
will actually read out of claims/*.json, verify NOWHERE: BF-4's line 500→501 shipped 165/165
green with the checker announcing "all claims verified". The story reproduces its own named
defect class one layer down, in the layer it created. Second angle: the GPL wall — the doc's own
discipline paragraph promises "no MAME source line is ever quoted", while BF-2/BF-3's notes carry
9- and 6-word contiguous runs of MAME's comments; the mechanical guard checks citation FORM
(backticks), not prose CONTENT, exactly the "citation gate checks quotes not meaning" lesson.
Third: the backtick guard itself stops at board-facts.md while this same diff seeded
open-questions.md with a MAME pointer — T3 backticked it and nothing redded, so the "a reader
must never mistake a prose pointer for a byte-verified citation" promise is enforced in one file
and merely hoped for in its neighbour. None of this is content-wrong today (comment-analyzer and
rule-checker independently re-verified every value), but df1-3's precedent is exact: a
verification apparatus that cannot see the mis-attribution class it was built for does not ship
as ground truth. REJECT.

### Round 1 Reviewer Assessment (REJECTED — superseded by round 2)

**Verdict:** REJECTED (round 1)

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] [RULE] | GPL never-copied violation: BF-2's note carries "the IRQ signal comes into CB1, set to VA11" (9 of the MAME comment's 11 words, original order) and BF-3's note "the COUNT240 signal comes into CA1, … the logical AND of …" (6- and 4-word verbatim runs) — comment-text reproduction, not identifier citation. Found independently by rule-checker and my own diff of the notes against the pinned lines. | plugins/defender/docs/rom-study/claims/08-board-facts.json (BF-2, BF-3 notes) | Dev (green rework): reword both notes to identifier-only paraphrase, e.g. "CB1 is the input MAME's driver wires the video-count line to (comment above the cb1_w call)". |
| [MEDIUM] [TEST] | Corroboration line numbers verify nowhere: R1 mutant (BF-4 corroboration 500→501, path intact) survived the full suite AND the checker CLI. The claims' MAME pointers — what later stories will read — are exactly the RV-7/TB-3 checkable-and-wrong class this story exists to close, one layer down. | plugins/defender/tests/audit/board-facts.test.ts (the skipIf(mame) block) | TEA (red rework): extend the local-clone teeth with an id→expected-token map over ALL williams corroborations (RV-7 ROM_START, TB-3 set_raw, BF-1 bank_select_w, BF-2 CB1, BF-3 COUNT240, BF-4 video_control_w, BF-5 decoder2, BF-6 cb1_w, BF-7 ca1_w), re-opened at the pinned SHA; kill R1. |
| [MEDIUM] [TEST] | The disguised-backtick MAME-pointer guard scans board-facts.md only; this diff itself added a MAME pointer to open-questions.md, and T3 (backticking it) shipped 165/165 green — invisible to the .SRC-only sweep by construction. | plugins/defender/tests/audit/board-facts.test.ts:460 region | TEA (red rework): generalize the no-backticked-.cpp-citation scan across all DOSSIER_FILES; kill T3. |
| [LOW] [TEST] [latent] | oqCites is .some over OQ-1's four-line union {1934,1935,1997,1998}, so it cannot distinguish the entry-$04 citation from the exit-$05 one. T1 (relabeling 1997-1998 as 1934-1935) was KILLED today — but only by the claims-coverage sweep, because no claim happens to cover 1934/1935; a legitimate future claim there re-opens the hole. | plugins/defender/tests/audit/board-facts.test.ts:287 (OQ_RESOLUTIONS[0].cites) | TEA, same rework: split into two cite groups (entry, exit) — or explicitly record the coverage-sweep defense as the intended guard. |
| [LOW] [TEST] [latent] | The pin-discipline check validates the FIRST mamedev/mame line in reference-sources.md, not the line pinnedMameSha() extracted the SHA from (single-line coincidence today; test-analyzer reproduced the decoy structurally). | plugins/defender/tests/audit/board-facts.test.ts:377 region | TEA, same rework: return {sha, line} from one extraction and assert discipline on THAT line. |
| [LOW] [DOC] | open-questions.md's intro still frames every disposition as "who resolves it, or why it stays a note" — three sections below it are now Resolved records; and the $14/$03E0 token regexes lack word boundaries (over-match class, currently harmless). | plugins/defender/docs/rom-study/open-questions.md:4-6; board-facts.test.ts:308,325 | Dev (intro sentence) / TEA (boundaries), same reworks — or record as accepted. |

[EDGE] [SILENT] [TYPE] [SEC] [SIMPLE] — specialists disabled; domains covered by my own pass: no
numeric/boundary code beyond the regex classes already flagged, no swallowed errors introduced
(mameFileAt propagates git failures loudly by design; readDossier's '' return is the established
presence-guarded convention), no type escapes (corroboration parsing narrows unknown by hand),
no security surface (static docs + read-only git show of a local clone), no complexity beyond
the shared-helper extraction the diff itself performs.

**Verified good (evidence):**
- [VERIFIED] All 78 claims re-open byte-for-byte (checker CLI + rule-checker's independent awk
  re-open of the 7 new ones, tabs exact).
- [VERIFIED] All 14 cited MAME lines carry their facts at the pin — comment-analyzer re-fetched
  every one via git show; my own re-open of all 9 corroboration lines agrees.
- [VERIFIED] The decode prose is TRUE: CRB $04/$05 writes at DEFA7 1934-1935/1997-1998 (PIA1=$CC02
  so PIA1+1 is CRB), CRA=$14 from ROMF8 76-81 with no later CRA write anywhere (only reads),
  $C3FC & ~$03E0 = $C01C ∈ [$C010,$C01F].
- [VERIFIED] The pin teeth bite: TEA's M3/M4/M5 + control, re-attested by the delivered battery;
  fence-stripping load-bearing (M1) and regression-safe (M6/M7 through the extracted helpers).
- [VERIFIED] Enrollment load-bearing (D1) and the row-exact census intact on the new doc (D2/D3).

**Data flow traced:** board fact → doc row (row-scoped tokens + pointers) → in-tree anchor →
claim (byte re-open) → MAME corroboration (schema + path) → pinned SHA (cross-file equality +
git-object teeth). The one unexercised link — corroboration.line at the pin — is finding 2.
**Handoff:** Back to TEA (red rework) for findings 2, 3 and the two latent LOWs; Dev rewords the
two BF notes and the intro sentence in the green that follows.

## TEA Assessment — rework round 1

**Scope:** the review's two [MEDIUM] apparatus gaps and three [LOW]s. Commit f7fee832, pushed.

**What changed (board-facts.test.ts only):**
- Corroboration drift teeth (finding 2): new id-keyed CORROBORATION_TOKENS map (RV-7, TB-3,
  BF-1..7) in the skipIf(mame) block — every williams corroboration's {file, line} re-opens at
  the pinned SHA via git show and must carry its identifier token; a corroborated claim with NO
  registered token is itself a red, so the teeth can never silently under-cover a new claim.
  Population-guarded (floor ANCHORED+2).
- Backtick guard generalized (finding 3): the no-backticked-.cpp-citation scan now sweeps ALL
  DOSSIER_FILES, not board-facts.md alone.
- OQ-1 cites split (LOW): the four-line union became two required groups — entry $04
  (DEFA7 1934-1935) AND exit $05 (DEFA7 1997-1998) — so the relabel evasion has no union to hide
  in. This is the rework's one genuinely red test: the shipped OQ-1 cites only the exit pair.
- Same-line pin discipline (LOW): pinnedMamePin() returns {sha, line}; the discipline check reads
  the SHA-BEARING row, not the first mamedev/mame mention.
- Token boundaries (LOW): /\$14\b/ and /\$03E0\b/i.

**Rework battery (all KILLED, full-suite runs, restores git-verified; baseline 1 standing red):**
| # | mutant | result |
|---|--------|--------|
| R1' | BF-4 corroboration line 500→501 (the survived R1, re-run) | KILLED — drift-teeth test red |
| T3' | backticked williams_m pointer in open-questions.md (the survived T3, re-run) | KILLED — generalized guard red |
| DK1 | pin row drops its GPL wording + decoy mamedev/mame GPL sentence added earlier in the doc | KILLED — same-line discipline test red |

**Suite state:** defender 165/166 with exactly ONE red — OQ-1's entry-write citation — plus lint
clean. **Left for Dev (green rework):** (1) add the entry-write citation
(defender/DEFA7.SRC:1934-1935, backticked) to OQ-1's Resolved record plus a covering claim
(generated verbatim; if it carries a williams corroboration, register its token in
CORROBORATION_TOKENS); (2) the review's [MEDIUM] GPL rewording of BF-2/BF-3 notes
(identifier-only paraphrase — the drift teeth only need CB1/COUNT240 present at the lines, so
rewording cannot red them); (3) the [LOW] open-questions.md intro sentence.

## Dev Assessment — green rework round 1

**Status:** GREEN — defender 166/166, orchestrator 494/494, lint clean, checker CLI 79/79,
working tree clean. Commit 7c430e48, pushed.

Three deliverables, exactly the review's routing:
- OQ-1's Resolved record now cites BOTH halves of the CRB pair — the $04 entry mask
  (`defender/DEFA7.SRC:1934-1935`) and the $05 exit re-arm (`defender/DEFA7.SRC:1997-1998`) —
  and claims/08-board-facts.json gains BF-8 (DEFA7.SRC:1935, verbatim GENERATED from the tree,
  tab-exact). BF-8 carries NO williams corroboration (BF-6 already corroborates the CRB model),
  so CORROBORATION_TOKENS needs no new entry and the census floor is untouched. This closes the
  rework's one standing red; the pre-fix state WAS that test's red, so the kill is by
  construction.
- The [MEDIUM] GPL violation: BF-2/BF-3 notes reworded to identifier-only paraphrase ("CB1 is
  the PIA input the driver wires the video-count line VA11 to…", "CA1 is the PIA input the
  driver drives high from scanline 240…") — no contiguous run of MAME comment text survives.
  The drift teeth stay green (they read the MAME lines, not the notes).
- The [LOW] intro: open-questions.md's disposition taxonomy now names the Resolved state
  explicitly ("a Resolved record (OQ-1/2/4, settled by df1-4's board-facts.md), or why it stays
  a note").

No test touched in this round; no scope widened. **Handoff:** back to the Reviewer for round 2.

## Reviewer Assessment

**Verdict:** APPROVED (round 2)

Round 2 verifies the round-1 routing on the final tree; the full-panel specialist pass, rule
compliance, devil's advocate and data-flow trace are round 1's (Subagent Results above), and the
round-2 diff (f7fee832 + 7c430e48) is confined to exactly the three routed files
(board-facts.test.ts, 08-board-facts.json, open-questions.md — stat-verified).

| Round-1 finding | Verification (round 2, executed) |
|-----------------|----------------------------------|
| [MEDIUM] [RULE] GPL near-verbatim in BF-2/BF-3 notes | [VERIFIED FIXED] both notes read back as identifier-only paraphrase; no contiguous run of the MAME comments survives (compared word-for-word against williams_m.cpp:27/36 at the pin) |
| [MEDIUM] [TEST] corroboration lines unverified (R1 survived) | [VERIFIED FIXED] CORROBORATION_TOKENS drift teeth shipped, id-keyed over all 9 williams corroborations with an unregistered-id red; my ORIGINAL R1 mutant re-run on the FINAL tree: KILLED (1 red). Unknown-corroboration guard + population floor (ANCHORED+2) hold |
| [MEDIUM] [TEST] backtick guard scoped to one doc (T3 survived) | [VERIFIED FIXED] scan generalized across DOSSIER_FILES; my ORIGINAL T3 mutant re-run on the FINAL tree: KILLED (1 red) |
| [LOW] oqCites union over OQ-1's four lines | [VERIFIED FIXED] split into entry/exit groups; the doc now cites BOTH (`DEFA7.SRC:1934-1935` + `:1997-1998`), BF-8 covers the new citation with a generated tab-exact verbatim (checker 79/79) |
| [LOW] pin-discipline decoy | [VERIFIED FIXED] pinnedMamePin returns {sha, line}; the discipline check reads the SHA-bearing row (TEA's DK1 mutant killed in rework, code re-read this round) |
| [LOW] intro taxonomy + token boundaries | [VERIFIED FIXED] intro names the Resolved state; /\$14\b/ and /\$03E0\b/i shipped |

[TEST] [RULE] [DOC] [EDGE] [SILENT] [TYPE] [SEC] [SIMPLE] — live-specialist findings all resolved
as above; disabled-specialist domains unchanged from round 1's own-pass coverage (no new code
surface in the round-2 diff).

**Final state:** defender 166/166, orchestrator 494/494, lint clean, checker 79/79, working tree
clean, both rework commits pushed. The dossier's MAME layer is now pinned, cross-checked at the
pin from doc AND claims sides, GPL-clean, and mutation-proven at every link that failed round 1.
**Handoff:** SM (finish flow) — PR into develop, then story finish. SM should sweep the untracked
sprint/context/context-story-df1-4.md into the bookkeeping commit (TEA's routed Improvement).