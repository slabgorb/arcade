---
story_id: "pm5-1"
jira_key: "pm5-1"
epic: "pm5"
workflow: "tdd"
---
# Story pm5-1: Single-source the eyes/return-home predicate

## Story Details
- **ID:** pm5-1
- **Jira Key:** pm5-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 2
- **Priority:** p3

## Background

The following are verified premises (all cites confirmed accurate against the current tree today, 2026-08-16):

- `plugins/pac-man/src/core/game.ts:278` — `export function isReturningHome(state, id)` returns `state.returning[id] !== null`. It is exported and documented (pm4-3) as "true from the moment a ghost is eaten until it is fully back in play (eyes IN TRANSIT or a regenerated body climbing out)". It has **ZERO production callers** — only two test files call it (`tests/core/ghost-eyes.test.ts`, `tests/shell/eyes-render.test.ts`).
- `plugins/pac-man/src/main.ts:232` — inlines `game.returning[id] !== null` (inside `if (game.house.released[id] || game.returning[id] !== null)`). This decides WHETHER TO DRAW the ghost. It duplicates `isReturningHome`'s exact logic without calling it. **This is the site to route through the helper.**
- `plugins/pac-man/src/shell/render.ts:312` — `if (game.returning[id] === 'eyes') return 'eaten'` inside `ghostRenderMode`. This decides whether to render the ghost AS EYES vs. a regenerated body. **This is a genuinely DIFFERENT predicate** ("render as eyes", true only during the 'eyes' phase, NOT during 'regenerated'). It is CORRECT as-is and MUST NOT be routed through `isReturningHome`.

The `!==null` vs `==='eyes'` "disagreement" flagged in the epic title is not a bug; it is two legitimately distinct questions.

## Acceptance Criteria

**AC1:** `main.ts:232` calls `isReturningHome(game, id)` in place of the inline `game.returning[id] !== null` — giving the helper its first production consumer. Behaviour is unchanged.

**AC2:** `render.ts:312`'s `=== 'eyes'` predicate is LEFT AS-IS (it is a distinct "render as eyes" check; do not route it through the helper).

**AC3:** A test asserts the render mode matches the chosen predicate — i.e. an eyes-phase returning ghost is drawn AND renders 'eaten'; a regenerated-body returning ghost is still drawn (isReturningHome true) but renders as a body ('chase'), not eyes.

**AC4:** Pure refactor — the full pac-man suite (`npx vitest run --project pac-man`) stays green; no behaviour change.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-16T16:07:09Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T15:47:25Z | 2026-08-16T15:50:41Z | 3m 16s |
| red | 2026-08-16T15:50:41Z | 2026-08-16T15:57:50Z | 7m 9s |
| green | 2026-08-16T15:57:50Z | 2026-08-16T16:00:30Z | 2m 40s |
| review | 2026-08-16T16:00:30Z | 2026-08-16T16:07:09Z | 6m 39s |
| finish | 2026-08-16T16:07:09Z | - | - |

## SM Assessment

**Setup complete; routed to TEA for the RED phase.** This is a 2pt p3 pac-man refactor
(tdd, phased). Summary of the coordination decisions:

- **Premise verified against the current tree (2026-08-16), all cites accurate.** The
  epic title's cites — `core/game.ts:278` (`isReturningHome` = `returning !== null`),
  `main.ts:232` (inline `!== null`), `render.ts:312` (`=== 'eyes'`) — are all correct as
  written. `isReturningHome` has ZERO production callers (only two test files use it).
- **Either/or resolved BEFORE setup (user ruling): ROUTE-THROUGH, not delete.** The
  `!==null` vs `==='eyes'` "disagreement" is not a bug — they are two distinct predicates
  ("draw the ghost?" vs. "render it as eyes?"). Only `main.ts:232` is to be routed through
  the helper; `render.ts:312`'s `=== 'eyes'` must stay untouched (routing it would render a
  regenerated body as eyes — a regression). Derived ACs reflect only this branch; a ⚠
  ruling banner sits atop `context-story-pm5-1.md` so the title's "or delete" half is not
  mistaken for open scope.
