---
story_id: "sw5-2"
jira_key: "sw5-2"
epic: "sw5"
workflow: "tdd"
---
# Story sw5-2: Re-port DARTH_TIE edges from the ROM draw list — remove the 44 fabricated edges, restore the 12 real ones

## Story Details
- **ID:** sw5-2
- **Jira Key:** sw5-2
- **Workflow:** tdd
- **Stack Parent:** none
- **Type:** bug
- **Points:** 3
- **Priority:** p1
- **Repos:** star-wars
- **Assignee:** Keith Avery

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-15T09:17:33Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-15T08:36:16Z | 2026-07-15T08:38:44Z | 2m 28s |
| red | 2026-07-15T08:38:44Z | 2026-07-15T09:00:46Z | 22m 2s |
| green | 2026-07-15T09:00:46Z | 2026-07-15T09:08:17Z | 7m 31s |
| review | 2026-07-15T09:08:17Z | 2026-07-15T09:17:33Z | 9m 16s |
| finish | 2026-07-15T09:17:33Z | - | - |

## Story Context

### Technical Approach

The DARTH_TIE model in `src/core/models.ts` currently ships edge connectivity that the code itself admits was RE-AUTHORED by heuristic. The audit discovered:
- **44 of 104 edges are fabricated** — they appear nowhere in the ROM
- **12 real ROM edges are missing** — the original draw list has them, but the port never copied them

The vertices are NOT in question — they already match the ROM byte-for-byte (vertex 0 = [-180,-180,130], the `.P -18,-18,13` row scaled by `.S=10.`).

**Source of truth:** The ROM draw list `.WL RTH` in WSOBJ.MAC (1983 MACRO-11 assembly language source).

### Acceptance Criteria

1. DARTH_TIE.edges are derived from the ROM draw list `.WL RTH` in WSOBJ.MAC, not authored.

2. The 44 edges that appear nowhere in the ROM are removed. models.ts admits authoring them ("RE-AUTHORED by structure... octagon rim + inner square hub + spokes + 4-strut pylon") — the port did not lose 44 real edges, it invented them.

3. The 12 ROM edges we never had are added — six bilateral cross-brace mirror pairs (2-7/3-6 and 15-18/14-19; 35-38/34-39 and 42-47/43-46) plus the four front-window chords (48-52, 49-53, 50-54, 51-55).

4. Vertices are UNCHANGED — they already match the ROM byte-for-byte (vertex 0 is [-180,-180,130], the `.P -18,-18,13` row scaled by `.S=10.`).

5. The ROM's degenerate self-edge (a literal `21,21` in `.BD 31,23,22,21,21,24,23`, i.e. edge [20,20]) is NOT copied into models.ts.

6. The contact sheet reports 0 in-ROM-not-in-port and 0 in-port-not-in-ROM for RTH to Darth Vader TIE.

7. DARTH_TIE's doc comment no longer claims a re-authored ring structure; it cites `.WL RTH` as the source.

8. Existing DARTH_TIE tests still pass. The induced-single-cycle topology guard assumed the AUTHORED ring structure — if it now fails, that is the guard being wrong about the ROM, not the ROM being wrong. Update it with rationale rather than reshaping the geometry to satisfy it.

## Sm Assessment

Setup complete and routed to RED phase (Han Solo / TEA). Strategic reading:

- **Nature of the story:** a fidelity correction, not a feature. The audit already did the hard analysis — every edge to remove (44 fabricated) and every edge to add (12 real: six bilateral cross-brace mirror pairs + four front-window chords) is enumerated in the ACs with ROM line-level provenance. The source of truth is `.WL RTH` in WSOBJ.MAC. The scope is edges in `src/core/models.ts` only; vertices are byte-for-byte correct and MUST stay untouched (AC4).
- **Adversarial trap TEA must guard against:** AC5 — the ROM's degenerate self-edge `21,21` (edge [20,20]) must NOT be copied. A naive "port every pair from the draw list" would smuggle it in. TEA should pin a test that the port omits [20,20].
- **The topology guard tension (AC8):** the existing induced-single-cycle guard was written against the *authored* ring structure. When the real ROM geometry lands, that guard may fail. The AC is explicit: if it fails, the guard is wrong about the ROM — update it with rationale, do NOT reshape geometry to satisfy it. Dev must not "fix" the geometry to pass a guard that encodes the fabrication.
- **Objective acceptance signal:** the contact sheet must report 0-in-ROM-not-in-port and 0-in-port-not-in-ROM for RTH→Darth Vader TIE (AC6). That is the falsifiable finish line, cross-checked by `just bake-models star-wars` in the orchestrator.
- **Prior-art context:** sibling stories sw5-4 (EXHAUST_PORT) and sw5-5 (tower/bunker) already landed the same re-port pattern successfully; sw5-1 (the `.WGD` parser extension) is done and is what made the ROM draw lists machine-readable. The pattern is proven.

