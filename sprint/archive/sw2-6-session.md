---
story_id: "sw2-6"
jira_key: ""
epic: "sw2"
workflow: "trivial"
---
# Story sw2-6: Disassembly fidelity audit (spike) — findings doc + file follow-on stories, no behavior change

## Story Details
- **ID:** sw2-6
- **Jira Key:** (none)
- **Workflow:** trivial
- **Stack Parent:** none
- **Repos:** star-wars
- **Assignee:** slabgorb
- **Branch:** chore/sw2-6-disassembly-fidelity-audit
- **Branch Strategy:** gitflow (feat/fix/chore/{STORY_ID}-{SLUG} off develop)

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-07-10T19:53:37Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-10T19:26:26Z | 2026-07-10T19:28:39Z | 2m 13s |
| implement | 2026-07-10T19:28:39Z | 2026-07-10T19:45:15Z | 16m 36s |
| review | 2026-07-10T19:45:15Z | 2026-07-10T19:53:37Z | 8m 22s |
| finish | 2026-07-10T19:53:37Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### Dev (implementation)
- **Gap** (non-blocking): `star-wars/reference/` (the disassembly + `Object_3D_Data.asm`) is gitignored and ABSENT from this checkout (a-2) — present in `a-1`/`a-3` and `~/Downloads/SW/`. Affects any sw3 story needing raw ROM numbers (`star-wars/reference/disasm/*`) — read it from a checkout that has it; don't assume it's populated locally. *Found by Dev during implementation.*
- **Gap** (non-blocking): the trench is a guaranteed one-shield loss every run — the cockpit is the immovable constant `[0,0,0]` and the y=200 catwalk's hit radius (240) always overlaps it, with no way to climb clear. Affects `star-wars/src/core/sim.ts` (`stepTrench`) + `state.ts` (`CATWALK_HIT_RADIUS`). Filed as sw3-2 (pilotable viewpoint fixes both). *Found by Dev during implementation.*
- **Improvement** (non-blocking): the sw2-5 note that the ~19 deferred speech lines all "need mechanics that don't exist" is overstated — the trench timer lines (Luke trust me / Yahoo / Force is strong) are reachable in the EXISTING trench run with only a progress timer + wave parity. Affects sw3-4 (unblocked). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): star-wars `develop` and `main` have advanced (v0.0.2/v0.0.3 released) since this branch was cut. The diff is a single NEW doc file so a merge conflict is not expected, but SM should confirm a clean merge at finish. Affects the finish/merge step only — no code change needed. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### Dev (implementation)
- **Filed follow-on stories into a NEW epic sw3 rather than appending to epic sw2**
  - Spec source: context-story-sw2-6.md, AC "file follow-on stories via /pf-sprint story add"
  - Spec text: "file concrete, scoped, actionable stories via /pf-sprint story add for the real gaps worth fixing"
  - Implementation: created epic `sw3` ("Star Wars — ROM fidelity pass") and filed sw3-1..sw3-8 there (via CLI, no hand-edited YAML)
  - Rationale: sw2 is the scoped "playtest-followup" epic (nearly done — only sw2-6/sw2-7 remain); the audit's output is a distinct ROM-fidelity theme. A new numbered epic matches the red-baron rb2..rb5 pattern and keeps sw2 clean.
  - Severity: minor
  - Forward impact: none — the stories are addressable regardless of epic home; sw2-7's playtest pass is unaffected. Findings doc placed in `docs/` (not `reference/`, which is gitignored) — explicitly permitted by the AC ("e.g. under docs/ or reference/").

### Reviewer (audit)
- **Filed follow-on stories into a NEW epic sw3 rather than appending to epic sw2** → ✓ ACCEPTED by Reviewer: sound. Matches the established per-game numbered-epic precedent (red-baron rb2..rb5), keeps the scoped sw2 "playtest-followup" epic clean, and has no forward impact — the 8 stories are addressable regardless of epic home and sw2-7 is unaffected. Verified sw3-1..sw3-8 exist in `sprint/epic-sw3.yaml` with points/priority matching the doc, filed via CLI (no hand-edited YAML).

## Sm Assessment

**Story:** sw2-6 — Disassembly fidelity audit (spike). Chore, 3 pts, p2, workflow `trivial` (phased: setup → implement → review → finish). Repo: star-wars (develop-based, ships via PRs).

**Setup complete.** Session file, story context (`sprint/context/context-story-sw2-6.md`), and branch `chore/sw2-6-disassembly-fidelity-audit` (off develop, checked out in `star-wars/`) are in place. Sprint YAML marked `in_progress`.

**Routing → Dev (implement phase).** This is a read-only audit spike producing documentation + backlog stories, not code.

