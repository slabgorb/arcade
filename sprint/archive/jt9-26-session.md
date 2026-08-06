---
story_id: "jt9-26"
jira_key: "jt9-26"
epic: "jt9"
workflow: "trivial"
---
# Story jt9-26: Two joust citations that name the wrong ROM family: JT51-009 misattributes SNPCR1 and still says jt5-1 collapsed the knights, and demo.ts cites real play from the module that IS the demo

## Story Details
- **ID:** jt9-26
- **Jira Key:** jt9-26
- **Workflow:** trivial
- **Stack Parent:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)
- **Branch:** none
- **PR:** none (trunk-based — work landed directly on main: claim 9b1fce8, fix 67ea469)

## Workflow Tracking
**Workflow:** trivial
**Repos:** arcade
**Phase:** finish
**Phase Started:** 2026-08-06T11:29:57Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T11:14:11+00:00 | 2026-08-06T11:17:43Z | 3m 32s |
| implement | 2026-08-06T11:17:43Z | 2026-08-06T11:25:35Z | 7m 52s |
| review | 2026-08-06T11:25:35Z | 2026-08-06T11:29:57Z | 4m 22s |
| finish | 2026-08-06T11:29:57Z | - | - |

## Background — Measured Corrections

This story fixes two distinct issues in joust's ROM study dossier. Per user ruling (2026-08-03):

**HALF 1 — JT51-009 (plugins/joust/docs/rom-study/claims/audio.json): FALSE CLAIM**
- The claim pairs the right label with the WRONG line: says SNPCR1 "is bound to the knight through P1DEC's decision block rather than a direct load (JOUSTRV4.SRC:5544)" but :5544 is G1DEC's sound row; P1DEC's row is :5552 (verified against audio-manifest.ts:229).
- The claim also says "P2 carries its own table SNPCR2 (:8119), which jt5-1 collapses onto this one" but jt5-6 UN-collapsed it; player2Materialise now exists in CUE_SOURCES citing SNPCR2 :8119 itself.
- VERIFIED FIX: Replace "P1DEC's decision block rather than a direct load (JOUSTRV4.SRC:5544)" with "a decision-block binding rather than a direct load (P1DEC :5552)", and delete the clause about P2/SNPCR2 collapse. Leave the source block (file/line/verbatim, JOUSTRV4.SRC:8116) UNTOUCHED.
- WHY IT SHIPS GREEN: the citation gate (tools/audit/check-citations.mjs:36-42) verifies only the source (file/line/verbatim), never the prose.