- **Sibling/premise probes clean at setup:** no `pm5-1` branch existed, no sibling session
  owned it (a-1 on mc11-2, a-2 on jt12-1), no open PRs, merge gate clear.
- **Claim pushed:** story stamped `in_progress`; epic stamp + context committed on
  `feat/pm5-1-single-source-returning-home-predicate` and pushed, so the sibling branch
  probe lights up.

**For TEA:** the session Background + Acceptance Criteria are your primary input. AC3 is the
non-vacuous heart — a test proving an eyes-phase returning ghost is drawn AND renders
`'eaten'`, while a `'regenerated'`-phase returning ghost is still drawn (isReturningHome
true) but renders as a body (`'chase'`), not eyes. Pure refactor: the full pac-man suite
must stay green.

## TEA Assessment

**RED verified; routed to Dev (GREEN).** New failing tests live in
`plugins/pac-man/tests/shell/return-home-predicate.test.ts` (committed as the RED commit).
Full-project RED state (`npx vitest run --project pac-man`): **2 failed / 406 passed** —
the only failures are the two Part A (AC1) tests; every pre-existing test and all three
Part B guards are green.

**Test design — a refactor's RED is structural on AC1, behavioural-guard on AC2/AC3:**

- **Part A (AC1, RED on arrival):** two AST-parsed assertions over `src/main.ts` (parsed
  with the `typescript` dep, the repo's own idiom — comments never reach the tree, so the
  prose mentioning "returning" cannot false-positive):
  1. `main.ts` must *call* `isReturningHome` at least once (currently 0 → RED) — this gives
     the helper its first production consumer.
  2. `main.ts` must no longer inline a `.returning … !== null` comparison for the draw gate
     (currently 1 → RED).
  Both flip green with the single minimal change: import `isReturningHome` and replace
  `game.returning[id] !== null` at `main.ts:232` with `isReturningHome(game, id)`.