No blocking PRs on star-wars; branch `fix/sw5-2-darth-tie-rom-edges` cut from develop. Ready for Han Solo to author the failing tests.

## Delivery Findings

### TEA (test design)
- **Improvement** (non-blocking): the shared file-level header in models.ts still names DARTH_TIE as re-authored — "TIE_FIGHTER and DARTH_TIE were likewise RE-AUTHORED from their own ring structure (story 8-10) … both are now closed into ring loops + symmetric struts and guarded by the same topology test." After this re-port that is false for DARTH_TIE (its edges ARE `.WL RTH` — six pen-up sub-bodies, not ring loops). Affects `src/core/models.ts` (the file header comment block ~lines 41-44; split the sentence so the re-authored claim names TIE_FIGHTER only, which stays true until sw5-3). AC-7's test is scoped to the DARTH_TIE const block and does NOT force this, so it is Dev's judgment call. *Found by TEA during test design.*
- No blocking findings.

### Dev (implementation)
- **Improvement** (non-blocking): the AC-3 front-window-chord `it.each` in the RED suite was malformed — `it.each(WINDOW_CHORDS)` over 2-number tuples spread each `[48,52]` into two args, so `key(48)` threw and the four tests could never pass under any implementation (they were red in RED for the wrong reason). Affects `tests/core/darth-tie-rom.test.ts` (fixed during GREEN — each chord wrapped in its own row; the corrected test still bites the old fabricated edges). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the AC-5 assertion `expect(edgeSet(ORACLE)).not.toContain('20-20')` is quasi-tautological — `edgeSet` filters self-edges by construction, so it can never contain `'20-20'`. The meaningful self-edge assertions are the adjacent two (ROM has `[20,20]`, port does not). Affects `tests/core/darth-tie-rom.test.ts:270` (optional: drop or replace the weak line). *Found by Reviewer during code review.*
- No blocking findings.

## Design Deviations