**Guardrails for the implement phase:**
- **No behavior change.** No edits to `star-wars/src/core` or `src/shell` sim behavior. Green test run before/after is the guardrail.
- **Deliverable 1 — findings doc:** audit the ported sim (`star-wars/src/core/`, incl. the math3d "Math Box") against the authentic 1983 Star Wars disassembly in `star-wars/reference/`. Commit a findings doc listing concrete fidelity gaps with ROM references where available.
- **Deliverable 2 — follow-on stories:** file concrete, scoped, actionable stories via `/pf-sprint story add` for the real gaps worth fixing. **Do not hand-edit sprint YAML.**
- **Known audit target:** the TIE collision model, deliberately deferred here per sw2-1's archive note. The audit is broader than just that.
- Don't gold-plate the doc — scope findings to what would actually feed the backlog and sw2-7's playtest verification pass.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `star-wars/docs/sw2-6-disassembly-fidelity-audit.md` (new, 298 lines) — the fidelity audit findings doc: current TS sim vs 1983 ROM, scored/classified by subsystem, with a fidelity scorecard, the filed sw3 backlog, and a deferred/not-filed list. Committed on branch `chore/sw2-6-disassembly-fidelity-audit`, pushed to origin.

**Backlog filed (orchestrator, via `pf sprint` CLI — NOT hand-edited):**
- New epic `sw3` "Star Wars — ROM fidelity pass" + 8 stories sw3-1..sw3-8 (uncommitted in `sprint/epic-sw3.yaml` + `sprint/current-sprint.yaml`; SM commits sprint changes at finish).

**What the audit found (headline):** the sim faithfully reproduces vertex data, aim/lock geometry, and several scores, but diverges on score VALUES (TIE 100 vs ROM 1,000; exhaust port 1,000 vs 25,000), the surface phase (flat 4-kill quota vs 22–50 towers + missing 50k bonus), the trench (immovable cockpit → unavoidable catwalk shield loss; identical every run; turrets never fire), audio (no music; 4 of 23 speech lines wired), and HUD scoring (no extra lives / bonus row). Highest-value, lowest-effort fix = sw3-1 (bake resolved score constants).

**No behavior change:** no `src/core`/`src/shell` files touched. Star-wars suite GREEN — **583/583** passing (54 files), before and after (`.session/test-runs/sw2-6-dev-green.md`).

**Branch:** `chore/sw2-6-disassembly-fidelity-audit` (pushed; no PR yet — SM opens it at finish per star-wars PR flow).

**Handoff:** To review (trivial workflow: implement → review → finish).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1 (non-blocking merge note) | confirmed 1 (non-blocking), dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings (workflow.reviewer_subagents.edge_hunter=false); N/A on a docs-only diff |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings; N/A on a docs-only diff (no executable code) |
| 4 | reviewer-test-analyzer | Yes | clean | none | N/A — confirmed no test work required (docs-only, no code changed) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings; doc accuracy instead covered by rule-checker |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings; N/A (no TypeScript changed) |
| 7 | reviewer-security | Yes | clean | none | N/A — CLEAN: no copyrighted ROM source leaked (no code fences/6809 mnemonics), no secrets |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings; N/A on a docs-only diff |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 34 instances | N/A — 0 violations; independently re-derived 24 factual claims from source, all matched exactly |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled; 4 with results, 1 non-blocking finding)
**Total findings:** 1 confirmed (non-blocking merge note), 0 dismissed, 0 deferred

### Rule Compliance

The TypeScript lang-review checklist is **N/A** — the diff is a single pure-addition
markdown file; no `.ts`, no `src/core`/`src/shell`, no tests changed. The applicable
project rules are documentation/provenance rules, all checked exhaustively by
reviewer-rule-checker (34 instances, 0 violations):

- **Provenance / copyright (reference/ is gitignored ROM material; commit no verbatim ROM source):** COMPLIANT. No code fences, no 6809 mnemonics anywhere in the doc; every ROM reference is a symbolic label/address + recovered number or original prose — matching the committed precedent `star-wars-1983-source-findings.md`. The doc's own "Provenance / safety" section asserts this and honors it.
- **Factual accuracy (claims match cited source + findings doc):** COMPLIANT. 24 headline claims independently re-derived from `state.ts`/`sim.ts`/`trench-obstacles.ts`/`models.ts`/`events.ts`/`audio.ts` — all exact (TIE_SCORE=100, TRENCH_BONUS=1000, TURRET_SCORE=200, CATWALK_HIT_RADIUS=240>200, vertex counts 52/56, "no music"/"no extra-life"/"no 50k bonus" greps, "4 of 23 speech lines").
- **Cross-references (filed stories + file/line citations exist):** COMPLIANT. sw3-1..sw3-8 exist in `epic-sw3.yaml` with points/priority matching the doc's table; all cited line numbers land on the described logic; the sw2-5 memo the doc "corrects" says verbatim what the doc claims.

## Reviewer Assessment

**Verdict:** APPROVED

This is a docs-only fidelity-audit spike: one new 298-line markdown file, zero
`src/`/`tests/` changes. For an audit deliverable the dominant risks are (a) factual
inaccuracy that would send the sw3 epic chasing phantom gaps, and (b) leaking
copyrighted ROM source into a committed file. Both were hunted hard and came back
clean.