- **Part B (AC2/AC3, GREEN on arrival — a mutation guard):** behaviourally pins that the
  draw predicate (`isReturningHome` = `returning !== null`) is strictly *broader* than the
  eyes predicate (`=== 'eyes'`). A `'regenerated'` ghost is still drawn yet renders as a
  **body (`'chase'`), not eyes**. Non-vacuity witness `sawRegenerated` proves the sim
  actually reached that phase (recipe lifted from pm4-3's `ghost-eyes.test.ts`). This goes
  RED **iff** Dev wrongly single-sources render.ts too (the forbidden half of the SM
  ruling) — deleting/replacing `render.ts:312`'s `=== 'eyes'` with `isReturningHome` turns
  the regenerated case `'eaten'`. That is the guard AC2 needs.

**For Dev (Yoda) — the minimal GREEN, and a trap to avoid:**

- The whole change is `plugins/pac-man/src/main.ts` only: add `isReturningHome` to the
  `./core/game` import on line 18, then rewrite the line-232 gate to
  `if (game.house.released[id] || isReturningHome(game, id))`. Nothing else.
- **DO NOT touch `render.ts:312`.** Its `game.returning[id] === 'eyes'` is a *different*
  predicate ("render as eyes"), correct as-is. Part B will catch you if you route it
  through the helper.
- Keep the gate boolean — lang-review #4: `released[id] || isReturningHome(…)` are both
  booleans, so `||` is correct; do not "simplify" to `??`.

### Rule Coverage (lang-review/typescript.md)

| Check | Applies? | Coverage |
|-------|----------|----------|
| #1 Type-safety escapes (`as any`, `!`) | No new ones — refactor introduces none | N/A; Reviewer to confirm none added |
| #2/#3 Generics / enums | No new types or enums | N/A |
| #4 `\|\|` vs `??` on falsy-valid values | **Yes** — the draw gate uses `\|\|` | Operands stay boolean → `\|\|` correct; flagged to Dev not to switch to `??` |
| #5 Module/declaration (`import type` vs value) | **Yes** — `isReturningHome` is a *value* import | Called at runtime, so it must be a value import (not `import type`); the Part A call-check would fail to compile under `import type`, so it is enforced |
| Test quality (no vacuous assertions) | **Yes** | Part A asserts real AST counts; Part B's regenerated guard carries a `sawRegenerated` non-vacuity witness. Self-checked: no `let _ =`, no always-true asserts |

## Dev Assessment

**GREEN — minimal, single-file change; routed to Reviewer.** Followed TEA's spec exactly.

**What changed (`plugins/pac-man/src/main.ts` only, commit `a5fbafb6`):**
1. Added `isReturningHome` to the existing `./core/game` import (a *value* import, not
   `import type` — it is called at runtime; lang-review #5).
2. Draw gate (was `main.ts:232`, now `:239` after the import reflow):
   `game.house.released[id] || game.returning[id] !== null`
   → `game.house.released[id] || isReturningHome(game, id)`.
   Both operands stay boolean, so `||` is retained (lang-review #4 — not `??`).
   Updated the adjacent pm4-3 comment to record the single-sourcing and to flag that this
   predicate is deliberately *broader* than render.ts's `=== 'eyes'`.

**What I deliberately did NOT touch:** `render.ts:312`'s `=== 'eyes'`. It is the distinct
"render as eyes" predicate (AC2); routing it through `isReturningHome` would render a
regenerated body as eyes. Part B's regenerated guard would have caught that — it stayed
green, confirming I left it alone.

**Verification (CONFIRMED-GREEN via testing-runner, both suites):**
- `npx vitest run --project pac-man` → **408 passed / 0 failed** (Part A now green, Part B
  still green).
- `npm run test:orchestrator` → **505 passed / 0 failed** (no test-file-count/README guard
  reacted to the new `return-home-predicate.test.ts`).
- `npm run lint` (`tsc --noEmit`, repo-wide) → clean, so the value import resolves.

**Scope discipline:** no refactor beyond the two lines the tests demanded; `isReturningHome`
and `render.ts` were not modified. Pure behaviour-preserving refactor (AC4).

## Subagent Results

| # | Subagent | Status | Findings | Severity | Notes |
|---|----------|--------|----------|----------|-------|
| 1 | reviewer-preflight | Complete | 0 | — | GREEN: 408 pac-man + 505 orchestrator = all pass; no console.log/TODO/skip/innerHTML smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via `workflow.reviewer_subagents.edge_hunter` |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings (I did the test-quality pass myself — see below) |
| 5 | reviewer-comment-analyzer | Complete | 2 | Low | Stale `main.ts:232` line cites in the test header (lines 9, 18) — FIXED |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Complete | 0 | — | Clean: no injection/eval/DOM sink/unsafe cast; canvas-draw predicate, no security surface |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Complete | 1 | Low | 29/30 checks clean; `as unknown as` at test.ts:56 lacked a justifying comment (#1) — FIXED |

**All received: Yes** — all 4 enabled subagents (preflight, comment-analyzer, security,
rule-checker) returned; the other 5 are disabled via `workflow.reviewer_subagents` and
pre-filled as Skipped.

## Reviewer Assessment

**Verdict: APPROVED.** pm5-1 is a clean, minimal, behaviour-preserving refactor that
implements the SM ruling exactly. All four enabled subagents returned; every finding was
Low-severity, confined to the TEST FILE, and I applied the fixes inline (proportionate for a
2pt story — a rework round for two stale line-cites and a missing cast comment would cost
more than it saves). Production code (`main.ts`) was clean on arrival by all four reviewers
and by my own read.

**Independent verification of the core change (not taken on the subagents' word):**
- **Semantic equivalence (AC4).** `isReturningHome` (game.ts:278-280) is exactly
  `return state.returning[id] !== null` — byte-identical to the inline it replaces. The gate
  went from `game.house.released[id] || game.returning[id] !== null` to
  `game.house.released[id] || isReturningHome(game, id)`. Pure refactor, behaviour unchanged.
- **AC1 met.** `main.ts` now calls `isReturningHome` — its first production consumer
  (grep confirms the only prior callers were two test files). Part A tests are now green.
- **AC2 met.** `render.ts:312`'s `ghostRenderMode` still gates on `=== 'eyes'`, untouched —
  I diffed it and confirmed it is not in the change set.
- **AC3 met.** Part B behaviourally pins the distinction (eyes → drawn + 'eaten';
  regenerated → drawn + 'chase', not eyes) with a `sawRegenerated` non-vacuity witness. The
  rule-checker independently confirmed both Part A guards are mutation-testable and Part B is
  non-vacuous (checks #15, #18, #25, #26, #27 all PASS).

**Findings and disposition (all VERIFIED against the tree, all FIXED in `5fc84b6c`):**
- **[DOC]** comment-analyzer #5 — the test header cited `main.ts:232` twice (lines 9, 18);
  the import reflow moved the draw gate off line 232 and removed the inline, so both cites
  were stale. VERIFIED (`grep -n main.ts:232`). Fixed by replacing the line numbers with the
  symbol (`main.ts's draw gate`), per this repo's line-ref-staleness convention.
- **[RULE]** rule-checker #1 — the `(sf as unknown as { parseDiagnostics?: unknown[] })`
  double-cast at test.ts:56 had no justifying comment, which lang-review #1 requires.
  VERIFIED. Not dismissed (a rule-matching finding may not be dismissed): fixed by adding the
  justification, mirroring `tests/helpers/purity-scanner.ts`'s established anti-fallback
  idiom for reaching the same unexported `parseDiagnostics` field. This is a real, useful
  guard (an unparseable main.ts would otherwise make both Part A counts return 0 and pass
  vacuously), so I kept it rather than deleting the cast.
- **[SEC]** security — no security surface (no backend, no user input reaching a sink, no
  DOM write, no eval). Nothing to fix.

**Post-fix re-verification:** `npm run lint` clean; `npx vitest run --project pac-man`
408/408. The three fixes are doc-only (comment text + one added comment block) — no logic
touched.

### Rule Compliance (lang-review/typescript.md)

- **#1 Type-safety escapes:** one `as unknown as` (test-only, reaching an unexported TS
  compiler-API field) — now carries the required justifying comment. No `as any`, no `!`
  non-null assertions, no `@ts-ignore`. PASS.
- **#4 `||` vs `??`:** the draw gate's operands are both genuine `boolean`
  (`released: Record<GhostId, boolean>`, `isReturningHome(): boolean`), so `||` is correct —
  not the falsy-value bug. PASS.
- **#5 Module/declaration:** `isReturningHome` is a value import (called at runtime);
  `GameState`/`GhostId` are `import type`. PASS.
- **#2/#3/#6/#7/#10/#11:** no generics/enums/JSX/async/input-validation/error-handling
  introduced. N/A.
- **Test quality (#8, #15, #18, #25-#27):** Part A AST guards are mutation-testable and
  scan-scoped correctly; Part B carries a non-vacuity witness. PASS.

**Correlation tags:** [DOC] [RULE] [SEC] — all findings triaged; none Critical or High.

## Impact Summary

**pm5-1 — single-source the eyes/return-home predicate.** Pure behaviour-preserving
refactor (2pt, p3, pac-man). Single review round, **APPROVED**.

- **Change:** `main.ts`'s ghost-draw gate now calls core `isReturningHome(game, id)` in
  place of the inline `game.returning[id] !== null` — the helper's first production consumer.
  `render.ts`'s `ghostRenderMode` keeps its distinct `=== 'eyes'` predicate, untouched.
- **ACs:** AC1 (main.ts routes through the helper) ✓ · AC2 (render.ts `=== 'eyes'` left
  as-is) ✓ · AC3 (test pins draw-vs-render distinction incl. the regenerated case) ✓ ·
  AC4 (pure refactor, suite green) ✓.
- **Findings (all Low, doc-only, all FIXED `5fc84b6c`):** [DOC] two stale `main.ts:232`
  line cites in the test header → symbolised; [RULE] `as unknown as` cast missing a
  justifying comment → added (mirrors `purity-scanner.ts`); [SEC] no security surface.
- **Verification:** pac-man 408/408 · orchestrator 505/505 · lint clean · trial-merge of
  `origin/develop` (6 commits, all missile-command) clean, merged-tree suite 16900/16900.
- **PR:** #468 (feat/pm5-1 → develop).

## Delivery Findings

No upstream findings.

## Design Deviations

No design deviations.