---
story_id: "sw5-3"
jira_key: "sw5-3"
epic: "sw5"
workflow: "tdd"
---
# Story sw5-3: Re-port the TIE family edges (TIE, TI1, TI2, TI3) — including the spider-ladder rung the port's own comment shows it omitted

## Story Details
- **ID:** sw5-3
- **Jira Key:** sw5-3
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-15T11:53:12Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-15T11:07:19Z | 2026-07-15T11:09:07Z | 1m 48s |
| red | 2026-07-15T11:09:07Z | 2026-07-15T11:28:53Z | 19m 46s |
| green | 2026-07-15T11:28:53Z | 2026-07-15T11:38:51Z | 9m 58s |
| review | 2026-07-15T11:38:51Z | 2026-07-15T11:53:12Z | 14m 21s |
| finish | 2026-07-15T11:53:12Z | - | - |

## Delivery Findings

### TEA (test design)
- **Improvement** (non-blocking): the shared file-level header in `models.ts` still
  names TIE_FIGHTER as re-authored — "TIE_FIGHTER was RE-AUTHORED from its own ring
  structure (story 8-10) … it is closed into ring loops + symmetric struts". After
  this re-port that is false for TIE_FIGHTER (its edges ARE `.WL TIE`). Affects
  `src/core/models.ts` (the file header comment block ~lines 41-46; update the
  TIE_FIGHTER sentence the way sw5-2 updated the DARTH_TIE one, and note sw5-3
  re-ported TIE_FIGHTER from `.WL TIE`). The provenance test I added is scoped to the
  `export const TIE_FIGHTER` block only (a header regex is brittle — the header also
  discusses DARTH_TIE/sw5-2), so this header line is Dev's judgment call, not forced.
  *Found by TEA during test design.*
- **Improvement** (non-blocking): the fragments' shared comment (`models.ts` ~176-182)
  says the wing edges are "re-authored here as index pairs". Post-fix they are the ROM's
  `.WL TI1`/`.WL2 TI2`/`.WL TI3` draw lists (minus the beam-continuation rungs the author
  dropped), not re-authored. Affects `src/core/models.ts` (that comment); fold into the
  header fix above. *Found by TEA during test design.*
- No blocking findings.

### Dev (implementation)
- Resolved BOTH of TEA's non-blocking doc findings in this commit: rewrote the shared file
  header so neither TIE is called heuristic (both now cite their `.WL` re-port), and rewrote the
  fragments' shared comment so the wing/cabin edges are described as the ROM's draw lists (naming
  the restored `.LD` stitches) rather than "re-authored". No new upstream findings during implementation.

### Reviewer (code review)
- **Improvement** (non-blocking): `tie-family-rom.test.ts`'s AC-1 set-equality uses a `Set`, which
  collapses duplicates, so a duplicate edge smuggled into a port list would not be caught *within this
  file*. It IS caught by `tests/core/models.test.ts:128` (`'has no duplicate edges (undirected)'`, a
  universal guard over the MODELS registry — I confirmed it covers all four TIE-family models), so this
  is not exploitable; the suite could optionally add a self-contained per-model edge-count assertion.
  Affects `tests/core/tie-family-rom.test.ts`. *Found by Reviewer during code review.*
- No blocking findings. The provenance describe-block tests documentation prose rather than runtime
  behaviour — intentional (logged TEA deviation, accepted below) and does not weaken the geometry guards.

## Impact Summary

**Upstream Effects:** 3 findings (0 Gap, 0 Conflict, 0 Question, 3 Improvement)
**Blocking:** None

- **Improvement:** the shared file-level header in `models.ts` still named TIE_FIGHTER as re-authored, which is now false for TIE_FIGHTER post-re-port — RESOLVED by Dev in this commit (header rewritten to cite .WL TIE). Affects `src/core/models.ts`.
- **Improvement:** the fragments' shared comment said the wing edges were "re-authored here as index pairs", but post-fix they are the ROM's .WL TI1/.WL2 TI2/.WL TI3 draw lists — RESOLVED by Dev in this commit (comment rewritten). Affects `src/core/models.ts`.
- **Improvement:** tie-family-rom.test.ts's AC-1 set-equality uses a Set, which collapses duplicates within that file alone — confirmed not exploitable, models.test.ts:128's universal no-duplicate-edges guard covers all four TIE-family models. Affects `tests/core/tie-family-rom.test.ts`.