**HALF 2 — demo.ts: TRUE but IMPRECISE (folded in from jt9-27)**
- demo.ts:220 and :2093 (the description's :183/:1310 have DRIFTED — use current lines) currently cite P1DEC/P2DEC (:5551, :5555) for EGGS1/EGGS2 cells
- These are the real-play blocks, but demo.ts IS the attract-demo module (selected by GOVER at JOUSTRV4.SRC:1025-1029)
- The cells are byte-identical across families (:5543 ≈ :5551, :5547 ≈ :5555), so both citations are TRUE
- ASYMMETRY TO PRESERVE: Half 1 is a false claim; Half 2 is true-but-imprecise
- CHOSEN DELIVERABLE (user ruling): Re-anchor demo.ts citations to the G-family (attract-demo): G1DEC :5543 / G2DEC :5547

**PREREQUISITE READ:** plugins/joust/src/shell/audio-manifest.ts (lines 229-382, jt5-23 record) explains why a G-row citation under a P-label is wrong-in-context. DEV MUST READ THIS BEFORE STARTING.

## Acceptance Criteria

1. **AC1: JT51-009 prose fixed, source unchanged**
   - The prose clause "P1DEC's decision block rather than a direct load (JOUSTRV4.SRC:5544)" is replaced with "a decision-block binding rather than a direct load (P1DEC :5552)" in plugins/joust/docs/rom-study/claims/audio.json
   - The clause "; P2 carries its own table SNPCR2 (:8119), which jt5-1 collapses onto this one" is deleted
   - The claim's source block (file, line, verbatim) is UNTOUCHED and remains byte-valid for the citation gate

2. **AC2: demo.ts lines re-anchored to G-family**
   - demo.ts:220 (formerly :183) now cites G1DEC :5543 for EGGS1 cell
   - demo.ts:2093 (formerly :1310) now cites G2DEC :5547 for EGGS2 cell
   - The re-anchor reflects that demo.ts is the attract-demo module and names the demo's own decision blocks

3. **AC3: Full suite stays green**
   - `npx vitest run` (all joust tests) passes
   - `npm run test:orchestrator` (cabinet wiring invariants) passes
   - Citation gate (`tools/audit/check-citations.mjs`) passes with no red findings

## Delivery Findings

### Dev (implementation)
- **Gap** (non-blocking): The orchestrator suite (`npm run test:orchestrator`) has 2 pre-existing failures in `tests/audit-refs.test.mjs` (`audit/star-wars resolves to a reachable commit` / `can still serve blobs`). Cause is environmental, not a regression: this checkout has no local `audit/star-wars` git tag (only `audit/red-baron` and `audit/tempest` exist; `git rev-parse audit/star-wars` → unknown revision). CI clones with `fetch-depth: 0` so it has the tag; a local checkout does not. Independent of jt9-26 (joust-only prose). Affects `tests/audit-refs.test.mjs` (needs the `audit/star-wars` tag fetched locally, or a skipIf-when-tag-absent guard like the vendored-tree pattern). *Found by Dev during implementation.* — Reviewer/SM to route/file if no owner exists.

### Reviewer (code review)
- **Confirm** (non-blocking): I independently reproduced Dev's `audit/star-wars`-tag finding — `git tag -l 'audit/*'` yields only `audit/red-baron` and `audit/tempest`; `audit/star-wars` is absent locally, so `tests/audit-refs.test.mjs` fails on tag resolution, not on anything jt9-26 touched. Genuinely pre-existing and out of scope; SM should route it (a `skipIf(!tagPresent)` guard mirroring the vendored-tree pattern is the natural fix). No blocking upstream findings from this review.

## Design Deviations

### Dev (implementation)
- **Added a one-clause contrast note alongside the demo.ts re-anchor**
  - Spec source: context-story-jt9-26.md, AC2 + SM ruling (re-anchor to G-family, NOT the family-independent-annotation alternative)
  - Spec text: "demo.ts lines re-anchored to G-family … names the demo's own decision blocks"
  - Implementation: Re-anchored both citations to G1DEC/G2DEC (:5543/:5547) as ruled, AND appended a short in-place note ("the attract-mode block this demo runs; real play binds the byte-identical rows at P1DEC/P2DEC :5551/:5555").
  - Rationale: The re-anchor is chosen; the note only records WHY G (not P) and that the rows are byte-identical, so a future reader does not "correct" it back to P — exactly the re-litigation failure `audio-decision-block-families.test.ts` warns about. It commits to G (does not present P as equally-correct), so it is not the rejected annotate-as-family-independent option.
  - Severity: minor
  - Forward impact: none — prose only; no test asserts the demo.ts citation string, and the ROM-side line set (5543/5547 + 5551/5555) is already blessed in `demo-jt8-6-source.test.ts` EGGS_CELL_LINES.

### Reviewer (audit)
- **Dev's added contrast note on the demo.ts re-anchor** → ✓ ACCEPTED by Reviewer: commits to G (does not present P as co-equal, so it is NOT the rejected annotate-as-family-independent branch), and naming the byte-identical P rows in-place is the correct defence against a future reader "correcting" G back to P — the exact re-litigation `audio-decision-block-families.test.ts:511-512` warns about. Prose-only, no test couples to it. Sound.
- No undocumented deviations found: the diff is exactly the two files AC1/AC2 name; `git diff` shows 7 insertions / 4 deletions, all prose. The `source` block of JT51-009 is untouched (verified in diff), so the citation gate's byte check is unaffected.

## SM Assessment

Setup for jt9-26 (trivial/phased, 2pt). Baldur re-verified every falsifiable premise against the current tree before setup — sibling probes clean (no remote branch, only unrelated mc1-5 in a-3), and the merged-in jt9-27 either/or was ruled by the user before setup, not left for Dev to assume.

**What is true, confirmed by measurement:**
- HALF 1 (JT51-009 in audio.json) is genuinely FALSE — :5544 is G1DEC's row, P1DEC's is :5552 (audio-manifest.ts:229), and the "jt5-1 collapses SNPCR2" clause is stale (jt5-6 un-collapsed it; player2Materialise cites SNPCR2 :8119 itself). Verified fix is in AC1; source block stays untouched.
- HALF 2 (demo.ts) is TRUE-but-imprecise — cells are byte-identical across G/P families, so the P-citations are not wrong, only wrong-in-context for the module that IS the attract demo.

**User ruling (obtained pre-setup):** re-anchor demo.ts to the G-family (G1DEC :5543 / G2DEC :5547). Not the family-independent-annotation alternative. AC2 encodes this.

**Line drift flagged:** the epic description's demo.ts:183/:1310 have moved to :220/:2093; ACs use the current lines.

**Trap for Dev to respect:** the citation gate reads only a claim's source, never its prose (self-documented in check-citations.mjs), so NOTHING here fails today and nothing will catch a regression. Both changes are prose/comment edits — Dev should weigh whether either can be pinned, and expect no red from the gate to signal correctness. Prerequisite read: audio-manifest.ts:229-382 (the jt5-23 G-vs-P record).

Handing off to Loki Silvertongue for the implement phase.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/joust/docs/rom-study/claims/audio.json` — JT51-009 prose: replaced "P1DEC's decision block rather than a direct load (JOUSTRV4.SRC:5544)" with "a decision-block binding rather than a direct load (P1DEC :5552)" and deleted the stale "; P2 carries its own table SNPCR2 (:8119), which jt5-1 collapses onto this one" clause. `source` block (JOUSTRV4.SRC:8116, verbatim) untouched.
- `plugins/joust/src/core/demo.ts` — re-anchored both EGGS1/EGGS2 DEGGS-binding citations (`:220`, `:2095`) from P1DEC/P2DEC (:5551, :5555) to the attract-demo G1DEC/G2DEC rows (:5543, :5547), with a one-clause note on why G and that the rows are byte-identical.

**ROM verification (before editing):** read JOUSTRV4.SRC:5542-5556 directly — `:5543` is G1DEC's `FDB DEATH1,EGGS1,…` row and `:5547` is G2DEC's `FDB DEATH2,EGGS2,…` row, byte-identical to the P rows `:5551`/`:5555`. Confirmed P1DEC's SNPCR1 sound row is `:5552` (G1DEC's is `:5544`) via audio-manifest.ts:229-254, which is why JT51-009's `:5544` was a G-under-P misattribution. player2Materialise exists in the manifest citing SNPCR2 :8119 itself — the "jt5-1 collapses" clause describes a port jt5-6 removed.

**Tests:** joust 2884/2884 GREEN (`npx vitest run --project joust`, exit 0), including the citation audit gate (`tests/audit/citations.test.ts` → `check-citations.mjs`). Orchestrator 396/398 — the 2 failures are pre-existing and environmental (`tests/audit-refs.test.mjs` needs the `audit/star-wars` git tag, absent in this local checkout; joust changes cannot affect it — see Delivery Findings).

**Committed & pushed:** `67ea469` (rebased onto `d508b38` after a sibling bz5-3 claim moved main; rebase clean, sibling touched no code). Trunk-based — no PR (SM creates none for this flow).

**AC status:** AC1 ✅ (JT51-009 prose fixed, source untouched, still byte-valid). AC2 ✅ (demo.ts re-anchored to G1DEC :5543 / G2DEC :5547). AC3 ✅ (joust + citation gate green; orchestrator delta is pre-existing/unrelated).

**Handoff:** To Heimdall (Reviewer) for the review phase.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 2 (pre-existing, unrelated) | confirmed 0, dismissed 0, deferred 2 (routed to SM) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings |

**All received:** Yes (1 enabled returned; 8 disabled via `workflow.reviewer_subagents`)
**Total findings:** 0 confirmed blocking, 0 dismissed, 2 deferred (both the pre-existing `audit/star-wars`-tag orchestrator failures, routed to SM — not caused by this diff)

> Note on the disabled panel: `comment_analyzer` — the one specialist whose domain this all-prose diff lives in — is disabled on this project. Per the known gap, I did its job by hand: I re-derived every new citation from the vendored ROM myself (below), which is the only check that can catch a false-but-byte-valid citation, since the citation gate provably cannot (`check-citations.mjs` self-documents that limit at :35-45).

## Reviewer Review — Manual Verification (the citation gate cannot do this)

Every new citation independently re-read from `reference/williams-source/joust/JOUSTRV4.SRC`:

- [VERIFIED] Half 1 — JT51-009 now cites **P1DEC :5552** for SNPCR1's binding — evidence: :5550 is `P1DEC FDB P1JOY,...` (block head) and :5552 is `FDB SNPLWU,...,SNPTREF,SNPCR1` (its sound row, ends in SNPCR1). It is an FDB decision-block binding, not a direct `LDX`/load — the claim's "decision-block binding rather than a direct load" is true. The OLD :5544 was G1DEC's row (attract demo); citing P for `playerMaterialise` — a **human-fired** transporter sound — matches audio-manifest.ts:250-254 (callSite line 5552). Correct family for the context.
- [VERIFIED] Half 1 — the deleted "P2 carries its own table SNPCR2 (:8119), which jt5-1 collapses onto this one" clause was genuinely stale — evidence: `player2Materialise` exists in audio-manifest.ts (:43, :64, and its own source SNPCR2 :8119 at :263-266). The collapse jt5-1 described was undone by jt5-6; the clause described a port that no longer exists. Correct to delete.
- [VERIFIED] Half 1 — JT51-009's `source` block (file/line/verbatim, JOUSTRV4.SRC:8116) is untouched — evidence: `git diff` shows only the `claim` line changed; the citation gate's byte check is unaffected and stayed green (2884/2884).
- [VERIFIED] Half 2 — demo.ts now cites **G1DEC :5543 / G2DEC :5547** for the EGGS1/EGGS2 DEGGS binding — evidence: :5542 `G1DEC FDB G1JOY,...`, :5543 `FDB DEATH1,EGGS1,...`; :5546 `G2DEC ...`, :5547 `FDB DEATH2,EGGS2,...`. The rows carry EGGS1/EGGS2. Correct.
- [VERIFIED] Half 2 — the "byte-identical rows at P1DEC/P2DEC (:5551, :5555)" claim holds — evidence: a raw string compare of :5543 vs :5551 and :5547 vs :5555 is equal on both. So the re-anchor is a precision move, not a correction.
- [VERIFIED] Half 2 — "the attract-mode block this demo actually runs" is correct — evidence: GOVER selection at :1025-1029 (`LDX #G1DEC  ASSUME GAME SIMULATION` / `LDA GOVER` / `BGT 30$` keeps G, else `LDX #P1DEC`). G = game-simulation = the self-playing attract demo; demo.ts models exactly that, so G is its family.
- [VERIFIED] Internal consistency — Half 1 points to P and Half 2 points to G, and that is not a contradiction: they document different things (a human-fired sound vs. the attract-demo egg counter). `demo-jt8-6-source.test.ts` EGGS_CELL_LINES already blesses BOTH `5543/5547 (attract-mode decisions)` and `5551/5555 (play decisions)`, so the demo.ts G-citation is consistent with the repo's existing pins, and the egg-catch.json JT86 claim citing P1DEC :5551 (real play) remains correct in its own context.
- [VERIFIED] No regression to the coupled test — evidence: `demo-jt8-6-source.test.ts`'s only demo.ts assertion checks the `eggHits` doc-block contains `4669` and `1979`; both survive (demo.ts:226-227). Suite green.
- [VERIFIED] Old wording fully removed — evidence: `grep` for "collapses onto this one" and "P1DEC's decision block rather than a direct load" across `plugins/joust/` returns nothing.

### Rule Compliance

Applicable project rules for this diff (CLAUDE.md, joust conventions):
- **core/shell purity boundary** — demo.ts is in `src/core/`; the purity scanner reads comment text too (per tempest lesson). The added comment contains no `window.`/`document.` or other banned tokens; it is pure ROM prose. Compliant — and the joust purity test passed. ✓
- **Citation dossier integrity** (claims/*.json `source` blocks must stay byte-valid) — JT51-009 `source` untouched; gate green. ✓
- **No fleet/shared-code changes** — diff is joust-local only; no `src/shared` touched, so no cross-game ripple. ✓
- No type/security/tenant rules apply — there are no type, API, auth, or data-flow changes; this is documentation prose in a comment and a JSON string. (Enumerated and found N/A rather than skipped.)

### Devil's Advocate

Let me argue this change is broken. First attack: the re-anchor is *wrong-headed* — a documentation comment inside `demo.ts` is describing a general ROM fact (how DEGGS reaches EGGS1/EGGS2), and that fact is family-independent, so pinning it to G1DEC "over-specifies" and a future reader will think the demo hard-selects G when really the cells are shared. Rebuttal: the comment's whole job is provenance for *this* module, and this module IS the attract demo (GOVER→G, :1025-1029); naming the family the module actually runs is more accurate, not less, and Dev's added clause explicitly names the byte-identical P rows so the shared-cell fact is not lost. Second attack: maybe the citation gate WILL now fail because I changed a claim string — a hidden test could assert the old prose. Rebuttal: the full joust suite (2884) and the citation gate ran green post-change; a `grep` for the old wording returns nothing; and `check-citations.mjs` provably ignores prose. Third attack: a wrong line number could have slipped in — the most dangerous outcome for a citation fix, because a byte-valid-but-wrong cite manufactures false corroboration (my own memory: "citation gate checks quotes not meaning"). Rebuttal: I did not trust Dev's numbers — I re-read :5542-5556, :5550-5552, :1025-1029, and :8119 from the vendored source directly and string-compared the byte-identical rows; every number checks. Fourth attack: the ROM continuation trap — SNPCR1 spans :8116-8118; did anything mis-cite its extent? Rebuttal: the `source` verbatim (:8116) is unchanged and the claim never asserts an extent. Fifth: could the orchestrator RED mask a real regression? Rebuttal: both failures are in `audit-refs.test.mjs` for the `audit/star-wars` tag, reproduced as a missing-local-tag condition with `git tag -l`, and neither test reads joust or the changed files. I cannot find a way this is broken. The one residual is the pre-existing orchestrator RED, which is filed as a Delivery Finding and routed to SM, not owned here.

## Reviewer Assessment

**Verdict:** APPROVED
**Data flow traced:** N/A — no runtime data flow changed. This is documentation: a JSON `claim` string (audio.json JT51-009) and two provenance comments (demo.ts). The one behavioural surface that *could* be touched — the citation gate's byte check over the `source` block — is provably unaffected (source untouched, gate green).
**Pattern observed:** correct context-sensitive family selection — a human-fired sound cue cites the P (real-play) family while the attract-demo module cites the G (attract) family, consistent with the jt5-23 record (audio-manifest.ts:338-385) and the already-blessed EGGS_CELL_LINES in demo-jt8-6-source.test.ts.
**Error handling:** N/A (no code paths). Citation correctness verified by hand against the ROM, which is the only check that can catch a false-but-byte-valid citation.
**Tests:** joust 2884/2884 green incl. citation gate; lint clean; the 2 orchestrator failures are pre-existing (`audit/star-wars` tag absent locally), reproduced and routed to SM.
**Handoff:** To SM for finish-story