---
story_id: "SH2-1"
jira_key: ""
epic: "SH2"
workflow: "trivial"
---
# Story SH2-1: Author ADR-0002 (font strategy) and ADR-0003 (render-surface extraction) — record the decisions and amend ADR-0001's scope guard

## Story Details
- **ID:** SH2-1
- **Jira Key:** (none — no Jira tracking)
- **Workflow:** trivial
- **Repos:** . (orchestrator)
- **Points:** 2
- **Priority:** p2
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-07-08T23:14:40Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-08T23:03:00Z | - | - |
| implement | 2026-07-08T23:03:00Z | 2026-07-08T23:09:26Z | 6m 26s |
| review | 2026-07-08T23:09:26Z | 2026-07-08T23:14:40Z | 5m 14s |
| finish | 2026-07-08T23:14:40Z | - | - |

## Acceptance Criteria

1. docs/adr/0002-font-strategy.md exists (Accepted) recording the ROM-stroke convergence, TTF retirement, and the fidelity trade; it references the design spec and notes it supersedes the TTF approach of bz2-2/A2-2.
2. docs/adr/0003-render-surface-extraction.md exists (Accepted) amending ADR-0001's scope guard — glow un-deferred (meets verb-identical bar), view eligible, font + compositor/phosphor recorded as convergence exceptions with rationale.
3. Both ADRs cross-link the design spec and ADR-0001; ADR-0001 is left intact (amendment is additive, recorded in ADR-0003).

## Technical Approach

This is a governance gate story documenting architectural decisions for the SH2 epic (render-surface extraction). Two new ADRs guide the epic:

**ADR-0002: Font Strategy** — Records the decision to converge the entire cabinet on the ROM stroke-vector font (VGMSGA) instead of the non-commercial Vector Battle TTF. Documents the shared-visual-language-over-per-cabinet-fidelity trade-off. Notes this supersedes the TTF approach committed in done stories bz2-2 (battlezone) and A2-2 (asteroids).