### Downstream Effects

Cross-module impact: 3 findings across 2 modules

- **`src/core`** — 2 findings
- **`tests/core`** — 1 finding

### Deviation Justifications

4 deviations

- **Re-seated the four TIE-family punch-list pins from the frozen defect to {0,0}**
  - Rationale: those pins deliberately froze the fabrication this story removes — a
  - Severity: minor
  - Forward impact: none (Dev's re-port turns them green).
- **Added a provenance doc-comment test not enumerated in the story's ACs**
  - Rationale: TIE_FIGHTER's doc comment currently states the OPPOSITE of AC-1 ("the
  - Severity: minor
  - Forward impact: Dev updates the TIE_FIGHTER doc block; the shared file header remains
- **AC-5 (self-edges not copied) is a keep-guard here — the family has none to copy**
  - Rationale: the AC is stated, but for this family it is satisfied by construction; a
  - Severity: minor
  - Forward impact: none.
- **Surgical edge edits + comment fixes, not a full ROM-stroke-order re-transcription**
  - Rationale: the resulting undirected edge SET is exactly `.WL TIE`/etc (proven by the suite's
  - Severity: minor
  - Forward impact: none.

## Design Deviations

### TEA (test design)
- **Re-seated the four TIE-family punch-list pins from the frozen defect to {0,0}**
  - Spec source: context-story-sw5-3.md, AC-6
  - Spec text: "The contact sheet reports 0/0 drift for all four TIE-family pairs."
  - Implementation: `tests/tools/romCompare.test.ts`'s punch-list previously pinned the
    audit's known-bad state — TIE `{1,3}`, TI1 `{1,0}`, TI2 `{1,0}`, TI3 `{3,0}`;
    re-seated all four to `{0,0}` plus `verdict(...).text === '✓ edges match'` and
    `drift === false`, mirroring exactly what sw5-2 did for the RTH pin.
  - Rationale: those pins deliberately froze the fabrication this story removes — a
    contract-change RED that TEA owns, not a spec omission. The pin's stated intent is
    "the number a stakeholder reads off the contact sheet"; sw5-3 changes that number.
  - Severity: minor
  - Forward impact: none (Dev's re-port turns them green).
- **Added a provenance doc-comment test not enumerated in the story's ACs**
  - Spec source: context-story-sw5-3.md, AC-1 (edges derived from `.WL TIE`/…); sw5-2
    session Design Deviations ("Forward impact: sw5-3 finishes the header when it
    re-ports TIE_FIGHTER")
  - Spec text: AC-1 — "TIE_FIGHTER … edges are derived from the ROM draw lists `.WL TIE`,
    `.WL TI1`, `.WL2 TI2` and `.WL TI3`."
  - Implementation: `tests/core/tie-family-rom.test.ts` asserts TIE_FIGHTER's own doc
    block cites `.WL TIE` and no longer claims RE-AUTHORED/hand-authored edges. sw5-3's
    ACs have no explicit doc-comment AC (sw5-2 had AC-7); I extended AC-1 to the comment.
  - Rationale: TIE_FIGHTER's doc comment currently states the OPPOSITE of AC-1 ("the
    disassembly gives only vertices, so edges are hand-authored"); leaving it is a
    confident lie the epic forbids, and sw5-2 explicitly deferred finishing it to sw5-3.
    Scoped to the const block (not the shared header — that is a non-blocking Delivery
    Finding, since a header regex is brittle).
  - Severity: minor
  - Forward impact: Dev updates the TIE_FIGHTER doc block; the shared file header remains
    a Delivery Finding for Dev's judgment.
- **AC-5 (self-edges not copied) is a keep-guard here — the family has none to copy**
  - Spec source: context-story-sw5-3.md, AC-5
  - Spec text: "Degenerate self-edges from the ROM are not copied."
  - Implementation: unlike `.WL RTH` (which draws `[20,20]` from `21,21`), none of the four
    TIE-family draw lists repeats an index, so there is no self-edge to omit. The suite
    pins this (oracle carries none; each port model carries none) as a GREEN keep-guard
    rather than a RED new-behavior test.
  - Rationale: the AC is stated, but for this family it is satisfied by construction; a
    pinned keep-guard catches a future re-port that introduced one, without pretending a
    self-edge exists to remove.
  - Severity: minor
  - Forward impact: none.

### Dev (implementation)
- **Surgical edge edits + comment fixes, not a full ROM-stroke-order re-transcription**
  - Spec source: context-story-sw5-3.md, AC-1; sibling sw5-2 (DARTH_TIE) precedent
  - Spec text: AC-1 — "edges are derived from the ROM draw lists `.WL TIE`/`.WL TI1`/`.WL2 TI2`/`.WL TI3`."
  - Implementation: sw5-2 replaced DARTH_TIE's whole edge list, re-ordered to mirror the ROM's
    `.WL RTH` stroke runs. Here the fragments' lists were ALREADY in ROM stroke order, so I only
    prepended the dropped `.LD` beam stitches ([6,12] wings; [0,12]/[12,20]/[20,6] cabin) at their
    run boundaries. TIE_FIGHTER I left in its readable thematic grouping (panels/pylons/ball) and
    corrected the 4 wrong edges in place (cap pentagon [24,28]; drop [24,29]/[28,29]/[39,47]),
    fixing the two now-inaccurate sub-comments (lower cap is a pentagon; equator has 7 struts).
  - Rationale: the resulting undirected edge SET is exactly `.WL TIE`/etc (proven by the suite's
    set-equal + diffEdges + contact-sheet pins), which is all AC-1 and the renderer require;
    a smaller, more readable diff than a full re-order, with no fidelity loss. The ROM's own
    traversal order is documented in `tie-family-rom.test.ts`'s oracle.
  - Severity: minor
  - Forward impact: none.

### Reviewer (audit)
- **TEA: Re-seated the four punch-list pins {defect}→{0,0}** → ✓ ACCEPTED: the correct contract-change
  RED implementing AC-6, mirroring sw5-2's RTH re-seat. Independently confirmed a genuine regression
  guard — test-analyzer's mutation (reintroduce `[28,29]`) flipped the TIE pin to `{0,1}` and failed it,
  and I verified the committed pins require `{0,0}` + `'✓ edges match'`. Not a tautology.
- **TEA: Added a provenance doc-comment test beyond the enumerated ACs** → ✓ ACCEPTED: sound scope
  extension of AC-1 — the old comment stated the OPPOSITE of AC-1 ("edges are hand-authored"), which the
  epic's "no confident lie" principle forbids, and sw5-2 explicitly deferred finishing it to sw5-3.
  Correctly scoped to the `export const TIE_FIGHTER` block (a whole-file/header regex would be brittle);
  the shared header was handled as a Delivery Finding and Dev completed it honestly. (test-analyzer's LOW
  note that this tests prose-not-behaviour is exactly the intent, and does not weaken the geometry guards.)
- **TEA: AC-5 (self-edges not copied) is a keep-guard here** → ✓ ACCEPTED: verified the four `.WL`
  draw lists carry no repeated index (unlike RTH's `21,21`), so there is nothing to omit; pinning it as a
  GREEN keep-guard (oracle + each port model carry none) is the honest treatment and catches a future
  regression without pretending a self-edge exists to remove.
- **Dev: Surgical edge edits + comment fixes, not a full ROM-stroke-order re-transcription** → ✓ ACCEPTED:
  the resulting undirected edge SET is exactly `.WL TIE`/`TI1`/`TI2`/`TI3` — I independently parsed the
  committed arrays (comments stripped) and confirmed 0/0 drift, no duplicates, no self-edges for all four,
  and mutation-proved the `[24,28]` restore bites (4 named tests RED on revert). A smaller, more readable
  diff than a full re-order with no fidelity loss; the fragments were already in ROM stroke order so only
  the dropped `.LD` stitches were prepended. No undocumented deviation found.

## Sm Assessment

**Diagnosis:** Setup was resumed, not fresh. A prior setup attempt flipped the
story to `in_progress`, created the branch, and generated the context file — then
bled out before writing the session file. I finished the cut: session file written,
all artifacts verified on disk.

**Setup complete — ready for RED:**
- **Story:** sw5-3 — Re-port the TIE family edges (TIE, TI1, TI2, TI3) from the ROM
  draw lists, including the spider-ladder rung the port's own comment shows it omitted.
- **Repo:** star-wars
- **Branch:** `feat/sw5-3-tie-family-edges-report` (exists, clean, at parity with develop)
- **Context:** `sprint/context/context-story-sw5-3.md` (ACs are solid, sourced from the story YAML)
- **Workflow:** tdd (phased) → next phase RED, owned by TEA (Imperator Furiosa)

**The heart of the finding (for TEA to pin as a failing test):** the port's own
comment authors a spider ladder with rungs 7-13, 8-14, 9-15, 10-16, 11-17 — a
six-rung ladder MISSING its 6-12 rung. The ROM has it. This is the single cleanest
corroboration of the whole contact-sheet audit. The four TIE-family pairs must
report 0/0 drift; vertices already match byte-for-byte (TIE vertex 0 is [-130,-208,234])
and must stay untouched; degenerate self-edges from the ROM must not be copied; and
the 3 TIE_FIGHTER edges that appear nowhere in the ROM must be removed.

**This is a re-port sibling of sw5-2 (DARTH_TIE, merged #88).** Same discipline
applies: diff the TS edge list against the gitignored ROM `.WL`/`.WL2` source
directly, don't trust a single golden value.

Handoff to TEA for the RED phase. Witness me.

## TEA Assessment

**Tests Required:** Yes
**Reason:** ROM-fidelity edge re-port with objective, enumerated acceptance criteria
across four models — the sibling of sw5-2 (DARTH_TIE), same proven pattern.

**Test Files:**
- `tests/core/tie-family-rom.test.ts` (NEW) — the story's dedicated suite. Builds an
  INDEPENDENT oracle by hand-transcribing `.WL TIE`, `.WL TI1`/`.WL2 TI2` (shared) and
  `.WL TI3` (WSOBJ.MAC:1352-1422) and decoding the AVG pen macros (`.BD` blank-move-then-draw,
  `.LD` continue-from-beam) in a re-implementation that is NOT sw5-1's parser. The oracle
  self-check asserts the hand decode reproduces `ROM_MODELS.{TIE,TI1,TI2,TI3}.edges`
  byte-for-byte, IN ROM STROKE ORDER (94/30/30/46 edges), so the bake and the port are each
  checked against WSOBJ.MAC, not merely against each other (the sw5-2/sw5-4 principle).
- `tests/tools/romCompare.test.ts` (EDIT) — re-seated the four TIE-family punch-list pins
  from the frozen defect (`{1,3}`/`{1,0}`/`{1,0}`/`{3,0}`) to `{0,0}` + `'✓ edges match'`
  (AC-6). See deviation.

**Tests Written:** 38 new (in the dedicated suite) + 4 re-seated, covering 6 ACs.
**Status:** RED — full suite **23 failed / 1163 passed (1186)**; only the two story files
fail. Baseline was 1148 (1148 + 38 new = 1186; 19 new-behaviour + 4 re-seated = 23 RED).
Verified DIRECTLY via `npx vitest run` (per-test reasons audited — every failure is a clean
AssertionError on the new-behaviour contract; no import/TDZ/malformed-`it.each` errors). The
19 keep-guards (oracle-vs-bake, AC-4 vertices deep-equal, AC-5 no-self-edge, and the
"genuine ROM edge" guard-the-guards) are correctly GREEN now — they protect Dev from touching
vertices or fabricating a self-edge during the re-port.

**The finding, proven:** my independent decode == the bake, in order, for all four models →
drift is exactly TIE `{1,3}`, TI1/TI2 `{1,0}`, TI3 `{3,0}`. Every one of the six missing ROM
edges is a `.LD` beam-continuation the author replaced with an isolated closed ring — the
headline `[6,12]` wing rung is the `.LD 13,…` stitch from the fin's inner circle (idx 6) into
the strut circle (idx 12). The re-port stays 1 connected component with no orphans and no
self-edges for all four, so NO topology-guard surgery is needed (unlike sw5-2's 1→6 AC-8).

### AC → test map

| AC | Test(s) | Now |
|----|---------|-----|
| 1 edges derived from `.WL TIE/TI1/TI2/TI3` | AC-1 `edges set-equal the ROM oracle` ×4 + `diffs clean via romCompare.diffEdges` ×4 + provenance `cites .WL TIE`/`no RE-AUTHORED` | failing |
| 2 fragments' 6-12 rung restored | AC-2 `TI1/TI2 carries the full six-rung ladder, including 6-12` ×2 (+ oracle guard: all six are ROM edges) | failing |
| 3 the 3 fabricated TIE edges removed | AC-3 `drops all 3 fabricated edges` + `restores the missing ROM edge [24,28]` + TI3 `carries all three` (+ oracle guards) | failing |
| 4 vertices UNCHANGED | AC-4 `deep-equals the ROM point table` ×4 + `vertex 0 is [-130,-208,234]` + `TI3 is TIE aft-28 slice` | **passing (keep)** |
| 5 self-edges NOT copied | oracle `NO self-edge in any list` + AC-5 `no port model carries a self-edge` ×4 | **passing (keep)** |
| 6 contact sheet 0/0 ×4 | AC-6 `0/0 drift + '✓ edges match'` ×4 + romCompare punch-list pins `{0,0}` ×4 | failing |

### Rule Coverage (lang-review typescript)

| Rule | Test(s) | Status |
|------|---------|--------|
| #4 falsy-zero (index 0 must survive the re-port) | AC-1 set-equal/diff reference `[0,1]`,`[6,0]`,`[0,12]` — a truthiness drop of index 0 fails them | covered |
| #8 test quality (meaningful assertions) | Phase-C self-check: every test asserts a concrete edge set / count / deep-equal / source regex; no `let _ =`, no `assert(true)`, no vacuous `is_none` | covered |

Other lang-review rules (enums, async, error handling, input validation, React) N/A — pure geometry-data edit.

**Self-check:** 0 vacuous tests. The three "guard-the-guard" oracle tests (each names an edge and
proves it IS/ISN'T in `.WL`) exist precisely so the AC assertions pin the ROM, not an arbitrary list.

### Dev guidance (GREEN, The Word Burgers)
- Replace ONLY the edge lists in `src/core/models.ts`; do NOT touch any vertices (AC-4 pins them
  deep-equal to the ROM). The clean way (sw5-2 pattern) is to lift each edge list from the bake
  `ROM_MODELS.{TIE,TI1,TI2,TI3}.edges` — the TIE family has NO self-edge and NO out-of-range edge,
  so a verbatim lift needs no filtering (confirmed: no duplicates either).
- Minimal alternative, if you prefer surgical edits over full replacement:
  - `TIE_WING_FRAG_EDGES` (shared by TI1 **and** TI2): ADD `[6, 12]` — the one missing rung. Fixes both.
  - `TIE_WING_FRAG_3.edges`: ADD `[0, 12]`, `[12, 20]`, `[6, 20]` (the three `.LD` stitch rungs).
  - `TIE_FIGHTER.edges`: ADD `[24, 28]`; REMOVE `[28, 29]`, `[24, 29]`, `[39, 47]` (the 3 fabricated).
- Update TIE_FIGHTER's doc comment to cite `.WL TIE` and drop the "RE-AUTHORED … hand-authored"
  claim (provenance test). Optionally finish the shared file header + fragments comment (Delivery Findings).
- Do NOT reshape geometry to satisfy any guard — the re-port is already 1 component / no orphans;
  `models.test.ts`'s TIE `isSingleComponent`, Y-symmetry (vertices only), no-orphan and no-degenerate
  guards all stay green, and `tie-wing-fragments.test.ts` stays green (verified: full suite has zero
  collateral failures).

**Handoff:** To Dev (The Word Burgers) for implementation.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/models.ts` — re-ported the four TIE-family edge lists to their ROM draw lists,
  **vertices untouched** (AC-4; diff has no vertex-line change, no new import):
  - `TIE_FIGHTER.edges`: dropped the fabricated lower-cap hexagon closure `[28,29]`/`[24,29]`
    and equator strut `[39,47]`; added the ROM's cap pentagon closer `[24,28]`. Kept the readable
    thematic grouping; corrected the two now-inaccurate sub-comments.
  - `TIE_WING_FRAG_EDGES` (shared by TI1 **and** TI2): added the `[6,12]` spider-ladder rung — the
    ROM's `.LD` stitch from the fin's inner circle into the strut circle. The story's headline.
  - `TIE_WING_FRAG_3.edges`: added the three `.LD` beam stitches `[0,12]`, `[12,20]`, `[6,20]`.
  - Rewrote TIE_FIGHTER's doc comment + the shared file header + the fragments comment to cite the
    `.WL` sources and drop the "RE-AUTHORED/hand-authored/re-authored" claims (resolves TEA's two
    Delivery Findings + the provenance test).

**What I did NOT do (minimalist discipline):** no vertex change (AC-4), no DARTH_TIE change, no
`isSingleComponent`/topology-guard edits (the re-port stays 1 component / no orphans, exactly as
TEA established), no dev-tool import into core, no new abstractions — plain edge literals.

**Verification (evidence, not assertion):**
- Affected files: `tests/core/tie-family-rom.test.ts` + `tests/tools/romCompare.test.ts` → **85/85 passed**.
- Full suite: **1186 passed / 1186 (99 files)**, 0 failing (RED was 23 failed / 1163 passed on the same 1186).
- Build: `npm run build` (`tsc --noEmit && vite build`) → clean, `✓ built` (the sidecar's tsc-strips-types
  trap checked — no type errors).
- Scope: `git diff` touches only `src/core/models.ts`; no vertex line, no import changed.
- Verified DIRECTLY (not via the haiku testing-runner, which my notes flag as confabulating test names).

**AC status:** 1 ✓ (edges are `.WL TIE`/`TI1`/`TI2`/`TI3`, provenance comment cites them) · 2 ✓ (the
6-12 rung restored in TI1 & TI2) · 3 ✓ (3 fabricated TIE edges gone, `[24,28]` restored) · 4 ✓
(vertices deep-equal ROM, untouched) · 5 ✓ (no self-edge in any port model) · 6 ✓ (all four
contact-sheet pairs 0/0, "✓ edges match").

**Tests:** 1186/1186 passing (GREEN)
**Branch:** feat/sw5-3-tie-family-edges-report (pushed)

**Handoff:** To Reviewer (Immortan Joe) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1186/1186 pass, build clean, tree clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — boundary/in-range covered by models.test.ts's universal in-range guard + my own edge-index check |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — N/A (pure static data, no error paths; the one test-side `throw` is a correct invariant guard) |
| 4 | reviewer-test-analyzer | Yes | findings | 2 LOW | confirmed 0 blocking, 2 LOW noted; oracle independence GENUINE; 3 mutation tests all RED with named tests |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — comment accuracy audited by me (see [DOC]); comments match the data |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — covered by rule-checker #1/#2/#17 (0 violations; readonly tuple types intact) |
| 7 | reviewer-security | Yes | clean | none | N/A — src/core purity + edge in-range + no-self-edge confirmed with test evidence |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — surgical data diff, no complexity/dead-code introduced |
| 9 | reviewer-rule-checker | Yes | clean | none (17 rule groups, 33 instances, 0 violations) | N/A |

**All received:** Yes (4 enabled returned — 3 clean, 1 with 2 LOW non-blocking; 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 0 confirmed blocking, 0 dismissed, 2 LOW (non-blocking, noted)

## Reviewer Assessment

**Verdict:** APPROVED

This is a ROM-fidelity geometry-DATA re-port. I treated it adversarially and — because I authored
the code this session (TEA→Dev→Review relay) — leaned on the independent subagents' MUTATION-PROVEN
findings over my own recollection, and re-verified the core deliverable with my own hands.

### Observations (evidence-backed)

1. **[VERIFIED] AC-1/AC-3/AC-6 — the committed edge arrays ARE the ROM, exactly.** I parsed the
   committed `models.ts` edge literals (comments stripped so prose like `[24,28]` couldn't pollute the
   count) and diffed them against `romModels.generated.ts`: TIE 94 edges, TI1/TI2 30, TI3 46, **0 in ROM
   not in port · 0 in port not in ROM · 0 duplicates · 0 self-edges** for all four. Evidence:
   `src/core/models.ts:151-251` vs the bake; my read-only parse. (First pass falsely flagged `[24,29]` etc.
   — that was MY parser reading the doc comment; corrected, then clean.)
2. **[VERIFIED] AC-2 — the 6-12 spider-ladder rung is restored.** `[6,12]` present in the shared
   `TIE_WING_FRAG_EDGES` (`models.ts:198`), so both TI1 and TI2 carry it. [TEST] mutation-proven: removing
   it turns 8 named tests RED.
3. **[VERIFIED] AC-4 — vertices untouched.** No `[n,n,n]` vertex hunk in the diff (rule-checker #16, my
   grep); `TIE_WING_FRAG_3.vertices` is still `TIE_FIGHTER.vertices.slice(-28)`.
4. **[TEST] Oracle independence is GENUINE — not a tautology.** test-analyzer cross-checked the test's
   hand-transcribed `.WL` draw lists against `WSOBJ.MAC:1352-1422` verbatim, and confirmed `ROM_MODELS`
   is baked by a *separate* MACRO-11 parser (`scripts/bake-models.mjs`), not derived from `models.ts` or
   the test's own decoder. I independently mutation-proved a fix the subagent did NOT test — removing the
   restored `[24,28]` pentagon closer → **4 named TIE tests RED** (AC-1 set-equal, AC-1 diffEdges, AC-3
   "restores the missing ROM edge [24,28]", AC-6 contact sheet), then restored (tree clean).
5. **[SEC] `src/core` purity intact.** `models.ts`'s sole import remains `import type { Vec3 } from
   '@arcade/shared/math3d'`; no import of `src/tools/*` (the dev-tool bake) or `src/shell/*`, no
   `Date.now`/`Math.random`/DOM. `romModels.generated.ts` (generated, DO-NOT-EDIT) is untouched.
6. **[RULE] 17 rule groups / 33 instances / 0 violations.** Including #1 (no `as any`; the `.find(...)!`
   non-null assertions are on hardcoded rom ids, structurally guaranteed and matching pre-existing repo
   idiom), #2 (readonly tuple types), #8 (test quality — all non-vacuous).
7. **[DOC] Rewritten comments are accurate.** The TIE_FIGHTER doc block, the shared file header, and the
   fragments comment now cite `.WL TIE`/`TI1`/`TI2`/`TI3`, describe the true structure (lower cap = 5-edge
   pentagon, equator = 7 struts, the `.LD` stitches), and drop the false "hand-authored" claim — resolving
   the prior confident lie. The provenance test enforces the citation for the TIE_FIGHTER block.
8. **[EDGE] All edge indices in range** for their vertex counts (52/18/18/28) — models.test.ts's universal
   in-range guard + my parse (max TI3 index 27). **[SILENT] N/A** — pure static data, no error paths (the
   test decoder's lone `throw` is a correct invariant guard, not a swallowed error). **[TYPE]** covered by
   rule-checker #1/#2/#17 (0 violations). **[SIMPLE]** surgical data diff — no dead code, no over-engineering.
9. **[LOW / TEST]** `tie-family-rom.test.ts`'s AC-1 set-equality collapses duplicates (`Set`), so a
   smuggled duplicate wouldn't fail *within this file* — but `models.test.ts:128`'s universal no-duplicate
   guard covers all four models (I confirmed). Non-blocking; logged as a Delivery Finding.

### Rule Compliance (lang-review typescript + CLAUDE.md)

Delegated to reviewer-rule-checker and cross-checked: 13 lang-review groups + 4 CLAUDE.md/story rules
(core purity, generated-file immutability, vertices-untouched, edge-type contract) — **0 violations across
33 instances**. Type-design (#1/#2), security (#10), and error-handling (#11) domains — whose dedicated
subagents are disabled — are covered here and by the rule-checker: no `as any`/`as unknown`, no user input
(pure geometry data, no I/O/auth), and the only `throw` is a descriptive test invariant guard.

### Deviation Audit
All four logged deviations (3 TEA + 1 Dev) stamped ✓ ACCEPTED in `## Design Deviations` → `### Reviewer
(audit)`. No undocumented deviation found: the diff is exactly the enumerated ROM re-port + honest comment
fixes + the four re-seated pins.

### Devil's Advocate
Suppose this is broken. The scariest failure: the ROM oracle itself is wrong and the port faithfully copies
a lie, so 0/0 drift "passes" over garbage. What refutes it — the oracle is checked THREE independent ways:
the test's hand decode reproduces the sw5-1 bake byte-for-byte IN ORDER, the bake is produced by a separate
assembly parser (`scripts/bake-models.mjs`) reading `WSOBJ.MAC` directly, and test-analyzer re-matched the
transcription against `WSOBJ.MAC` verbatim. Three transcriptions from two source paths agreeing is far
stronger than one. Second angle: the surgical edit could have introduced a DUPLICATE the set-based tests
hide — refuted by `models.test.ts:128` (universal no-dup) and my own parse (0 dups). Third: could removing
the fabricated cap edges ORPHAN vertex 29? No — it retains `[11,29]` (pylon) and `[29,43]` (cap→belt), both
real ROM edges; the universal no-orphan guard is green and TEA's analysis showed all 52 vertices touched.
Fourth: could dropping `[39,47]` disconnect the model? No — it stays one connected component (isSingleComponent
guard green), and `39`/`47` remain linked via `[26,39]`/`[47,32]`. Fifth: index 0 is falsy — a truthiness
bug could drop it — but the edges are literal pairs (no truthiness logic), the render path is untouched, and
`[0,1]`/`[6,0]`/`[0,12]` are all present. Sixth: a confused player might see the "disconnected-looking" TIE —
but that's the renderer's concern, unchanged, and the cabinet strokes exactly this set. Seventh: could the
provenance regex pass on a comment while the edges stayed wrong? The geometry guards are orthogonal to the
prose guard, and both must pass. Nothing rises above LOW.

**Data flow traced:** `TIE_FIGHTER/TIE_WING_FRAG_1/2/3.edges` (pure core data) → consumed by `drawWireframe`
(shell), which strokes each `[a,b]` symmetrically; direction-agnostic, all indices in `[0, vertexCount)`, no
runtime input to corrupt.
**Pattern observed:** ROM-faithful re-port with an independent hand-decoded oracle self-checked against a
separate bake — matches the approved sibling sw5-2/sw5-4/sw5-5 pattern. `models.ts:137-251`,
`tie-family-rom.test.ts`.
**Error handling:** N/A (pure static geometry data); the test decoder's one `throw` is a correct invariant guard.

**Handoff:** To SM (The Organic Mechanic) for finish-story.