**Observations (7):**
- [VERIFIED] No behavior change — structurally guaranteed. `git diff develop...HEAD --name-only` = one doc file; preflight confirms 583/583 tests green, `tsc --noEmit` clean, working tree clean. Evidence: the guardrail can't be violated when no executable file changed.
- [VERIFIED] [RULE] Factual accuracy independently re-derived (24 instances, 0 wrong): TIE_SCORE=100 (state.ts:105) vs ROM 1,000; TRENCH_BONUS=1000 (state.ts:283) vs ROM 25,000; TURRET_SCORE=200 (state.ts:246) = faithful; CATWALK_HIT_RADIUS=240 (state.ts:184) > catwalk y=200 (trench-obstacles.ts:65) so the crash fires every pass (sim.ts:461) — the "guaranteed shield loss" claim is real, not hyperbole; TIE/Darth vertex counts 52/56.
- [VERIFIED] [SEC] No copyrighted ROM source leaked — no code fences, no 6809 mnemonics found by exhaustive grep; every reference is a label/address/number re-expressed as our own prose, matching the precedent findings doc. No secrets. Injection/auth/tenant N/A (no code).
- [VERIFIED] Follow-on backlog is real and matches the doc: sw3-1..sw3-8 exist in `sprint/epic-sw3.yaml` with points/priority exactly as tabled, filed via CLI (no hand-edited YAML).
- [VERIFIED] The sw2-5-memo correction is accurate and valuable — the archived sw2-5 finding verbatim says the deferred speech lines "need R2-damage/Vader-tail/wingman mechanics"; the audit correctly shows the trench-timer subset is reachable now, unblocking sw3-4.
- [VERIFIED] Scope discipline honored — the doc separates 8 filed stories from an explicit "identified but NOT filed" list (cosmetic/blocked items), so the backlog isn't bloated, exactly as the SM guardrail asked.
- [LOW] [preflight] `develop`/`main` advanced (v0.0.2/v0.0.3) since the branch was cut. Docs-only new file → no conflict expected; SM should confirm a clean merge at finish. Non-blocking.

**Subagent dispatch (all 8 specialist domains accounted for):**
- [SEC] security — CLEAN (no ROM-source leak, no secrets).
- [RULE] rule-checker — CLEAN (0 violations / 34 instances; 24 facts re-verified).
- [TEST] test-analyzer — CLEAN (no test work required; docs-only).
- [EDGE] edge-hunter — disabled via settings; N/A (no executable paths in a doc).
- [SILENT] silent-failure-hunter — disabled via settings; N/A (no error paths in a doc).
- [DOC] comment-analyzer — disabled via settings; doc-accuracy covered by [RULE] instead.
- [TYPE] type-design — disabled via settings; N/A (no TypeScript changed).
- [SIMPLE] simplifier — disabled via settings; N/A (prose, not code).

**Devil's Advocate.** Suppose this doc is quietly wrong. The worst failure mode for
a fidelity audit isn't a crash — it's confident inaccuracy: a misstated ROM value or
an overstated gap that makes an sw3 implementer "fix" something that isn't broken, or
skip something that is. So I attacked the numbers, not the prose. Every load-bearing
claim traces to two independent anchors: the already-committed ROM extraction
(`star-wars-1983-source-findings.md`, itself peer-reviewed) for ROM truth, and the
live source for "current TS" — and the rule-checker re-derived 24 of them from the
actual files with zero mismatches. The scariest single claim — "every trench run
costs a guaranteed shield with no counterplay" — is arithmetic, not opinion: catwalk
at y=200, hit radius 240, cockpit pinned at [0,0,0], collision unconditional; it holds.
Could a filed story be un-actionable? sw3-5 (music) is honestly flagged "needs assets
sourced"; sw3-1 (scoring) will break tests that assert 100 — but it's `workflow: tdd`,
so the red/green cycle owns those updates; the audit scoped it correctly. Could the
"new epic sw3" call fragment the backlog? It matches the rb2..rb5 precedent, keeps sw2
scoped, and is logged as a deviation (ACCEPTED). Could copyrighted code have slipped
in? Exhaustively grepped — none. Could a claim be un-sourced? The audio/HUD deep
items (shield ring, corner dots) weren't in the 24 re-verified set, but they're
deferred/not-filed cosmetic notes consistent with the findings doc's Open follow-up
#7 — low stakes even if slightly off. I find no material defect. The doc is accurate,
honestly scoped, leaks nothing, and its backlog is actionable.

**Deviation audit:** 1 deviation (new epic sw3 vs appending to sw2) → ACCEPTED (see Design Deviations → Reviewer (audit)).

**Handoff:** To SM (The Organic Mechanic) for finish-story. One non-blocking note for the finish/merge step: confirm a clean merge given develop/main advanced since the branch was cut (docs-only new file → low risk).