**ADR-0003: Render-Surface Extraction** — Amends ADR-0001's scope guard to admit:
- **glow:** No longer deferred; meets the verb-identical bar (state-set + shadowBlur reset boilerplate is identical across games; constants are parameters).
- **view:** Meets the verb-identical bar (DPR resize + letterbox concern hand-rolled in every game's main.ts).
- **font, compositor, phosphor:** Admitted as deliberate convergence-driven exceptions to the ≥2-consumers rule, with explicit rationale documented.

Both ADRs cross-link to:
- The 2026-07-08 design spec at `docs/superpowers/specs/2026-07-08-shared-render-extraction-design.md`
- ADR-0001 (unchanged; amendment is additive)
- Each other

**Branch Strategy:** trunk-based (orchestrator repo — work happens on main, no feature branch)

## Delivery Findings

### Dev (implementation)
- **Improvement** (non-blocking): The design spec at `docs/superpowers/specs/2026-07-08-shared-render-extraction-design.md` still reads `Status: Draft (awaiting review)` and its header's "Authors on acceptance" line anticipates ADR-0002/ADR-0003 — which now exist and are Accepted. Affects `docs/superpowers/specs/2026-07-08-shared-render-extraction-design.md` (flip the spec status to Accepted / cross-reference the two ADRs). Left untouched here: out of SH2-1 scope (the ACs scope this story to the two new ADR files, ADR-0001 intact). *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (blocking): ADR-0002 mis-maps the SH2 migration story IDs — states SH2-5 evolves battlezone (lines 116, 139) when SH2-5 = star-wars and SH2-6 = battlezone. Affects `docs/adr/0002-font-strategy.md` (correct the SH2-N forward-references, or drop them since the spec did not require them). *Found by Reviewer during code review.*
- Agree with Dev's non-blocking spec-status finding above.

## Impact Summary

**Upstream Effects:** 1 findings (1 Gap, 0 Conflict, 0 Question, 0 Improvement)
**Blocking:** 1 BLOCKING items — see below

**BLOCKING:**
- **Gap:** ADR-0002 mis-maps the SH2 migration story IDs — states SH2-5 evolves battlezone (lines 116, 139) when SH2-5 = star-wars and SH2-6 = battlezone. Affects `docs/adr/0002-font-strategy.md`.


### Downstream Effects

- **`docs/adr`** — 1 finding

## Design Deviations

### Dev (implementation)
- **Added SH2-N migration-story forward-references in ADR-0002 beyond design spec §11** (logged retroactively after Reviewer flagged it — should have been logged at implement time)
  - Spec source: design spec §11 (ADR bookkeeping); story AC-1
  - Spec text: "ADR-0002 (font strategy) — record the decision… Resolves the item ADR-0001 reserved and unblocks backlog stories bz2-2 / A2-2." (no request for specific SH2-N story references)
  - Implementation: ADR-0002 additionally names the SH2 migration stories that carry out the retirement (SH2-4 asteroids, SH2-5 star-wars, SH2-6 battlezone, SH2-7 lobby).
  - Rationale: Concrete forward-references make the governance ADR actionable as an audit trail. Kept (corrected) rather than deleted per Reviewer's option A.
  - Severity: minor (now that IDs are correct); was High while the IDs were wrong (Reviewer [DOC-1]).
  - Forward impact: none — references now match `sprint/epic-SH2.yaml`; if SH2 story IDs are renumbered these lines must be updated.
- Other than the above: both ADRs record the decisions verbatim from the design spec (§4.1 faithfulness trade, §5 eligibility table, §11 ADR bookkeeping). AC-2's "view meets the bar" is present in design §5, so its inclusion is not a deviation.

### Reviewer (audit)
- **Dev's "No deviations" claim** → ✗ FLAGGED by Reviewer: one UNDOCUMENTED deviation. Design spec §11 scopes ADR-0002's supersession note to "unblocks backlog stories bz2-2 / A2-2" — it does *not* ask for forward-references to specific SH2-N migration stories. Dev added them (ADR-0002 lines 116, 139, 144) — added detail beyond spec, which per the deviation rules should have been logged — and got the battlezone mapping **factually wrong** (claims SH2-5 = battlezone; the epic has SH2-5 = star-wars, SH2-6 = battlezone). See finding [DOC-1] in the assessment. Severity: High (factual error in an Accepted governance record).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `docs/adr/0002-font-strategy.md` (new) — Accepted ADR recording the cabinet's convergence on the ROM stroke-vector font (VGMSGA), retirement of the non-commercial Vector Battle TTF, and the shared-visual-language-over-per-cabinet-HUD-fidelity trade. Notes it resolves the item ADR-0001 reserved and supersedes the TTF approach of done stories bz2-2 (battlezone) / A2-2 (asteroids); A2-2's letter-spacing intent carried forward via `layoutText`'s `letterSpacing`.
- `docs/adr/0003-render-surface-extraction.md` (new) — Accepted ADR amending ADR-0001's scope guard: (1) charter widened to "pure core + explicitly-flagged browser helpers" fenced by a purity guard; (2) `glow` un-deferred (meets the verb-identical bar), `view` eligible (standard bar), `font` + `compositor`/`phosphor` admitted as convergence-driven exceptions with §5 rationale.
- `sprint/context/context-story-SH2-1.md` (new) — story context created during setup.

**ADR-0001:** left intact (verified via `git status` — unchanged). The amendment is additive and lives entirely in ADR-0003.

**Cross-links verified:** every link target resolves on disk — both ADRs link ADR-0001, the design spec (`../superpowers/specs/2026-07-08-shared-render-extraction-design.md`), and each other.

**Tests:** N/A — docs-only story, no code and no test targets in the orchestrator repo.

**Acceptance Criteria:** all 3 met (0002 exists/Accepted with convergence + TTF retirement + fidelity trade + spec ref + bz2-2/A2-2 supersession; 0003 exists/Accepted amending the scope guard with glow/view/font/compositor verdicts; both cross-link spec + ADR-0001 + each other; ADR-0001 intact).

**Branch:** main (trunk-based orchestrator — no feature branch), committed and pushed.

**Handoff:** To review phase (The Thought Police).

---

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (mechanical) | confirmed 0, dismissed 0, deferred 0 — tree clean, 18/18 orchestrator tests pass, all relative links resolve, headings well-formed, commit = 3 files only |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings (workflow.reviewer_subagents.edge_hunter=false) — N/A for a markdown-only diff |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — N/A (no code) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — N/A (no tests in scope) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — its domain (doc accuracy) assessed by Reviewer directly; found [DOC-1] |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — N/A (no types) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — N/A (no code, no inputs) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — assessed by Reviewer directly (see SIMPLE observation) |
| 9 | reviewer-rule-checker | No | Skipped | disabled | Disabled via settings — ADR-template/AC compliance checked by Reviewer directly (Rule Compliance section) |

**All received:** Yes (1 enabled subagent returned; 8 disabled via settings and pre-filled as Skipped)
**Total findings:** 1 confirmed ([DOC-1], blocking), 0 dismissed, 0 deferred

## Rule Compliance

This is a docs-only story; no `.claude/rules/*.md`, no `SOUL.md`, no lang-review checklist applies (no source). The governing "rules" are the story's ACs, the ADR template (ADR-0001 as exemplar), and factual fidelity to the design spec. Enumerated exhaustively:

- **AC-1 — `docs/adr/0002-font-strategy.md` exists (Accepted), records ROM-stroke convergence + TTF retirement + fidelity trade, references the spec, notes supersession of bz2-2/A2-2:** COMPLIANT. File exists; `**Status:** Accepted`; §Context + §Decision record the convergence and TTF retirement; the faithfulness trade is recorded (Decision Outcome + §4.1 citation); design spec linked; "Supersession of prior work" section names bz2-2 (done) and A2-2 (archived).
- **AC-2 — `docs/adr/0003-render-surface-extraction.md` exists (Accepted), amends ADR-0001's scope guard: glow un-deferred (verb bar), view eligible, font+compositor/phosphor as convergence exceptions with rationale:** COMPLIANT. File exists; Accepted; Amendment 2 table records all four verdicts with §5 rationale; charter amendment (Amendment 1) present.
- **AC-3 — both ADRs cross-link the spec and ADR-0001; ADR-0001 left intact:** COMPLIANT. Both link ADR-0001, the spec, and each other (preflight verified all resolve). `git diff HEAD~1 HEAD -- docs/adr/0001-shared-code-strategy.md` is empty; ADR-0001's git history shows no SH2-1 commit — intact.
- **ADR template conformance (every heading vs ADR-0001):** COMPLIANT. Status/Date/Author/Story front-matter, Context, Considered Options (0002), Decision Outcome, Consequences, Related Decisions — matches ADR-0001's register.
- **Factual fidelity to design spec (every load-bearing claim checked):** ONE VIOLATION → [DOC-1]. The ×4 TTF camp (asteroids/star-wars/battlezone/lobby), VGMSGA naming, font-consumer counts (§3 table), "first epic SH shipped math3d/rng/highscore/loop", purity-guard globals list, and the A2-2 letterSpacing carry-forward all check out against the spec. The SH2-N migration-story mapping does NOT (see [DOC-1]).

## Reviewer Observations

- **[HIGH][DOC-1]** Factual error — ADR-0002 maps the wrong SH2 story to battlezone at `docs/adr/0002-font-strategy.md:116` ("SH2-5 battlezone") and `:139` ("SH2-5 evolves [battlezone]"). Ground truth in `sprint/epic-SH2.yaml`: SH2-4 = asteroids, **SH2-5 = star-wars**, **SH2-6 = battlezone** (SH2-6's title literally reads "(evolves bz2-2)"). A reader tracing "which story retires battlezone's TTF" is sent to star-wars's story. Fix: on :139 change "SH2-5" → "SH2-6"; on :116 correct the enumeration to "SH2-4 asteroids, SH2-5 star-wars, SH2-6 battlezone, SH2-7 lobby" (or delete the forward-references — the spec §11 never required them).
- **[VERIFIED]** ADR-0001 untouched — evidence: `git diff HEAD~1 HEAD -- docs/adr/0001-shared-code-strategy.md` empty; file's only commits (67bdce4, 44e6c7b) predate SH2-1. Complies with AC-3's "left intact."
- **[VERIFIED]** All cross-links resolve — evidence: preflight resolved `0001-shared-code-strategy.md`, the `0002`/`0003` pair, and `../superpowers/specs/2026-07-08-shared-render-extraction-design.md` (×2) to real files on disk.
- **[VERIFIED]** Supersession framing accurate — evidence: `sprint/epic-bz2.yaml:24` `status: done` for bz2-2; `sprint/archive/A2-2-session.md` exists (A2-2 done). ADR-0002 correctly calls them "done stories," and A2-2's session records the very "ADR-0002 bypass" ADR-0002 cites.
- **[VERIFIED]** Eligibility table in ADR-0003 faithfully mirrors design §5 (glow=meets/verb, view=meets, font=convergence exception, compositor+phosphor=convergence exception) — evidence: side-by-side with spec §5 rows; consumer counts match spec §3 table.
- **[SIMPLE]** No over-engineering — the ADRs stay within the template register; no invented sections. The one excess is the very forward-reference detail that carries [DOC-1]: it was not required by the spec and introduced the error. Removing it is a valid fix and would also simplify.
- **[VERIFIED]** Internal consistency between the two ADRs — font is called "pure / joins the pure core" in both 0002 (Decision drivers, Related Decisions) and 0003 (charter table); no contradiction.

### Devil's Advocate

Argue the docs are broken. First and strongest: an ADR is not prose, it is a *reference* — its whole value is that a future engineer can trust it without re-deriving. ADR-0002 asserts "SH2-5 evolves battlezone." That engineer, mid-migration, opens SH2-5 expecting battlezone and finds star-wars. Now they distrust the entire ADR: if the story IDs are wrong, is the font decision itself reliable? A single false fact in an Accepted governance record poisons confidence in every true one around it. That is not cosmetic — it is the failure mode ADRs exist to prevent. The error is doubly damning because it was *self-inflicted*: the design spec §11 asked only that ADR-0002 note it "unblocks bz2-2 / A2-2." Dev volunteered forward-references the spec never requested and got them wrong — added surface area, added risk, no AC benefit. A confused reader is the likeliest casualty, exactly the persona this section must protect.

What else could be broken? Consider the "supersedes bz2-2/A2-2" claim under stress: bz2-2 and A2-2 are *done, shipped* stories. Does an ADR have the authority to "supersede" already-merged work? Here it holds up — ADR-0002 doesn't rewrite their code, it records that the strategy they embodied is being reversed and points at the SH2 stories that will do the reversing. That is legitimate ADR bookkeeping, and A2-2's own session file pre-declared an "ADR-0002 bypass," so the record is internally consistent. Consider ADR-0001 "intact": could an edit have sneaked in via whitespace? No — the diff is byte-empty. Consider the author attribution: is it dishonest to sign these "Architect (Emmanuel Goldstein)" when Dev typed them? No — they record the Architect's decisions from the Architect-authored spec, matching ADR-0001's convention; the "recorded for story SH2-1" qualifier is honest. Consider link rot: relative paths could break if `docs/adr/` moves — but that is speculative and out of scope. The devil finds exactly one true wound: [DOC-1]. It is enough to block.

## Reviewer Assessment

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | ADR-0002 mis-maps SH2 migration story IDs — asserts SH2-5 = battlezone; actual mapping is SH2-5 = star-wars, SH2-6 = battlezone (evolves bz2-2). A false forward-reference in an Accepted governance ADR. | `docs/adr/0002-font-strategy.md:116`, `:139` | Line 139: `SH2-5` → `SH2-6`. Line 116: correct the enumeration to "SH2-4 asteroids, SH2-5 star-wars, SH2-6 battlezone, SH2-7 lobby" — or delete the SH2-N forward-references entirely (the design spec §11 did not require them). Line 144's "SH2-4 migrates asteroids" is correct and stays. |

**Subagent dispatch tags:** `[EDGE]` disabled/N-A · `[SILENT]` disabled/N-A · `[TEST]` disabled/N-A (docs-only) · `[DOC]` **[DOC-1] confirmed** (assessed by Reviewer; comment-analyzer disabled) · `[TYPE]` disabled/N-A · `[SEC]` disabled/N-A · `[SIMPLE]` reviewed — the excess forward-references are the only complexity and are the [DOC-1] site · `[RULE]` rule-checker disabled; AC/template/factual-fidelity checked by Reviewer (see Rule Compliance — 1 violation).

**Preflight:** clean — working tree clean, 18/18 orchestrator tests green, links resolve, commit scoped to 3 files.

**Data flow traced:** reader → ADR-0002 "which story retires battlezone's TTF?" → misdirected to SH2-5 (star-wars) instead of SH2-6 (battlezone). The false reference is the defect.

**Note:** All three ACs are otherwise met and the core decisions are recorded faithfully. This is a narrow, two-line factual fix. Findings are content-only (no test involved) → route to Dev for green rework.

**Handoff:** Back to Dev (Julia) for the SH2-N story-ID correction.

---

## Dev Rework — Round 1 (response to [DOC-1])

**Finding addressed:** [DOC-1] (HIGH) — ADR-0002 mis-mapped SH2 migration story IDs.

**Fix applied** (`docs/adr/0002-font-strategy.md`):
- Line 116: `SH2-5 battlezone, and the star-wars/lobby equivalents` → `SH2-5 star-wars, SH2-6 battlezone, SH2-7 lobby` (full, correct enumeration).
- Line 139: `SH2-5 evolves battlezone` → `SH2-6 evolves battlezone`.
- Line 143 (`SH2-4 migrates asteroids`) was already correct — untouched.

**Verification:** `grep -nE 'SH2-[2-9]' docs/adr/0002-font-strategy.md` cross-checked against `sprint/epic-SH2.yaml` id/title pairs — all four references (SH2-4 asteroids, SH2-5 star-wars, SH2-6 battlezone, SH2-7 lobby) now match ground truth. ADR-0002 was the only file with the defect; ADR-0003 had no SH2-N migration references. ADR-0001 remains untouched.

**Deviation:** the spec-beyond forward-references are now logged under Design Deviations → Dev (implementation), resolving the Reviewer's FLAGGED audit item.

**Workflow note:** the trivial workflow has no rework loop (setup→implement→review→finish), so the review-phase rejection routing (`complete-phase review green rework`) mis-advanced the session to the terminal `finish` phase. `pf workflow fix-phase SH2-1 implement` was attempted to rewind, but fix-phase is **forward-only** ("Target phase 'implement' is not ahead of current phase 'finish'") — the phase cannot be walked back to re-run implement→review. State is wedged: phase=`finish` (SM), `review_verdict: rejected`, but [DOC-1] is fixed+committed (2f50477) and verified. Reconciliation path pending user direction.

**Handoff:** Fix complete; workflow-state reconciliation awaiting decision.

---

## Reviewer Re-verification — Round 2

**Verdict:** APPROVED

**[DOC-1] re-verified as resolved.** Checked the committed ADR-0002 at HEAD (commit 2f50477) with `git show HEAD:docs/adr/0002-font-strategy.md | grep -nE 'SH2-[2-9]'` against `sprint/epic-SH2.yaml` id/title pairs:

| Ref in ADR-0002 | Epic ground truth | Match |
|---|---|---|
| line 116: SH2-4 asteroids, SH2-5 star-wars, SH2-6 battlezone, SH2-7 lobby | SH2-4=asteroids, SH2-5=star-wars, SH2-6=battlezone, SH2-7=lobby | ✓ |
| line 139: SH2-6 evolves battlezone | SH2-6=battlezone (title: "…evolves bz2-2") | ✓ |
| line 143: SH2-4 migrates asteroids | SH2-4=asteroids | ✓ (was already correct) |

The fix was text-only (no structural/link change), so preflight's earlier clean result (tree clean, 18/18 tests, links resolve) still holds. No new issues introduced. The Reviewer's FLAGGED deviation is now resolved: Dev logged the spec-beyond forward-references under Design Deviations → Dev (implementation).

**All 3 ACs met; sole blocking finding [DOC-1] resolved.** `review_verdict` updated rejected → approved.

**Workflow-state note:** phase remained at terminal `finish` (SM) because the trivial workflow has no rework loop and `fix-phase` is forward-only; re-verification + verdict flip were done at the field level (user-approved recovery path) rather than by rewinding the phase.

**Handoff:** To SM (Winston Smith) for the finish ceremony.