### TEA (test design)
- **Re-seated the headline RTH regression pin from {12,44} to {0,0}**
  - Spec source: context-story-sw5-2.md, AC-6
  - Spec text: "The contact sheet reports 0 in-ROM-not-in-port and 0 in-port-not-in-ROM for RTH to Darth Vader TIE."
  - Implementation: `tests/tools/romCompare.test.ts`'s headline pin previously encoded the audit's known-bad state `{ onlyInRom: 12, onlyInPort: 44 }`; re-seated to `{ 0, 0 }` plus a `verdict('RTH').text === '✓ edges match'` assertion.
  - Rationale: that pin deliberately froze the fabrication this story removes — a contract-change RED that TEA owns, not a spec omission.
  - Severity: minor
  - Forward impact: none (Dev's re-port turns it green).
- **AC-7 scoped to DARTH_TIE's own doc block, not the shared file header**
  - Spec source: context-story-sw5-2.md, AC-7
  - Spec text: "DARTH_TIE's doc comment no longer claims a re-authored ring structure; it cites `.WL RTH` as the source."
  - Implementation: the AC-7 source test scopes to the `export const DARTH_TIE` … next-`export const` region only; the shared header (models.ts ~41-44) that also names TIE_FIGHTER is not asserted against.
  - Rationale: that header names TIE_FIGHTER too, whose re-port is sw5-3; forcing it to fully drop "re-authored" now would fail for the wrong reason or spill into sw5-3's scope. Logged as a non-blocking Delivery Finding above.
  - Severity: minor
  - Forward impact: sw5-3 should finish updating that shared header.
- **AC-8 topology guard replaced, not deleted — 6 ROM sub-bodies**
  - Spec source: context-story-sw5-2.md, AC-8
  - Spec text: "The induced-single-cycle topology guard assumed the AUTHORED ring structure — if it now fails … Update it with rationale rather than reshaping the geometry to satisfy it."
  - Implementation: replaced `isSingleComponent(DARTH_TIE) === true` (models.test.ts) with an assertion that the model is NOT one component and decomposes into exactly 6 connected sub-bodies (`.WL RTH`'s six pen-up runs) with all 56 vertices stroked. The authoritative edge-set proof (0/0 vs the hand-decoded oracle) lives in the new `tests/core/darth-tie-rom.test.ts`.
  - Rationale: AC-8 authorizes updating the guard; kept a meaningful ROM-derived invariant rather than deleting it.
  - Severity: minor
  - Forward impact: none.

### Dev (implementation)
- **Repaired a malformed `it.each` in the AC-3 window-chord tests**
  - Spec source: tests/core/darth-tie-rom.test.ts, AC-3 (front-window chords)
  - Spec text: "restores the front-window chord [48,52]/[49,53]/[50,54]/[51,55]"
  - Implementation: wrapped each chord as its own row (`WINDOW_CHORDS.map((chord) => [chord] as const)`) so `it.each` passes the whole `[a,b]` tuple as one argument. The original `it.each(WINDOW_CHORDS)` spread `[48,52]` into two args (`chord === 48`), so `key(chord)` threw — the four tests could not pass under ANY implementation.
  - Rationale: a structurally-broken test, not a moved goalpost; my edges genuinely include all four chords. The corrected test still bites — it is red against story 8-10's fabricated edges, which lack `48-52`…`51-55`.
  - Severity: minor
  - Forward impact: none.
- **Corrected the stale shared file header (the TEA Delivery Finding)**
  - Spec source: sw5-2 Delivery Findings → TEA (test design); AC-7
  - Spec text: "the shared file-level header in models.ts still names DARTH_TIE as re-authored … split the sentence so the re-authored claim names TIE_FIGHTER only"
  - Implementation: rewrote models.ts's file header so the "RE-AUTHORED" claim names TIE_FIGHTER only, and states DARTH_TIE was RE-PORTED from `.WL RTH` by sw5-2 (six pen-up sub-bodies). TIE_FIGHTER's status is unchanged and still true until sw5-3.
  - Rationale: leaving a known-false provenance claim in the file contradicts the epic's own "don't leave a confident lie" principle; AC-7's test did not force it, but honesty did. No TIE_FIGHTER geometry touched.
  - Severity: minor
  - Forward impact: sw5-3 finishes the header when it re-ports TIE_FIGHTER.

### Reviewer (audit)
- **Re-seated the headline RTH regression pin {12,44}→{0,0}** → ✓ ACCEPTED by Reviewer: the old pin deliberately froze the audit defect; flipping it to {0,0} + `'✓ edges match'` is the correct contract-change RED implementing AC-6. Independently confirmed clean (onlyInRom=onlyInPort=0).
- **AC-7 scoped to DARTH_TIE's own doc block, not the shared header** → ✓ ACCEPTED by Reviewer: sound scoping — the shared header also names TIE_FIGHTER (sw5-3's territory), and Dev separately fixed the header's DARTH claim, so nothing stale is left.
- **AC-8 topology guard replaced, not deleted — 6 ROM sub-bodies** → ✓ ACCEPTED by Reviewer: exactly what AC-8 authorizes ("update it with rationale rather than reshaping the geometry"). The 6-component + no-orphan assertion is ROM-derived and I re-verified it (6 components over all 56 vertices).
- **Repaired a malformed `it.each` in the AC-3 window-chord tests** → ✓ ACCEPTED by Reviewer: a genuine test defect (tuple-spreading made `key(48)` throw), not a moved goalpost; the corrected test still bites the old fabricated edges (which lack 48-52…51-55). rule-checker #8 independently confirms the fix is correct.
- **Corrected the stale shared file header** → ✓ ACCEPTED by Reviewer: honest doc fix resolving TEA's own Delivery Finding; no TIE_FIGHTER geometry touched, and TIE_FIGHTER's re-authored status remains accurately stated until sw5-3.

## TEA Assessment

**Tests Required:** Yes
**Reason:** ROM-fidelity edge re-port with objective, enumerated acceptance criteria.

**Test Files:**
- `tests/core/darth-tie-rom.test.ts` (NEW) — the story's dedicated suite. Builds an INDEPENDENT oracle by hand-transcribing `.WL RTH` (WSOBJ.MAC:1427-1479) and decoding the AVG pen macros (`.BD` = blank-move then draw; `.LD` = continue from beam) in a re-implementation that is NOT sw5-1's parser. The oracle self-check asserts the hand decode reproduces `ROM_MODELS.RTH.edges` byte-for-byte (73 edges incl. the lone `[20,20]`), so the bake and the port are each checked against WSOBJ.MAC, not merely against each other (the sw5-4 principle). Covers AC-1/2/3/4/5/6/7.
- `tests/tools/romCompare.test.ts` (EDIT) — re-seated the headline punch-list pin `RTH -> Darth Vader TIE` from `{12,44}` to `{0,0}` + `'✓ edges match'` verdict (AC-6). See deviation.
- `tests/core/models.test.ts` (EDIT) — replaced the DARTH_TIE `isSingleComponent === true` guard with a 6-sub-body ROM-faithful topology assertion (AC-8). See deviation.

**Tests Written:** 22 new + 2 re-seated, covering 8 ACs.
**Status:** RED (17 failing for the intended reasons — one per new-behaviour assertion; full suite 17 failed / 1131 passed / 1148 total, baseline was 1126). The oracle self-checks, AC-4 (vertices already the ROM's, deep-equal) and AC-5 (port must NOT carry `[20,20]`) are keep-behaviour guards and correctly GREEN now — they protect Dev from touching vertices or smuggling the self-edge in during the re-port.

### AC → test map

| AC | Test(s) | Now |
|----|---------|-----|
| 1 edges derived from `.WL RTH` | `is exactly the ROM draw list's 72 real edges` | failing |
| 2 remove the 44 fabricated | same set-equal + `72 edges … NO self-edge` + `fabricated spoke [0,8] is GONE` | failing |
| 3 restore the 12 real | `it.each` cross-braces (4 pairs) + window chords (4) + `all twelve are ROM edges` | failing |
| 4 vertices UNCHANGED | `deep-equals ROM RTH's 56-point table` + `vertex 0 is [-180,-180,130]` | **passing (keep)** |
| 5 self-edge `[20,20]` NOT copied | `the ROM draws it but the port does not carry it` | **passing (keep)** |
| 6 contact sheet 0/0 | `clears RTH → Darth Vader TIE … '✓ edges match'` + romCompare pin `{0,0}` | failing |
| 7 doc comment cites `.WL RTH` | `cites '.WL RTH'` + `no longer claims a RE-AUTHORED ring structure` | failing |
| 8 topology guard updated | models.test.ts `is the ROM's six pen-up sub-bodies, not one fabricated blob` | failing |

### Rule Coverage (lang-review typescript)

| Rule | Test(s) | Status |
|------|---------|--------|
| #4 falsy-zero (index 0 must survive the re-port) | edge diff / set-equal reference `[7,0]`,`[0,1]` — a truthiness drop of index 0 fails them | covered |
| #8 test quality (meaningful assertions) | Phase-C self-check: every test asserts a concrete edge set / count / deep-equal / source regex; no `let _ =`, no `assert(true)`, no vacuous `is_none` | covered |

Other lang-review rules (enums, async, error handling, input validation, React) N/A — this is a pure geometry-data edit.

**Self-check:** 0 vacuous tests found.

### Dev guidance (GREEN, Yoda)
- Replace ONLY `DARTH_TIE.edges` in `src/core/models.ts`. The 72 edges are `.WL RTH` decoded — you can lift them from `ROM_MODELS.RTH.edges` **minus the `[20,20]` self-edge** (AC-5), stored as undirected `[a,b]` pairs. Do NOT touch `DARTH_TIE.vertices` (AC-4 pins them deep-equal to the ROM).
- Rewrite the DARTH_TIE doc comment to cite `.WL RTH` as the source and drop the "RE-AUTHORED … octagon rim + inner square hub + spokes + 4-strut pylon" claim (AC-7). Optionally split the stale shared file header (Delivery Finding).
- Do NOT reshape geometry to make anything a single component — the ROM draws six pen-up sub-bodies and AC-8's guard now expects exactly that.

**Handoff:** To Dev (Yoda) for implementation.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/models.ts` — replaced `DARTH_TIE.edges` with the 72 `.WL RTH` edges (the ROM draw list minus the `[20,20]` self-edge), grouped and ordered to mirror the ROM's own `;RIGHT WING`/`;RIGHT STRUT`/`;BODY`/`;LEFT STRUT`/`;LEFT WING`/`;FRONT WINDOW` sections. Rewrote the DARTH_TIE doc comment to cite `.WL RTH` and drop the "RE-AUTHORED" claim (AC-7). Corrected the shared file header so "re-authored" names TIE_FIGHTER only. **Vertices untouched** (AC-4).
- `tests/core/darth-tie-rom.test.ts` — repaired the malformed AC-3 window-chord `it.each` (see deviation). No coverage weakened; the fix still bites the old edges.

**What I did NOT do (minimalist discipline):** no change to `DARTH_TIE.vertices`, no change to TIE_FIGHTER geometry (sw5-3), no new abstractions — the edges are plain literals in ROM stroke order.

**Verification (evidence, not assertion):**
- Affected files: `tests/core/darth-tie-rom.test.ts` + `tests/tools/romCompare.test.ts` + `tests/core/models.test.ts` → **106 passed**.
- Full suite: **1148 passed (98 files)**, 0 failing (RED was 17 failed / 1131 passed on the same 1148).
- Build: `npm run build` (tsc --noEmit && vite build) → clean, `✓ built`.
- AC-6 real-world: `pairModels()` → RTH pair `verticesMatch: true`, `onlyInRom: []`, `onlyInPort: []`, `verdictFor(...).text === '✓ edges match'` (asserted green).

**AC status:** 1 ✓ · 2 ✓ · 3 ✓ · 4 ✓ (vertices deep-equal ROM, untouched) · 5 ✓ (no `[20,20]`, no self-edge) · 6 ✓ (0/0, "✓ edges match") · 7 ✓ (cites `.WL RTH`, no "RE-AUTHORED") · 8 ✓ (six ROM sub-bodies, not one blob).

**Tests:** 1148/1148 passing (GREEN)
**Branch:** fix/sw5-2-darth-tie-rom-edges (pushed)

**Handoff:** To Reviewer (Obi-Wan) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1148 pass, build clean, tree clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (index-0/boundary check below) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — N/A (pure data, no error paths) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (test-quality review below) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (doc accuracy below) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — covered by rule-checker #1/#2 |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — N/A (pure geometry data, no I/O/auth/input) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer (LOW observation below) |
| 9 | reviewer-rule-checker | Yes | clean | 16 rules / 27 instances / 0 violations | N/A |

**All received:** Yes (2 enabled returned, both clean; 7 disabled via `workflow.reviewer_subagents`)
**Total findings:** 0 confirmed blocking, 0 dismissed, 2 LOW (non-blocking, noted)

## Reviewer Assessment

**Verdict:** APPROVED

The whole story is edge correctness, so I re-verified it INDEPENDENTLY of the tests — a script comparing the shipped `DARTH_TIE` against `ROM_MODELS.RTH` directly:

- **AC-1/AC-2/AC-6 [VERIFIED]** — `DARTH_TIE.edges` is exactly `.WL RTH`: 72 edges, `onlyInRom = []`, `onlyInPort = []` (0/0 drift). Every genuine fabrication (the rim→hub spokes `[0,8]`,`[7,8]`,`[1,9]`… and cockpit-square joins) is gone; every port edge is a real ROM edge. models.ts:325-346.
- **AC-3 [VERIFIED]** — all 12 named ROM edges present (`missing = []`): the six cross-brace mirror pairs (2-7/3-6, 15-18/14-19, 35-38/34-39, 42-47/43-46) and the four front-window chords (48-52, 49-53, 50-54, 51-55).
- **AC-4 [VERIFIED]** — vertices UNTOUCHED: deep-equal `ROM_MODELS.RTH.vertices` (56 points); the models.ts diff has only the comment + edges hunks, no vertex line changed.
- **AC-5 [VERIFIED]** — the degenerate self-edge is NOT copied: `hasSelf = false`; the LEFT STRUT group drops the `21,21` repeat. Also guarded by the universal "no degenerate edges" invariant (models.test.ts:120).
- **AC-7 [VERIFIED / DOC]** — the DARTH_TIE doc comment now cites `.WL RTH` and drops "RE-AUTHORED"; the shared file header was honestly re-scoped to name TIE_FIGHTER only (accurate until sw5-3). Comments match the data (6 sub-bodies confirmed).
- **AC-8 [VERIFIED]** — the topology guard is correctly updated, not deleted: `isSingleComponent(false)` + exactly 6 connected sub-bodies over all 56 vertices (no orphans). ROM-derived, per the AC's own instruction. models.test.ts:754.
- **Core purity [VERIFIED]** — models.ts:50 imports only `import type { Vec3 }`; no DOM/time/random/shell/tools import (rule-checker #14; the lone grep hit was the comment word "front-**window**"). Generated bake untouched (#16); dev-tool isolation intact (#15).
- **[RULE]** rule-checker: 16 checks, 27 instances, 0 violations — including the deliberate `it.each` 1-tuple wrap (#8) and the safe `!` assertions that mirror the pre-existing `isSingleComponent` helper.
- **[LOW / TEST]** the AC-5 line `expect(edgeSet(ORACLE)).not.toContain('20-20')` is quasi-tautological (edgeSet filters self-edges by construction). Non-blocking — the meaningful self-edge checks are adjacent. Logged as a non-blocking Delivery Finding.
- **[LOW / SIMPLE]** the AC-8 test re-implements a BFS component-count inline rather than extending the `isSingleComponent` helper. Acceptable for a self-contained test; non-blocking.

### Rule Compliance (lang-review typescript + CLAUDE.md)
Delegated to reviewer-rule-checker and cross-checked: 13 lang-review rules + 3 CLAUDE.md rules (core purity, dev-tool isolation, generated-file immutability) — **0 violations across 27 instances**. Type-design (#1/#2), security (#10), and error-handling (#11) domains — whose dedicated subagents are disabled — are covered here: no `as any`/`as unknown`, no broad `object`/`Function` types, no user input (pure geometry data, no I/O/auth), and the one `throw` in the test decoder is a descriptive invariant guard, not a swallowed error.

### Devil's Advocate
Suppose this is broken. The scariest failure mode: the ROM oracle itself is wrong, and the port faithfully copies a lie. Both the bake (`romModels.generated.ts`, from sw5-1's parser) and the new test's hand-decoded `RTH_DRAW` could share a systematic error — say, a wrong anchor drop making every draw index off by one. If that were true, the edges would connect the wrong vertices and the ship would render as garbage, yet 0/0 drift would still "pass" because both sides share the error. What refutes this: the indices are anchored to the *vertices*, which AC-4 pins deep-equal to the ROM byte-for-byte (vertex 0 = `.P -18,-18,13` = [-180,-180,130]); an off-by-one anchor would misalign the 12 hand-audited AC-3 edges the story author enumerated independently from the draw list — and those 12 land exactly. The test's oracle is also decoded by a re-implementation that is NOT sw5-1's parser, yet reproduces the bake byte-for-byte including the lone `[20,20]` — two independent transcriptions agreeing is much stronger than one. Second angle: a confused player sees a "disconnected" TIE (six floating sub-bodies) and calls it a bug. But that IS the ROM — the AVG hardware pen-ups between draw runs; the contact-sheet acceptance signal (0/0) is precisely "matches what the cabinet draws", and visual polish is explicitly a render concern, not this data's job. Third: could dropping `[20,20]` have removed real connectivity? No — a self-edge draws a zero-length beam; it is never connectivity, and romCompare filters it on both sides regardless. Fourth: index 0 is falsy and heavily stroked (`[7,0]`,`[0,1]`); a truthiness bug could drop it — but the render path is untouched and the universal in-range guard passes. Fifth: does the shared-header edit or the topology-guard swap break TIE_FIGHTER? No — its edges and its own `isSingleComponent` test are untouched, and the full suite is 1148/1148. Nothing here rises above LOW.

**Data flow traced:** `DARTH_TIE.edges` (pure core data) → consumed by `drawWireframe` (shell) which strokes each `[a,b]` symmetrically; direction-agnostic, all indices in `[0,56)`, no runtime input to corrupt.
**Pattern observed:** ROM-faithful re-port with an independent hand-decoded oracle self-checked against the bake — matches the sibling sw5-4/sw5-5 pattern. models.ts:315-346, darth-tie-rom.test.ts.
**Error handling:** N/A (pure static data); the test decoder's one `throw` is a correct invariant guard.

**Handoff:** To SM for finish-story.